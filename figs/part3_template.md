title: Moving Fewer Bytes
date: Draft
author: Shashwat Pandey

---

*Part 3 of 4. [Part 1](blog.html?post=cuda_gemm) built a matmul kernel through
nine rungs to 8.1 TFLOPS. [Part 2](blog.html?post=decode_roofline) showed that
decode is bandwidth-bound, that the +20% target sat below the physical floor,
and that a kernel worth +57% in a microbenchmark was worth +0.3% in a real
model. This part closes that gap — completely, with arithmetic — and then builds
the kernel that actually shipped: an int8 GEMM using `mma.sync` directly, and a
vLLM patch that makes the whole server 39.7% faster.*

## 1. The only lever left

Part 2 ended on a wall. Decode moves 942 MB of weights per step, the bus does
227 GB/s [4], so a perfect kernel is worth +15.2% over cuBLAS and the target was
+20%. There is nothing left to win by reading the weights *faster*.

There are exactly two ways out.

<figure>
{{svg:two_levers}}
<figcaption>The two levers on a bandwidth-bound problem. Batching amortises the
weights across more tokens (Part 2 §4) and is the serving system's decision, not
the kernel's. Quantisation makes the weights themselves smaller, and that is a
kernel problem.</figcaption>
</figure>

This part takes the second one. **W8A16**: weights stored as int8, activations
left in bf16. The weights are 87.5% of the traffic and int8 is half the size of
bf16, so the ceiling moves in a way no amount of tiling could manage.

Note what is *not* being quantised. The activations stay bf16, so every
accumulation happens in fp32 exactly as before and there is no activation
calibration, no outlier handling, no per-token scale. W8A16 is the conservative
end of quantisation, and it is where almost all of the bandwidth win lives
anyway.

## 2. What int8 buys, on the roofline

The arithmetic is short. Halve the weight bytes and the per-step traffic goes
from 1077 MB to 606 MB:

<figure>
{{svg:int8_roofline}}
<figcaption>Per-step traffic and the speedup it implies. The weights fall from
942 to 471 MB; everything else is unchanged, because activations, KV cache and
norms are all still bf16. The predicted win is <b>1.78×</b> — and that prediction
is what the rest of this post is measured against.</figcaption>
</figure>

A useful discipline from Part 2: write the prediction down *before* building the
kernel, so you find out whether you understand the problem or just built
something. My traffic-weighted estimate across all five projection shapes came
out at **1.652× at batch 1** and **1.567× at batch 16** — below the naive 1.78×
because the KV cache and activations don't shrink, and because some shapes are
too small to reach the bus at all.

## 3. Why int8 → bf16 costs nothing

The kernel has to turn each int8 weight back into something the tensor cores can
multiply. That conversion is usually where you'd expect to lose accuracy. Here it
loses exactly nothing, for a reason worth spelling out.

<figure>
{{svg:dequant_exact}}
<figcaption>bf16 carries 8 significant bits — 7 stored mantissa bits plus the
implicit leading 1 — so it represents every integer up to 256 exactly. An int8 weight spans −128…127. The int8 → bf16 conversion is
therefore <b>lossless</b>: all the error in W8A16 comes from the rounding that
happened when the weight was quantised, none from the dequantisation in the
kernel.</figcaption>
</figure>

This is a nice property of bf16 specifically. fp16 stores 10 and is also exact here, but bf16's 8 bits are *exactly* enough — which means the same
trick does not extend to int16 weights, and it is why the widely-used bit hack in
§10 works at all.

## 4. Where the scale factors go

Quantisation stores each weight as an integer plus a scale: $w \approx s \cdot
q$. Applying that scale is the one real design decision in the kernel, and it
depends entirely on how the scales are shared.

<figure>
{{svg:scale_placement}}
<figcaption>Two scale layouts, two very different kernels. A single scale per
output channel factors straight out of the $K$ sum, so it can be applied
<b>once</b> in the epilogue — the K loop stays pure integer-to-bf16. Group-wise
scales change partway down K, so they cannot be factored out and must be applied
<b>inside</b> the loop, once per group.</figcaption>
</figure>

Mathematically it's one line. For per-channel scales,

$$\sum_k a_k \cdot (s_n q_{nk}) = s_n \sum_k a_k q_{nk}$$

and $s_n$ leaves the loop. For group-wise scales $s_{n,g}$ the sum splits into
one partial sum per group and each partial gets its own scale before being added
in — so you pay a multiply every $G$ steps down K, and you need the group
boundary to line up with the MMA's K step or the bookkeeping gets ugly.

I shipped group-128 rather than per-channel, and the reason is accuracy: on every
projection in the model, group-128 had **lower** output error than per-channel
(6.7e-3–7.4e-3 versus 8.4e-3–1.15e-2). A group of 128 weights shares a scale, so
one large weight in a channel no longer stretches the scale for all 896 or 4864
of them.

## 5. First attempt, and why it wasn't enough

The obvious first build reuses everything from Part 2: `wmma` fragments,
`cp.async` multi-stage pipelining, int8 weights loaded into shared memory and
converted on the way into the fragment.

It worked, it was correct, and it reached about **90 GB/s** — on a 227 GB/s bus.
Measured in situ on the fused gate/up projection it was worth 1.065× against
HuggingFace, when the traffic said it should be worth nearly 1.8×.

The problem is that `wmma` is an opaque interface. You hand it a pointer and a
stride and it loads a 16×16 fragment for you, which is convenient and means you
cannot get between the shared-memory load and the fragment. But dequantisation is
exactly a step that has to happen *between* those two things: the bytes in shared
memory are int8, and the fragment needs bf16. So the int8 had to be expanded to
bf16 in shared memory first — which put the full-size bf16 data back in shared
memory and gave up much of the point.

<figure>
{{svg:wmma_vs_mma}}
<figcaption>Why <code>wmma</code> blocks the optimization. It owns the
shared-memory → fragment path, so an int8 buffer has to be expanded to bf16
<i>in shared memory</i> before <code>load_matrix_sync</code> will take it — and
then shared memory holds the same bytes bf16 would have. Dropping to
<code>mma.sync</code> puts the fragment in named registers, so each lane can
dequantise its own values on the way in.</figcaption>
</figure>

## 6. Down to the lane: mma.sync and ldmatrix

`mma.sync` is the instruction `wmma` is built on. Using it directly means owning
the fragment layout: which of the 32 lanes in a warp holds which element of the
16×16×16 tile. That layout is fixed by the hardware and documented in the PTX
ISA [1], and getting it wrong produces output that is subtly, confusingly
permuted.

The two instructions that matter:

```cuda
// load four 8x8 tiles of A from shared memory, already in fragment layout
ldmatrix.sync.aligned.m8n8.x4.shared.b16  {a0, a1, a2, a3}, [smem_addr];

// 16x8x16 multiply-accumulate: bf16 inputs, fp32 accumulator
mma.sync.aligned.m16n8k16.row.col.f32.bf16.bf16.f32
    {d0, d1, d2, d3}, {a0, a1, a2, a3}, {b0, b1}, {c0, c1, c2, c3};
```

<figure>
{{svg:mma_lanes}}
<figcaption><code>ldmatrix.x4</code> is the piece that makes this practical.
Each of the 32 lanes supplies one row address, and the instruction delivers four
8×8 tiles already permuted into the layout <code>mma.sync</code> wants — a
shared-memory transpose for free, in one instruction. Doing the same thing with
ordinary loads costs a dozen instructions and a bank-conflict
problem.</figcaption>
</figure>

A is the activation matrix and stays bf16, so `ldmatrix` handles it directly.
B is the weight matrix, and B is where the whole point of the kernel lives.

## 7. Dequantising in registers

Each lane needs two `b` registers, holding four bf16 weights between them. So
each lane reaches into shared memory, picks up its own int8 bytes, and converts
them in registers — never writing bf16 back to shared memory at all.

<figure>
{{svg:bfrag_gather}}
<figcaption>How one lane builds its B fragment. Lane <code>t</code> handles
column <code>n = t % 4 · 2</code> and reads at <code>k = (t / 4) · 2</code> and
<code>k + 8</code> — two 16-bit loads that pick up four int8 weights, converted
to bf16 and packed into two registers. Shared memory only ever holds int8, so the
tile is half the size and twice as many K-steps fit in it.</figcaption>
</figure>

Two details that mattered more than they look:

- **The weights stay in `[N][K]` layout.** That is what `nn.Linear` already
  stores, so no repacking pass, no extra copy of the weights at load time, and
  the plugin can quantise in place. It costs a strided read per lane, which is
  fine because those reads hit shared memory.
- **The scales are `[N][K/G]`**, indexed by output channel and group, so the
  in-loop scale multiply is one load per group per lane.

## 8. 1.39× to 2.06× — and the bandwidth goes *down*

<figure>
{{svg:kb8_speedups}}
<figcaption>Every decode shape, streamed and interleaved against cuBLAS bf16.
The kernel wins everywhere, 1.389× to 2.057×. Look at the bandwidth columns
though: on four of five shapes it achieves <b>lower</b> GB/s than cuBLAS and
still wins.</figcaption>
</figure>

That last observation is the whole thesis of these three posts in one table.
`o_proj` at batch 1: cuBLAS moves its bytes at 138.4 GB/s, my kernel at 115.2
GB/s — 17% *worse* bandwidth — and it is 1.665× faster, because it moves half as
many bytes. On a bandwidth-bound problem, GB/s is not the score. Bytes are.

It's also why the first kernel failed. At 90 GB/s the int8 kernel wasn't slow
because int8 is hard; it was slow because it had put bf16-sized data back into
shared memory and lost the advantage it was built for.

## 9. The address that was never loaded

One bug from this kernel is worth documenting, because the mental model it broke
is one I'd have defended.

Row tiles come from `blockIdx.y`, and the last tile is usually partial — at
M = 1 with a 16-row tile, 15 of the 16 rows don't exist. The load was guarded, so
those rows were never fetched. The kernel still threw intermittent device-side
asserts.

<figure>
{{svg:oob_address}}
<figcaption>The distinction I had wrong. <code>cp.async</code>'s predicate
suppresses the <i>copy</i>, not the <i>address computation</i> — and the address
for row 15 was still being formed, 15·K elements past the end of A. Computing an
out-of-range address is itself the fault, whether or not anything is read from
it.</figcaption>
</figure>

The fix is one line per index: clamp rather than predicate, `const int ar = g < M
? g : (M - 1)`, so every lane forms a legal address and the predicate decides
whether the copy happens. Intermittent because it depended on whether the
out-of-range address happened to land in mapped memory, which depends on the
allocator, which depends on everything else in the process.

## 10. int4: the trick works, the accuracy doesn't

If halving the weights is good, quartering them should be better. int4 packs two
weights per byte, and there is a genuinely elegant way to unpack them [2].

<figure>
{{svg:int4_bits}}
<figcaption>The bit trick. Store each nibble biased by +8 so it is in 0…15, then
<code>0x4300 | nib</code> <i>is</i> the bf16 bit pattern for 128 + nib — because
0x4300 is bf16 128.0 and the low nibble lands exactly in the mantissa's last four
bits. One OR converts an int4 to a float. Subtracting 136 in the epilogue
recovers the signed value.</figcaption>
</figure>

It works. It's fast. And it is not deployable, which I only found out by
measuring accuracy rather than speed.

<figure>
{{svg:int4_error}}
<figcaption>Output error against group size, every projection in the model. int8
at group 128 sits at 6.7e-3–7.4e-3, which is <b>within noise of cuBLAS's own
bf16 rounding error</b> of about 6.1e-3. Round-to-nearest int4 is 12–13% at
group 128 and still 7% at group 8 — a group size so small the scales stop saving
any space. Two orders of magnitude apart, at every setting.</figcaption>
</figure>

The honest conclusion is that round-to-nearest int4 does not work on a
0.5B-parameter model, and the fix isn't a better kernel — it's a better
quantiser (GPTQ, AWQ) that uses calibration data to choose the rounding.
Worth knowing before building the kernel, which I did not.

## 11. Where the +57% went

Now the cliffhanger from Part 2. The microbenchmark said **+56.7%** at batch 16
and **+65.2%** at batch 1. The real model, measured at batch 1, said **+3.6%**.
Every one of those numbers is correct. Here is the whole difference, in four
terms, all at batch 1 so the chain is comparable end to end.

<figure>
{{svg:gap_accounting}}
<figcaption>The gap, accounted for. Each step is a real effect with its own
arithmetic, and by the bottom row there is nothing unexplained left. The largest
single term — 69% of an eager decode step not being GPU work at all — has nothing
to do with kernels.</figcaption>
</figure>

Taking the terms one at a time:

**Amdahl, on GPU time.** GEMM is 84.9% of decode's GPU time. So even a GEMM that
gets 1.652× faster bounds the whole step at

$$\frac{1}{0.151 + 0.849/1.652} = 1.50\times$$

That's a ceiling, not a prediction, and it is already well below +57%.

**Amdahl, on wall time.** In an eager PyTorch loop the GPU is idle most of the
step. The same decode step took **22.1 ms eager and 6.85 ms under a CUDA graph** —
so 69% of the eager step was Python and launch overhead, and GEMM is only about
26% of the wall clock. The bound drops to 1.12×, and I measured 1.04×.

<figure>
{{svg:overhead}}
<figcaption>The measurement that reframed the whole project. CUDA graphs are
worth <b>3.2×</b> on this model — far more than anything in Part 1 or Part 2 —
and they are a framework feature, not a kernel. Optimizing a kernel inside a
harness that spends 69% of its time in Python measures the harness.</figcaption>
</figure>

**Fusion was worth almost nothing.** I'd assumed fusing the gate and up
projections, and folding SiLU into the epilogue, would be a significant win.
Isolated and measured: fusion inside bf16 was **1.010×**. Fusion inside W8A16 was
1.039×. The traffic breakdown in Part 2 said this in advance — all elementwise
work in the model is 3.6% of the bytes — and I built it anyway.

So the answer to "why didn't the kernel win transfer" is that I was comparing
against a baseline that was leaving 3.2× on the table for reasons unrelated to
kernels. The fix is not a better kernel. It is to measure against a serving stack
that isn't doing that.

## 12. The kernel that never ran

Which means vLLM: CUDA graphs, `torch.compile`, fused QKV and gate/up
projections, paged KV cache. Everything the custom harness was missing, already
there. A proper baseline.

The integration is small — register a quantisation config, implement
`LinearMethodBase` [3], and vLLM routes every `Linear` through it. I wired it up, ran
it, and got **1.01×**.

The kernel was never called. Not once.

<figure>
{{svg:torch_compile}}
<figcaption>The failure. My <code>apply()</code> had a shape guard —
<code>if flat.shape[0] &lt;= 16</code> — because the kernel only won on small
batches. But <code>torch.compile</code> traces with whatever shape it is handed,
resolves the Python <code>if</code> <b>at trace time</b>, and bakes the losing
branch into the graph. Every subsequent call replayed a graph containing the bf16
fallback.</figcaption>
</figure>

This is a specific and generalisable trap: **a Python conditional inside a traced
function is not a runtime decision.** It is a compile-time one, decided once, by
whatever shape happened to arrive first. The counter that caught it was three
lines — increment on each kernel call, print at exit — and I should have had it
from the first run rather than after two days of 1.01×.

Two changes fixed it:

- **Make the kernel shape-agnostic.** Row-tiling over `blockIdx.y` means one
  kernel handles M = 1 and M = 2048, so there is no branch to bake. This was
  worth doing regardless of the tracing problem; the branch only existed because
  the earlier kernel lost on large batches, and `mma.sync` had already fixed that.
- **Register it as a custom op.** `torch.library.custom_op` plus
  `register_fake` makes the call an opaque node that `torch.compile` traces
  through without trying to look inside it.

## 13. Converting the wrong layers

The other integration mistake was more ordinary. The first version converted
every `nn.Linear` in the model — all 169 of them — on the theory that int8 is
smaller and smaller is better.

<figure>
{{svg:wrong_layers}}
<figcaption>Per-shape speedup for the earlier <code>wmma</code> kernel. It wins
big on the two large shapes and <b>loses</b> on <code>down_proj</code>,
<code>k_proj</code> and <code>v_proj</code>. Converting everything therefore made
the Linear layers slower in aggregate. The later <code>mma.sync</code> kernel
wins on all of them, which is what finally made an unconditional plugin
correct.</figcaption>
</figure>

`k_proj` and `v_proj` are N = 128 — 0.2 MB of weights. They never reach the bus,
they're latency-bound, and halving a quantity that isn't the bottleneck does
nothing while adding a dequantisation step. The interim fix was to calibrate at
load time: time both paths per shape, keep whichever wins. The real fix was a
kernel that doesn't lose.

## 14. +39.7%

<figure>
{{svg:vllm_ab}}
<figcaption>vLLM 0.27.1, Qwen2.5-0.5B-Instruct, batch 1, 128 tokens, with vLLM's
own <code>torch.compile</code> and CUDA graphs active and the kernel serving 100%
of Linear calls. <b>4.977 → 3.563 ms/token</b>, 200.9 → 280.5 tok/s, and the
generated text is identical. Two engines resident in one process, alternating
rounds, clocks pinned at 2505 MHz throughout: median <b>1.3922×</b>.</figcaption>
</figure>

Against the 1.50× Amdahl ceiling from §11, 1.397× is 93% of what was
theoretically available. That is the number I'd defend, and it is smaller than
the microbenchmark by exactly the amount the arithmetic predicted.

The interleaved A/B is worth a note after Part 2. Measured sequentially, in
separate processes, it was 1.397×. Measured interleaved, two engines resident and
alternating, it was 1.389–1.392× across nine rounds. Those agree, which is what
tells me thermal drift wasn't inflating the sequential number — the check that
Part 2's second lie made non-negotiable.

## 15. What it costs

A speedup on a quantised model is only interesting alongside the accuracy it
costs, so: full wikitext-2-raw test split, 1024-token window, stride 512,
299,077 tokens scored, all 169 linear layers quantised including `lm_head`.

<figure>
{{svg:accuracy}}
<figcaption>Perplexity is essentially unchanged: <b>13.6650 → 13.6687</b>, a
degradation of 0.0037 or <b>+0.027%</b>. The bf16 run repeats to 4 decimal
places, so that delta is signal and not noise. But greedy decoding diverges after
<b>51 of 128 tokens</b> — and both facts are true at once.</figcaption>
</figure>

That second number deserves more attention than it usually gets. A 0.027%
perplexity change does not mean the model produces the same text; greedy decoding
takes an argmax, so an arbitrarily small logit change flips a token and every
token after it differs. Perplexity is the claim I can support. "Identical
output" is not, and a benchmark that reports only the first is hiding something.

(At batch 1 in vLLM the 128-token generation *was* identical — one sample, not a
guarantee.)

## 16. Batch size eats the win

One last figure, because it ties back to Part 2's most important plot.

<figure>
{{svg:batch_win}}
<figcaption>The same kernel, the same server, two batch sizes, next to the
GEMM-only estimate for each. <b>1.397× at batch 1, 1.070× at batch 32.</b> The
estimate overshoots by 18% at batch 1 and by 0.2% at batch 32 — not because the
model changed, but because Amdahl dilution is proportional to the size of the
win.</figcaption>
</figure>

The mechanism is Part 2 §4: at batch 32 each weight serves 32 tokens, so the
weights are no longer 87.5% of the traffic and halving them buys much less. Weight
quantisation is a *latency* optimization. If you are throughput-bound and batching
well, it does progressively less for you — which is worth knowing before you
spend three weeks on it.

The pleasing part is the agreement at the right-hand end, and the reason for it
is worth stating because it is not what I first assumed. The GEMM share of decode
does not change much with batch size. What changes is the *size of the win*: the
whole-model speedup is $1/(0.151 + 0.849/g)$ for a GEMM speedup $g$, so a $g$ of
1.652 dilutes to 1.50 — a 9% haircut — while a $g$ of 1.072 dilutes to 1.060, a
1.1% one. Amdahl takes a fixed fraction of the *excess* over 1.0, so a small win
survives the trip to end-to-end almost intact and a large one does not.

## 17. What I'd do differently

Three posts, and the lessons that actually generalise are mostly not about CUDA.

**Compute the ceiling first.** Every wrong turn in this project — the +20% target,
the elementwise fusion, the int4 kernel, converting 169 layers — would have been
avoided by arithmetic I could do in ten minutes with numbers I already had on
disk. The roofline is not an analysis you do at the end. It's the thing that tells
you which optimization to attempt.

**Measure against the best available baseline, not a convenient one.** Most of my
apparent wins were against a harness leaving 3.2× on the table in Python
overhead. vLLM was harder to beat and the number that came out is the only one
worth quoting.

**Instrument the thing you are claiming.** A three-line counter would have caught
"the kernel never ran" on day one. A byte counter would have caught the L2
problem. Neither is sophisticated; both are just asking the code to confirm the
story instead of assuming it.

**Report the negative results.** int4 didn't work. Fusion was worth 1%. The
ladder inverts at M = 1. Those took as long as the wins and are more useful to
anyone else deciding what to try.

Final numbers, all interleaved, all against vLLM with graphs and compile active:
**+39.7% single-stream latency, +0.027% perplexity, +7.0% throughput at batch
32.** The kernel is 400 lines. The measurement harness that made those numbers
trustworthy is bigger than the kernel, and that ratio is the most honest thing I
can tell you about GPU performance work.

[Part 4](blog.html?post=triton_mlir_llvm) writes this same kernel in forty-three
lines of Triton, reads every level of IR the compiler produces, and finds it
matches this one on eight of ten shapes — for a reason that took one more
experiment to pin down.

[1] `mma.sync` and `ldmatrix` fragment layouts are in the [PTX ISA](https://docs.nvidia.com/cuda/parallel-thread-execution/index.html#warp-level-matrix-instructions). The per-lane element maps are the part to read carefully; getting them wrong gives permuted output rather than an error.
[2] The `0x4300 | nib` int4 unpack trick is used in several production kernels; a clear writeup is in the [FasterTransformer / TensorRT-LLM weight-only kernels](https://github.com/NVIDIA/TensorRT-LLM). The bias-by-8 convention is what makes the OR legal.
[3] vLLM's quantisation plugin surface is `register_quantization_config` plus `LinearMethodBase` — see the [vLLM docs on custom quantization](https://docs.vllm.ai/en/latest/contributing/model/index.html). `torch.library.custom_op` is documented in the [PyTorch custom-ops guide](https://pytorch.org/tutorials/advanced/custom_ops_landing_page.html) and is the piece that keeps `torch.compile` from tracing into the kernel.
[4] All measurements are from an RTX 4060 Laptop (sm_89, 24 SMs, 8 GB, 227 GB/s measured, 28.41 TFLOPS bf16), serving Qwen2.5-0.5B-Instruct under vLLM 0.27.1 and PyTorch 2.13. Perplexity on wikitext-2-raw test, 299,077 tokens.
