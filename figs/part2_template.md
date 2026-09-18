title: CUDA GEMM, Part 2: Bandwidth Limits and Six Benchmarking Errors
date: September 4, 2026
author: Shashwat Pandey

---

*Part 2 of 4. [Part 1](blog.html?post=cuda_gemm) built a matmul kernel from
0.112 to 8.115 TFLOPS — and then discovered that at the matrix shapes a language
model actually uses while generating text, the best of those nine kernels
reaches 11.7% of cuBLAS. This part explains why, builds the tool that predicts
it, and then documents the six separate occasions on which my own benchmarks
told me the opposite of the truth.*

## 1. Two questions a kernel can be answering

Part 1 was one long answer to a single question: **how do I get the most
arithmetic out of each byte I fetch?** Every rung raised arithmetic intensity.
Tiling, register blocking, the 8×8 outer product — all of it was reuse.

Decode asks a different question. When a model generates one token, it multiplies
a 1×896 vector by every weight matrix in the network. There is *no reuse to
find*. Each weight is used exactly once and thrown away. The only question that
matters is: **how fast can I stream a gigabyte off the bus?**

<figure>
{{svg:two_questions}}
<figcaption>The same kernel, two regimes. Prefill has thousands of rows to
amortise each weight over, so it is bound by arithmetic. Decode has one, so it is
bound by how fast the weights arrive. Optimizations for one are frequently
irrelevant to the other — and occasionally harmful.</figcaption>
</figure>

If you take one thing from this post: before optimizing a kernel, find out which
question it is answering. There is a tool for that, and it takes about ten
minutes to learn.

## 2. Arithmetic intensity

Take the simplest possible piece of the problem: a single dot product over $K$
elements.

It loads $2K$ numbers. It does $2K$ floating-point operations — $K$ multiplies
and $K$ adds. In fp32, that's $8K$ bytes for $2K$ flops:

$$\text{arithmetic intensity} = \frac{2K \text{ flops}}{8K \text{ bytes}} = 0.25 \text{ flops/byte}$$

The $K$ cancels. A longer dot product doesn't help you — it loads more and
computes proportionally more.

<figure>
{{svg:arith_intensity}}
<figcaption>Arithmetic intensity for three shapes of the same operation. A single
dot product is hopeless at 0.25 flops/byte. A full matmul is far better, because
each row of A is reused across all N columns of B — and that reuse is exactly
what Part 1's tiling was harvesting.</figcaption>
</figure>

Now do the same count for a full matmul, $M\times K$ times $K\times N$. It does
$2MKN$ flops and touches $4(MK + KN + MN)$ bytes, so at $M = N = K = 1024$:

$$\frac{2 \cdot 1024^3}{4 \cdot 3 \cdot 1024^2} = \frac{2 \cdot 1024}{12} \approx 171 \text{ flops/byte}$$

Nearly 700× better than the dot product, from exactly the same multiply-add
work. The difference is entirely *reuse*: each row of A is read once and used
against all $N$ columns of B. That is what the $K$ cancelling in the dot-product
case was telling us — with $M = N = 1$ there is nothing to amortise over.

Now compare that to the machine. My GPU does about 28 trillion flops/second and
reads about 227 billion bytes/second [4], so it *wants* work with an intensity
of

$$\frac{28{,}410 \text{ Gflop/s}}{227 \text{ GB/s}} \approx 125 \text{ flops/byte}$$

That number is the **ridge point**, and it is the single most useful fact about a
piece of hardware. Feed the GPU work above 125 flops/byte and it can be limited
by arithmetic. Below it, no kernel — however beautiful — can be limited by
anything but memory.

A length-896 dot product is at 0.25. It is 500× below the ridge.

One wrinkle worth knowing: the ridge point moves with precision. Tensor cores do
bf16 four times faster than fp32, but bf16 also halves the bytes, so the ridge
lands near $28{,}410 / 227 \approx 125$ for bf16 against $7{,}020 / 227 \approx
31$ for fp32. Switching to lower precision *raises* the bar for being
compute-bound, which is the opposite of the intuition that faster math should
make things compute-bound.

## 3. The roofline

Plot achievable performance against arithmetic intensity [1] and you get two
lines:
a sloped one where memory is the limit (performance = intensity × bandwidth),
and a flat one where arithmetic is. The lower of the two is your roof.

<figure>
{{svg:roofline}}
<figcaption>The roofline for this GPU, with the real shapes on it. Prefill sits to
the right of the ridge, where Part 1's optimizations pay. Every decode shape sits
far to the left, pinned under the sloped section — which means the <i>only</i>
lever there is bytes moved, and cuBLAS is already close to the roof.</figcaption>
</figure>

This is why Part 1's ladder inverted at M=1. The register outer product raises
arithmetic intensity, and arithmetic intensity is not the binding constraint. It
was answering a question nobody asked, while its 8×8 thread tile wasted 63 of
every 64 accumulators.

## 4. Where a gigabyte actually goes

So decode is memory-bound. Bound by *what* memory, exactly? Let's count every
byte the model touches to produce one step, at a batch of 16.

<figure>
{{svg:traffic_breakdown}}
<figcaption>Every byte, one decode step, batch 16. The <b>weights are 87.5%</b>
of it, and they are a fixed toll: the same 942 MB whether you are generating one
token or sixteen. Every intermediate activation in the entire network — all the
norms, the SiLU, the logits — is 3.6%.</figcaption>
</figure>

That breakdown kills several optimization ideas outright, and it is worth being
explicit about which:

- **Fusing elementwise ops.** Every RMSNorm, SiLU, residual add and rotary
  embedding in the network lives inside that 3.6% slice. Perfect fusion of all of
  them is bounded by 3.6%. I spent time on this before I counted.
- **A faster attention kernel.** The KV cache is 8.9%, and it grows with
  sequence length rather than with model size — so it matters enormously for long
  contexts and barely at all at the 128-token lengths I was measuring.
- **Anything about the logits.** `lm_head` is 12.3 MB, shared with the embedding
  table. It is 1.1% of the traffic and it is the last thing in the network, which
  is also where profiler timelines make it look important.

What it leaves is the weights, and there are exactly two things you can do to
942 MB of weights: read them fewer times, or make them smaller.

But the interesting consequence is what happens when you change the batch size.
The weights don't grow — the same 942 MB serves every sequence in the batch. So
the *per-token* cost collapses:

<figure>
{{svg:traffic_per_token}}
<figcaption>Bytes moved per token generated. At batch 1 each token costs
<b>951 MB</b>; at batch 128 it costs <b>16 MB</b>. This is the single most
important plot for anyone tuning inference, and it is a statement about weights
being a fixed toll, not about any kernel.</figcaption>
</figure>

That curve is why throughput-oriented serving batches aggressively, and why
single-stream latency is such a different problem. It also explains why the
concurrency sweep I'd run months earlier peaked at 128 — a fact I had in a JSON
file and had not connected to anything.

## 5. What this makes impossible

Here is where the roofline stops being interesting and starts being useful.

My goal at one point was a 20% speedup on decode. Decode moves 942 MB of weights
per step. The bus measures 227 GB/s. So the floor — a kernel that saturates DRAM
perfectly and wastes nothing — is

$$\frac{942 \text{ MB}}{227 \text{ GB/s}} = 4053\ \mu s$$

cuBLAS does it in 4668 µs, which is 87% of the roof already. And 20% faster than
cuBLAS would be 3890 µs, which requires **237 GB/s on a 227 GB/s bus**.

<figure>
{{svg:bus_ceiling}}
<figcaption>The arithmetic that ended a line of work. A perfect kernel is worth
<b>+15.2%</b>; the target was +20%; the gap is not an engineering problem but a
physical one. The only way past the dashed line is to move fewer bytes, which is
Part 3.</figcaption>
</figure>

I want to be clear about how much time this would have saved me. The number
`227 GB/s` was in a file called `device_peaks.json`, measured weeks earlier. The
number `942 MB` is four multiplications. Ten minutes of arithmetic would have
retargeted a week of work.

## 6. Decode is the wrong *shape*, not just the wrong intensity

There's a second, more concrete reason the ladder failed at M=1, and it has
nothing to do with the roofline. It's about how many blocks the kernel launches.

<figure>
{{svg:decode_shape}}
<figcaption>A 128-wide tile over a 896-column matrix makes 7 blocks. At M=1
there is one block-row, so that's <b>7 blocks on 24 SMs</b> — two thirds of the
GPU is idle before the kernel starts. And of the 128×128 outputs each block
computes, 127 of 128 rows are padding.</figcaption>
</figure>

So the tiled kernel is wasting the machine twice: it leaves 17 SMs empty, and the
SMs it does use spend most of their registers on rows that don't exist. The
autotuner's best configuration out of 188 reached **15.7%** of cuBLAS. No tile
shape fixes this, because the problem isn't the tile — it's that there is no
parallelism along M or N to find.

## 7. The kernel decode actually wants

If you can't get parallelism from the output, get it from the reduction. Split
the K dimension across blocks, have each compute a partial sum, and add them up
in a second pass.

<figure>
{{svg:splitk}}
<figcaption>Split-K. Each block takes a slice of K, so block count becomes a free
parameter instead of a function of output size. Every thread owns 4 output
columns via <code>float4</code>, and because B is row-major, consecutive threads
read consecutive columns — coalesced, exactly as in Part 1 §4.</figcaption>
</figure>

Against the tiled ladder this is worth **5.7× to 13×** at M=1 — 13× on
`down_proj`, which has the longest K in the model and therefore the most
reduction to split.

It also comes with a cost, and the cost has a clean closed form. The partial sums
go to global memory and come back:

$$\text{extra bytes} = 2 \cdot \texttt{nsplit} \cdot M \cdot N \cdot 4$$

against $2KN$ bytes of weights. For `down_proj` at M=1 — $K = 4864$, $N = 896$,
8 splits — that is 57 KB of partials against 8.7 MB of weights: 0.7%, free. Push
to M=128 and the same 8 splits cost 7.3 MB against the same 8.7 MB of weights,
and split-K has nearly doubled the traffic to buy parallelism you no longer need.

So split-K is not a better decode kernel. It is a trade of bytes for blocks, and
it is only a good trade while blocks are the scarce thing. That ratio is two
lines of arithmetic, and it is worth writing down *before* building the kernel —
the same lesson as §5, one level down.

## 8. Tensor cores, and when more stages help

The fp32 ladder tops out against a 7 TFLOPS ceiling. The model's GEMMs are bf16
and run on tensor cores, where the ceiling is 28.4. Switching to `wmma` fragments
and then adding `cp.async` was worth up to **+61%** on its own.

`cp.async` deserves its own paragraph, because it changes the shape of the inner
loop. A normal shared-memory staging load is really two instructions: global→
register, then register→shared. The thread owns the data in between, so it has to
*wait* for the global load to land before it can store it. `cp.async` issues one
instruction that copies global→shared directly, in the background, and returns
immediately; you find out later whether it finished by waiting on a counter. The
thread never holds the bytes, so it never blocks on them.

That is what makes multi-stage pipelining possible. With $N$ shared-memory
buffers you can have $N-1$ copies in flight while computing on the $N$th, so the
loop stops alternating between fetch and compute and starts doing both at once.
Part 1's double buffering was the $N = 2$ case done by hand, with the register
round-trip still in it.

Then I hit a wall that taught me something specific. On the narrow shapes, no
tile configuration helped. The reason is a single line of algebra:

$$\text{threads} = \frac{BM}{WM}\cdot\frac{BN}{WN}\cdot 32 \cdot \frac{N}{BN}\cdot\frac{M}{BM} \;=\; \frac{32N}{WN}$$

With `BM = WM = 16`, everything cancels except `N` and `WN` — and `wmma` fixes
`WN ≥ 16`. So `o_proj` gets **1792 threads no matter what tile you choose**, 4.9%
of what the GPU can host. The tile was never the variable.

<figure>
{{svg:pipeline_stages}}
<figcaption>With thread count pinned, the only remaining lever is bytes in flight
per thread — pipeline depth. The search picks depth exactly where the mechanism
predicts: the starved narrow shapes take 3–6 stages, the two already at the bus
take 2, and past 6 nothing improves.</figcaption>
</figure>

That's a satisfying result because the shape of the answer was predicted by the
algebra before the autotuner confirmed it. It is also the last thing in this post
that went right.

## 9. Six ways my benchmarks lied

Everything above is the physics. What follows is the part I'd actually want a
beginner to read, because every single one of these produced a number that looked
completely reasonable, and I believed several of them for days.

### Lie 1: the cache was doing the work

Sweeping batch sizes finely, I found what looked like a real result: on
`gate_up_proj`, a 16-row tile beat cuBLAS by **160–186%** across all of
M=2…32. It repeated to within a percentage point over three runs. Three
independent configurations agreed. It had an obvious mechanism.

It was my benchmark. The timing loop called the kernel a few hundred times on
**the same weight matrix**. That matrix is 16.6 MB; this GPU's L2 cache is
33.5 MB. After the first iteration the weights never left cache. Decode does the
exact opposite — it streams 988 MB of distinct weights every step and reuses
none of them.

<figure>
{{svg:lie_l2}}
<figcaption>The same kernel and the same shape, measured twice. Rotating through
enough distinct copies of the weights to exceed L2 — which is what the model
actually does — collapses a 169% "win" to 109%. Both kernels then sit against
the memory ceiling, where there is almost nothing left to win.</figcaption>
</figure>

The fix is mechanical once you see it. Allocate enough distinct copies of the
weight matrix to exceed L2 — `ceil(2 * L2 / bytes) + 1` of them is comfortable —
and have iteration $i$ use copy $i \bmod n$. It costs memory and a modulo, and it
turns the benchmark into a measurement of the thing you care about.

The lesson generalises past GPUs: **a microbenchmark that reuses its input is
measuring the cache.** If the real workload streams, the benchmark must stream.
And notice what made this one so durable: it was *reproducible*. Reproducibility
tells you a measurement is stable. It tells you nothing about whether it is
measuring the right thing.

### Lie 2: thermal drift became speedup

This one produced the most absurd number of the project: a **372% speedup** that
was entirely a thermometer reading.

My autotuner timed cuBLAS once, then measured 188 candidate configurations. That
sweep takes about a minute, during which a laptop GPU heats from 60 °C to 87 °C
and drops from 3105 MHz to about 1200 MHz. The reference was measured cold and
the candidates warm, so the drift landed entirely in the ratio.

<figure>
{{svg:lie_thermal}}
<figcaption>Clock against wall time during one autotuner run, with the "speedup"
it reported. The same cuBLAS call measured 7.45 TFLOPS cold and 1.87 TFLOPS hot.
On another shape the reported figure was 259.8%; re-measured properly it was
<b>68.1%</b> — the kernel was losing badly.</figcaption>
</figure>

The fix is to stop measuring them separately. Run candidate and reference in
short alternating rounds — A, B, A, B, twenty times — and take the median of the
per-round *ratios* rather than the ratio of the totals. Drift then appears on both
sides of every ratio and cancels, and you get a distribution instead of a point,
so you can see when the two are within noise of each other.

The reason this one deserves a whole section is that I made *exactly the same
mistake* again, one level up, weeks later: a Python harness that timed a model in
bf16, then quantised it, then timed it again — minutes apart. A hot run measured
the identical bf16 baseline at 15.63 ms/token where a cool run measured 9.24. The
mechanism was identical and I did not recognise it, because it was in a different
language, at a different scale, in code I thought of as the harness rather than
the benchmark. Knowing a failure mode is not the same as having a habit that
prevents it.

### Lie 3: cuBLAS is not an oracle

I had been scoring correctness by comparing against cuBLAS. On bf16 my kernel
started failing, and the failures were large.

My kernel was right. cuBLAS's *default* bf16 path reduces partial sums in
reduced precision. Setting
`CUBLAS_MATH_DISALLOW_REDUCED_PRECISION_REDUCTION` [2] cuts its own worst
sampled error from **7.6e-1 to 3.9e-3** — a factor of 200.

<figure>
{{svg:lie_cublas}}
<figcaption>Error against an fp64 reference for the same shape. The library's
default path is the least accurate thing in the picture. Scoring a kernel against
a library marks it wrong for being <i>more</i> accurate than its reference.</figcaption>
</figure>

The fix: score against truth, not against another implementation. I recompute a
spread-out sample of the output in `double` on the host and compare both.

### Lie 4: a metric that rejected every correct answer

With the fp64 reference in place, a new failure appeared: at K=4864, **all 188
configurations** in the search space were reported incorrect. All of them.

The bug was the metric. I was scoring per-element *relative* error, and a dot
product of 4864 terms can cancel almost to zero.

<figure>
{{svg:lie_relerr}}
<figcaption>Why relative error is the wrong metric here. An output of 0.02 inside
a matrix whose RMS is 10 is the difference of two ~10-sized partial sums. A
normal half-ulp slip there reads as a <b>76% error</b>, even though the kernel is
perfect. With K=4864 enough elements cancel that every candidate fails.</figcaption>
</figure>

The fix is to score against the scale the arithmetic actually works at:
`max|C − truth| / RMS(truth)`. One bf16 ulp is 3.9e-3 of that scale, fp32 lands
near 1e-6, and a genuine indexing bug is O(1). The three regimes are orders of
magnitude apart, which is what you want from a correctness gate.

### Lie 5: a race that only appeared above 600 blocks

My pipelined kernel was correct on every shape I tested, then wrong on two.
`lm_head` and `gate_up` at batch 2048 produced errors an order of magnitude too
large, and the error *varied with batch size* — which is the signature of a race,
not a logic bug.

<figure>
{{svg:lie_race}}
<figcaption>The bug. <code>cp.async.wait_group N</code> waits until at most N
copy groups are outstanding [3]. In steady state, permitting one is right. But on the
<b>last</b> tile nothing new is issued, so the one group still permitted to be in
flight is the very buffer about to be read.</figcaption>
</figure>

Below about 600 blocks the copy always happened to land before it was needed, so
the kernel passed. At 1187 blocks the extra contention stretched it past the
barrier.

The fix is two lines: permit `min(NSTAGE - 2, tiles_remaining)` outstanding
groups instead of a constant, so the allowance drains to zero as the loop ends.
Finding it took reading the failure *pattern* rather than the failure. Three
facts pointed straight at it — the error scaled with block count, it varied with
batch size at fixed weights, and it was far too large to be precision but far too
small to be a wrong index. Nothing but a race produces that combination, and once
you believe it is a race in an async pipeline there are only about three places
to look.

Two things I'd do differently. First, a correctness gate that passes 90% of the
time is not a gate — a race needs enough shapes and enough repetitions to
surface. Second, I fixed this exact bug once, then reintroduced it weeks later
when generalising the kernel from two pipeline stages to N.

### Lie 6: the tight loop doesn't predict the real thing

The last one is the most uncomfortable, because the measurement was clean.

My autotuner reported that a configuration hit **1.22×** on `down_proj`. Driven
the way the model drives it — once per layer, interleaved with the other
projections, different weights each time — the same configuration measured
**0.85×**. Not a small correction: a win became a loss.

<figure>
{{svg:lie_insitu}}
<figcaption>The same configuration, the same shape, the same GPU — measured in a
tuner loop and then inside the model. A tight loop is not a small approximation
of a workload; it is a different workload, and it does not even err in a
predictable direction.</figcaption>
</figure>

## 10. What all six have in common

Not one of these was a bug in a kernel. Every one was a bug in a *measurement*,
and every one produced a plausible number.

That's the thing worth internalising. A kernel bug usually announces itself —
wrong output, a crash, a NaN. A measurement bug hands you a number in the right
range with the right sign and lets you build on it. Five of the six above
survived at least one round of me looking directly at them and nodding.

The habits that actually caught them:

- **Stream if the real thing streams.** Rotate inputs past cache size.
- **Interleave the comparison.** Never candidate-then-reference, always
  candidate/reference/candidate/reference.
- **Score against truth.** An fp64 reference, not another library.
- **Score at the right scale.** Relative error is wrong wherever cancellation is
  possible.
- **Measure in place.** A tight loop is a different workload.
- **Distrust a passing correctness check.** Especially for anything asynchronous.

## 11. What the harness ended up looking like

All six fixes are small, and they compose into something you write once and
reuse. Stripped down, the benchmark that survived looks like this:

```python
def compare(candidate, reference, shape, rounds=20):
    # (1) enough distinct weights to defeat L2, rotated per call
    W = [make_weights(shape) for _ in range(l2_rotation_count(shape))]
    # (2) interleaved, so thermal drift cancels inside each ratio
    ratios = []
    for r in range(rounds):
        a = time_one(candidate, W[r % len(W)])
        b = time_one(reference, W[r % len(W)])
        ratios.append(b / a)
    # (3) truth is fp64 on the host, not the reference implementation
    truth = sample_truth(shape)
    assert score(candidate, truth) < 4e-3   # (4) error / RMS, not relative
    return statistics.median(ratios), iqr(ratios)
```

Four of the six lies are closed by those four numbered lines. The fifth — the
race — needs shape and repetition coverage in the correctness gate, which is a
property of the *test matrix* rather than of the timing code. The sixth is not
closable inside a microbenchmark at all: the only fix for a tight loop being a
different workload is to also measure the real workload.

Returning an interquartile range next to the median mattered more than I
expected. A median of 1.04 with an IQR of 0.4 is not a 4% win; it is a
measurement that has not converged, and before I returned spread I had no way to
tell those two apart.

## 12. And it still didn't transfer

Here is where Part 2 ends and Part 3 begins.

After all of that — a correct fp64 gate, cold-cache measurement, interleaved
timing, an honest roofline — I had a kernel configuration that was worth
**+57% on decode GEMM**, traffic-weighted across every projection in the model.

Then I ran it inside a real model, generating real tokens.

<figure>
{{svg:micro_vs_e2e}}
<figcaption>The microbenchmark said +57%. End to end, on the real model, it was
<b>+0.3% to +3.7%</b>. A factor of roughly fifteen, and none of it is
measurement error this time — every one of those numbers is correct.</figcaption>
</figure>

Part 3 accounts for that gap completely, and the accounting is more interesting
than the kernel work: it turns out one of the biggest wins available was already
in the serving framework I was comparing against, another was a Python branch
evaluated at the wrong time, and the thing that finally worked was a PTX
instruction I'd been avoiding.

[1] The roofline model comes from Williams, Waterman & Patterson, [*Roofline: an insightful visual performance model for multicore architectures*](https://dl.acm.org/doi/10.1145/1498765.1498785), CACM 2009. If you only ever learn one performance model, learn this one.
[2] `CUBLAS_MATH_DISALLOW_REDUCED_PRECISION_REDUCTION` is documented under [cublasSetMathMode](https://docs.nvidia.com/cuda/cublas/index.html#cublasmath-t). It is worth knowing it exists before you use cuBLAS as a correctness reference.
[3] `cp.async` and `cp.async.wait_group` semantics are in the [PTX ISA](https://docs.nvidia.com/cuda/parallel-thread-execution/index.html#data-movement-and-conversion-instructions-cp-async). The "at most N outstanding" wording is precise and is exactly where Lie 5 comes from.
[4] All measurements are from an RTX 4060 Laptop (sm_89, 24 SMs, 8 GB, 227 GB/s measured), serving Qwen2.5-0.5B-Instruct under vLLM 0.27.1 and PyTorch 2.13.
