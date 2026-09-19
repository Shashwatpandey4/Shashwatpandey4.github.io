title: A Speedup Is a Claim: Making a Kernel Benchmark Carry Its Evidence
date: September 16, 2026
author: Shashwat Pandey

---

*Agents are writing GPU kernels now, and the field's own surveys say the
bottleneck is not generation but evaluation — nobody can tell whether the
speedups are real. I spent four posts learning to distrust my own numbers on one
laptop GPU. This is that distrust packaged as a library, and a demonstration
that fixing only the measurement changes the reported result by 1.6× to 2.4×
without touching a kernel.*

## 1. The interesting problem moved

Two things landed recently that are worth putting side by side.

[Karpathy's autoresearch](https://github.com/karpathy/autoresearch) [1] is about as
small as a research loop can be: three files, an agent that edits `train.py`,
a **fixed five-minute** training budget, and a rule — keep the change if
`val_bpb` improved, otherwise discard it. The fixed wall-clock budget is the
only guardrail, and it is there to stop the agent winning by training longer.

[Prime Intellect's Prime Agent](https://www.primeintellect.ai/blog/prime-agent)
[2] is the opposite in scale: a harness where context is a variable and
sub-agents are function calls inside a live IPython kernel, with a `/refine` loop that lets
the agent rewrite its own prompts and skills. It reports 95.5% Best@1 on
ARC-AGI-3, above the 95.4% human-expert baseline. It also evaluates on GPU
kernel writing, and — the part I keep thinking about — it reports discovering
**reward hacking** in Factorio.

So: agents can write kernels. The question is who checks them.

<figure>
{{svg:field_state}}
<figcaption>Reported <code>fast_1</code> on KernelBench Level 1 across the
approaches in the 2026 survey. The numbers have climbed fast. What has not kept
pace is the question of what a "correct, faster" kernel means when the thing
deciding is a benchmark harness.</figcaption>
</figure>

## 2. The field says the problem is evaluation

The [survey on automated kernel generation](https://arxiv.org/html/2601.15727v3)
[3] lists its open problems. The first two are not about models:

> "Systems are vulnerable to **reward hacking**, where kernels achieve favorable
> benchmark scores without delivering corresponding benefits in practical
> deployments."

> "The impact of kernel-level improvements on **end-to-end AI systems** remains
> insufficiently understood."

I have an unusual relationship with those two sentences, because I spent four
posts producing exactly the failures they describe, by hand, with no agent
involved. A 169% win that was the L2 cache. A 259.8% win that was really a
68.1% loss. A kernel that measured 1.22× in a tuner loop and 0.85× inside a
model. A microbenchmark worth +57% that was worth +3.6% end to end.

Each of those has a mechanism, and the mechanisms are boringly different from
one another:

| The claim | What it actually was | Corrected |
|---|---|---|
| 169.1% of cuBLAS | working set fit in 33.55 MB of L2 | **108.9%** |
| 259.8% of cuBLAS | reference timed once, cold | **68.1%** — a loss |
| 1.22× in a tuner | measured inside the model instead | **0.85×** — a sign flip |
| +57% on the kernel | Amdahl: GEMM is 26% of an eager step's wall clock | **+0.3–3.7%** end to end |

That table is the argument for a record rather than a number. No single check
catches all four: a cache-residency test says nothing about clocks, a clock
check says nothing about whether the shape is representative, and neither says
anything about what fraction of the model the kernel is. They fail
independently, so they have to be checked independently.

An agent doing this at 100 experiments a night does not make those mistakes less
often. It makes them faster, and it removes the human who might have squinted at
the number.

## 3. The failure mode is not knowing, it is reaching for the wrong copy

Here is the part I find genuinely damning about my own work. I knew every rule.
I had written them all down. And I still shipped the L2 lie a second time, in
[Part 4](blog.html?post=triton_mlir_llvm), four weeks after documenting it in
[Part 2](blog.html?post=decode_roofline).

<figure>
{{svg:scattered}}
<figcaption>Why. The discipline existed, but as copy-paste. <code>warmup</code>
is defined in fourteen files. <code>graph_time</code> is defined in four — and
only two of them rotate the inputs. When I needed a graph timer while writing
Part 4, I reached for one of the two that did not, and it reported
<b>850 GB/s on a 227 GB/s bus</b>.</figcaption>
</figure>

A rule that lives in fourteen copies is not a rule. It is a habit, and habits
fail exactly when you are busy. The fix is not more discipline. It is one
implementation with the rules welded in, so that reaching for it is easier than
reaching around it.

## 4. Truth is arithmetic, not another implementation

The first rule. Score against an fp64 reference computed from the same inputs,
never against a library.

This is not pedantry. cuBLAS's default bf16 path reduces partial sums in reduced
precision; setting `CUBLAS_MATH_DISALLOW_REDUCED_PRECISION_REDUCTION` cuts its
own worst sampled error from **7.6e-1 to 3.9e-3**, a factor of 200. Score
against it and you mark a correct kernel wrong for being *more* accurate than
its reference.

```python
def sample_truth(x, w, n=512, seed=0):
    """A spread sample of x @ w, recomputed in double on the device."""
    rows = torch.randint(0, x.shape[0], (n,), generator=g).to(x.device)
    cols = torch.randint(0, w.shape[1], (n,), generator=g).to(w.device)
    return rows, cols, (x[rows].double() * w[:, cols].double().T).sum(dim=1)
```

## 5. Scale the metric to the output

The second rule, and the one I have got wrong in both directions.

Per-element *relative* error rejected all 188 configurations in a search at
K=4864, because a dot product of 4864 terms can cancel to near zero and a
half-ulp slip there reads as 76% error. So I moved to max error over the RMS of
the output — and that metric then reported **5.29e-02** for an attention kernel
that was bit-identical to production, because causal output magnitude falls from
0.82 at row 0 to 0.06 at row 511 and the ratio is an artifact of that spread.

Neither metric is wrong. Each is wrong somewhere. So the library names three
regimes instead of setting a threshold:

<figure>
{{svg:regimes}}
<figcaption>The verdicts are orders of magnitude apart, which is what makes this
a gate rather than a tuned threshold. A correct bf16 kernel sits within a few
ulp; a quantised one sits in the tens; a race or a wrong index is
O(1).</figcaption>
</figure>

## 6. What a sampled gate does not catch

An honest limitation, measured rather than asserted. I corrupted a known-good
output four ways and scored each both by sampling 512 elements and exhaustively:

<figure>
{{svg:sampling}}
<figcaption>Sampling catches the two systematic corruptions and <b>misses the
single zeroed element entirely</b> — as it must, since 512 samples of 155,648
elements miss one bad entry with probability 0.997. This is fine, and the reason
is worth stating: real kernel bugs are systematic. A race drops a tile, a wrong
index shifts a row, a bad group scale tilts a slab. Single-element corruption is
not a failure mode that kernels have.</figcaption>
</figure>

## 7. Stream if the workload streams

Rule three, and the one that cost me most. A timing loop over one weight matrix
measures L2, not DRAM. Decode reads 988 MB of distinct weights per step and
reuses none of them.

The library sizes the rotation from the device rather than a constant [5]:

```python
def rotation_for(bytes_per_input, factor=2.0):
    l2 = device.props()["l2_bytes"]
    return max(2, int(factor * l2 / max(bytes_per_input, 1)) + 1)
```

With one caveat I did not appreciate until writing the FlashAttention post:
**"does my benchmark reuse data" is the wrong question.** The right one is "does
the real workload reuse it". Weights stream once per step and are gone; a KV
cache is genuinely re-read every step for the life of the sequence. For the same
model, the two tensors want opposite treatment.

## 8. Interleave, capture, and report the spread

Three more rules, briefly, because they are each one line of consequence.

**Interleave.** Time the reference once and the candidate 156 times against
that single reading, and whatever was wrong with the one reading is now wrong
with all 156 ratios. That is how a 68.1% loss was reported as a 259.8% win.
Alternating rounds puts every drift on both sides of every ratio, where it
cancels. §11 is about how badly I misdescribed the *reason* for this rule.

**Capture in a graph.** Launch overhead is not the kernel. Eager timing said a
Triton kernel lost on 8 of 10 decode shapes; under CUDA graphs the same kernels
won 8 of 10. Triton's Python launch path costs about 20 µs against torch's 6, on
kernels that run for 6.

**Report the spread.** A median of 1.04 with an IQR of 0.4 is not a 4% win. The
library treats that as a verdict rather than a caveat:

> **NO DIFFERENCE:** 0.997× sits inside its own IQR (0.009). This is not a
> speedup.

The spread is also why the ratio is computed the way it is. Two obvious options
differ more than they look:

```python
median([r / c for r, c in zip(refs, cands)])   # median of ratios
median(refs) / median(cands)                   # ratio of medians
```

Interleaving pairs each reference round with the candidate round beside it, so
the first form subtracts whatever drift the two shared — they ran a few hundred
microseconds apart. The second form throws that pairing away and compares two
summaries of the whole run, which reintroduces exactly the drift the
interleaving was there to cancel. `attest` uses the median of ratios, and the
IQR it reports is the IQR of those per-pair ratios, which makes it a spread of
the effect rather than a spread of the timings. That distinction is what lets
the `NO DIFFERENCE` rule above be a one-line comparison instead of a t-test.

## 9. The check that actually catches things: divide

Every rule above is preventative. One check is diagnostic, and it is the one
that has caught the most: **compute the implied bandwidth and compare it to a
bus width you measured on the same machine.**

```
IMPLAUSIBLE: implies 348 GB/s on a 227 GB/s bus.
             The inputs are being served from cache, not memory.
```

That is one division. It caught the 169% in Part 2 and the 850 GB/s in Part 4,
and in both cases the *ratio* looked entirely reasonable — 1.69× and 2.05× are
plausible numbers for a kernel change. The physics is what gave it away.

The library measures the bus itself rather than trusting a datasheet, and gets
**226.9 GB/s** on a card whose spec sheet says 256.

Which is itself a rule worth stating: the ceiling has to come from the machine
in front of you, in the state it is actually in. There are two separate
subtleties here that I got wrong in turn.

The first is *whose* ceiling. Copy bandwidth (226.4 GB/s) and read-only
bandwidth (250.1 GB/s) are different numbers on the same bus, because a copy
moves every byte twice. A weight-streaming GEMM reads far more than it writes,
so the copy figure is the wrong ceiling for it — and using it, my `lm_head`
measurement came out at "105% of the bus" and was flagged `IMPLAUSIBLE` while
being perfectly legitimate. A false positive on the one check I trusted most is
worse than no check, so `attest` measures both and compares against the read
figure.

The second is the state of the machine. Before any of this runs, the library
refuses to measure at all if something else is on the GPU:

```
RuntimeError: other processes hold the GPU: 3821, chrome
```

That is not fastidiousness. With a browser holding a few hundred megabytes and
a compositor waking up 60 times a second, the same bf16 matmul measured
**17.7 TFLOPS on an idle card and 11.5 TFLOPS with a desktop session on it** —
a 35% haircut that belongs to neither the kernel nor the harness, and that
drifts as the user scrolls. Every rule below is worthless if the measurement is
sharing the device, so this one runs first and raises rather than warns.

## 10. The attestation

Which brings me to the actual proposal. A speedup, on its own, is unfalsifiable.
"1.67×" tells you nothing about whether the inputs streamed, whether the clocks
moved, whether launch overhead dominated, or whether the output was ever
checked.

So the library does not return a number. It returns a record:

```
OK down_proj      2.334x  (iqr 0.020)  cand 21.7us  ref 50.6us
     rotation=16 graphs=True rounds=8 clk 2250->2250MHz implied=201GB/s
     correctness: lossy (2.24e-02)
```

Rotation of 16, so the working set exceeded L2. Graphs on, so launch cost is
excluded. Eight interleaved rounds, clocks flat at 2250 MHz across them. An
implied 201 GB/s, under the measured 227. Correctness "lossy" at 2.2e-2, which
is what int8 should be. **Every claim I would otherwise have to take on trust is
in the line.**

The machine-readable form is the one that matters, because it is what a loop
consumes:

```json
{
  "speedup": 2.334, "iqr": 0.02, "range": [2.31, 2.36],
  "cand_us": 21.7, "ref_us": 50.6,
  "measured_bus_gb_s": 226.9, "implied_gb_s": 201.2,
  "conditions": {
    "rotation": 16, "cuda_graphs": true, "interleaved_rounds": 8,
    "clock_before_mhz": 2250, "clock_after_mhz": 2250
  },
  "correctness": { "score": 0.0224, "verdict": "lossy" },
  "flags": [], "trustworthy": true
}
```

`trustworthy` is not a quality judgement about the kernel. It says only that
nothing about *how this was measured* tripped a check. A flagged record is not
necessarily wrong either — `CACHED` is correct behaviour for a KV cache. The
flag means a human has to decide, and the record gives them what they need to.

## 11. I went to demonstrate one rule, and it did not survive

Every rule in §8 is stated with a number attached. While assembling this post I
decided to stop asserting the interleaving one and demonstrate it, on the
grounds that a post about evidence should not contain a claim I had never
checked. It took three attempts and the first two failed in different ways.

**The clock figures were never measured.** Nine files across two repositories
justify interleaving with the same sentence: *this laptop drops 3105 → 1200 MHz
under load*. 3105 MHz is `sm_max_mhz` — the advertised boost ceiling, which
`nvidia-smi` will hand you on an idle card. It is a spec number. I had put it on
one side of an arrow, a round number on the other, and repeated the pair for
four months. My own archived logs say the observed range is **2505 MHz at 70 °C
down to 1335 MHz at 91 °C**, with the power-cap throttle bit `0x20` set: a 1.88×
spread, not the 2.6× I kept quoting.

**And the headline number was not thermal at all.** Going back to
`tune_bf16.json`, the 259.8% that [Part 2](blog.html?post=decode_roofline)
opens with decomposes as: candidate 9.034 µs in the sweep and 9.037 µs in the
A/B — unchanged — while cuBLAS read 0.0235 ms cold and 0.0062 ms interleaved.
The entire 3.81× error is in the reference, and the GPU state logged with that
run is `2490 MHz, 85 °C, throttle 0x00`. The card was not throttling. It was
cuBLAS's first call on that shape, paying for heuristic selection and kernel
load exactly once, with nothing to amortise it against.

**Then the demo measured an idle GPU.** My first attempt timed the same function
for thirteen minutes and reported 1.000× under both protocols, which I briefly
took for a result. It called `nvidia-smi` once per iteration to record the
clock; that call takes about 35 ms against 2.6 ms of GPU work, so the card sat
idle between samples at 38 W and never heated. I had built an instrument that
reported the absence of an effect it was preventing.

Sampling the clock on a timer instead fixes it, and the third attempt is the
experiment I wanted:

<figure>
{{svg:thermal}}
<figcaption>53,909 timings of one unchanged 2048³ bf16 matmul over 780 seconds,
GPU pinned at its 80 W cap and 87 °C. The clock falls from 2490 to 1965 MHz and
the same function slows <b>14%</b>. Timed sequentially — reference first, then
candidate — that drift becomes a <b>12.2% error</b> on a ratio whose true value
is 1.000. Interleaved, it is 0.0%.</figcaption>
</figure>

So the rule stands, and it is worth its 12.2%. What did not stand is the reason
I had been giving for it and the size I had been claiming. Thermal drift on this
card is a 12% effect that needs thirteen minutes of saturation to develop, not a
372% one that appears in a minute — and the measurement I had been citing as its
consequence was caused by something else entirely.

The uncomfortable part is not the error. It is that this is a post about making
measurements carry their evidence, and the most-repeated claim in the project
carried none. `3105 → 1200` propagated through nine files because it was
memorable and directionally true, and nothing in my process distinguishes a
number I measured from a number I wrote down. The records in §10 exist so that
*speedups* cannot do this. The prose around them still can.

## 12. The lies, caught automatically

The demonstration. Same kernel, same GPU, same afternoon — only the harness
differs:

<figure>
{{svg:caught}}
<figcaption>The library was not told what to look for. Fixing only the
measurement moved <code>gate_up</code> from 50.0 to 81.3 µs — <b>1.63×</b> — and
<code>o_proj</code> at M=1 from 24.3 to 10.3 µs — <b>2.4×</b>. No kernel
changed. A reported speedup of 1.6× is entirely available from harness choices
alone.</figcaption>
</figure>

That last sentence is the whole argument for doing this. If the harness is worth
1.6× on its own, then any agent loop optimising against a naive harness has 1.6×
of free reward available that has nothing to do with the kernel — and gradient
descent, or an LLM, will find it.

## 13. And a real claim, passing

The other half of a useful gate is that it lets good work through.

<figure>
{{svg:attested}}
<figcaption>The Triton W8A16 kernel against cuBLAS bf16 at M=1, run through the
library. Four of four carry no flags: every implied bandwidth under the measured
bus, every IQR below 2% of the effect, every correctness score in the "lossy"
band where int8 belongs. The speedups, 1.67× to 2.33×, agree with the 1.69–2.21×
Part 3 measured by hand — which is the result I wanted, because the library was
built to reproduce that discipline, not to improve on it.</figcaption>
</figure>

## 14. One rule that is not universal

Every rule above is stated as if it always applies. One of them does not, and
the exception took me until the FlashAttention post to notice.

Rotation exists because weights stream: decode reads 988 MB of distinct weights
per step and reuses none of them, so a benchmark that re-reads one matrix is
measuring L2. But a KV cache is the *same bytes*, re-read on every decode step,
for the life of the sequence. Caching it is what the hardware is supposed to do,
and a benchmark that rotates KV tensors past L2 is now the one telling the lie.

So the library flags `CACHED` rather than refusing, and the flag text says so:
*"raise the rotation unless the real workload also re-reads these bytes"*. The
question is never "does my benchmark reuse data". It is "does the real workload
reuse it", and for two tensors in the same model the answers differ.

## 15. What it cannot do

Being clear about the edges, since the point of the thing is honesty.

**It cannot tell you a tight loop is the wrong workload.** The single largest
gap in my series — a configuration that measured 1.22× in a tuner and 0.85×
inside a model — produces no flags at all. Both measurements are clean. They are
measurements of different things, and no amount of harness rigour inside one of
them detects that. The only fix is to also measure the real workload.

That gap deserves a sentence more, because it is the one I would most like to
close and cannot. Every rule in this post makes a measurement more faithful *to
the thing it measures*. None of them has any opinion about whether that thing
resembles the deployment. A tight loop over one shape with warm caches, perfect
clocks, no other kernels competing for L2 and no scheduler contention is a
beautifully rigorous measurement of a situation that never occurs. The flags
will all be clear. The number will still be wrong by 40%, in the direction that
flatters you, and the only instrument that detects it is running the model.

**It cannot fix your test matrix.** A `cp.async` race that was correct below 600
blocks and wrong at 1187 is not a measurement problem; it is a coverage problem.
`attest` verifies the shapes it is handed. Choosing them is still a human
judgement, and mine was wrong by a factor of two.

**It cannot catch a single bad element**, per §6, and does not claim to.

## 16. Why this matters more with an agent in the loop

Autoresearch's guardrail is a fixed five-minute budget, and that is a good
guardrail — it closes the most obvious exploit. But it says nothing about
whether the thing being timed streamed its inputs, whether the clocks drifted
across the run, or whether the output was ever compared against arithmetic.

A human running 20 experiments a week eventually squints at a suspicious number.
An agent running 100 a night does not squint, and a loop that keeps whatever
improves the metric will find the 1.6× that lives in the harness before it finds
the 1.6× that lives in the kernel. That is not a hypothetical failure of
alignment; it is the cheapest available gradient.

And it is worth being concrete about what "in the harness" means, because none
of these require the agent to do anything adversarial. Every one of them is a
locally sensible edit that a hill-climb on wall-clock time would accept:

- **Shrink the tile** until the working set fits in L2. Perfectly reasonable
  tuning move, and it buys 1.7× of cache rather than kernel.
- **Reduce the rotation** to one buffer, because allocating sixteen is slow and
  the code looks cleaner. Same effect, arrived at by tidying.
- **Cut the warmup**, because warmup is dead time in a five-minute budget. This
  is the thermal lie, and a budget-constrained agent is *positively incentivised*
  toward it.
- **Loosen the tolerance** on the correctness check until the candidate passes.
  One constant, and the diff reads like calibration.
- **Reorder** so the candidate runs after the reference in a single pass, which
  is what any straightforward benchmark script does anyway.

Not one of those is a lie the model tells. They are all lies the *protocol*
tells, and the model simply keeps whichever one scores. Which is why the fix
cannot be a better-behaved model: the record has to make the conditions part of
the result, so that "this ran with rotation=1" is data the accept condition sees
rather than an invisible property of how the experiment happened to be written.

Concretely, an autoresearch-shaped loop with this in it changes in one place.
Instead of

```python
if new_time < best_time:      # keep it
```

the accept condition reads the record:

```python
rec = attest(candidate, baseline, inputs)
if rec["flags"]:              # the measurement is not admissible
    reject(rec["flags"])
elif rec["correctness"]["verdict"] == "WRONG":
    reject("output does not match arithmetic")
elif rec["speedup"] - 1 > rec["iqr"]:
    accept(rec)               # a real effect, larger than its own spread
```

Three of those four branches have nothing to do with speed. That ratio is the
argument: in my own four posts, the mistakes that cost the most time were never
in the kernel.

There is a version of this I have not built and would want before trusting an
agent with it. The flags say a measurement is inadmissible; they do not say what
to do instead. The [compiler-grounded diagnosis
work](https://arxiv.org/abs/2607.23089) [4] goes the other way — escalating from
profiling to IR attribution to compiler analysis, and reporting *why* a kernel
is slow rather than that it is, for a 4.35× geometric mean on their benchmark.
An evaluator that both refuses bad measurements and explains the good ones is
the thing worth handing to a loop. This is half of it.

The library is about 400 lines. Every rule in it was bought with a wrong number
I published or nearly published, and the module docstrings say which.

[1] Andrej Karpathy, [autoresearch](https://github.com/karpathy/autoresearch). The loop is three files and a five-minute budget; the design is worth reading precisely because it is so small.
[2] Prime Intellect, [Prime Agent](https://www.primeintellect.ai/blog/prime-agent). The RLM and Continual Harness abstractions, the ARC-AGI-3 result, and the Factorio reward-hacking observation.
[3] [Towards Automated Kernel Generation in the Era of LLMs](https://arxiv.org/html/2601.15727v3), 2026. The survey whose open problems this post is a response to; also the source of the KernelBench figures.
[4] [Compiler-Grounded Hierarchical Diagnosis for LLM-Based Triton Kernel Optimization](https://arxiv.org/abs/2607.23089), 2026. 4.35× geomean on NPUKernelBench by escalating from profiling to IR attribution before rewriting — the diagnosis direction this library's flags only gesture at.
[5] All measurements are from an RTX 4060 Laptop (sm_89, 24 SMs, 8 GB, 226.9 GB/s measured device-to-device, 33.55 MB L2), torch 2.13.0+cu130, Triton 3.7.1.
