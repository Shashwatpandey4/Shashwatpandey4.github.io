title: Why Is This Kernel Slow
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

<figure>
{{svg:ladder}}
<figcaption>Five rungs, cheapest first. Only rung 1 needs to run the kernel;
everything above rung 2 is static and byte-identical every time. The ordering is
the point — most kernels are explained at rung 2, and only the survivors are
worth reading IR for.</figcaption>
</figure>

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

`gate_up`, at 90% of the ceiling, wants the **minimum** depth — it has no latency
left to hide and every extra stage is pure occupancy cost. `down_proj`, with
K=4864, has the most reduction to hide and needs depth badly enough to pay for
it. The two small shapes sit in the middle at three.

Against the configs I actually shipped in Parts 3 and 4, this is worth 9% on
`qkv_proj`, 1.4% on `gate_up`, and nothing on the other two. Small — but I
would not have found them by guessing, and more to the point I now know *why*
each shape wants what it wants.

## 6. Rung 4: what the compiler decided

Above rung 3, the questions stop being about resources and start being about
choices. The TritonGPU IR records them.

<figure>
{{svg:emitted}}
<figcaption>Rungs 4 and 5 across all five shapes. The async-copy count tracks
pipeline depth, as it should. One <code>convert_layout</code> everywhere —
Triton is moving between layouts once per kernel, which is cheap but not free.
And the row that matters: <b>LDSM is zero on every shape.</b></figcaption>
</figure>

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
1.85×", and it is the one the evidence supports. Chasing it into the TritonGPU
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

[1] [Compiler-Grounded Hierarchical Diagnosis for LLM-Based Triton Kernel Optimization](https://arxiv.org/abs/2607.23089), 2026. The escalation idea, and a 4.35× geometric mean on NPUKernelBench applying it to Ascend NPUs.
[2] Occupancy arithmetic for Ada is in the [CUDA C++ Programming Guide](https://docs.nvidia.com/cuda/cuda-c-programming-guide/index.html#compute-capability-8-x): 64K 32-bit registers and up to 100 KB of shared memory per SM, 1536 resident threads.
[3] Triton exposes `n_regs`, `n_spills` and `metadata.shared` on the compiled kernel, and dumps `ttir`/`ttgir`/`llir`/`ptx`/`sass` under `TRITON_KERNEL_DUMP=1`. Both are what rungs 3 to 5 read.
[4] All measurements are from an RTX 4060 Laptop (sm_89, 24 SMs, 8 GB), Triton 3.7.1, torch 2.13.0+cu130, at M=1 on Qwen2.5-0.5B's projection shapes. Read ceiling 250.0 GB/s, copy 226.4 GB/s, bf16 peak 28.41 TFLOP/s. Timings via `attest`.
