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
<svg viewBox="0 0 740 330" role="img" aria-label="A five rung diagnosis ladder, escalating from runtime symptom to emitted instructions">
  <text x="0" y="14" font-family="'Virgil','Excalifont','Architects Daughter','Comic Sans MS',cursive" font-size="12.5" fill="#666666">escalate only as far as the evidence requires</text>
  <path d="M-0.09813948031514884 37.509145707450806 L151.57244435790926 35.06160063799471 L150.52439664248377 73.95032933410258 L0.3472864652052522 73.86496192272753" stroke="none" stroke-width="0" fill="#c2410c" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M0.20827539023011923 35.661361798085274 C44.8732157856226 33.81403664113023, 91.77463136259466 36.04543190361001, 150.899625701271 33.832226052321495 M-0.7173658835701645 36.031434184592214 C45.612512706499544 36.86142898635007, 92.36852779025212 37.06945157186128, 150.52077649058774 35.001977160852405 M150.86614396031945 36.835108580626546 C149.0399251960013 45.742978498712176, 150.97756136281228 58.11495001744479, 150.64993258770556 74.89594113472849 M150.66134205283598 35.44223244516179 C149.33415944373795 48.58598625892773, 148.7126942942161 61.08864233633504, 149.33059833766893 74.91235761670396 M148.7030490523204 72.08080455902964 C94.4098336916417 75.30631818003022, 36.34351099301129 72.14082585400902, 0.2775120800361037 76.18561542276294 M149.6599326682277 75.00982801942155 C114.26692420607432 73.36334792892448, 78.99517552861944 75.16467820028774, -0.30849291263148193 74.53861436573789 M0.22372089084237815 75.63112185243517 C-1.8042293560747056 64.84774946719408, 0.18343770978413523 54.22888151463121, 0.651742840372026 36.27864759806543 M0.3559724909253419 72.94810945717617 C0.037273355996236185 63.227008549589655, -0.8216004315260799 52.47896395837888, -0.5246924507431686 34.970710176508874" stroke="#c2410c" stroke-width="1.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="10" y="53" font-family="'Virgil','Excalifont','Architects Daughter','Comic Sans MS',cursive" font-size="13" fill="#ffffff">1  symptom</text>
  <text x="10" y="69" font-family="'Virgil','Excalifont','Architects Daughter','Comic Sans MS',cursive" font-size="11" fill="#ffffff">how slow, against what</text>
  <text x="160" y="61" font-family="monospace" font-size="11.5" fill="#666666">runs the kernel</text>
  <path d="M0.3415191922336817 84.67292831204831 L256.5225508842617 84.8537341978401 L254.6034639392048 124.20780935548245 L-0.8346015062183142 123.35069333575666" stroke="none" stroke-width="0" fill="#c2410c" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M-0.8459443216150832 84.8075017183252 C78.43984276801466 84.62975742535447, 153.262356822022 87.41161383257753, 254.24692114120464 86.37411252968676 M-0.2669133151092411 85.37283676182366 C85.16510999328287 88.19470832962041, 169.66211663554452 87.85703772520394, 256.7924080423697 86.75022906822026 M256.35651862882077 87.11073180772364 C257.83772069704906 99.96135008707643, 256.1360463429727 109.840255491063, 255.97953511737288 126.13965070582927 M255.8887875335291 85.66303098332136 C257.2499787321575 101.33889563176781, 255.55439819603043 115.2167635684833, 256.8781628685072 124.19982571136207 M257.6625765524339 124.0371215760287 C155.78846530904087 122.81366195306333, 55.580922247418 123.3271892692137, 0.07873896632814184 123.63035194573467 M255.77588781171997 123.79973137412678 C201.98376295000418 122.64380784367184, 146.53991718963354 122.08135820713302, -0.3030103279325915 123.58429604587509 M1.6310563590377571 123.12150711156428 C1.0612569805048406 107.66777646839618, 1.1432473297975958 95.62936908267439, -0.8972767923027277 87.15195875503123 M-0.5042749030515552 122.94615479838103 C0.4447763240002096 114.98455791641027, 0.14256241079792378 105.34218844380229, 1.0601221757009627 84.95754326116294" stroke="#c2410c" stroke-width="1.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="10" y="103" font-family="'Virgil','Excalifont','Architects Daughter','Comic Sans MS',cursive" font-size="13" fill="#ffffff">2  bound</text>
  <text x="10" y="119" font-family="'Virgil','Excalifont','Architects Daughter','Comic Sans MS',cursive" font-size="11" fill="#ffffff">achieved GB/s vs the bus, flops vs peak</text>
  <text x="266" y="111" font-family="monospace" font-size="11.5" fill="#666666">runs the kernel</text>
  <path d="M0.7811778647825123 136.23671091664582 L361.4726574106142 134.6458677576855 L363.08253123592584 174.46528937686236 L-2.0164894776418807 172.8364247487858" stroke="none" stroke-width="0" fill="#eef4fc" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M1.3192809478436847 137.1225173625007 C108.57577242972991 139.17995685840373, 218.53923205148865 139.34755918576522, 361.4668822809239 135.17814151999772 M0.035006377624728344 136.38650800326192 C127.28821411802186 134.70321856680195, 254.19844061146793 135.4306515864454, 361.52372641580166 136.4146170828258 M361.8468932973221 137.38635503482072 C363.07151619809684 149.77972167544067, 362.1305313231331 161.5655609646812, 361.3091376470402 172.98336027693003 M361.11623301422225 135.88382952148095 C362.1297980205771 146.49180500460787, 361.5601020978447 156.34488480063155, 362.2257273993455 173.48729380602018 M362.6420554211524 175.26698308683154 C286.6300267117674 174.0801161021545, 212.82614873099035 174.10452888212538, -0.05183462706968598 174.81759239918802 M361.8641786243581 174.43694606964175 C220.66683617211552 174.61292564332328, 79.58502354257766 175.37145677129948, -0.27894514816754495 174.39729328443826 M-1.3616081727668643 175.01189237069337 C0.3627433170843869 162.48780346959828, -1.460943050188944 152.22985665071755, 1.953703575022519 138.02526991199701 M0.8354777029715479 172.9442001395859 C0.8522792920041831 166.74210728323087, 1.1067252531219274 158.2054129292257, 0.44493680214509373 134.944376345817" stroke="#1a73e8" stroke-width="1.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="10" y="153" font-family="'Virgil','Excalifont','Architects Daughter','Comic Sans MS',cursive" font-size="13" fill="#1a1a1a">3  resources</text>
  <text x="10" y="169" font-family="'Virgil','Excalifont','Architects Daughter','Comic Sans MS',cursive" font-size="11" fill="#666666">registers, spills, shared memory, occupancy</text>
  <text x="372" y="161" font-family="monospace" font-size="11.5" fill="#666666">static</text>
  <path d="M1.2208365373313428 187.80049352124334 L466.42276393696665 184.43800131753088 L467.1615985326469 224.72276939824224 L1.2016225509345533 222.32215616181492" stroke="none" stroke-width="0" fill="#eef4fc" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M0.3794992754450426 186.29108260764895 C141.60873331099472 185.52768529626627, 283.2583367097289 186.20006189781157, 468.2179163659775 186.60146113934536 M0.2003631617649956 185.91143507810284 C174.15580285572847 186.05409145864718, 348.1430839873795 186.2934655314763, 467.8665302543617 186.17508501376304 M467.3372679658234 187.66197826191782 C468.3053116991445 199.5980932638049, 468.1250163032934 213.29086643829942, 466.63874017670753 224.2270698480308 M468.54367849491535 186.10462805964053 C467.0096173089966 199.24471437744796, 467.565805999659 210.4730060327798, 467.57329193018376 224.9747619006783 M467.98970818198893 223.8080177465662 C365.32028846502743 222.77618313709053, 260.9032586396684 222.52274820748286, -0.11883926672486217 223.38989096417876 M467.9304794696401 223.7441337956344 C297.0764932731566 222.15525761259443, 125.32251904468298 222.56569406059475, -0.23114986059617326 223.80813044212073 M0.04572729542851448 222.5022776298225 C-0.3357703463360668 209.70783047080042, 0.33486656982451674 198.03034421876075, 0.404683942347765 184.4985810689628 M-0.024769691005349162 222.94224548079075 C1.2597822600081563 208.69965665005148, -0.12911190455406907 195.86863741464913, -0.1702485714107752 184.93120943047106" stroke="#1a73e8" stroke-width="1.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="10" y="203" font-family="'Virgil','Excalifont','Architects Daughter','Comic Sans MS',cursive" font-size="13" fill="#1a1a1a">4  IR</text>
  <text x="10" y="219" font-family="'Virgil','Excalifont','Architects Daughter','Comic Sans MS',cursive" font-size="11" fill="#666666">what TritonGPU decided: layouts, async copies, dots</text>
  <text x="478" y="211" font-family="monospace" font-size="11.5" fill="#666666">static</text>
  <path d="M1.6604952098801733 234.96427612584085 L575.7728704633191 234.23013487737626 L575.6406658293679 274.9802494196221 L0.019734579510986807 271.8078875748441" stroke="none" stroke-width="0" fill="#eef4fc" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M-0.16790617592632773 235.80098186023534 C172.54897646244615 237.0765792388238, 346.0489486241341 236.39686556761637, 574.7231236850471 235.8234009052068 M0.3314022553339601 235.5982672255859 C225.65595833301546 237.44897956168427, 452.13449516173455 237.40956479465737, 574.0668518519774 236.0457468014583 M572.8276426343248 237.93760148901492 C573.5391072001923 249.41646485216916, 574.1195012834538 265.0161719119176, 571.9683427063749 275.4707794191316 M573.7711239756085 236.32542659780012 C574.9254365974161 249.79762375028804, 574.4075099014733 264.60112726492804, 572.920856461022 274.2622299953364 M573.5741504561156 274.616667156294 C438.3733739583567 273.5391387317442, 302.2060531948507 273.0763383600973, -0.17683155424892905 274.1640448499471 M573.9635423124209 274.1509628694877 C377.58295360572635 275.4601078152172, 181.30057660710065 275.70286261911315, -0.2308456611260772 274.2890917831287 M1.4530627636238933 274.3926628889516 C-1.0342840097565205 264.5278574720025, 2.1306761898379776 254.63083178680392, -1.1443356903269888 235.3718922259286 M-0.8850170849822462 272.9402908219956 C-1.3687147719878705 260.4572060168721, -0.0009490622300655227 248.73186190007254, -0.7854339449666441 234.91804251512514" stroke="#1a73e8" stroke-width="1.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="10" y="253" font-family="'Virgil','Excalifont','Architects Daughter','Comic Sans MS',cursive" font-size="13" fill="#1a1a1a">5  instructions</text>
  <text x="10" y="269" font-family="'Virgil','Excalifont','Architects Daughter','Comic Sans MS',cursive" font-size="11" fill="#666666">what ptxas emitted: PTX and SASS</text>
  <text x="584" y="261" font-family="monospace" font-size="11.5" fill="#666666">static</text>
  <path d="M-0.24389463961124425 291.76185132563114 C217.35525362968446 290.9821684907675, 434.74902531206607 290.9120660852194, 719.8159789222478 292.3185558277369 M-0.14327657908201222 292.05625113219025 C154.97955623835324 291.00452877944707, 309.65142988830803 291.2190485185981, 720.0914498785138 291.97708574026825" stroke="#dfe3e6" stroke-width="1" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="0" y="312" font-family="'Virgil','Excalifont','Architects Daughter','Comic Sans MS',cursive" font-size="12.5" fill="#666666">Most kernels are explained at rung 2. Only the survivors are worth reading IR for, and everything above</text>
  <text x="0" y="328" font-family="'Virgil','Excalifont','Architects Daughter','Comic Sans MS',cursive" font-size="12.5" fill="#666666">rung 2 is static — byte-identical on every run, with no profiler and no thermal state to worry about.</text>
</svg>
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
<svg viewBox="0 0 740 248" role="img" aria-label="Copy bandwidth is 226 GB/s and read bandwidth 250, so lm_head at 238 is legitimate">
  <text x="0" y="14" font-family="monospace" font-size="11" fill="#666666">WHICH BANDWIDTH IS THE CEILING?  ·  MEASURED ON THIS CARD</text>
  <text x="0" y="53" font-family="monospace" font-size="11.5" fill="#1a1a1a">device-to-device copy</text>
  <rect x="200" y="36" width="392.4" height="24" fill="#6b7280" rx="3"/>
  <text x="582.4" y="53" font-family="monospace" font-size="12.5" fill="#fff" text-anchor="end">226.4 GB/s</text>
  <text x="200" y="76" font-family="monospace" font-size="10.5" fill="#666666">counts read AND write</text>
  <text x="0" y="99" font-family="monospace" font-size="11.5" fill="#1a1a1a">pure read (reduction)</text>
  <rect x="200" y="82" width="433.5" height="24" fill="#1a73e8" rx="3"/>
  <text x="643.5" y="99" font-family="monospace" font-size="12.5" fill="#1a73e8">250.1 GB/s</text>
  <text x="200" y="122" font-family="monospace" font-size="10.5" fill="#666666">what a weight-streaming GEMM does</text>
  <line x1="613.4" y1="30" x2="613.4" y2="150" stroke="#c2410c" stroke-width="2" stroke-dasharray="5 4"/>
  <text x="607.4" y="166" font-family="monospace" font-size="11.5" fill="#c2410c" text-anchor="end">lm_head measured 238.5</text>
  <text x="0" y="200" font-family="monospace" font-size="12" fill="#c2410c">105% of the copy figure. 95% of the read figure. Same kernel.</text>
  <text x="0" y="220" font-family="monospace" font-size="11.5" fill="#1a1a1a">The reference was wrong, not the measurement — and it was the reference I</text>
  <text x="0" y="238" font-family="monospace" font-size="11.5" fill="#1a1a1a">published three days earlier as a plausibility check.</text>
</svg>
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
<svg viewBox="0 0 740 318" role="img" aria-label="Three of five decode shapes are already at the memory bandwidth ceiling">
  <text x="0" y="14" font-family="monospace" font-size="11" fill="#666666">EVERY DECODE SHAPE AT M=1  ·  % OF THE 250 GB/S READ CEILING</text>
  <text x="0" y="52" font-family="monospace" font-size="11.5" fill="#1a1a1a">qkv_proj</text>
  <text x="118" y="52" font-family="monospace" font-size="10.5" fill="#666666">7 us</text>
  <rect x="190" y="37" width="224.2" height="20" fill="#1a73e8" rx="3"/>
  <text x="420.2" y="52" font-family="monospace" font-size="11.5" fill="#1a73e8">59%</text>
  <text x="700" y="52" font-family="monospace" font-size="10.5" fill="#666666" text-anchor="end">0.3 TF (1% peak)</text>
  <text x="0" y="90" font-family="monospace" font-size="11.5" fill="#1a1a1a">o_proj</text>
  <text x="118" y="90" font-family="monospace" font-size="10.5" fill="#666666">5.8 us</text>
  <rect x="190" y="75" width="212.8" height="20" fill="#1a73e8" rx="3"/>
  <text x="408.8" y="90" font-family="monospace" font-size="11.5" fill="#1a73e8">56%</text>
  <text x="700" y="90" font-family="monospace" font-size="10.5" fill="#666666" text-anchor="end">0.28 TF (1% peak)</text>
  <text x="0" y="128" font-family="monospace" font-size="11.5" fill="#1a1a1a">down_proj</text>
  <text x="118" y="128" font-family="monospace" font-size="10.5" fill="#666666">21.7 us</text>
  <rect x="190" y="113" width="304.0" height="20" fill="#c2410c" rx="3"/>
  <text x="500.0" y="128" font-family="monospace" font-size="11.5" fill="#c2410c">80%</text>
  <text x="700" y="128" font-family="monospace" font-size="10.5" fill="#666666" text-anchor="end">0.4 TF (1% peak)</text>
  <text x="0" y="166" font-family="monospace" font-size="11.5" fill="#1a1a1a">gate_up_proj</text>
  <text x="118" y="166" font-family="monospace" font-size="10.5" fill="#666666">42.6 us</text>
  <rect x="190" y="151" width="311.6" height="20" fill="#c2410c" rx="3"/>
  <text x="507.6" y="166" font-family="monospace" font-size="11.5" fill="#c2410c">82%</text>
  <text x="700" y="166" font-family="monospace" font-size="10.5" fill="#666666" text-anchor="end">0.41 TF (1% peak)</text>
  <text x="0" y="204" font-family="monospace" font-size="11.5" fill="#1a1a1a">lm_head</text>
  <text x="118" y="204" font-family="monospace" font-size="10.5" fill="#666666">570.9 us</text>
  <rect x="190" y="189" width="361.0" height="20" fill="#c2410c" rx="3"/>
  <text x="557.0" y="204" font-family="monospace" font-size="11.5" fill="#c2410c">95%</text>
  <text x="700" y="204" font-family="monospace" font-size="10.5" fill="#666666" text-anchor="end">0.48 TF (2% peak)</text>
  <line x1="570" y1="28" x2="570" y2="224" stroke="#1a1a1a" stroke-width="1.5" stroke-dasharray="5 4"/>
  <text x="570" y="240" font-family="monospace" font-size="10.5" fill="#1a1a1a" text-anchor="middle">100% of ceiling</text>
  <text x="0" y="268" font-family="monospace" font-size="12" fill="#c2410c">Three shapes are at the wall. No kernel work moves them.</text>
  <text x="0" y="288" font-family="monospace" font-size="12" fill="#1a73e8">Two are at 56-59%, and those are the only two the rungs above can help.</text>
  <text x="0" y="308" font-family="monospace" font-size="10.5" fill="#666666">Every shape is at 1-2% of the bf16 tensor-core peak. That is decode: arithmetic is not the constraint.</text>
</svg>
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
<svg viewBox="0 0 740 252" role="img" aria-label="Shared memory rather than registers limits blocks per SM from three stages upward">
  <text x="0" y="14" font-family="monospace" font-size="11" fill="#666666">BLOCKS PER SM, LIMITED TWO WAYS  ·  BN=64, 4 WARPS  ·  ADA: 64K REGS, 100 KB SMEM</text>
  <text x="120" y="34" font-family="monospace" font-size="10" fill="#666666">SMEM</text>
  <text x="250" y="34" font-family="monospace" font-size="10" fill="#6b7280">BY REGISTERS</text>
  <text x="420" y="34" font-family="monospace" font-size="10" fill="#c2410c">BY SHARED MEM</text>
  <text x="700" y="34" font-family="monospace" font-size="10" fill="#666666" text-anchor="end">LIMITER</text>
  <rect x="0" y="44" width="700" height="34" fill="#fff"/>
  <text x="6" y="66" font-family="monospace" font-size="12" fill="#1a1a1a">2 stages</text>
  <text x="120" y="66" font-family="monospace" font-size="11" fill="#666666">12.3 KB</text>
  <rect x="250" y="54" width="12" height="14" fill="#6b7280" opacity="0.55"/>
  <rect x="266" y="54" width="12" height="14" fill="#6b7280" opacity="0.55"/>
  <rect x="282" y="54" width="12" height="14" fill="#6b7280" opacity="0.55"/>
  <rect x="298" y="54" width="12" height="14" fill="#6b7280" opacity="0.55"/>
  <rect x="420" y="54" width="12" height="14" fill="#c2410c"/>
  <rect x="436" y="54" width="12" height="14" fill="#c2410c"/>
  <rect x="452" y="54" width="12" height="14" fill="#c2410c"/>
  <rect x="468" y="54" width="12" height="14" fill="#c2410c"/>
  <rect x="484" y="54" width="12" height="14" fill="#c2410c"/>
  <rect x="500" y="54" width="12" height="14" fill="#c2410c"/>
  <rect x="516" y="54" width="12" height="14" fill="#c2410c"/>
  <rect x="532" y="54" width="12" height="14" fill="#c2410c"/>
  <text x="700" y="66" font-family="monospace" font-size="11" fill="#6b7280" text-anchor="end">registers</text>
  <rect x="0" y="84" width="700" height="34" fill="#fafbfb"/>
  <text x="6" y="106" font-family="monospace" font-size="12" fill="#1a1a1a">3 stages</text>
  <text x="120" y="106" font-family="monospace" font-size="11" fill="#666666">24.5 KB</text>
  <rect x="250" y="94" width="12" height="14" fill="#6b7280" opacity="0.55"/>
  <rect x="266" y="94" width="12" height="14" fill="#6b7280" opacity="0.55"/>
  <rect x="282" y="94" width="12" height="14" fill="#6b7280" opacity="0.55"/>
  <rect x="298" y="94" width="12" height="14" fill="#6b7280" opacity="0.55"/>
  <rect x="314" y="94" width="12" height="14" fill="#6b7280" opacity="0.55"/>
  <rect x="420" y="94" width="12" height="14" fill="#c2410c"/>
  <rect x="436" y="94" width="12" height="14" fill="#c2410c"/>
  <rect x="452" y="94" width="12" height="14" fill="#c2410c"/>
  <rect x="468" y="94" width="12" height="14" fill="#c2410c"/>
  <text x="700" y="106" font-family="monospace" font-size="11" fill="#c2410c" text-anchor="end">SHARED MEM</text>
  <rect x="0" y="124" width="700" height="34" fill="#fdf4f0"/>
  <text x="6" y="146" font-family="monospace" font-size="12" fill="#1a1a1a">4 stages</text>
  <text x="120" y="146" font-family="monospace" font-size="11" fill="#666666">36.8 KB</text>
  <rect x="250" y="134" width="12" height="14" fill="#6b7280" opacity="0.55"/>
  <rect x="266" y="134" width="12" height="14" fill="#6b7280" opacity="0.55"/>
  <rect x="282" y="134" width="12" height="14" fill="#6b7280" opacity="0.55"/>
  <rect x="298" y="134" width="12" height="14" fill="#6b7280" opacity="0.55"/>
  <rect x="314" y="134" width="12" height="14" fill="#6b7280" opacity="0.55"/>
  <rect x="420" y="134" width="12" height="14" fill="#c2410c"/>
  <rect x="436" y="134" width="12" height="14" fill="#c2410c"/>
  <text x="700" y="146" font-family="monospace" font-size="11" fill="#c2410c" text-anchor="end">SHARED MEM</text>
  <text x="182" y="146" font-family="monospace" font-size="9.5" fill="#c2410c">shipped</text>
  <rect x="0" y="164" width="700" height="34" fill="#fafbfb"/>
  <text x="6" y="186" font-family="monospace" font-size="12" fill="#1a1a1a">5 stages</text>
  <text x="120" y="186" font-family="monospace" font-size="11" fill="#666666">49.0 KB</text>
  <rect x="250" y="174" width="12" height="14" fill="#6b7280" opacity="0.55"/>
  <rect x="266" y="174" width="12" height="14" fill="#6b7280" opacity="0.55"/>
  <rect x="282" y="174" width="12" height="14" fill="#6b7280" opacity="0.55"/>
  <rect x="298" y="174" width="12" height="14" fill="#6b7280" opacity="0.55"/>
  <rect x="314" y="174" width="12" height="14" fill="#6b7280" opacity="0.55"/>
  <rect x="420" y="174" width="12" height="14" fill="#c2410c"/>
  <rect x="436" y="174" width="12" height="14" fill="#c2410c"/>
  <text x="700" y="186" font-family="monospace" font-size="11" fill="#c2410c" text-anchor="end">SHARED MEM</text>
  <text x="0" y="222" font-family="monospace" font-size="12" fill="#1a1a1a">Shared memory scales linearly with depth: 12,544 bytes per stage.</text>
  <text x="0" y="242" font-family="monospace" font-size="11.5" fill="#c2410c">The config I shipped in Part 4 is exactly where it takes a block per SM away.</text>
</svg>
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
<svg viewBox="0 0 740 418" role="img" aria-label="Optimal pipeline depth differs per shape and trades against occupancy">
  <text x="0" y="14" font-family="monospace" font-size="11" fill="#666666">MICROSECONDS VS PIPELINE DEPTH  ·  TIMED THROUGH ATTEST  ·  BEST IN BLUE</text>
  <text x="0" y="44" font-family="monospace" font-size="11.5" fill="#1a1a1a">qkv_proj</text>
  <rect x="150" y="38.0" width="46" height="44.0" fill="#cbd1d6" rx="2"/>
  <text x="173" y="34.0" font-family="monospace" font-size="10" fill="#666666" text-anchor="middle">9.2</text>
  <text x="173" y="94" font-family="monospace" font-size="9.5" fill="#666666" text-anchor="middle">s2 · 4blk</text>
  <rect x="282" y="51.9" width="46" height="30.1" fill="#1a73e8" rx="2"/>
  <text x="305" y="47.9" font-family="monospace" font-size="10" fill="#1a73e8" text-anchor="middle">6.3</text>
  <text x="305" y="94" font-family="monospace" font-size="9.5" fill="#666666" text-anchor="middle">s3 · 4blk</text>
  <rect x="414" y="49.0" width="46" height="33.0" fill="#cbd1d6" rx="2"/>
  <text x="437" y="45.0" font-family="monospace" font-size="10" fill="#666666" text-anchor="middle">6.9</text>
  <text x="437" y="94" font-family="monospace" font-size="9.5" fill="#666666" text-anchor="middle">s4 · 2blk</text>
  <rect x="546" y="46.1" width="46" height="35.9" fill="#cbd1d6" rx="2"/>
  <text x="569" y="42.1" font-family="monospace" font-size="10" fill="#666666" text-anchor="middle">7.5</text>
  <text x="569" y="94" font-family="monospace" font-size="9.5" fill="#666666" text-anchor="middle">s5 · 2blk</text>
  <text x="0" y="126" font-family="monospace" font-size="11.5" fill="#1a1a1a">o_proj</text>
  <rect x="150" y="120.0" width="46" height="44.0" fill="#cbd1d6" rx="2"/>
  <text x="173" y="116.0" font-family="monospace" font-size="10" fill="#666666" text-anchor="middle">9.4</text>
  <text x="173" y="176" font-family="monospace" font-size="9.5" fill="#666666" text-anchor="middle">s2 · 4blk</text>
  <rect x="282" y="133.6" width="46" height="30.4" fill="#1a73e8" rx="2"/>
  <text x="305" y="129.6" font-family="monospace" font-size="10" fill="#1a73e8" text-anchor="middle">6.5</text>
  <text x="305" y="176" font-family="monospace" font-size="9.5" fill="#666666" text-anchor="middle">s3 · 4blk</text>
  <rect x="414" y="133.6" width="46" height="30.4" fill="#1a73e8" rx="2"/>
  <text x="437" y="129.6" font-family="monospace" font-size="10" fill="#1a73e8" text-anchor="middle">6.5</text>
  <text x="437" y="176" font-family="monospace" font-size="9.5" fill="#666666" text-anchor="middle">s4 · 2blk</text>
  <rect x="546" y="131.2" width="46" height="32.8" fill="#cbd1d6" rx="2"/>
  <text x="569" y="127.2" font-family="monospace" font-size="10" fill="#666666" text-anchor="middle">7</text>
  <text x="569" y="176" font-family="monospace" font-size="9.5" fill="#666666" text-anchor="middle">s5 · 2blk</text>
  <text x="0" y="208" font-family="monospace" font-size="11.5" fill="#1a1a1a">gate_up</text>
  <rect x="150" y="206.4" width="46" height="39.6" fill="#1a73e8" rx="2"/>
  <text x="173" y="202.4" font-family="monospace" font-size="10" fill="#1a73e8" text-anchor="middle">42.8</text>
  <text x="173" y="258" font-family="monospace" font-size="9.5" fill="#666666" text-anchor="middle">s2 · 2blk</text>
  <rect x="282" y="205.8" width="46" height="40.2" fill="#cbd1d6" rx="2"/>
  <text x="305" y="201.8" font-family="monospace" font-size="10" fill="#666666" text-anchor="middle">43.4</text>
  <text x="305" y="258" font-family="monospace" font-size="9.5" fill="#666666" text-anchor="middle">s3 · 2blk</text>
  <rect x="414" y="203.5" width="46" height="42.5" fill="#cbd1d6" rx="2"/>
  <text x="437" y="199.5" font-family="monospace" font-size="10" fill="#666666" text-anchor="middle">45.9</text>
  <text x="437" y="258" font-family="monospace" font-size="9.5" fill="#666666" text-anchor="middle">s4 · 1blk</text>
  <rect x="546" y="202.0" width="46" height="44.0" fill="#cbd1d6" rx="2"/>
  <text x="569" y="198.0" font-family="monospace" font-size="10" fill="#666666" text-anchor="middle">47.5</text>
  <text x="569" y="258" font-family="monospace" font-size="9.5" fill="#666666" text-anchor="middle">s5 · 1blk</text>
  <text x="0" y="290" font-family="monospace" font-size="11.5" fill="#1a1a1a">down_proj</text>
  <rect x="150" y="284.0" width="46" height="44.0" fill="#cbd1d6" rx="2"/>
  <text x="173" y="280.0" font-family="monospace" font-size="10" fill="#666666" text-anchor="middle">42.3</text>
  <text x="173" y="340" font-family="monospace" font-size="9.5" fill="#666666" text-anchor="middle">s2 · 2blk</text>
  <rect x="282" y="302.6" width="46" height="25.4" fill="#cbd1d6" rx="2"/>
  <text x="305" y="298.6" font-family="monospace" font-size="10" fill="#666666" text-anchor="middle">24.4</text>
  <text x="305" y="340" font-family="monospace" font-size="9.5" fill="#666666" text-anchor="middle">s3 · 2blk</text>
  <rect x="414" y="303.3" width="46" height="24.7" fill="#1a73e8" rx="2"/>
  <text x="437" y="299.3" font-family="monospace" font-size="10" fill="#1a73e8" text-anchor="middle">23.7</text>
  <text x="437" y="340" font-family="monospace" font-size="9.5" fill="#666666" text-anchor="middle">s4 · 1blk</text>
  <rect x="546" y="302.8" width="46" height="25.2" fill="#cbd1d6" rx="2"/>
  <text x="569" y="298.8" font-family="monospace" font-size="10" fill="#666666" text-anchor="middle">24.2</text>
  <text x="569" y="340" font-family="monospace" font-size="9.5" fill="#666666" text-anchor="middle">s5 · 1blk</text>
  <text x="0" y="370" font-family="monospace" font-size="11.5" fill="#1a1a1a">gate_up (90% of ceiling) wants the MINIMUM depth. down_proj (K=4864) pays 1.8x</text>
  <text x="0" y="388" font-family="monospace" font-size="11.5" fill="#1a1a1a">for going shallow. Depth pays until shared memory costs a block per SM.</text>
  <text x="0" y="408" font-family="monospace" font-size="10.5" fill="#666666">qkv at 2 and 3 stages has identical occupancy (33%) and differs by 1.46x, so occupancy is not the whole story.</text>
</svg>
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
<svg viewBox="0 0 740 280" role="img" aria-label="Across all five shapes Triton emits MMA instructions but never ldmatrix">
  <text x="0" y="14" font-family="monospace" font-size="11" fill="#666666">RUNG 4 (TTGIR)  AND  RUNG 5 (SASS)  ·  ALL FIVE SHAPES</text>
  <text x="250" y="34" font-family="monospace" font-size="10" fill="#666666" text-anchor="middle">async_copy</text>
  <text x="360" y="34" font-family="monospace" font-size="10" fill="#666666" text-anchor="middle">dot_op</text>
  <text x="480" y="34" font-family="monospace" font-size="10" fill="#666666" text-anchor="middle">convert_layout</text>
  <text x="600" y="34" font-family="monospace" font-size="10" fill="#666666" text-anchor="middle">HMMA</text>
  <text x="690" y="34" font-family="monospace" font-size="10" fill="#666666" text-anchor="middle">LDSM</text>
  <rect x="0" y="42" width="700" height="27" fill="#fff"/>
  <text x="6" y="61" font-family="monospace" font-size="12" fill="#1a1a1a">qkv_proj</text>
  <text x="250" y="61" font-family="monospace" font-size="12" fill="#666666" text-anchor="middle">12</text>
  <text x="360" y="61" font-family="monospace" font-size="12" fill="#666666" text-anchor="middle">14</text>
  <text x="480" y="61" font-family="monospace" font-size="12" fill="#666666" text-anchor="middle">1</text>
  <text x="600" y="61" font-family="monospace" font-size="12" fill="#666666" text-anchor="middle">16</text>
  <text x="690" y="61" font-family="monospace" font-size="15" fill="#c2410c" text-anchor="middle">0</text>
  <rect x="0" y="74" width="700" height="27" fill="#fafbfb"/>
  <text x="6" y="93" font-family="monospace" font-size="12" fill="#1a1a1a">o_proj</text>
  <text x="250" y="93" font-family="monospace" font-size="12" fill="#666666" text-anchor="middle">12</text>
  <text x="360" y="93" font-family="monospace" font-size="12" fill="#666666" text-anchor="middle">14</text>
  <text x="480" y="93" font-family="monospace" font-size="12" fill="#666666" text-anchor="middle">1</text>
  <text x="600" y="93" font-family="monospace" font-size="12" fill="#666666" text-anchor="middle">16</text>
  <text x="690" y="93" font-family="monospace" font-size="15" fill="#c2410c" text-anchor="middle">0</text>
  <rect x="0" y="106" width="700" height="27" fill="#fff"/>
  <text x="6" y="125" font-family="monospace" font-size="12" fill="#1a1a1a">gate_up_proj</text>
  <text x="250" y="125" font-family="monospace" font-size="12" fill="#666666" text-anchor="middle">9</text>
  <text x="360" y="125" font-family="monospace" font-size="12" fill="#666666" text-anchor="middle">14</text>
  <text x="480" y="125" font-family="monospace" font-size="12" fill="#666666" text-anchor="middle">1</text>
  <text x="600" y="125" font-family="monospace" font-size="12" fill="#666666" text-anchor="middle">32</text>
  <text x="690" y="125" font-family="monospace" font-size="15" fill="#c2410c" text-anchor="middle">0</text>
  <rect x="0" y="138" width="700" height="27" fill="#fafbfb"/>
  <text x="6" y="157" font-family="monospace" font-size="12" fill="#1a1a1a">down_proj</text>
  <text x="250" y="157" font-family="monospace" font-size="12" fill="#666666" text-anchor="middle">9</text>
  <text x="360" y="157" font-family="monospace" font-size="12" fill="#666666" text-anchor="middle">14</text>
  <text x="480" y="157" font-family="monospace" font-size="12" fill="#666666" text-anchor="middle">1</text>
  <text x="600" y="157" font-family="monospace" font-size="12" fill="#666666" text-anchor="middle">32</text>
  <text x="690" y="157" font-family="monospace" font-size="15" fill="#c2410c" text-anchor="middle">0</text>
  <rect x="0" y="170" width="700" height="27" fill="#fff"/>
  <text x="6" y="189" font-family="monospace" font-size="12" fill="#1a1a1a">lm_head</text>
  <text x="250" y="189" font-family="monospace" font-size="12" fill="#666666" text-anchor="middle">6</text>
  <text x="360" y="189" font-family="monospace" font-size="12" fill="#666666" text-anchor="middle">14</text>
  <text x="480" y="189" font-family="monospace" font-size="12" fill="#666666" text-anchor="middle">1</text>
  <text x="600" y="189" font-family="monospace" font-size="12" fill="#666666" text-anchor="middle">16</text>
  <text x="690" y="189" font-family="monospace" font-size="15" fill="#c2410c" text-anchor="middle">0</text>
  <rect x="650" y="36" width="80" height="166" fill="#c2410c" opacity="0.07"/>
  <text x="0" y="230" font-family="monospace" font-size="12" fill="#c2410c">LDSM is zero on every shape. Part 4 found this on one config; it holds on all five.</text>
  <text x="0" y="250" font-family="monospace" font-size="11.5" fill="#1a1a1a">Triton emits the same MMAs and feeds them with ordinary shared loads.</text>
  <text x="0" y="270" font-family="monospace" font-size="10.5" fill="#666666">Which can only pay on the two shapes that are NOT bandwidth-bound. On the other three the feed cannot matter.</text>
</svg>
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
<svg viewBox="0 0 740 300" role="img" aria-label="Two bugs, each caught because the number it produced was impossible rather than merely wrong">
  <text x="0" y="14" font-family="'Virgil','Excalifont','Architects Daughter','Comic Sans MS',cursive" font-size="12.5" fill="#666666">both found by an impossible number, not a wrong one</text>
  <path d="M-0.28568589903414254 29.255967722907663 C248.43756687521935 28.669799143038688, 497.9537617728859 27.787028650008143, 700.7400638964027 29.144343255534768 M-0.28112006735056644 29.653228920809923 C232.11204813789578 29.66639316253364, 463.73413163397464 29.71819850258529, 699.9920778231696 30.3886022163555 M701.3621659761295 29.513833745755257 C701.9724997783509 66.72836326956748, 702.1838852966633 102.03328223582356, 699.08028859552 136.61079434398562 M700.8071103704162 30.22469036011025 C701.0583793352152 57.19195761354641, 700.8522749225403 87.13042266285049, 699.90496839704 135.72949351398273 M700.1937251832336 136.42831987001003 C530.0730431906879 139.0939654858783, 358.53912656374274 138.57744484025986, 0.7618460419028998 135.87028869487347 M700.2517084567621 136.05891636501997 C427.30172343757005 134.27993838638065, 154.8036249006167 134.30855654686687, -0.3888853855058551 136.27355624686928 M1.0493392353877427 135.85423140171915 C-0.8746227567549796 94.87078693993391, -0.20755448392592374 53.47774412762374, -1.9838492566719652 29.212531187571585 M-0.21275523183867337 135.69220391539858 C0.11801744471676656 106.76845775032415, 2.1776354975569996 76.07088374635202, 0.45082487883046274 29.36772602526471" stroke="#c2410c" stroke-width="1.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="12" y="52" font-family="'Virgil','Excalifont','Architects Daughter','Comic Sans MS',cursive" font-size="13.5" fill="#c2410c">1.  in the ladder itself</text>
  <text x="12" y="74" font-family="monospace" font-size="12" fill="#1a1a1a">resources() read list(cache.values())[-1]</text>
  <text x="12" y="94" font-family="'Virgil','Excalifont','Architects Daughter','Comic Sans MS',cursive" font-size="12" fill="#666666">that is the LAST COMPILED kernel, not the one launched</text>
  <text x="12" y="118" font-family="'Virgil','Excalifont','Architects Daughter','Comic Sans MS',cursive" font-size="12" fill="#c2410c">symptom: identical shared memory for 4 different pipeline depths</text>
  <path d="M-0.7884899820387364 152.56007700815798 C249.18002210378648 152.75741268657148, 498.5936011756957 152.3615742494911, 699.5108822475373 152.19697087660433 M-0.12653291516005993 152.20965230874717 C246.81173155121505 153.33473638936877, 493.2247928468138 153.13588577911258, 700.1767131371051 152.27984120063485 M700.8525406446308 151.78945697285235 C701.608927390214 189.73689168691635, 702.5810023876392 228.13890136741105, 698.4098911251873 259.8545039150864 M700.0345558511093 152.44548889826984 C699.4256643484197 186.5957783119753, 700.3454445491395 222.56036654617637, 699.2525329278782 257.0169616086408 M699.7769578920305 257.45440620318055 C518.6756981179118 260.09595095403495, 336.73687837675214 261.1002794481069, 0.6898869453370572 258.5727383650839 M700.2766007680445 258.43567428044975 C444.56425107084215 260.26855276048184, 188.43621480442584 260.17772659480573, -0.41574750952422623 257.85196775607767 M-1.9433252964168788 259.74461666084824 C-1.3679859398864211 229.38778033927082, 1.7934056163765493 197.47216449193655, 0.8671311106532813 152.08584234453738 M-1.0730026258155705 257.6902492566034 C-1.5186648118905723 230.78990089390427, -1.1023868847303093 205.86189578529448, -0.16436049472540618 151.35455910991877" stroke="#1a73e8" stroke-width="1.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="12" y="174" font-family="'Virgil','Excalifont','Architects Daughter','Comic Sans MS',cursive" font-size="13.5" fill="#1a73e8">2.  in attest, published three days earlier</text>
  <text x="12" y="196" font-family="monospace" font-size="12" fill="#1a1a1a">plausibility compared against a COPY benchmark</text>
  <text x="12" y="216" font-family="'Virgil','Excalifont','Architects Daughter','Comic Sans MS',cursive" font-size="12" fill="#666666">a weight-streaming GEMM is read-dominated, not a copy</text>
  <text x="12" y="240" font-family="'Virgil','Excalifont','Architects Daughter','Comic Sans MS',cursive" font-size="12" fill="#1a73e8">symptom: a legitimate kernel reading 105% of the bus</text>
  <text x="0" y="280" font-family="'Virgil','Excalifont','Architects Daughter','Comic Sans MS',cursive" font-size="12.5" fill="#666666">Neither would have shown up as a slightly-off ratio. Smem must scale with depth; bandwidth cannot exceed</text>
  <text x="0" y="296" font-family="'Virgil','Excalifont','Architects Daughter','Comic Sans MS',cursive" font-size="12.5" fill="#666666">the bus. A number with a physical bound attached is auditable — one without is decoration.</text>
</svg>
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
