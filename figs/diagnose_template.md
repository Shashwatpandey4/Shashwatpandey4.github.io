title: Why Is This Kernel Slow: A Diagnosis Ladder for Triton
date: September 19, 2026
author: Shashwat Pandey

---

*A profiler tells you a kernel is slow. It does not tell you why, and the
difference matters: three of my five decode shapes turn out to have nothing left
to win, and knowing which three is worth more than any optimisation. This is a
five-rung diagnosis ladder applied to kernels I have already published — and it
found a bug in itself, and another in the library I shipped three days ago.*

## 1. "Slow" is not a diagnosis

Every kernel post I have written ends with a number. This one starts from a
complaint about them: a speedup, or a percentage of peak, tells you where you
are without telling you what is holding you there.

That distinction is the premise of the [compiler-grounded diagnosis
work](https://arxiv.org/abs/2607.23089) [1], which puts it better than I would:
profiling metrics "reveal that a kernel is slow, but not why the backend
compiler fails to realize a profitable optimization." Their answer is to
escalate — from profiling, to IR attribution, to compiler analysis — and only
rewrite source once the evidence points somewhere. They report a 4.35×
geometric mean on NPUKernelBench doing it.

I wanted to know what that looks like on kernels whose numbers I already know,
so I built the ladder and pointed it at my own five shapes.

Rung 1 is the one everybody already has, and it is worth being precise about why
it is not enough. "7.0 µs" is not a diagnosis. Neither is "1.67× faster than
cuBLAS", because a ratio tells you about the other implementation, not about the
ceiling. The question rung 1 can never answer is *how much is left* — and
without that, every subsequent hour is speculative. You can spend a week making
a kernel 5% faster and never learn that it was already at 95% of what the
hardware can do.

<figure>
{{svg:ladder}}
<figcaption>Five rungs, cheapest first. Only rung 1 needs to run the kernel;
everything above rung 2 is static and byte-identical every time. The ordering is
the point — most kernels are explained at rung 2, and only the survivors are
worth reading IR for.</figcaption>
</figure>

The escalation is not just tidiness, it is an economic argument. Rungs 1 and 2
need a warm GPU, exclusive access, a rotation past L2 and eight interleaved
rounds — in other words everything the previous post was about, and tens of
seconds per shape. Rungs 3 to 5 need a compile and a handful of regexes over
files on disk: no GPU contention, no thermal state, no measurement hygiene at
all, because nothing is being timed. They are close to free and perfectly
reproducible.

Which means the expensive rung is the one you must do first, and the cheap rungs
are the ones you are tempted to skip. That is exactly backwards from how it
feels, and it is why I ordered the ladder explicitly rather than reaching for
whichever tool was nearest.

Timing comes from [`attest`](blog.html?post=attest_harness), the harness from the
previous post [4], so every number here arrives with rotation past L2, CUDA
graphs, interleaved rounds and an fp64 correctness gate already applied. That
dependency direction matters: a diagnosis is only as good as the measurement it
starts from, and rung 1 is the only rung that can lie to you.

## 2. Rung 2 needs a ceiling, and mine was wrong

The first real rung asks which wall you are against: divide bytes by time and
compare to bandwidth, divide flops by time and compare to peak.

Immediately, a problem. `lm_head` measured **238.5 GB/s** against a bus I had
measured at **226.4** — 105%, which is impossible. I had published that
measurement three days earlier as the plausibility check in `attest`.

<figure>
{{svg:ceiling}}
<figcaption>The reference was wrong, not the kernel. A device-to-device copy
moves every byte twice through the controller and lands about 10% below a pure
read. A weight-streaming GEMM reads far more than it writes, so the copy figure
is the wrong ceiling for it. Against the read ceiling, <code>lm_head</code> sits
at 95% — memory bound and entirely legitimate.</figcaption>
</figure>

This is a small fix with an annoying lesson attached. The whole argument of the
previous post was that dividing bytes by time is the check that catches what
ratios hide. It is — but it inherits the quality of its denominator, and I had
picked a denominator that was 10% too tight for every read-dominated kernel I
would ever point it at.

Getting that number right matters more than it sounds, because rung 2 is the
only rung whose output is a *budget*. Every rung above it spends effort against
a prize that rung 2 sizes. If the ceiling is 10% too low, every shape looks
closer to finished than it is and real work gets abandoned; 10% too high and you
chase a gap that does not exist. It is the one measurement in the ladder where
being approximately right is not good enough, and it is also the one people
most often take from a spec sheet.

## 3. Three of five shapes are finished

With the ceiling corrected, rung 2 answers the question it exists for:

<figure>
{{svg:bound}}
<figcaption>Every decode shape at M=1. <b>Three are at the wall</b> — 80%, 82%
and 95% of the read ceiling — and no amount of kernel work moves them, because
the bytes have to cross the bus regardless. Two sit at 56–59%, and those are the
only two where the remaining rungs can say anything useful. Note the flops
column: every shape is at 1–2% of the tensor-core peak, which is what decode
looks like.</figcaption>
</figure>

I want to dwell on this, because it is the single most useful output of the
exercise. **Three of five shapes have nothing left.** Any time spent optimising
`gate_up`, `down_proj` or `lm_head` further is spent against physics. An agent
loop pointed at those three would burn a night finding nothing, and — worse —
would eventually find something, because a benchmark that cannot be beaten
honestly can still be beaten dishonestly.

There is a second reading of that table worth spelling out. Look at the flops
column: **every shape is at 1–2% of the tensor-core peak**. A profiler that
reports "low SM utilisation" or "poor tensor-core occupancy" would light up red
on all five, and would be useless, because at M=1 there is precisely one row of
output per weight matrix and no arithmetic to do. A metric that is alarming on
every input is not a diagnostic. This is why rung 2 asks *which* ceiling rather
than how close you are to a fixed one — the answer for decode is almost always
memory, and the interesting question is how close.

It also sets the prize for everything below. `qkv_proj` and `o_proj` are leaving
41% and 44% of the read ceiling on the table. That, and nothing larger, is what
rungs 3 to 5 are competing for.

## 4. Rung 3: occupancy, and what actually caps it

For the two shapes that survive, the next rung reads registers, spills and
shared memory off the compiled kernel — static, no profiler required. Triton
hands these over directly [3]:

```python
k = matching_cache_entry(jit, cfg)
k.n_regs, k.n_spills, k.metadata.shared      # 96, 0, 37632
```

and the occupancy arithmetic is integer division against the Ada limits [2]:
64K registers and 100 KB of shared memory per SM, 1536 resident threads.

No spills anywhere, which rules out the obvious. But occupancy is **17%** on four
of five shapes, and the arithmetic says why:

<figure>
{{svg:occupancy}}
<figcaption>Blocks per SM, limited by registers and by shared memory
independently. Shared memory wins from three stages upward, and it scales
<b>linearly with pipeline depth</b> — 12,544 bytes per stage at BN=64. The
configuration I shipped in Part 4 used four stages, which is precisely the point
where smem takes a block per SM away.</figcaption>
</figure>

That is a hypothesis, not a conclusion: *the depth I chose to hide latency is
the thing capping occupancy*. Rung 3's job is to produce exactly this kind of
testable statement, and the test is cheap.

It is worth saying what occupancy is for, because 17% sounds alarming and often
is not. Occupancy is how many warps the scheduler has available to switch to
when one stalls on memory. It is a *latency-hiding budget*, not a utilisation
figure — a kernel at 17% occupancy that never stalls is perfect, and a kernel at
100% occupancy waiting on DRAM is not. So low occupancy is only a diagnosis when
paired with a stall the kernel cannot hide, which is why this rung sits above
rung 2 rather than replacing it. On the three shapes already at the memory wall,
occupancy is irrelevant by construction: there is no latency to hide that more
warps would help with, because the bus is the constraint and more warps do not
widen the bus.

There is also a reason this rung is static rather than profiled. `n_regs`,
`n_spills` and `metadata.shared` are properties of the compiled binary, so
reading them costs a compile and no GPU time at all, they are identical on every
run, and they are available before the kernel has ever been launched. A profiler
would give the same numbers plus a great deal else, at the cost of serialising
the kernel and perturbing exactly the timings rung 1 just established.

## 5. Acting on it

<figure>
{{svg:depth}}
<figcaption>Sweeping the variable rung 3 implicated, timed through
<code>attest</code>. The diagnosis is <b>partly</b> right. On
<code>qkv_proj</code> two stages and three stages have identical occupancy (33%)
yet differ by 1.46× — so depth buys something independent of occupancy. And
<code>down_proj</code> is emphatic in the other direction: dropping to two
stages costs it <b>1.8×</b>.</figcaption>
</figure>

The honest summary is that occupancy was a real constraint and an incomplete
explanation. What comes out is a rule with a shape to it:

> Pipeline depth pays until shared memory costs you a block per SM. Where that
> crossover sits depends on whether the shape is already at the wall.

`gate_up`, at 82% of the ceiling, wants the **minimum** depth — it has no latency
left to hide and every extra stage is pure occupancy cost. `down_proj`, with
K=4864, has the most reduction to hide and needs depth badly enough to pay for
it. The two small shapes sit in the middle at three.

Against the configs I actually shipped in Parts 3 and 4, this is worth 9% on
`qkv_proj`, 1.4% on `gate_up`, and nothing on the other two. Small — but I
would not have found them by guessing, and more to the point I now know *why*
each shape wants what it wants.

## 6. Rung 4: what the compiler decided

Above rung 3, the questions stop being about resources and start being about
choices. The TritonGPU IR records them, and unlike everything below it, it
records them in a form that says *why*. What the ladder pulls out of `qkv_proj`'s
`ttgir` is six numbers:

```
async_copies    12      cp.async issued in the loop body
local_allocs     3      shared-memory buffers
dot_ops         14      tt.dot operations
convert_layouts  1      layout reconciliations
divisibility    10      pointer alignment the compiler proved
warps_per_cta  4, 1     how the 4 warps tile the output block
```

`warps_per_cta = 4, 1` is warptiling — Part 1's rung 6, which I implemented by
hand in CUDA and which here is a consequence of passing `num_warps=4` and a 16×64
block. `divisibility = 10` is the compiler having proved the pointers are
1024-byte aligned, which is the precondition for the vectorised loads that were
Part 1's rung 4. Neither appears in the Triton source. Both appear here.

What I look for at this rung is mismatch, and `convert_layouts` is where it
shows: a layout reconciliation is the compiler discovering that the layout a
value was produced in is not the one its consumer wants, and fixing it by
round-tripping through shared memory. One per kernel, outside the loop, is
setup. The same operation *inside* the `K` loop would run once per iteration —
38 times for `down_proj`, whose K=4864 at BK=128 gives 38 trips — and would be
the whole diagnosis. The count is what
distinguishes those two cases, and nothing at rungs 1 to 3 can tell them apart,
because both look like "slower than it should be".

<figure>
{{svg:emitted}}
<figcaption>Rungs 4 and 5 across all five shapes. The async-copy count tracks
pipeline depth, as it should. One <code>convert_layout</code> everywhere —
Triton is moving between layouts once per kernel, which is cheap but not free.
And the row that matters: <b>LDSM is zero on every shape.</b></figcaption>
</figure>

This is the rung where Part 1's optimisations stop being things I wrote and
become things I can only read. Warptiling, vectorised loads and the pipelining
that `async_copies` counts are all present in these kernels, but I did not write
any of them and cannot address them directly. The only handles are `BLOCK_*`,
`num_warps` and `num_stages` — three integers standing in for nine hand-written
rungs — and rung 4 is how you find out what the compiler did with them.

## 7. Rung 5: the instruction that is never there

Rung 5 stops caring what the compiler decided and asks what came out. Two greps,
one over the PTX and one over the disassembled SASS:

```
$ grep -c 'mma.sync'  kernel.ptx     16
$ grep -c 'ldmatrix'  kernel.ptx      0
$ grep -c 'HMMA'      kernel.sass    16
$ grep -c 'LDSM'      kernel.sass     0
```


[Part 4](blog.html?post=triton_mlir_llvm) had found that at an identical tile
config, the hand-written `mma.sync` kernel was 1.85× faster than Triton on
`gate_up`, and traced it to one instruction family: eight `ldmatrix` in the
CUDA kernel, zero in Triton, confirmed in PTX and again in SASS.

That was one shape and one config. It holds across all five. Triton emits the
same MMA instructions — 16 or 32 `HMMA` depending on `BN` — and feeds them with
ordinary shared-memory loads rather than `ldmatrix`.

I want to be careful about what this does and does not license. It is **not** a
claim that emitting `LDSM` would make these kernels faster. Three of the five
shapes are at the memory wall, where the instruction that feeds the MMA cannot
matter. The honest statement is narrower and more useful:

> The `ldmatrix` gap is a real codegen difference, it is consistent across
> shapes, and it can only pay on the two shapes that are not bandwidth-bound —
> which are the two smallest.

That is a much less exciting conclusion than "I found a compiler bug worth
1.85×", and it is the one the evidence supports. The difference between the two
statements is rung 2. Without a ceiling, "Triton never emits `ldmatrix`, and the
kernel that does is 1.85× faster" is an extremely tempting causal story, and I
would have had no instrument for resisting it. With a ceiling, three of the five
shapes are ruled out before the question is even asked, and the claim shrinks to
something I can defend. Chasing it into the TritonGPU
lowering is the obvious next thing, and rung 2 says the prize is bounded by the
41% of the ceiling that `qkv_proj` and `o_proj` are leaving on the table.

## 8. The ladder found two bugs, one in itself

<figure>
{{svg:bugs}}
<figcaption>Both were caught by an impossible number rather than by a wrong one.
Shared memory cannot be identical across four pipeline depths; a kernel cannot
read 105% of the bus. Neither would have been visible as a slightly-off ratio,
which is the same lesson as the previous post arriving from the other
direction.</figcaption>
</figure>

The first is mine and it is embarrassing in a specific way. `resources()` read
`list(cache.values())[-1]` from Triton's JIT cache — the *most recently
compiled* kernel, not the one just launched. Once a config had been compiled
earlier in the sweep, the reader silently returned a different kernel's numbers.
It reported identical shared memory for four different depths, which is
impossible, which is the only reason I looked.

The second is in `attest`, published three days before this, and is the ceiling
problem from §2.

What the two have in common is more specific than carelessness. In both cases
the wrong number was *plausible in isolation*. 37,632 bytes of shared memory is
an entirely reasonable figure; 238 GB/s is an entirely reasonable figure. Each
became visible only in relation to something else — the same value repeating
where it had to change, and a value exceeding a bound it could not exceed. A
number that can only be checked against intuition cannot be checked at all, and
intuition is exactly what an agent loop does not have.

Both are the same failure: a tool that reports a number without any way to
notice that the number is absurd. The diagnosis ladder catches these because
every rung has a physical bound attached — smem must scale with depth, bandwidth
cannot exceed the bus, occupancy is a ratio of integers. Numbers with bounds are
auditable. Numbers without them are decoration.

## 9. What the ladder cannot tell you

**It cannot tell you the shape is the wrong shape.** Rung 2 says `gate_up` is at
82% of the ceiling and finished. It cannot say that quantising the weights would
halve the bytes and move the ceiling, which was the entire point of Part 3. The
ladder optimises within a problem; it does not question the problem.

**It stops where the compiler becomes a black box.** Rung 5 reads what `ptxas`
emitted. It cannot say why `ptxas` chose it, and on NVIDIA hardware there is no
rung 6.

**It has nothing to say about end-to-end impact.** Every number here is one
kernel in isolation. Part 3 spent 4,000 words on the gap between that and a
model, and nothing in this ladder closes it.

**It diagnoses one configuration, not a kernel.** Everything above is M=1 with
one tile config per shape. The `LDSM` result happens to hold across all five,
but "Triton never emits `ldmatrix`" is a claim about five points in a space with
thousands of them, and I have not earned the general version. §5's depth sweep
is the same caution in miniature: the answer changed per shape, and it would
have been easy to measure one shape and generalise wrongly.

## 10. What I would build next

The thing I actually want is the loop: a ladder whose output is a *hypothesis
with a test attached*, run automatically. Rung 3 produced "shared memory caps
occupancy, try fewer stages" and I ran that sweep by hand in ten minutes. There
is no reason a harness could not propose it, run it through `attest`, and keep
the result only if the measurement is admissible.

That is the shape of the thing worth handing to an agent, and it is the
difference between the two open problems the field lists. Generation is solved
well enough to be interesting. Knowing whether the generated thing is better,
and *why*, is still done by hand — and when I do it by hand I get it wrong about
as often as I get it right.

There is also a smaller, more concrete thing I would do first, because this
exercise made it obvious. Rung 2 should run *before* any optimisation work is
authorised, on every shape, and its output should be a budget rather than a
score: `gate_up` has 18% of the ceiling left, `qkv_proj` has 41%, `lm_head` has
5%. Those three numbers would have redirected a meaningful fraction of the last
four posts. I spent time tuning shapes that had nothing to give because I was
measuring speedups against cuBLAS rather than distance from the wall, and a
ratio against another implementation will happily let you optimise something
that is already finished.

[1] [Compiler-Grounded Hierarchical Diagnosis for LLM-Based Triton Kernel Optimization](https://arxiv.org/abs/2607.23089), 2026. The escalation idea, and a 4.35× geometric mean on NPUKernelBench applying it to Ascend NPUs.
[2] Occupancy arithmetic for Ada is in the [CUDA C++ Programming Guide](https://docs.nvidia.com/cuda/cuda-c-programming-guide/index.html#compute-capability-8-x): 64K 32-bit registers and up to 100 KB of shared memory per SM, 1536 resident threads.
[3] Triton exposes `n_regs`, `n_spills` and `metadata.shared` on the compiled kernel, and dumps `ttir`/`ttgir`/`llir`/`ptx`/`sass` under `TRITON_KERNEL_DUMP=1`. Both are what rungs 3 to 5 read.
[4] All measurements are from an RTX 4060 Laptop (sm_89, 24 SMs, 8 GB), Triton 3.7.1, torch 2.13.0+cu130, at M=1 on Qwen2.5-0.5B's projection shapes. Read ceiling 250.0 GB/s, copy 226.4 GB/s, bf16 peak 28.41 TFLOP/s. Timings via `attest`.
