title: Making a Matmul Fast: 0.1 to 8 TFLOPS in Nine Steps
date: Draft
author: Shashwat Pandey

---

*Part 1 of 3. This part builds a matrix-multiply kernel from the dumbest possible
version up to roughly cuBLAS speed, one idea at a time. Part 2 asks why that
turned out not to matter, and Part 3 gets the win somewhere else entirely.*

## 1. Why this one function matters

I profiled a small language model — Qwen2.5-0.5B — generating text on my laptop
GPU, and sorted the kernels by how long they ran. Here is the whole picture.

<figure>
<svg viewBox="0 0 740 176" role="img" aria-label="Share of GPU time by kernel category, prefill and decode">
  <text x="0" y="14" font-family="monospace" font-size="11" fill="#666">SHARE OF GPU TIME BY KERNEL</text>

  <text x="0" y="52" font-family="monospace" font-size="12" fill="#1a1a1a">prefill</text>
  <rect x="78" y="40" width="469" height="18" fill="#1a73e8"/>
  <rect x="547" y="40" width="99" height="18" fill="#c2410c"/>
  <rect x="646" y="40" width="74" height="18" fill="#b9c0c6"/>
  <text x="86" y="53" font-family="monospace" font-size="11" fill="#fff">matmul  73.0%</text>
  <text x="553" y="53" font-family="monospace" font-size="10.5" fill="#fff">attn 15.4</text>
  <text x="651" y="53" font-family="monospace" font-size="10.5" fill="#333">rest 12</text>

  <text x="0" y="96" font-family="monospace" font-size="12" fill="#1a1a1a">decode</text>
  <rect x="78" y="84" width="544" height="18" fill="#1a73e8"/>
  <rect x="622" y="84" width="54" height="18" fill="#c2410c"/>
  <rect x="676" y="84" width="44" height="18" fill="#b9c0c6"/>
  <text x="86" y="97" font-family="monospace" font-size="11" fill="#fff">matmul  84.7%</text>
  <text x="628" y="97" font-family="monospace" font-size="10.5" fill="#fff">8.4</text>
  <text x="681" y="97" font-family="monospace" font-size="10.5" fill="#333">6.9</text>

  <line x1="78" y1="118" x2="720" y2="118" stroke="#d8dcdf"/>
  <text x="78" y="136" font-family="monospace" font-size="10.5" fill="#666">0%</text>
  <text x="383" y="136" font-family="monospace" font-size="10.5" fill="#666">50%</text>
  <text x="694" y="136" font-family="monospace" font-size="10.5" fill="#666">100%</text>
  <text x="0" y="158" font-family="monospace" font-size="10.5" fill="#666">Nsight Systems, RTX 4060 Laptop, Qwen2.5-0.5B. "matmul" is the GEMM kernels (cuBLAS/CUTLASS);</text>
  <text x="0" y="170" font-family="monospace" font-size="10.5" fill="#666">"attn" is FlashAttention; "rest" is RMSNorm, SiLU, sampling and KV-cache writes.</text>
</svg>
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
bytes per second from its main memory. Those numbers are off by a factor of 123.

So: a GPU is an enormous arithmetic engine attached to a memory system that
cannot possibly keep it fed. Every optimization in this post is a trick for
getting more arithmetic out of each byte you fetch.

The memory system isn't one thing, though. It's a hierarchy, and the levels are
wildly different:

<figure>
<svg viewBox="0 0 740 262" role="img" aria-label="GPU memory hierarchy: size, bandwidth and latency at each level">
  <text x="0" y="14" font-family="monospace" font-size="11" fill="#666">WHERE DATA CAN LIVE &#183; RTX 4060 LAPTOP (sm_89)</text>
  <text x="128" y="36" font-family="monospace" font-size="10" fill="#666">SIZE</text>
  <text x="228" y="36" font-family="monospace" font-size="10" fill="#666">BANDWIDTH (log scale)</text>
  <text x="640" y="36" font-family="monospace" font-size="10" fill="#666">LATENCY</text>

  <!-- registers -->
  <rect x="0" y="46" width="118" height="34" fill="#15803d"/>
  <text x="8" y="67" font-family="monospace" font-size="11.5" fill="#fff">registers</text>
  <text x="128" y="67" font-family="monospace" font-size="11" fill="#333">256 KB/SM</text>
  <rect x="228" y="54" width="392" height="18" fill="#15803d"/>
  <text x="236" y="67" font-family="monospace" font-size="11" fill="#fff">~100 TB/s</text>
  <text x="640" y="67" font-family="monospace" font-size="11" fill="#333">~1 cycle</text>

  <!-- shared -->
  <rect x="0" y="92" width="118" height="34" fill="#1a73e8"/>
  <text x="8" y="113" font-family="monospace" font-size="11.5" fill="#fff">shared mem</text>
  <text x="128" y="113" font-family="monospace" font-size="11" fill="#333">100 KB/SM</text>
  <rect x="228" y="100" width="300" height="18" fill="#1a73e8"/>
  <text x="236" y="113" font-family="monospace" font-size="11" fill="#fff">~12 TB/s</text>
  <text x="640" y="113" font-family="monospace" font-size="11" fill="#333">~30 cycles</text>

  <!-- L2 -->
  <rect x="0" y="138" width="118" height="34" fill="#6b8ea8"/>
  <text x="8" y="159" font-family="monospace" font-size="11.5" fill="#fff">L2 cache</text>
  <text x="128" y="159" font-family="monospace" font-size="11" fill="#333">32 MB</text>
  <rect x="228" y="146" width="196" height="18" fill="#6b8ea8"/>
  <text x="236" y="159" font-family="monospace" font-size="11" fill="#fff">~2 TB/s</text>
  <text x="640" y="159" font-family="monospace" font-size="11" fill="#333">~200 cycles</text>

  <!-- DRAM -->
  <rect x="0" y="184" width="118" height="34" fill="#c2410c"/>
  <text x="8" y="205" font-family="monospace" font-size="11.5" fill="#fff">DRAM</text>
  <text x="128" y="205" font-family="monospace" font-size="11" fill="#333">8 GB</text>
  <rect x="228" y="192" width="92" height="18" fill="#c2410c"/>
  <text x="236" y="205" font-family="monospace" font-size="11" fill="#fff">227 GB/s</text>
  <text x="640" y="205" font-family="monospace" font-size="11" fill="#333">~400 cycles</text>

  <line x1="228" y1="228" x2="620" y2="228" stroke="#d8dcdf"/>
  <text x="0" y="252" font-family="monospace" font-size="10.5" fill="#666">Register and shared-memory bandwidths are aggregate across all 24 SMs. Latencies are rough; the ratios are what matter.</text>
</svg>
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
<svg viewBox="0 0 740 286" role="img" aria-label="Naive kernel memory access: one warp reads 32 different rows of A">
  <text x="0" y="14" font-family="monospace" font-size="11" fill="#666">MATRIX A IN MEMORY (ROW-MAJOR) &#183; WHAT ONE WARP TOUCHES IN ONE ITERATION</text>

  <!-- rows of A -->
  <g>
    <text x="0" y="46" font-family="monospace" font-size="10.5" fill="#666">row 0</text>
    <rect x="52" y="34" width="600" height="14" fill="#eef1f3" stroke="#dfe3e6"/>
    <rect x="172" y="34" width="14" height="14" fill="#c2410c"/>
    <text x="664" y="46" font-family="monospace" font-size="10" fill="#c2410c">fetch 1</text>

    <text x="0" y="68" font-family="monospace" font-size="10.5" fill="#666">row 1</text>
    <rect x="52" y="56" width="600" height="14" fill="#eef1f3" stroke="#dfe3e6"/>
    <rect x="172" y="56" width="14" height="14" fill="#c2410c"/>
    <text x="664" y="68" font-family="monospace" font-size="10" fill="#c2410c">fetch 2</text>

    <text x="0" y="90" font-family="monospace" font-size="10.5" fill="#666">row 2</text>
    <rect x="52" y="78" width="600" height="14" fill="#eef1f3" stroke="#dfe3e6"/>
    <rect x="172" y="78" width="14" height="14" fill="#c2410c"/>
    <text x="664" y="90" font-family="monospace" font-size="10" fill="#c2410c">fetch 3</text>

    <text x="0" y="112" font-family="monospace" font-size="10.5" fill="#666">row 3</text>
    <rect x="52" y="100" width="600" height="14" fill="#eef1f3" stroke="#dfe3e6"/>
    <rect x="172" y="100" width="14" height="14" fill="#c2410c"/>
    <text x="664" y="112" font-family="monospace" font-size="10" fill="#c2410c">fetch 4</text>

    <text x="76" y="132" font-family="monospace" font-size="12" fill="#999">&#8942;</text>
    <text x="176" y="132" font-family="monospace" font-size="12" fill="#c2410c">&#8942;</text>

    <text x="0" y="156" font-family="monospace" font-size="10.5" fill="#666">row 31</text>
    <rect x="52" y="144" width="600" height="14" fill="#eef1f3" stroke="#dfe3e6"/>
    <rect x="172" y="144" width="14" height="14" fill="#c2410c"/>
    <text x="664" y="156" font-family="monospace" font-size="10" fill="#c2410c">fetch 32</text>
  </g>

  <text x="52" y="178" font-family="monospace" font-size="10.5" fill="#666">&#8592; one row = K floats (3584 bytes for K=896) &#8594;</text>

  <!-- what the hardware moves -->
  <text x="0" y="214" font-family="monospace" font-size="11" fill="#666">WHAT THE HARDWARE ACTUALLY MOVES</text>
  <rect x="0" y="224" width="720" height="26" fill="#fbeae4" stroke="#e8c4b4"/>
  <g font-family="monospace" font-size="10">
    <rect x="6" y="230" width="20" height="14" fill="#c2410c"/><text x="30" y="241" fill="#7a2d0c">32 B sector</text>
    <rect x="118" y="230" width="20" height="14" fill="#c2410c"/><text x="142" y="241" fill="#7a2d0c">32 B sector</text>
    <rect x="230" y="230" width="20" height="14" fill="#c2410c"/><text x="254" y="241" fill="#7a2d0c">32 B sector</text>
    <text x="342" y="241" fill="#7a2d0c">&#8230; 32 of them, and 31/32 of every one is thrown away</text>
  </g>
  <text x="0" y="274" font-family="monospace" font-size="10.5" fill="#666">Measured: 0.112 TFLOPS, ~15 GB/s of useful bandwidth out of 227 GB/s available.</text>
</svg>
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
*column* instead. That's the entire change:

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
<svg viewBox="0 0 740 250" role="img" aria-label="Coalesced access: one warp reads one contiguous run of B">
  <text x="0" y="14" font-family="monospace" font-size="11" fill="#666">SAME WARP, AFTER THE SWAP &#183; MATRIX B, ROW k</text>

  <rect x="52" y="34" width="600" height="18" fill="#eef1f3" stroke="#dfe3e6"/>
  <rect x="172" y="34" width="128" height="18" fill="#15803d"/>
  <text x="0" y="47" font-family="monospace" font-size="10.5" fill="#666">row k</text>
  <text x="180" y="47" font-family="monospace" font-size="10" fill="#fff">32 adjacent floats</text>
  <text x="664" y="47" font-family="monospace" font-size="10" fill="#15803d">1 fetch</text>

  <line x1="172" y1="58" x2="172" y2="74" stroke="#15803d"/>
  <line x1="300" y1="58" x2="300" y2="74" stroke="#15803d"/>
  <line x1="172" y1="74" x2="300" y2="74" stroke="#15803d"/>
  <text x="176" y="88" font-family="monospace" font-size="10" fill="#15803d">128 bytes = exactly one memory transaction</text>

  <text x="0" y="124" font-family="monospace" font-size="11" fill="#666">BYTES MOVED TO DELIVER 128 USEFUL BYTES</text>

  <text x="0" y="152" font-family="monospace" font-size="11" fill="#1a1a1a">naive</text>
  <rect x="78" y="140" width="560" height="16" fill="#c2410c"/>
  <text x="86" y="152" font-family="monospace" font-size="10.5" fill="#fff">1024 bytes &#183; 32 transactions &#183; 87.5% wasted</text>

  <text x="0" y="180" font-family="monospace" font-size="11" fill="#1a1a1a">coalesced</text>
  <rect x="78" y="168" width="70" height="16" fill="#15803d"/>
  <text x="156" y="180" font-family="monospace" font-size="10.5" fill="#15803d">128 bytes &#183; 1 transaction &#183; 0% wasted</text>

  <line x1="78" y1="198" x2="720" y2="198" stroke="#d8dcdf"/>
  <text x="0" y="224" font-family="monospace" font-size="10.5" fill="#666">Measured on o_proj (896x896), M=2048: 0.112 &#8594; 0.847 TFLOPS. Useful bandwidth 15 &#8594; 110 GB/s.</text>
  <text x="0" y="240" font-family="monospace" font-size="10.5" fill="#666">Note what did NOT change: the instruction count. Only the addresses did.</text>
</svg>
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

Each element now crosses the DRAM bus `K/BS` times instead of `K` times. With
BS=32 that's a 32x reduction in traffic.

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
<svg viewBox="0 0 740 300" role="img" aria-label="Register outer product: 16 loads produce 64 fused multiply-adds">
  <text x="0" y="14" font-family="monospace" font-size="11" fill="#666">ONE THREAD, ONE STEP OF k &#183; TM=TN=8</text>

  <!-- regM column -->
  <text x="6" y="46" font-family="monospace" font-size="10.5" fill="#1a73e8">regM</text>
  <text x="0" y="60" font-family="monospace" font-size="9.5" fill="#666">8 from As</text>
  <g fill="#1a73e8">
    <rect x="52" y="72" width="22" height="22"/><rect x="52" y="96" width="22" height="22"/>
    <rect x="52" y="120" width="22" height="22"/><rect x="52" y="144" width="22" height="22"/>
    <rect x="52" y="168" width="22" height="22"/><rect x="52" y="192" width="22" height="22"/>
    <rect x="52" y="216" width="22" height="22"/><rect x="52" y="240" width="22" height="22"/>
  </g>

  <!-- regN row -->
  <text x="90" y="46" font-family="monospace" font-size="10.5" fill="#c2410c">regN &#183; 8 from Bs</text>
  <g fill="#c2410c">
    <rect x="86" y="50" width="22" height="16"/><rect x="110" y="50" width="22" height="16"/>
    <rect x="134" y="50" width="22" height="16"/><rect x="158" y="50" width="22" height="16"/>
    <rect x="182" y="50" width="22" height="16"/><rect x="206" y="50" width="22" height="16"/>
    <rect x="230" y="50" width="22" height="16"/><rect x="254" y="50" width="22" height="16"/>
  </g>

  <!-- 8x8 accumulator grid -->
  <g fill="#15803d" opacity="0.88">
    <rect x="86" y="72" width="190" height="190"/>
  </g>
  <g stroke="#fff" stroke-width="1">
    <line x1="110" y1="72" x2="110" y2="262"/><line x1="134" y1="72" x2="134" y2="262"/>
    <line x1="158" y1="72" x2="158" y2="262"/><line x1="182" y1="72" x2="182" y2="262"/>
    <line x1="206" y1="72" x2="206" y2="262"/><line x1="230" y1="72" x2="230" y2="262"/>
    <line x1="254" y1="72" x2="254" y2="262"/>
    <line x1="86" y1="96" x2="276" y2="96"/><line x1="86" y1="120" x2="276" y2="120"/>
    <line x1="86" y1="144" x2="276" y2="144"/><line x1="86" y1="168" x2="276" y2="168"/>
    <line x1="86" y1="192" x2="276" y2="192"/><line x1="86" y1="216" x2="276" y2="216"/>
    <line x1="86" y1="240" x2="276" y2="240"/>
  </g>
  <text x="300" y="150" font-family="monospace" font-size="12" fill="#15803d">64 accumulators, all in registers</text>
  <text x="300" y="168" font-family="monospace" font-size="12" fill="#15803d">64 FMAs from 16 loaded values</text>

  <text x="300" y="206" font-family="monospace" font-size="11" fill="#666">loads per FMA:</text>
  <text x="300" y="224" font-family="monospace" font-size="11" fill="#c2410c">rung 3 (one output/thread) &#8594; 2.00</text>
  <text x="300" y="242" font-family="monospace" font-size="11" fill="#1a73e8">rung 4 (8x1 per thread)   &#8594; 1.13</text>
  <text x="300" y="260" font-family="monospace" font-size="11" fill="#15803d">rung 5 (8x8 per thread)   &#8594; 0.25</text>

  <text x="0" y="292" font-family="monospace" font-size="10.5" fill="#666">Measured: 1.121 &#8594; 3.712 &#8594; 4.695 TFLOPS. The accumulators never touch memory at all until the very end.</text>
</svg>
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
<svg viewBox="0 0 740 216" role="img" aria-label="Transposing As so shared-memory reads become vectorizable">
  <text x="0" y="14" font-family="monospace" font-size="11" fill="#666">THE 8 VALUES ONE THREAD NEEDS FROM As</text>

  <text x="0" y="40" font-family="monospace" font-size="11" fill="#c2410c">As stored [BM][BK]</text>
  <g>
    <rect x="150" y="28" width="340" height="14" fill="#eef1f3" stroke="#dfe3e6"/>
    <rect x="150" y="44" width="340" height="14" fill="#eef1f3" stroke="#dfe3e6"/>
    <rect x="150" y="60" width="340" height="14" fill="#eef1f3" stroke="#dfe3e6"/>
    <rect x="150" y="76" width="340" height="14" fill="#eef1f3" stroke="#dfe3e6"/>
    <rect x="192" y="28" width="12" height="14" fill="#c2410c"/>
    <rect x="192" y="44" width="12" height="14" fill="#c2410c"/>
    <rect x="192" y="60" width="12" height="14" fill="#c2410c"/>
    <rect x="192" y="76" width="12" height="14" fill="#c2410c"/>
  </g>
  <text x="504" y="58" font-family="monospace" font-size="10.5" fill="#c2410c">stride BK apart &#8594; 8 x LDS.32</text>

  <text x="0" y="134" font-family="monospace" font-size="11" fill="#15803d">As stored [BK][BM]</text>
  <rect x="150" y="122" width="340" height="14" fill="#eef1f3" stroke="#dfe3e6"/>
  <rect x="192" y="122" width="48" height="14" fill="#15803d"/>
  <text x="504" y="134" font-family="monospace" font-size="10.5" fill="#15803d">contiguous &#8594; 2 x LDS.128</text>

  <line x1="0" y1="166" x2="720" y2="166" stroke="#d8dcdf"/>
  <text x="0" y="190" font-family="monospace" font-size="10.5" fill="#666">Transposing costs 4 scalar SMEM writes at load time, once per tile, and saves 6 SMEM reads per thread per k step.</text>
  <text x="0" y="206" font-family="monospace" font-size="10.5" fill="#666">Measured: 4.695 &#8594; 7.252 TFLOPS.</text>
</svg>
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

That is rung 8, and it's where I hit the result I did not expect.

Boehm's worklog tunes on an A6000: 84 SMs, a serious datacentre card. I have 24
SMs in a laptop. I took his configuration verbatim, then let an autotuner search
188 valid configurations of the *same kernel* on my GPU. Same code. Only the
template parameters differ.

<figure>
<svg viewBox="0 0 740 262" role="img" aria-label="Same warptiling kernel, A6000 config versus retuned for 24 SMs">
  <text x="0" y="14" font-family="monospace" font-size="11" fill="#666">SAME KERNEL, DIFFERENT TILE PARAMETERS &#183; TFLOPS</text>

  <g font-family="monospace" font-size="10.5">
    <text x="0" y="44" fill="#1a1a1a">qkv_proj  M=128</text>
    <rect x="132" y="32" width="93" height="15" fill="#9aa4ab"/><text x="231" y="44" fill="#666">1.854  A6000 config</text>
    <rect x="132" y="49" width="177" height="15" fill="#15803d"/><text x="315" y="61" fill="#15803d">3.547  retuned &#8594; +91%</text>

    <text x="0" y="98" fill="#1a1a1a">o_proj    M=128</text>
    <rect x="132" y="86" width="72" height="15" fill="#9aa4ab"/><text x="210" y="98" fill="#666">1.442</text>
    <rect x="132" y="103" width="138" height="15" fill="#15803d"/><text x="276" y="115" fill="#15803d">2.764  +92%</text>

    <text x="0" y="152" fill="#1a1a1a">down_proj M=128</text>
    <rect x="132" y="140" width="82" height="15" fill="#9aa4ab"/><text x="220" y="152" fill="#666">1.631</text>
    <rect x="132" y="157" width="155" height="15" fill="#15803d"/><text x="293" y="169" fill="#15803d">3.103  +90%</text>

    <text x="0" y="206" fill="#1a1a1a">lm_head   M=128</text>
    <rect x="132" y="194" width="380" height="15" fill="#9aa4ab"/><text x="518" y="206" fill="#666">7.604  A6000 config</text>
    <rect x="132" y="211" width="309" height="15" fill="#c2410c"/><text x="447" y="223" fill="#c2410c">6.182  retuned &#8594; &#8722;19%</text>
  </g>

  <line x1="132" y1="238" x2="720" y2="238" stroke="#d8dcdf"/>
  <text x="0" y="256" font-family="monospace" font-size="10.5" fill="#666">A6000 config: 128x128 block tile, 128 accumulators/thread. Retuned winners on 24 SMs: 64x64 and 32x128, 32 accumulators.</text>
</svg>
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
<svg viewBox="0 0 740 190" role="img" aria-label="Single versus double buffered K loop timeline">
  <text x="0" y="14" font-family="monospace" font-size="11" fill="#666">TIME &#8594;</text>

  <text x="0" y="46" font-family="monospace" font-size="11" fill="#1a1a1a">single</text>
  <g font-family="monospace" font-size="9.5">
    <rect x="66" y="34" width="86" height="16" fill="#c2410c"/><text x="74" y="46" fill="#fff">load i</text>
    <rect x="152" y="34" width="20" height="16" fill="#9aa4ab"/>
    <rect x="172" y="34" width="60" height="16" fill="#15803d"/><text x="180" y="46" fill="#fff">math i</text>
    <rect x="232" y="34" width="86" height="16" fill="#c2410c"/><text x="240" y="46" fill="#fff">load i+1</text>
    <rect x="318" y="34" width="20" height="16" fill="#9aa4ab"/>
    <rect x="338" y="34" width="60" height="16" fill="#15803d"/><text x="346" y="46" fill="#fff">math i+1</text>
    <rect x="398" y="34" width="86" height="16" fill="#c2410c"/><text x="406" y="46" fill="#fff">load i+2</text>
  </g>

  <text x="0" y="90" font-family="monospace" font-size="11" fill="#1a1a1a">double</text>
  <g font-family="monospace" font-size="9.5">
    <rect x="66" y="78" width="86" height="16" fill="#c2410c"/><text x="74" y="90" fill="#fff">load i</text>
    <rect x="152" y="78" width="60" height="16" fill="#15803d"/><text x="160" y="90" fill="#fff">math i</text>
    <rect x="152" y="96" width="86" height="16" fill="#c2410c" opacity="0.55"/><text x="160" y="108" fill="#7a2d0c">load i+1 (overlapped)</text>
    <rect x="212" y="78" width="60" height="16" fill="#15803d"/><text x="220" y="90" fill="#fff">math i+1</text>
    <rect x="212" y="96" width="86" height="16" fill="#c2410c" opacity="0.55"/>
    <rect x="272" y="78" width="60" height="16" fill="#15803d"/><text x="280" y="90" fill="#fff">math i+2</text>
  </g>

  <text x="0" y="146" font-family="monospace" font-size="10.5" fill="#666">The loads do not get faster. They stop being on the critical path.</text>
  <text x="0" y="164" font-family="monospace" font-size="10.5" fill="#666">Measured: 7.591 &#8594; 8.115 TFLOPS &#183; 97.9% of cuBLAS on this shape.</text>
</svg>
<figcaption>Double buffering doesn't make anything faster; it makes the waiting
happen somewhere else. Worth the last <b>7%</b>, which takes us to 97.9% of
cuBLAS.</figcaption>
</figure>

## 10. The ladder

Here is every rung, on one shape, measured with the candidate and cuBLAS timed
alternately in the same process so neither gets a thermal advantage.

<figure>
<svg viewBox="0 0 740 320" role="img" aria-label="All nine kernel versions, TFLOPS, against cuBLAS">
  <text x="0" y="14" font-family="monospace" font-size="11" fill="#666">o_proj (896x896), M=2048, fp32 &#183; TFLOPS</text>
  <line x1="196" y1="24" x2="700" y2="24" stroke="#d8dcdf"/>
  <text x="196" y="20" font-family="monospace" font-size="9.5" fill="#999">0</text>
  <text x="440" y="20" font-family="monospace" font-size="9.5" fill="#999">4</text>
  <text x="684" y="20" font-family="monospace" font-size="9.5" fill="#999">8</text>

  <g font-family="monospace" font-size="10.5">
    <text x="0" y="44" fill="#1a1a1a">1  naive</text>
    <rect x="196" y="34" width="7" height="14" fill="#c2410c"/><text x="209" y="45" fill="#666">0.112</text>
    <text x="0" y="66" fill="#1a1a1a">2  coalesce</text>
    <rect x="196" y="56" width="53" height="14" fill="#c2410c"/><text x="255" y="67" fill="#666">0.847</text>
    <text x="0" y="88" fill="#1a1a1a">3  shared mem</text>
    <rect x="196" y="78" width="71" height="14" fill="#c2410c"/><text x="273" y="89" fill="#666">1.121</text>
    <text x="0" y="110" fill="#1a1a1a">4  1D blocktile</text>
    <rect x="196" y="100" width="234" height="14" fill="#e08a3c"/><text x="436" y="111" fill="#666">3.712</text>
    <text x="0" y="132" fill="#1a1a1a">5  2D blocktile</text>
    <rect x="196" y="122" width="296" height="14" fill="#e08a3c"/><text x="498" y="133" fill="#666">4.695</text>
    <text x="0" y="154" fill="#1a1a1a">6  vectorize</text>
    <rect x="196" y="144" width="457" height="14" fill="#1a73e8"/><text x="659" y="155" fill="#666">7.252</text>
    <text x="0" y="176" fill="#1a1a1a">7  warptile (A6000)</text>
    <rect x="196" y="166" width="447" height="14" fill="#9aa4ab"/><text x="649" y="177" fill="#666">7.089</text>
    <text x="0" y="198" fill="#1a1a1a">8  warptile (tuned)</text>
    <rect x="196" y="188" width="478" height="14" fill="#1a73e8"/><text x="680" y="199" fill="#666">7.591</text>
    <text x="0" y="220" fill="#1a1a1a">9  + double buffer</text>
    <rect x="196" y="210" width="511" height="14" fill="#15803d"/><text x="713" y="221" fill="#15803d">8.115</text>
  </g>

  <line x1="708" y1="30" x2="708" y2="238" stroke="#1a1a1a" stroke-dasharray="3 3"/>
  <text x="600" y="252" font-family="monospace" font-size="10.5" fill="#1a1a1a">cuBLAS 8.138</text>

  <text x="0" y="280" font-family="monospace" font-size="11" fill="#15803d">72.8x from rung 1 to rung 9. 97.9% of cuBLAS.</text>
  <text x="0" y="300" font-family="monospace" font-size="10.5" fill="#666">Also: a sustained fp32 GEMM on this GPU measured 7.02 TFLOPS earlier in the project, and both cuBLAS and rung 9 beat it here,</text>
  <text x="0" y="314" font-family="monospace" font-size="10.5" fill="#666">because that 7.02 was itself measured under sustained load, while these bursts run at a higher clock.</text>
</svg>
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
it is 84.7% of the time in the profile we started with.

So I ran the same nine kernels at M=1.

<figure>
<svg viewBox="0 0 740 258" role="img" aria-label="The same nine kernels at M=1, where the ladder inverts">
  <text x="0" y="14" font-family="monospace" font-size="11" fill="#666">o_proj (896x896), M=1 &#183; TFLOPS &#183; SAME NINE KERNELS</text>
  <line x1="196" y1="24" x2="700" y2="24" stroke="#d8dcdf"/>
  <text x="196" y="20" font-family="monospace" font-size="9.5" fill="#999">0</text>
  <text x="440" y="20" font-family="monospace" font-size="9.5" fill="#999">0.16</text>
  <text x="674" y="20" font-family="monospace" font-size="9.5" fill="#999">0.32</text>

  <g font-family="monospace" font-size="10.5">
    <text x="0" y="44" fill="#1a1a1a">1  naive</text>
    <rect x="196" y="34" width="25" height="14" fill="#9aa4ab"/><text x="227" y="45" fill="#666">0.016</text>
    <text x="0" y="66" fill="#1a1a1a">2  coalesce</text>
    <rect x="196" y="56" width="46" height="14" fill="#1a73e8"/><text x="248" y="67" fill="#1a73e8">0.029</text>
    <text x="0" y="88" fill="#1a1a1a">3  shared mem</text>
    <rect x="196" y="78" width="31" height="14" fill="#9aa4ab"/><text x="233" y="89" fill="#666">0.020</text>
    <text x="0" y="110" fill="#1a1a1a">4  1D blocktile</text>
    <rect x="196" y="100" width="39" height="14" fill="#9aa4ab"/><text x="241" y="111" fill="#666">0.025</text>
    <text x="0" y="132" fill="#1a1a1a">5  2D blocktile</text>
    <rect x="196" y="122" width="16" height="14" fill="#c2410c"/><text x="218" y="133" fill="#c2410c">0.010  &#8592; slower than rung 2</text>
    <text x="0" y="154" fill="#1a1a1a">6  vectorize</text>
    <rect x="196" y="144" width="22" height="14" fill="#c2410c"/><text x="224" y="155" fill="#666">0.014</text>
    <text x="0" y="176" fill="#1a1a1a">9  + double buffer</text>
    <rect x="196" y="166" width="58" height="14" fill="#1a73e8"/><text x="260" y="177" fill="#666">0.037</text>
  </g>

  <line x1="690" y1="30" x2="690" y2="194" stroke="#1a1a1a" stroke-dasharray="3 3"/>
  <text x="560" y="208" font-family="monospace" font-size="10.5" fill="#1a1a1a">cuBLAS 0.314</text>

  <text x="0" y="234" font-family="monospace" font-size="11" fill="#c2410c">The best kernel of the nine reaches 11.7% of cuBLAS. The ladder has inverted.</text>
  <text x="0" y="252" font-family="monospace" font-size="10.5" fill="#666">Rung 5 &#8212; the register outer product, the idea that unlocked everything at M=2048 &#8212; is now 3x slower than rung 2.</text>
</svg>
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
