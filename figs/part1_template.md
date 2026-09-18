title: CUDA GEMM, Part 1: From a Naive Kernel to cuBLAS Parity
date: September 1, 2026
author: Shashwat Pandey

---

*Part 1 of 4. This part builds a matrix-multiply kernel from the dumbest possible
version up to roughly cuBLAS speed, one idea at a time. Part 2 asks why that
turned out not to matter, Part 3 gets the win somewhere else entirely, and
[Part 4](blog.html?post=triton_mlir_llvm) discovers that a compiler will now
generate every step below, unasked, from forty lines of Python.*

## 1. Why this one function matters

I profiled a small language model — Qwen2.5-0.5B — generating text on my laptop
GPU, and sorted the kernels by how long they ran. Here is the whole picture.

<figure>
{{svg:time_split}}
<figcaption>Every kernel the model runs, bucketed. During token generation,
<b>85% of the GPU's time goes into plain matrix multiplication</b> — and most of
what's left is attention, which is also matrix multiplication wearing a hat.
(A caution I had to apply to my own notes: the profiler files FlashAttention
under "GEMM" too. Add them and you get 93%, which is true but double-counts if
you then draw attention as a separate slice. The bars above keep them apart.)</figcaption>
</figure>

So if you want the model to be faster, you want the matmul to be faster. Almost
nothing else is worth your attention until that's true — fuse every activation
and normalisation perfectly and you are fighting over 7%.

Which raises the obvious question: how fast *can* a matmul be, and how would you
know? There's a convenient answer to the second part. NVIDIA ships cuBLAS, a
hand-tuned library that has absorbed a decade of engineer-years, and we can
simply race against it. If I write a kernel that hits 90% of cuBLAS, that's a
real number. If I write one that hits 1%, I've learned something too.

I'm going to build that kernel here. Nine versions, each one idea. The first is
so slow it's almost funny; the last is within a few percent of the library. What
I want you to take away isn't the code — you can read the code anywhere — it's
the *shape of the reasoning*: at every step, something specific about the
hardware is the bottleneck, and the fix follows from naming it.

The structure follows Simon Boehm's excellent SGEMM worklog [1], which is where
I'd send you next. Where I diverge is that I ran everything on a 24-SM laptop
GPU against the matrix shapes this particular model actually issues, and both of
those choices changed the answers in ways I didn't expect.

## 2. The memory you are actually using

Before any code, one piece of background, because it explains all nine steps.

When people first learn that a GPU is fast, they learn it as "lots of cores."
That's true and mostly irrelevant. The RTX 4060 in my laptop can do about 28
trillion floating-point operations per second. It can read about 227 **billion**
bytes per second from its main memory [3]. Those numbers are off by a factor of
123.

So: a GPU is an enormous arithmetic engine attached to a memory system that
cannot possibly keep it fed. Every optimization in this post is a trick for
getting more arithmetic out of each byte you fetch.

The memory system isn't one thing, though. It's a hierarchy, and the levels are
wildly different:

<figure>
{{svg:mem_hierarchy}}
<figcaption>Four places a number can be. Going one level down costs you roughly
an order of magnitude in bandwidth and a similar factor in latency. <b>The entire
craft of writing a fast matmul is moving work up this diagram.</b></figcaption>
</figure>

Two things about this picture are worth holding onto.

**First, the top two levels are tiny.** 100 KB of shared memory per SM sounds
like nothing because it is nothing — a 128×128 tile of floats is 64 KB. You are
going to be working in a space smaller than a single JPEG.

**Second, the bottom level is the one you'll actually be waiting on.** DRAM is
400 cycles away. In 400 cycles the SM could have done thousands of
multiply-adds. So the question that decides whether your kernel is fast is never
"how many FLOPs does it do" — every version does exactly the same $2MNK$ FLOPs.
The question is *how many times does the same byte come across that 227 GB/s
wire.*

Keep that sentence. It's the whole post.

## 3. The dumbest possible kernel

Here's the problem. Given matrices $A$ ($M \times K$) and $B$ ($K \times N$),
compute $C = A B$, where

$$C[i][j] = \sum_{k} A[i][k] \cdot B[k][j]$$

<figure>
{{svg:matrix_tiling}}
<figcaption>The problem, tiled. One output element needs a whole row of A and a whole column of B. One <i>block</i> owns the dashed tile, <code>BM</code>&#215;<code>BN</code> of C. These labels &mdash; <code>BM</code>, <code>BN</code>, <code>BK</code> &mdash; recur in every diagram from here on.</figcaption>
</figure>

And here's the version you'd write if you'd just learned CUDA. One thread per
output element; each thread walks the whole $k$ dimension by itself.

```cuda
__global__ void sgemm_naive(int M, int N, int K,
                            const float *A, const float *B, float *C) {
  const uint row = blockIdx.x * blockDim.x + threadIdx.x;
  const uint col = blockIdx.y * blockDim.y + threadIdx.y;

  if (row < M && col < N) {
    float acc = 0.0f;
    for (int k = 0; k < K; ++k)
      acc += A[row * K + k] * B[k * N + col];
    C[row * N + col] = acc;
  }
}
```

This is correct. It is also, on my GPU, **0.112 TFLOPS** — about 1.4% of what
cuBLAS achieves on the same matrices. A factor of seventy.

Seventy is a lot. It's worth sitting with the question of where it could
possibly go, because the kernel looks so innocent. It does the right number of
multiplies. It has no branches in the inner loop. Every thread does the same
amount of work.

<figure>
{{svg:thread_hierarchy}}
<figcaption>A kernel launch from the outside in. The <b>warp</b> is the unit that talks to memory: one instruction, 32 addresses, at once. We'll follow <code>t0</code> and <code>t1</code> through the next several figures.</figcaption>
</figure>

The answer is that GPU threads don't execute alone. They execute in **warps** of
32, in lockstep: all 32 threads issue the same instruction at the same time. So
when the warp reaches `A[row * K + k]`, that's not one load — it's 32 loads, one
per thread, issued simultaneously. And the memory system will service them
together *if and only if* they happen to fall in the same neighbourhood.

Now look at which 32 addresses those are. Consecutive `threadIdx.x` means
consecutive `row`. So at a fixed `k`, the warp is reading

```
A[0*K + k], A[1*K + k], A[2*K + k], ... A[31*K + k]
```

Thirty-two addresses, each `K` floats apart. For K=896 that's 3584 bytes of
stride. They are in 32 completely different places.

<figure>
{{svg:naive_access}}
<figcaption>The naive kernel's fatal flaw, drawn. The warp wants 32 floats
(128 bytes). Because they sit in 32 different rows, the memory system must fetch
32 separate 32-byte sectors — <b>1024 bytes moved to deliver 128</b>. You are
paying 8× for every number, and that's before the latency of 32 independent
round trips.</figcaption>
</figure>

That's the whole story of version one. It isn't short of arithmetic; it's
drowning in wasted bytes. The DRAM bus is delivering about 15 GB/s of numbers
the kernel actually wants, out of 227 GB/s it could be delivering.

And here's what I find genuinely delightful about this problem: the fix is to
swap two lines. Not to restructure the algorithm, not to add shared memory — just
to change *which thread computes which output*. That's the next section, and it
buys 8×.

## 4. Swapping two lines, for 8x

The naive kernel mapped `threadIdx.x` to the *row* of C. Let's map it to the
*column* instead — so that the 32 threads of a warp ask for 32 *adjacent*
addresses, which the memory system can service as one transaction rather than
32 [2]. That's the entire change:

```cuda
template <const uint BLOCKSIZE>
__global__ void sgemm_coalesce(int M, int N, int K,
                               const float *A, const float *B, float *C) {
  const uint row = blockIdx.x * BLOCKSIZE + (threadIdx.x / BLOCKSIZE);
  const uint col = blockIdx.y * BLOCKSIZE + (threadIdx.x % BLOCKSIZE);
  //                                         ^^^^^^^^^^^^^^^^^^^^^^^
  //                                         this is the whole fix
  if (row < M && col < N) {
    float acc = 0.0f;
    for (int k = 0; k < K; ++k)
      acc += A[row * K + k] * B[k * N + col];
    C[row * N + col] = acc;
  }
}
```

Same arithmetic. Same number of loads. Same everything — except now consecutive
threads in a warp have consecutive `col`, so at a fixed `k` the warp reads

```
B[k*N + 0], B[k*N + 1], B[k*N + 2], ... B[k*N + 31]
```

which are 32 *adjacent* floats. 128 contiguous bytes. One transaction.

<figure>
{{svg:coalesced}}
<figcaption>The same warp, one index swapped. What was 32 scattered fetches is
one burst. <b>0.112 &#8594; 0.847 TFLOPS, a 7.6x speedup for zero extra work.</b>
Meanwhile A is now read by all 32 threads at the same address, which the
hardware broadcasts for free.</figcaption>
</figure>

I want to dwell on this for a second, because it's the most important lesson in
the post and it arrives in the cheapest possible package. Nothing about the
*computation* changed. The kernel does not do less work. It does the identical
work, in an order the memory system likes, and it runs 7.6 times faster.

Almost every optimization that follows is a more elaborate version of this same
move.

## 5. Staging tiles in shared memory

We fixed *how* we read. We haven't touched *how often*.

Count it. Every thread walks all of K. Thread `(i,j)` reads the whole row
`A[i][:]` and the whole column `B[:][j]`. So across the grid, each element of A
gets pulled from memory N times, and each element of B gets pulled M times. For
896x896 matrices that is nearly 900 redundant trips per number.

The fix is the reason shared memory exists. Divide C into tiles. For each tile,
cooperatively load the matching slabs of A and B into shared memory once, then
let all the threads in the block read them from there — 30 cycles instead of 400.

```cuda
template <const uint BS>
__global__ void sgemm_smem(int M, int N, int K,
                           const float *A, const float *B, float *C) {
  __shared__ float As[BS * BS];
  __shared__ float Bs[BS * BS];

  const uint tRow = threadIdx.x / BS, tCol = threadIdx.x % BS;
  float acc = 0.0f;

  for (int bk = 0; bk < K; bk += BS) {       // walk K in chunks
    As[tRow * BS + tCol] = A[tRow * K + tCol];   // everyone loads one element
    Bs[tRow * BS + tCol] = B[tRow * N + tCol];
    __syncthreads();                          // wait for the whole tile

    for (uint d = 0; d < BS; ++d)              // now read from SMEM
      acc += As[tRow * BS + d] * Bs[d * BS + tCol];
    __syncthreads();                          // before anyone overwrites it

    A += BS;  B += BS * N;
  }
  C[tRow * N + tCol] = acc;
}
```

<figure>
{{svg:smem_kloop}}
<figcaption>Cache blocking. Each pass loads one <code>BK</code>-wide chunk of A and B into shared memory, does all the arithmetic it can, then advances both pointers. DRAM trips per element fall from <code>K</code> to <code>K/BK</code>.</figcaption>
</figure>

Each element now crosses the DRAM bus `K/BS` times instead of `K` times. With
BS=32 that's a 32x reduction in traffic.

<figure>
{{svg:gmem_load}}
<figcaption>Filling the cache is itself a coalescing problem. Consecutive threads take consecutive <i>columns</i>, so the tile loads in wide bursts &mdash; the same rule as section 4, applied to the load rather than the arithmetic.</figcaption>
</figure>

For which we get... **1.121 TFLOPS.** A 1.3x improvement.

That is a deeply unsatisfying return on a 32x traffic reduction, and the
disappointment is informative. We removed the DRAM bottleneck and immediately
hit a new one: the inner loop does **two shared-memory loads for every single
multiply-add**. Shared memory is ten times faster than DRAM, but we're asking it
for two numbers per unit of arithmetic, and that ratio is what now caps us.

Which brings us to the idea that actually unlocks this kernel.

## 6. Arithmetic intensity, and how to buy it

Here is the concept to take away from the whole post.

**Arithmetic intensity** is the ratio of useful arithmetic to bytes loaded. Every
version so far has had a terrible one: 2 loads per FMA. If you want a kernel to
go fast, you have to raise that number, and the way you raise it is to give each
thread *more outputs*.

Watch what happens with just two outputs per thread. Thread computes `C[i][j]`
and `C[i+1][j]`. It loads `B[k][j]` once — and uses it **twice**:

```cuda
float b = Bs[k * BN + tCol];          // one load
acc0 += As[(row + 0) * BK + k] * b;   // two FMAs
acc1 += As[(row + 1) * BK + k] * b;
```

Three loads, two FMAs. Better than 2:1. Push it to 8 outputs stacked in a column
and it's 9 loads for 8 FMAs. Now make it two-dimensional — each thread owns an
8x8 patch of C — and the inner loop becomes a **register outer product**:

<figure>
{{svg:blocktile_1d}}
<figcaption>1D blocktiling. One value of <code>Bs</code>, held in a register, feeds <b>all TM</b> multiply-adds. Loads per FMA drop 2.00 &#8594; 1.13, and this is the first large jump in the post: <b>1.121 &#8594; 3.712 TFLOPS</b>.</figcaption>
</figure>

<figure>
{{svg:outer_product}}
<figcaption>The move that unlocks the kernel. Load 8 values of A and 8 of B into
registers, then do every pairwise product: <b>16 loads buy 64 FMAs</b>. Shared
memory traffic per result drops 8x, and the 64 running sums live in registers
where they cost nothing to touch.</figcaption>
</figure>

This is rungs 4 and 5, and it takes us from 1.121 to **4.695 TFLOPS**. The 8x8
patch is why: arithmetic intensity went from 2 loads-per-FMA to 0.25, an
eightfold improvement, and the measured speedup is 4.2x.

One implementation detail worth flagging, because it bit me. The loop nesting
has to put the `k` step *outermost* of the three inner loops:

```cuda
for (uint d = 0; d < BK; ++d) {            // k, outermost
  for (uint i = 0; i < TM; ++i) regM[i] = As[...];   // load 8
  for (uint j = 0; j < TN; ++j) regN[j] = Bs[...];   // load 8
  for (uint i = 0; i < TM; ++i)
    for (uint j = 0; j < TN; ++j)
      acc[i][j] += regM[i] * regN[j];      // 64 FMAs
}
```

If you nest it the other way, the loads land inside the arithmetic and the
compiler can't keep the fragments in registers. Same maths, same output, a third
of the speed.

<figure>
{{svg:loop_nest}}
<figcaption>The four loops, outermost first. The innermost pair is the only place in the kernel that touches no memory at all &mdash; which is exactly why the <code>k</code> step has to sit outside it.</figcaption>
</figure>

## 7. Telling the compiler the loads are wide

The GPU can load 128 bits in a single instruction. So far we've been asking for
32 bits at a time, which means four times as many load instructions as
necessary.

The fix is to cast to `float4` and promise alignment:

```cuda
float4 t = reinterpret_cast<const float4 *>(&A[innerRowA * K + innerColA * 4])[0];
```

This emits `LDG.E.128` instead of four `LDG.E.32`. Same bytes, a quarter of the
instructions.

There's a subtler half. In rung 5, a thread's 8 reads of `regM` walk `As` with
stride `BK` — scattered, so they can't be vectorised. But if we store `As`
**transposed** when we load it, those same 8 reads become contiguous, and two
`LDS.128` instructions replace eight `LDS.32`:

<figure>
{{svg:transpose}}
<figcaption>Transposing <code>As</code> as it lands in shared memory turns eight
scattered 32-bit reads into two 128-bit ones. Together with <code>float4</code>
on the global loads: <b>4.695 &#8594; 7.252 TFLOPS</b> — 83% of cuBLAS.</figcaption>
</figure>

## 8. Warptiling, and a surprise about whose GPU you're on

Threads execute in warps, and each SM has four warp schedulers that run
independently. So far our thread tiles have been interleaved arbitrarily across
warps, which means a warp's 32 threads pull from scattered parts of shared
memory. Adding one explicit level of hierarchy — block, then **warp**, then
thread — gives each warp a contiguous rectangle to own, which keeps its reads in
the same shared-memory banks and lets the four schedulers get out of each other's
way.

<figure>
{{svg:warptile}}
<figcaption>Warptiling inserts one level between block and thread. Each warp gets a contiguous <code>WM</code>&#215;<code>WN</code> rectangle, which keeps its shared-memory reads in the same banks and lets the SM's four warp schedulers stay out of each other's way.</figcaption>
</figure>

That is rung 8, and it's where I hit the result I did not expect.

Boehm's worklog tunes on an A6000: 84 SMs, a serious datacentre card. I have 24
SMs in a laptop. I took his configuration verbatim, then let an autotuner search
188 valid configurations of the *same kernel* on my GPU. Same code. Only the
template parameters differ.

<figure>
{{svg:a6000}}
<figcaption>Retuning the same kernel for a 24-SM GPU is worth up to <b>+91%</b>.
And the last row is the honest part: on the one shape wide enough to keep a big
tile busy, the A6000 configuration <i>wins by 19%</i>. His parameters aren't
wrong — they're tuned for a regime my model rarely visits.</figcaption>
</figure>

The winners on my card are *small*: 64x64 or 32x128 block tiles with 32
accumulators per thread, against the A6000's 128x128 and 128. The reason is
plain once you count blocks. A 128x128 tile over a 896-column matrix makes 7
blocks wide; with 512 rows that's 28 blocks total, on 24 SMs. One full wave plus
four stragglers — 42% of the second wave is idle silicon. Halve the tile and you
get 112 blocks, which packs far better.

<figure>
{{svg:tile_quant}}
<figcaption>Why the big tile loses here. A 128&#215;128 tile over this matrix makes <b>28 blocks</b> on <b>24 SMs</b> &mdash; one full wave, then a second wave that is 20/24 idle. Halving the tile gives 112 blocks and the ragged edge amortises away. Nothing in the kernel changes; only the template parameters do.</figcaption>
</figure>

**This is the first place a benchmark misled me, and it won't be the last.** If I
had only ever run the square 4096x4096 case, the A6000 configuration would have
looked fine and I'd have shipped a kernel that was 2x off on the shapes that
matter.

## 9. Double buffering

One rung left. The K loop still stalls twice per tile: once waiting for the
global loads, once on the `__syncthreads()` that guards them. Give shared memory
*two* tile buffers and you can prefetch tile `i+1` into registers while the
arithmetic for tile `i` is still running, then commit it to the other buffer.

<figure>
{{svg:dbuf_timeline}}
<figcaption>Double buffering doesn't make anything faster; it makes the waiting
happen somewhere else. Worth the last <b>7%</b>, which takes us to 97.9% of
cuBLAS.</figcaption>
</figure>

## 10. The ladder

Here is every rung, on one shape, measured with the candidate and cuBLAS timed
alternately in the same process so neither gets a thermal advantage.

<figure>
{{svg:ladder}}
<figcaption>Nine ideas, <b>72.8x</b>, ending at 97.9% of a library that has had
far more engineering poured into it than one weekend. The two grey-ish rungs
(3 and 7) are the ones where I learned the most, because they under-delivered.</figcaption>
</figure>

The autotuner from rung 8 also produced a result I find genuinely pretty. Sweep
every shape at every batch size, and the winning tile is not a constant — it
tracks the number of rows you're multiplying:

| shape | M=1 | M=16 | M=128 | M=512 | M=2048 |
|---|---|---|---|---|---|
| qkv_proj | 64x64x**32** | 32x128x**32** | 64x128x**32** | 64x128x**8** | 128x128x**8** |
| o_proj | 64x64x**32** | 32x128x**32** | 64x128x**32** | 64x64x**8** | 128x128x**8** |
| down_proj | 64x64x**32** | 32x128x**32** | 64x128x**32** | 64x64x**8** | 128x128x**8** |
| gate_up_proj | 32x128x**32** | 32x128x**32** | 64x64x**8** | 128x128x**16** | 128x128x**16** |

The pattern is monotone: as M grows, the tile gets **wider and shallower** — the
K depth falls from 32 to 8 while the block face grows fourfold. And it follows
from where the reuse is. At M=1 there is no reuse along rows at all, so the only
way to amortise a load is to go deep in K. At M=2048 the rows supply all the
reuse you need, and a deep K tile just burns shared memory that would otherwise
buy you more resident blocks.

## 11. And then I benchmarked the shapes that actually matter

Everything above is measured at M=2048 — a big, comfortable, compute-bound
matrix. That is what prefill looks like.

But a language model generating text one token at a time doesn't multiply
2048x896 matrices. It multiplies **1x896** matrices. That's the decode phase, and
it is 84.9% of the time in the profile we started with.

So I ran the same nine kernels at M=1.

<figure>
{{svg:inversion}}
<figcaption>The same nine kernels, same GPU, one row instead of 2048. <b>Rung 5
is three times slower than rung 2</b>, and the best of the nine manages 11.7% of
cuBLAS. Every optimization in this post was an answer to a question that decode
does not ask.</figcaption>
</figure>

Look at rung 5. An 8x8 thread tile computing a 1x896 output means 63 of every 64
accumulators hold nothing. The 128x128 block tile that packed so beautifully at
M=2048 covers a matrix that is one row tall. And 896 output columns divided by a
128-wide tile is 7 blocks, on a GPU with 24 SMs — so two thirds of the machine
is idle before the kernel even starts.

None of this is a bug in the kernel. The kernel is fine. It is answering the
wrong question: *how do I get maximum arithmetic out of each byte*, when decode's
question is *how fast can I stream a gigabyte of weights off the bus*.

That is Part 2. We'll build the roofline model that tells you which question
you're in, find out why a 20% speedup was arithmetically impossible on this
hardware, and then I'll walk through the six separate occasions on which my own
benchmarks confidently told me the opposite of the truth — including a 372%
speedup that was entirely a thermometer reading, and a kernel that was correct on
every shape below 600 blocks and silently wrong above it.


[1] Simon Boehm, [*How to Optimize a CUDA Matmul Kernel for cuBLAS-like Performance: a Worklog*](https://siboehm.com/articles/22/CUDA-MMM). The nine-rung structure of this post follows his. Section 8 is where our numbers part ways: he tunes on an 84-SM A6000, I have 24 SMs, and the same kernel wants a different tile.
[2] NVIDIA, [*CUDA C++ Best Practices Guide* &mdash; coalesced access to global memory](https://docs.nvidia.com/cuda/cuda-c-best-practices-guide/index.html#coalesced-access-to-global-memory). The 32-byte sector behaviour behind section 3.
[3] All numbers here are from my own runs on an RTX 4060 Laptop (sm_89, 24 SMs, 8 GB, 227 GB/s measured). Candidate and cuBLAS are timed in alternating rounds inside one process, because this card throttles from 3105 to about 1200 MHz under sustained load &mdash; Part 2 has the story of what that did to my first set of results.
