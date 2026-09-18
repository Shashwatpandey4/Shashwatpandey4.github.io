title: Implementing FlashAttention in Triton
date: September 13, 2026
author: Shashwat Pandey

---

*FlashAttention, written from scratch in Triton and measured against PyTorch's
production implementation on a laptop GPU. The kernel comes out numerically
identical to NVIDIA's, reaches 92% of the bf16 tensor-core peak on prefill, and
is 5.2× faster on decode — of which only 1.2× is the kernel. The rest is a
detail about grouped-query attention that PyTorch's fast path cannot use.*

## 1. The matrix you must not build

Attention starts with a matrix multiply that produces one score per
(query, key) pair. For a sequence of length $S$ that is an $S \times S$ matrix,
per head, per batch element. Write it down for the shape this model actually
prefills at:

<figure>
{{svg:scores_matrix}}
<figcaption>The attention score matrix at prefill — batch 8, 14 heads, sequence
2048 — is <b>939.5 MB</b> in bf16. Every weight in Qwen2.5-0.5B is
<b>942.2 MB</b>. The intermediate is the size of the entire model, it exists
only to be immediately softmaxed and multiplied away, and in fp32 it is
1.88 GB.</figcaption>
</figure>

That coincidence is the whole motivation. [Part 2](blog.html?post=decode_roofline)
of my GEMM series spent 4,000 words on the fact that decode moves 942 MB of
weights per step and that this is the binding constraint. Attention, at prefill,
asks you to move the same quantity again — for a value that is thrown away on
the next line.

And it gets worse faster than anything else in the model. Every other cost here
is linear in sequence length: the weights don't grow at all, the KV cache grows
linearly, the activations grow linearly. The score matrix grows as $S^2$. Double
the context and the weights are unchanged while this doubles *twice*. At 8192
tokens and batch 8 it would be 15 GB, on a card with 8.

So you don't build it. That is what FlashAttention is [1]: not a faster matmul,
but an *arrangement* in which the big intermediate never exists.

## 2. Why you can't just tile it

The obvious fix is the one from Part 1: tile it. Take a block of queries, a
block of keys, compute that patch of scores in shared memory, use it, discard
it.

The problem is softmax.

<figure>
{{svg:softmax_problem}}
<figcaption>Softmax is not elementwise. Every output depends on a sum over the
<i>whole</i> row, and the numerically-safe form also needs the row's maximum
before it can exponentiate anything. A tile of scores cannot be turned into a
tile of probabilities, because the normaliser lives outside the tile. This is
why attention resisted tiling long after matmul stopped
resisting it.</figcaption>
</figure>

The textbook workaround is three passes over the row: one for the max, one for
the sum of exponentials, one to normalise. Three passes over an $S \times S$
matrix means building it, which is what we were trying to avoid.

## 3. Online softmax

The trick — which predates FlashAttention by four years [2] — is to keep a
running max and a running sum, and to *retroactively correct* both when a later
block turns out to contain something bigger.

Suppose you have processed some keys and hold a max $m$ and a sum
$\ell = \sum e^{s_i - m}$. A new block arrives with max $m'$. The new overall
max is $m_{\text{new}} = \max(m, m')$, and every term you already accumulated
was scaled by the wrong constant. Fixing it costs one multiply:

$$\ell_{\text{new}} = \ell \cdot e^{m - m_{\text{new}}} + \sum_{j \in \text{block}} e^{s_j - m_{\text{new}}}$$

<figure>
{{svg:online_softmax}}
<figcaption>Two blocks, worked through with real numbers. When block 2 turns out
to contain a larger score, the correction factor $\alpha = e^{m - m_{new}}$
rescales <i>both</i> the running sum and the accumulated output — and after
rescaling, the state is exactly what a single pass over both blocks would have
produced. Not an approximation: an
identity.</figcaption>
</figure>

The same factor $\alpha$ applies to the accumulated output, and that is the step
that makes the whole thing work. The running output is
$\text{acc} = \sum_i e^{s_i - m} v_i$ — an *unnormalised* weighted sum, deliberately
left undivided. Every term in it carries the same $e^{-m}$, so correcting all of
them at once is one scalar multiply, no matter how many keys are already folded
in. Then the single division by $\ell$ happens once, at the very end.

So the loop carries three things — $m$, $\ell$, and the running output — and
touches each key block exactly once. Memory is $O(BM \times BN)$ of shared
memory instead of $O(S^2)$ of DRAM, and the arithmetic is the same
count as before plus one multiply per block.

**It is exact.** Not "accurate enough": the rescaling is algebraically
equivalent to the three-pass version, so the only differences from a
naive implementation are floating-point rounding, which §6 measures.

## 4. What the kernel actually does

<figure>
{{svg:flash_loop}}
<figcaption>One program computes <code>BM</code> rows of output for one
(batch, head). It loads its queries once, then walks the keys in blocks of
<code>BN</code>: score, update the running statistics, accumulate, discard.
Everything in the dashed box lives in registers and shared memory and is never
written to DRAM. The <code>BM × BN</code> patch is the largest thing that
exists at any moment.</figcaption>
</figure>

In Triton the whole forward pass is about forty lines. The loop body:

```python
for start_n in range(0, hi, BN):
    kj = tl.load(k_ptr, mask=offs_n[:, None] < SK, other=0.0)
    s = tl.dot(q, tl.trans(kj)) * sm_scale
    if CAUSAL:
        s = tl.where((offs_m[:, None] + (SK - SQ)) >= offs_n[None, :],
                     s, float("-inf"))
    m_new = tl.maximum(m_i, tl.max(s, 1))       # running max
    alpha = tl.math.exp2((m_i - m_new) * 1.44269504)
    p     = tl.math.exp2((s - m_new[:, None]) * 1.44269504)
    l_i   = l_i * alpha + tl.sum(p, 1)          # rescale the past, add present
    acc   = acc * alpha[:, None]
    vj    = tl.load(v_ptr, mask=offs_n[:, None] < SK, other=0.0)
    acc  += tl.dot(p.to(vj.dtype), vj)
    m_i   = m_new
acc = acc / l_i[:, None]                        # one division, at the end
```

Two details worth pointing at. `exp2` with a $\log_2 e$ factor rather than
`exp`, because the hardware has a fast `ex2.approx` and no fast `e^x`. And
`p.to(vj.dtype)` — the probabilities are cast to bf16 to feed the tensor cores,
which is the one place the algorithm gives up precision it did not have to.
§6 shows production does exactly the same thing.

## 5. Causal masking is a free halving, if you let it be

One thing worth not getting wrong. With causal masking, a query at position $i$
can only see keys up to $i$, so roughly half the score matrix is structurally
zero. The naive implementation computes it anyway and then writes
$-\infty$ over it — that is what `masked_fill` does.

In the tiled form you can simply not loop over those blocks:

```python
hi = SK if not CAUSAL else tl.minimum(SK, (pid_m + 1) * BM + SK - SQ)
for start_n in range(0, hi, BN):
```

A block of queries needs keys only up to its own last row, so the loop bound is
a function of `pid_m`. Blocks entirely above the diagonal are never visited,
and only the one block straddling the diagonal needs an elementwise mask. That
is where about half of prefill's arithmetic goes — not saved by a faster
instruction, just never issued.

The `SK - SQ` offset is there for the case where the query block is shorter than
the key sequence, which is exactly what decode does: one new query row against
a long cache, where the query attends to *everything* and the causal bound is
vacuous.

## 6. Grouped-query attention, which turns out to matter

One shape detail, because it drives the largest number in this post. This model
has **14 query heads sharing 2 key/value heads** [3] — seven query heads read
the same K and V.

<figure>
{{svg:gqa}}
<figcaption>GQA 7:1. The KV cache is seven times smaller than the number of
query heads would suggest, which is the entire point of the design. In a kernel
it costs one line — <code>hkv = hq // 7</code> — and it means a decode step
reads 8.4 MB of KV instead of 58.7 MB. Hold on to that
ratio.</figcaption>
</figure>

## 6. Correctness: the same digits as NVIDIA's

Truth is an fp64 reference computed on the same inputs [5] — arithmetic, not
another kernel, per [Part 2](blog.html?post=decode_roofline)'s third lie.

<figure>
{{svg:correctness}}
<figcaption>Four implementations against an fp64 reference. My Triton kernel and
PyTorch's FlashAttention agree to <b>every digit reported</b>, and so do the two
non-flash paths. Flash is slightly <i>less</i> accurate than fp32 naive, by
construction — casting P to bf16 for the tensor cores — and production makes the
same trade, which is why the numbers match rather than merely being
close.</figcaption>
</figure>

Two implementations landing on identical error is much stronger evidence than
either being small. It says the kernels are doing the same arithmetic in the
same order, which is what you want from a from-scratch reimplementation.

## 7. A metric that lied, in a new way

The first correctness number I computed was **5.29e-02**, using the metric Part
2 settled on: max absolute error over the RMS of the truth. For a kernel that
turns out to be bit-comparable to production, that is an alarming number.

<figure>
{{svg:metric_lie}}
<figcaption>Why <code>max/RMS</code> is the wrong metric for causal attention.
Output magnitude falls by more than an order of magnitude down the sequence:
row 0 attends to exactly one key and <i>is</i> a whole <code>v</code> vector,
while row 2047 averages 2048 of them. The RMS is set by the many small rows, the
max error by the few large ones, and the ratio is an artifact of that spread.
<code>RMS(err)/RMS(truth)</code> is the honest number and reads
<b>1.98e-03</b>.</figcaption>
</figure>

Part 2's Lie 4 was that *relative* error is wrong where cancellation happens.
This is its mirror image: max-over-RMS is wrong where the output's own dynamic
range is large. Both come from the same root cause — a metric has to be
scaled by something representative of the quantity it is judging, and "the RMS
of the whole tensor" is only representative if the tensor is roughly uniform.

## 8. Prefill: 92% of the tensor-core peak

<figure>
{{svg:prefill_perf}}
<figcaption>Prefill attention is compute-bound, and the Triton kernel gets
close to the ceiling: <b>26.1 TFLOP/s at batch 8, or 92% of this GPU's measured
28.41 TFLOP/s bf16 peak</b>. Against PyTorch's FlashAttention it is 1.23× at
short sequences and 0.98× at the largest — parity where it matters. Against the
naive path, 17× to 45×.</figcaption>
</figure>

Two honest notes. The advantage at short sequences is fixed overhead, not
arithmetic — at 512 tokens the whole call is 29 µs and launch costs dominate
differently for the two paths. And at batch 8 sequence 2048, the shape a real
prefill uses, PyTorch is very slightly ahead. I would not ship this over
`flash_attn`; that was never the point.

## 9. Memory: the number that justifies the algorithm

<figure>
{{svg:memory}}
<figcaption>Peak memory for a single attention call, log scale. The naive path
needs <b>4.5 GB</b> for one prefill attention at batch 8 — on an 8 GB card —
against <b>30 MB</b> for flash. At decode the ratio reaches
<b>23,000×</b>, because flash's footprint does not grow with sequence length at
all while the score matrix grows linearly in it.</figcaption>
</figure>

This is why FlashAttention mattered more than its speedup. A 45× time saving is
excellent; being able to run the shape *at all* is categorical. Long-context
inference is not a faster version of short-context inference — without this
algorithm it is arithmetically impossible on this hardware.

## 10. Decode: 5.2×, and what it actually is

<figure>
{{svg:decode_decomp}}
<figcaption>Decode attention, one query row against a growing KV cache. Total
advantage over PyTorch's FlashAttention is <b>5.2× to 5.4×</b> — but it
factors. About <b>4.4×</b> comes from reading the GQA-native KV (2 heads)
instead of an expanded copy (14 heads), and only about <b>1.2×</b> is the
kernel. At Sk=128 the KV fits in L2, GQA buys nothing, and the remaining 4.7× is
fixed cost in SDPA's kernel at tiny sizes.</figcaption>
</figure>

I want to be careful here, because "5× faster than PyTorch's FlashAttention" is
the kind of claim that deserves suspicion, and when I first measured it I was
suspicious of it myself. So: the honest version is **1.2× faster kernel, and a
4.4× advantage from being allowed to exploit GQA.** Which raises the obvious
question.

## 11. What actually limits decode attention

Before accepting a 5× claim I ran [Part 2](blog.html?post=decode_roofline)'s
habit on it: divide bytes by time and compare against a bus width I measured
once.

| KV cache read | time | implied |
|---|---|---|
| 2.1 MB (Sk 128) | 17.0 µs | 123 GB/s |
| 16.8 MB (Sk 1024) | 103.8 µs | 162 GB/s |
| 67.1 MB (Sk 4096) | 456.6 µs | 147 GB/s |

All of it comfortably under the 227 GB/s this card measures, so nothing
impossible is being claimed — which is more than I could say for my first
attempt at Part 4's benchmark.

Two observations. First, at 123–162 GB/s decode attention is **not**
bandwidth-bound here; it has headroom against the bus, and what limits it is
elsewhere. Second, and more interesting: at the smaller cache sizes the whole KV
cache fits in this GPU's 33.55 MB L2. For the GEMM work that would have been a
measurement bug — Part 2's first lie was exactly that. Here it is not, because
**the KV cache genuinely is re-read every decode step.** Weights stream once per
step and are gone; the KV cache is the same bytes, every step, for the life of
the sequence. Caching it is what the hardware is supposed to do.

That distinction is worth holding on to. "Does my benchmark reuse data?" is the
wrong question. The right one is "does the real workload reuse it?", and for
these two tensors in the same model the answers differ.

## 12. Why PyTorch can't use GQA on its fast path

Because its flash backend requires the query, key and value tensors to have the
same number of heads [4]. Hand it `[B, 14, S, D]` queries and `[B, 2, S, D]`
keys and it declines.

There is an `enable_gqa=True` flag that accepts the mismatched shapes. It does
not help, and the way it fails is the interesting part:

<figure>
{{svg:sdpa_fallback}}
<figcaption>What <code>enable_gqa=True</code> does inside
<code>sdpa_kernel(FLASH_ATTENTION)</code>. The call succeeds and returns correct
numbers, and a warning stream nobody reads says <i>"Flash attention kernel not
used"</i> and <i>"runtime disabled"</i>. It silently ran the <b>math</b> backend
— the 4.5 GB one. Benchmarking against that and calling it FlashAttention would
have produced a 30× headline and a completely false
one.</figcaption>
</figure>

So the practical choice an SDPA user faces is: expand the KV cache to 14 heads
and read seven times the bytes to get the fast kernel, or keep GQA and get the
slow one. That is a real limitation with a real cost, and it is the single best
argument in this post for writing your own attention kernel — not because you
will beat NVIDIA's arithmetic, but because a library API can forbid something
your model does.

The check that caught it is three lines: run the call inside
`warnings.catch_warnings(record=True)` and assert that nothing says "not used".
Every backend-selecting API deserves that treatment.

## 13. And then I ignored my own advice

[Part 4](blog.html?post=triton_mlir_llvm) of the GEMM series ended with four
recommendations. The second was *autotune before you optimize*, on the grounds
that the config space was worth up to 3× and cost seconds to search.

I benchmarked this kernel with one config for every shape.

<figure>
{{svg:autotune}}
<figcaption>72 configs swept per regime. For prefill the single config I picked
was fine — within 1% of best. For decode it was <b>2.69× slower than
optimal</b>, because <code>BM=64</code> computes 64 rows of output when
<code>Sq=1</code> and throws away 63 of them. The fix is
<code>BM=16</code>. The worst configs are 12.6× and 19.3× off.</figcaption>
</figure>

Every decode number in the first version of this post was 2.7× too slow, and
the error was in my favour nowhere — it made my kernel look worse, which is
presumably why I did not notice for an hour. Part 4 said the search was free and
worth 3×; here it was free and worth 2.69×, on the very next thing I wrote.

## 14. What I'd take from this

**Softmax was the obstacle, not the matmul.** Attention resisted tiling for
years after matmul stopped resisting it, and the fix was not a better memory
layout but a different algebraic arrangement of the same computation. Worth
remembering when a kernel looks un-tileable: the blocker is often a reduction,
and reductions can frequently be made incremental. The pattern — carry running
statistics, rescale the history when they change — is not specific to softmax.

**The memory win was the point, not the speed win.** I came to this expecting a
performance post and the most important figure turned out to be §10's: 4.5 GB
against 30 MB. Time optimizations make a workload cheaper; this one makes a
workload *possible*. Those are different kinds of result and it is worth
noticing which one you have.

**Two implementations agreeing to every digit is the correctness result to
want.** A small error tells you your kernel is plausible. An *identical* error
tells you it is doing the same arithmetic as the thing you are copying.

**Check that the fast path is the path you got.** `enable_gqa=True` returns
right answers from the wrong kernel and warns about it where nobody looks. Any
API that picks an implementation for you can pick the slow one silently.

**Scale your error metric to the thing it judges.** Part 2 learned this for
cancellation; this post learned the mirror image for outputs with wide dynamic
range. Same lesson, opposite direction: `max/RMS` read 5.29e-02 for a kernel
that was bit-comparable to production.

Final numbers, all under CUDA graphs with an fp64 correctness gate: **92% of
bf16 peak on prefill, 148× less memory than the naive path, 5.2× faster than
PyTorch's FlashAttention on decode of which 1.2× is the kernel, and error
identical to production to three significant figures.**

[1] Dao, Fu, Ermon, Rudra & Ré, [*FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness*](https://arxiv.org/abs/2205.14135), NeurIPS 2022. The "exact" in the title is the point of §3 — it is an identity, not an approximation.
[2] The online-softmax rescaling predates FlashAttention: Milakov & Gimelshein, [*Online normalizer calculation for softmax*](https://arxiv.org/abs/1805.02867), 2018.
[3] Grouped-query attention is from Ainslie et al., [*GQA: Training Generalized Multi-Query Transformer Models from Multi-Head Checkpoints*](https://arxiv.org/abs/2305.13245), 2023. Qwen2.5-0.5B uses 14 query heads over 2 KV heads.
[4] PyTorch's backend selection is documented under [torch.nn.attention.sdpa_kernel](https://pytorch.org/docs/stable/generated/torch.nn.attention.sdpa_kernel.html). It is a preference, not a guarantee; the fallback is silent apart from a warning.
[5] All measurements are from an RTX 4060 Laptop (sm_89, 24 SMs, 8 GB, 227 GB/s measured, 28.41 TFLOP/s bf16), Triton 3.7.1, torch 2.13.0+cu130, on Qwen2.5-0.5B-Instruct's attention shapes: 14 query heads, 2 KV heads, head_dim 64, bf16. Timings are medians under CUDA graphs; correctness is RMS relative error against an fp64 reference.
