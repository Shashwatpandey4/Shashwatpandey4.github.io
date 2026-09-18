title: CUDA GEMM, Part 4: What the Compiler Generates
date: September 10, 2026
author: Shashwat Pandey

---

*Part 4 of 4. [Part 1](blog.html?post=cuda_gemm) built a matmul kernel through
nine rungs to 8.1 TFLOPS. [Part 2](blog.html?post=decode_roofline) showed decode
is bandwidth-bound and catalogued six ways my benchmarks lied.
[Part 3](blog.html?post=w8a16_vllm) got +39.7% in vLLM with a hand-written int8
kernel. This part writes the same kernels in Triton, reads every level of IR the
compiler produces, and finds that a 43-line kernel matches or beats the 135-line
one on 8 of 10 shapes — for a reason that is not the one I expected.*

## 1. Two front-ends, one backend

Parts 1 through 3 were about bytes. This one is about what my source code
actually becomes.

Before anything else, an honest correction to the premise. I set out to write
about "LLVM optimizations," and for CUDA that phrase is only half true:

<figure>
{{svg:two_frontends}}
<figcaption>Two front-ends that meet in the middle. The <code>.cu</code> path
goes through NVVM, which <i>is</i> LLVM. The Triton path goes through two levels
of MLIR first, then LLVM. Both then hand PTX to <code>ptxas</code>, which is
closed-source and not LLVM at all. Where the interesting decisions live is the
question §7 answers, and the answer surprised me.</figcaption>
</figure>

Everything below is measured on the same RTX 4060 Laptop and the same five
projections of Qwen2.5-0.5B as the rest of the series [4]. Triton 3.7.1, torch
2.13.0, clang 18.1.3, nvcc 12.8.

## 2. The same GEMM, in 43 lines

Here is the whole int8 kernel — the Triton equivalent of Part 3's `mma.sync`
work:

```python
@triton.jit
def _gemm_w8a16(A, B, S, C, M, N, K, sam, sak, sbk, sbn, ssg, ssn, scm, scn,
                BM: tl.constexpr, BN: tl.constexpr, BK: tl.constexpr,
                G: tl.constexpr, GROUP_M: tl.constexpr):
    pid = tl.program_id(0)
    # ... grouped program ordering elided ...
    rm = (pid_m * BM + tl.arange(0, BM)) % M
    rn = (pid_n * BN + tl.arange(0, BN)) % N
    rk = tl.arange(0, BK)
    pa = A + (rm[:, None] * sam + rk[None, :] * sak)
    pb = B + (rk[:, None] * sbk + rn[None, :] * sbn)

    acc = tl.zeros((BM, BN), dtype=tl.float32)
    for k in range(0, tl.cdiv(K, BK)):
        m = rk[None, :] < K - k * BK
        a = tl.load(pa, mask=m, other=0.0)
        q = tl.load(pb, mask=m.T, other=0)
        s = tl.load(S + k * ssg + rn * ssn)
        w = (q.to(tl.float32) * s[None, :]).to(tl.bfloat16)
        acc = tl.dot(a, w, acc)
        pa += BK * sak
        pb += BK * sbk
    # ... masked store elided ...
```

There is no `ldmatrix`, no `mma.sync`, no `cp.async`, no fragment layout, no
wait-group bookkeeping. **43 non-comment lines against kb8's 135**, and kb8 also
needs a shared header of `cp.async` helpers and a config dispatch table on top.

The obvious question is what that costs. The answer needs four levels of IR, so
let's read them.

## 3. Level 1 — Triton IR: what you wrote, made explicit

Setting `TRITON_KERNEL_DUMP=1` gets you every stage on disk [1]: `ttir`,
`ttgir`, `llir`, `ptx` and the disassembled `sass`. The first is almost a
transcript of the source:

```
%12 = tt.splat %arg0 : !tt.ptr<bf16> -> tensor<16x128x!tt.ptr<bf16>>
%13 = tt.addptr %12, %11 : tensor<16x128x!tt.ptr<bf16>>, tensor<16x128xi32>
%14 = tt.load %13, %mask, %other : tensor<16x128x!tt.ptr<bf16>>
%15 = tt.dot %14, %20, %acc : tensor<16x128xbf16> * tensor<128x64xbf16>
```

Pointer arithmetic made explicit, tensors still whole tensors, `tt.dot` still a
single abstract operation. There is no notion of a warp, a thread, shared
memory, or a fragment. Nothing about the machine has been decided.

It is the least interesting level, and that is exactly why it is worth looking
at: it establishes that none of Part 1 is in the source. Whatever appears next
was the compiler's idea.

## 4. Level 2 — TritonGPU IR, where the rungs appear

One pass later the picture changes completely. TritonGPU IR attaches a *layout*
to every tensor — which thread holds which element — and rewrites the loop
around it.

<figure>
{{svg:ttgir_layout}}
<figcaption>A TritonGPU blocked layout, and the four Part 1 optimizations
encoded in its parameters. <code>order = [1,0]</code> is coalescing:
consecutive threads take consecutive columns. <code>sizePerThread</code> is the
register tile. <code>warpsPerCTA</code> is warptiling. And the layout is what
lets the compiler emit a vectorized load at all.</figcaption>
</figure>

The loop body changes too. `ttg.local_alloc` appears — shared memory, which the
source never mentions. So does `ttg.async_copy_global_to_local`, six of them,
with matching `ttg.async_commit_group` and `ttg.async_wait`.

That is `cp.async` multi-stage pipelining: the thing Part 2 §8 spent a whole
template-recursion helper on, and then got subtly wrong twice. Part 2's Lie 5
was a tail race in exactly this machinery — `cp.async.wait_group N` permits N
outstanding copies, and on the last tile the one still permitted is the buffer
about to be read. That bug cannot occur here, because I am not the one writing
the wait-group arithmetic. The compiler derives the whole schedule from one
argument, `num_stages=3`.

That is worth saying plainly: **the single hardest bug in Parts 1–3 was in code
that a compiler will now write for me, correctly, from an integer.**

## 5. The scorecard

So: how much of Part 1 did I need to write?

<figure>
{{svg:scorecard}}
<figcaption>Every optimization rung of Part 1's ladder, against the TritonGPU IR
evidence that the compiler generated it unasked. <b>All of them.</b> Rung 1 is
the naive baseline and rung 7 was the mis-tuned A6000 config, so the mechanism
behind every rung that actually bought something is in that IR — from a kernel
whose source mentions none of them.</figcaption>
</figure>

I want to be careful about what this does and does not say. It does not say the
compiler is as good as a human at these — §14 shows it is not. It says the
*ideas* are no longer where the work is. Coalescing, shared-memory staging,
register blocking, vectorization, warptiling and double buffering are all
compiler features now, and a person writing a GEMM in 2026 spends their time
somewhere else.

One thing is left to the human: **the tile shape.** `BM`, `BN`, `BK`,
`num_warps`, `num_stages` are still arguments. Hold that thought until §15,
because it turns out to be the whole ballgame.

## 6. Why nvcc couldn't do rung 6

Part 1 rung 6 replaced four scalar loads with one `float4` and got a large win.
I framed it then as "telling the compiler the loads are wide," and left open why
the compiler needed telling.

The TritonGPU IR contains the answer, nine times:

```
tt.divisibility = 16 : i32
```

<figure>
{{svg:divisibility}}
<figcaption>The same optimization, two compilers, different information. nvcc
compiles ahead of time and cannot know whether a pointer is 16-byte aligned, so
it must assume the worst and emit scalar loads. Triton is a JIT: it inspects the
actual pointer at launch, specialises the kernel on divisibility-by-16, and
vectorizes freely. The compiler was never dumber than me — it was working with
less information.</figcaption>
</figure>

That is a genuinely satisfying resolution to a question Part 1 left hanging, and
it generalises past this example: **a large fraction of what a JIT "optimizes
better" is really just knowing more at the moment it compiles.**

## 7. Level 3 — LLVM IR, and the thin waist

Now the level the post is named after. Both paths produce LLVM IR, so I compiled
kb8 with clang's NVPTX backend [3] and compared the same stage.

clang handles the hand-written kernels without complaint, `wmma`, `mma.sync`,
inline asm and all — `tune_mma.cu` expands to 158,550 lines of LLVM IR across
156 kernel instantiations. Reduced to one instantiation, kb8 is 707 lines, and
its tensor-core work appears as this:

```llvm
call { float, float, float, float } asm sideeffect
  "mma.sync.aligned.m16n8k16.row.col.f32.bf16.bf16.f32 ...", ...
call { i32, i32, i32, i32 } asm sideeffect
  "ldmatrix.sync.aligned.m8n8.x4.shared.b16 ...", ...
```

`asm sideeffect`. Opaque strings. LLVM cannot see inside them, cannot reorder
them meaningfully, cannot fold anything through them, cannot prove anything
about their operands. As far as LLVM's own pass pipeline is concerned, the hot
loop of this kernel is a black box with register constraints attached.

And Triton's `llir` at the same level? The same thing. Eight
`mma.sync.aligned.m16n8k16...` inline asm blocks, plus fourteen `cp.async`
blocks, with NVVM *intrinsics* only for the cheap bookkeeping:
`llvm.nvvm.cp.async.commit.group` × 7 and `llvm.nvvm.cp.async.wait.group` × 3.
So Triton is marginally more transparent to LLVM than the hand-written kernel —
its commit/wait calls are real intrinsics that LLVM understands — but the
arithmetic that matters is opaque in both.

Which means the passes I went in expecting to watch fire — SLP vectorization,
LICM, loop unrolling on the K loop — are not where this kernel's performance
comes from. They have already been rendered unnecessary by the MLIR layer, or
they cannot see the code that matters.

<figure>
{{svg:thin_waist}}
<figcaption>Where the decisions actually get made. Layout, coalescing,
pipelining and fragment assignment are settled <b>above</b> LLVM, in MLIR.
Scheduling, register allocation and spilling are settled <b>below</b> it, in
ptxas. LLVM's own passes see a function whose hot loop is opaque inline asm, and
optimize around the edges. For this workload LLVM is a thin waist, and a post
titled "LLVM optimizations" has to say so.</figcaption>
</figure>

This is the correction the scoping conversation anticipated, now with evidence.
If you want to understand GPU matmul codegen, learn MLIR layouts and read
`ptxas -v`. LLVM IR is where you confirm what the layer above decided.

## 8. Level 4 — PTX and SASS: one missing instruction

Down one more level, the comparison gets sharp. Same shape, same tile config,
same group size — Triton versus hand-written, counted in PTX and again in the
disassembled SASS [2]:

<figure>
{{svg:instr_table}}
<figcaption>Identical tensor-core work — <b>8 <code>mma.sync</code> in PTX and 8
<code>HMMA</code> in SASS on both sides.</b> The compiler independently chose
the same instruction I hand-picked in Part 3. But kb8 issues 8
<code>ldmatrix</code> / <code>LDSM</code> to feed those MMAs and Triton issues
<b>zero</b>, using ordinary shared-memory loads instead. That one missing
instruction family is the entire codegen gap, and §14 measures what it
costs.</figcaption>
</figure>

I did not expect the MMA counts to match exactly. That they do is the strongest
single piece of evidence for §5's claim: the compiler is making the same
structural choices, at the same granularity, as the hand-written kernel.

## 9. Register pressure is one division

Part 1 rung 5 gave each thread an 8×8 tile of accumulators and warned vaguely
about register pressure. Triton makes that precise, and — for the first time in
this series — **without running anything.** A compiled kernel reports
`n_regs`, `n_spills` and `shared` directly, byte-identical on every build.

Each thread owns `BM*BN/(num_warps*32)` accumulator floats. Sweeping 48 configs:

<figure>
{{svg:reg_cliff}}
<figcaption>Registers against accumulators per thread, across 48 configs.
<code>regs ≈ acc_per_thread + 35</code> until it saturates at the 255-register
budget, and spilling begins <b>exactly</b> where the accumulator alone would
exceed it: nothing at 128, 146–184 bytes at 256, 578 bytes at 512. The register
allocator is not being mysterious. It is doing a division you can do
yourself.</figcaption>
</figure>

The `+35` is not mysterious either: it is the loop's addressing state — base
pointers, the two `k` offsets, the mask, the scale pointer, the pipeline's
buffer indices — and it barely moves across the whole sweep, from 37 registers
at the smallest tile to about the same overhead at the largest.

Same shape of answer as Part 2 §8's `threads = 32N/WN`: a resource constraint
that looks like compiler magic and is actually one line of algebra. And note
what the table lets you do before writing a benchmark — rule out every config
with `BM*BN/(num_warps*32) > 128` for free, which is a third of the search
space.

## 10. And then I measured it, and it lied

Everything to here is static. The moment I started timing, Part 2 happened
again.

First measurement, eager, weights rotated past L2 exactly as Part 2 demands:
Triton reached **0.57× to 1.02×** of cuBLAS. It lost on 8 of 10 decode shapes.
Clean, reproducible, and I nearly wrote it up.

<figure>
{{svg:lie_launch}}
<figcaption>The seventh lie, in the post about compilers. Those kernels take
6–10 µs; Triton's Python launch path costs about <b>20 µs</b> and torch's about
<b>6 µs</b>. The eager column is mostly measuring the difference between two
launch paths. Capture both in a CUDA graph — which is how vLLM runs them — and
Triton goes from losing 8 of 10 to <b>winning 8 of 10</b>. And look at
<code>lm_head</code>: 1.1 ms per call, far too big for launch overhead to
matter, identical in both columns. That is the control that proves the
mechanism.</figcaption>
</figure>

This is precisely Part 3 §11 — "optimizing a kernel inside a harness that spends
69% of its time in Python measures the harness" — committed by me, one part
later, in my own benchmark. Knowing a failure mode is still not the same as
having a habit that prevents it.

## 11. And then it lied again

The first CUDA-graph version reported `gate_up` at **2.047×**. I was pleased for
about a minute, which is how long it took to divide.

<figure>
{{svg:lie_l2_again}}
<figcaption>Part 2's first lie, recommitted. Graphs pin their pointers, so my
first capture held <b>one</b> 17.4 MB weight matrix — which fits the 33.55 MB L2
— and the implied bandwidth was <b>850 GB/s on a 227 GB/s bus</b>. Physically
impossible, and the ratio looked perfectly reasonable. The fix is to capture one
kernel node per weight so the replay streams; every corrected number lands at
195–248 GB/s, which is where a pure read stream should be.</figcaption>
</figure>

What caught it was not the speedup looking wrong. It was dividing bytes by time
and comparing against a number I had measured two parts earlier. **The roofline
is a lie detector**, and that is most of what it is for.

## 12. bf16: Triton versus cuBLAS

With the harness finally honest:

<figure>
{{svg:bf16_graph}}
<figcaption>Triton against cuBLAS bf16 on the five projections, under CUDA
graphs, weights streamed. Triton wins on 8 of 10, from 1.05× to 1.37×, and ties
on the two <code>lm_head</code> rows. Effective bandwidth 195–248 GB/s against a
227 GB/s measured bus — these kernels are at the wall, which is exactly what
Part 2 said the ceiling was.</figcaption>
</figure>

A Triton kernel that a competent person writes in an afternoon beats NVIDIA's
hand-tuned library on the shapes this model actually uses during decode. That
is worth sitting with.

## 13. W8A16: 43 lines against 135

Now Part 3's kernel.

<figure>
{{svg:w8a16_three}}
<figcaption>cuBLAS bf16, hand-written kb8, and Triton W8A16, all under graphs
with weights streamed. Both int8 kernels beat cuBLAS by 1.07–2.49×, confirming
Part 3's result on a different harness. <b>Triton matches or beats the
hand-written kernel on 8 of 10 rows</b>, losing only on <code>gate_up</code>
(0.91×) and tying on <code>lm_head</code>. Sampled fp64 error is identical to
two significant figures on every row, so this is the same arithmetic on both
sides.</figcaption>
</figure>

The identical error columns matter more than the speed columns. It would be easy
to "win" here by quietly computing something cheaper; 2.0e-2 to 2.7e-2 on both
sides says the comparison is fair.

## 14. Codegen, or config?

At this point the tempting headline is "the compiler beats the human." Before
writing that I ran one more experiment, and it inverted the conclusion.

If Triton's advantage is *codegen*, it should still win when forced to use kb8's
own tile config. If the advantage is the *config*, it should collapse.

<figure>
{{svg:attribution}}
<figcaption>The same Triton kernel, run at kb8's compiled-in config. On
<code>down_proj</code> it lands at 33.6 µs against kb8's 34.0 µs — <b>1.01×,
dead level</b>, so the entire 1.65× win was a better tile choice. On
<code>gate_up</code> it lands at 71.7 µs against 39.0 µs — <b>0.54×</b>, so here
the hand-written code is genuinely and substantially better at the same config.
That is the missing <code>ldmatrix</code> from §8, priced.</figcaption>
</figure>

So the honest conclusion is the opposite of the tempting one:

> **At a fixed tile config, the hand-written kernel is equal or better — by up
> to 1.85×. Triton wins overall because trying fifty configs costs nothing,
> and hand-writing one costs a week.**

That reframes the whole post. Forty-three lines did not beat a hundred and
thirty-five because the compiler writes better code. They beat it because the
compiler made the search free, and the search is where the performance was.

## 15. What the search is worth

Which makes the config space the thing to measure.

<figure>
{{svg:search_value}}
<figcaption>24 configs per shape, timed under graphs. Three facts at once: the
search is <b>essentially free</b> (0–5 seconds, mostly compile cache); a naive
<code>BN=64, 4 warps, 3 stages</code> default is already within <b>0–10%</b> of
the best; and the <i>worst</i> config is <b>1.6× to 3.0×</b> slower. The space
matters enormously, and avoiding the cliff is trivial.</figcaption>
</figure>

There is also a small confirmation of Part 2 hiding in the winning configs.
Part 2 §8 argued that pipeline depth is the only remaining lever once thread
count is pinned, and that shapes already saturating the bus want shallow
pipelines while starved ones want deep. Triton's search, which knows nothing
about that argument, picks **2 stages for `gate_up`** (236 GB/s, at the wall)
and **4 for `down_proj`** (long K, the most reduction to hide). It disagrees
with Part 2 on `qkv` — 3 stages where the hand-written kernel wanted 6 — which
is what I would expect given the two kernels have different thread counts
entirely.

## 16. A footnote on where the scale goes

One experiment I ran expecting a result and got a non-result, which is worth
reporting for that reason.

Part 3 §4 established that a group-wise scale cannot leave the K loop. But
*where inside* the loop it lands is a free choice, and Triton makes all three
variants a one-line edit:

```python
# 0  cheapest: two roundings and a bf16 multiply
w = q.to(tl.bfloat16) * s[None, :].to(tl.bfloat16)
# 1  what kb8 does: fp32 multiply, one rounding
w = (q.to(tl.float32) * s[None, :]).to(tl.bfloat16)
# 2  most careful: exact int8->bf16, scale the fp32 partial sum
p = tl.dot(a, q.to(tl.bfloat16));  acc += p * s[None, :]
```

Variant 2 should be the most accurate: int8 → bf16 is lossless (Part 3 §3), so
the weight never rounds at all.

<figure>
{{svg:scale_modes}}
<figcaption>Sampled fp64 error for all three placements, on four projections,
against the unquantised bf16 baseline. The fp32 placement is best or tied on
three of four, and the cheap bf16 one is worst on three of four — but the whole
spread is under 1.6×, while quantisation itself costs <b>3×</b>. Where the scale
goes barely matters.</figcaption>
</figure>

That is a measurement of Part 3's claim rather than an argument for it: **all the
W8A16 error is in the quantiser, and essentially none of it is in the kernel.**
Part 3 asserted that from the bit layout of bf16; this is what it looks like
when you try to make it false on purpose and can't. The careful variant also
costs an extra $BM \times BN$ fp32 multiply-add per group, so on a
bandwidth-bound kernel it is pure loss.

## 17. What I'd reach for, and when

Four parts, and this is what I would actually tell someone starting now.

**Write it in Triton first.** You get coalescing, shared-memory staging,
register blocking, vectorization, warptiling and `cp.async` pipelining for
free, and you get them right. Then autotune, because that is where the factor of
two to three lives and it costs seconds.

**Drop to CUDA when you can name the instruction you want.** The one place the
hand-written kernel was decisively better, I can point at the reason: 8
`ldmatrix` instructions Triton never emits. "I think CUDA would be faster" is
not a reason. "Triton is not emitting `LDSM` and I can see it in the SASS" is.

**Read `ptxas -v` before you read a profiler.** Registers, spills and shared
memory are free to obtain, deterministic, and explain more than they have any
right to. This is the only chapter of this series where the numbers don't move,
and it is the cheapest evidence in it.

**The roofline is a lie detector.** It caught the 169% in Part 2 and the 850
GB/s in §11. Dividing bytes by time and comparing to a bus width you measured
once is the highest-value habit in the whole series — and it costs one division,
which is less than the time it takes to feel pleased about a number.

**Autotune before you optimize.** §15's worst config is 3× off the best on the
same kernel and the same hardware. If you have not searched the tile space, you
do not yet know whether you have a codegen problem, and every hour spent reading
IR before that point is speculative.

And the one that keeps coming back: **I walked into two of my own documented
traps while writing the post about compilers.** Part 3's launch-overhead lesson
and Part 2's L2 lesson, both of them, four weeks after writing them down. The
fix was never knowledge. It was building the check into the harness so the
mistake becomes impossible rather than merely known.

Final scoreboard, all interleaved, all streamed, all under graphs: **Triton beats
cuBLAS bf16 on 8 of 10 decode shapes (1.05–1.37×), and Triton W8A16 matches or
beats 135 lines of hand-written `mma.sync` CUDA on 8 of 10 (0.91–1.65×) at
identical numerics** — with a kernel that fits on one screen and mentions not one
of Part 1's nine rungs.

[1] Triton's IR levels and the `TRITON_KERNEL_DUMP` / `MLIR_ENABLE_DUMP` environment variables are documented in the [Triton repository](https://github.com/triton-lang/triton). The `ttgir` layout attributes are the part worth learning; everything else follows from them.
[2] `mma.sync`, `ldmatrix` and `cp.async` are specified in the [PTX ISA](https://docs.nvidia.com/cuda/parallel-thread-execution/index.html#warp-level-matrix-instructions). `LDSM` is `ldmatrix` as it appears in SASS.
[3] clang's CUDA support and the open NVPTX backend are described in the [LLVM docs](https://llvm.org/docs/NVPTXUsage.html); compiling for CUDA 12.8 with clang 18 needs `-Wno-unknown-cuda-version`, which is a version-skew warning rather than a real incompatibility.
[4] All measurements are from an RTX 4060 Laptop (sm_89, 24 SMs, 8 GB, 227 GB/s measured), Triton 3.7.1, torch 2.13.0+cu130, clang 18.1.3, nvcc 12.8. Timings use CUDA graphs with weights rotated past the 33.55 MB L2 and candidate/reference interleaved; correctness is a sampled fp64 reference scored as max error over RMS.
