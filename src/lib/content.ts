/**
 * Article content for the marketing site.
 *
 * Kept as data rather than a page each, so every article gets the same layout,
 * the same disclaimer and the same metadata treatment without repetition.
 *
 * Editorial rule: these explain MECHANICS. They never recommend a product, a fund
 * or an allocation. That is the line between education and investment advice, and
 * SEBI has been escalating enforcement against material that crosses it while
 * calling itself education.
 */

export interface Article {
  slug: string;
  section: 'Product' | 'Learn' | 'Legal';
  title: string;
  lede: string;
  body: string; // simple HTML
}

const ARTICLES: Article[] = [
  {
    slug: 'how-it-works',
    section: 'Product',
    title: 'How RetireMeter works',
    lede: 'Four steps, one loop. The plan is the easy half — the tracking is what makes it true.',
    body: `
<h2>1 · You set the shape of the life</h2>
<p>Your age, when you want to stop working, and how long the money must last. Then every milestone you intend to fund — a car in 2029, a house in 2032, a business at 45 — each with a cost in today's money and the year you want it.</p>
<p>These are not separate calculators. They compete for the same rupees, and the engine solves them together. Move the house a year earlier and the retirement number changes, because it must.</p>

<h2>2 · The plan comes back as a prescription</h2>
<p>Not a corpus number and a shrug. A monthly figure broken down by instrument, each with the rate being assumed and the reason it sits there. Money needed inside three years goes to capital-protected instruments, because a thirty percent fall the year before you buy the car is not a risk worth taking. Money twenty years out goes to growth, because nothing else beats thirteen percent medical inflation over that distance.</p>
<p>Every rate is yours to change. Every amount is yours to move. The total is fixed by the arithmetic; the split is a judgement about risk that only you can make.</p>

<h2>3 · You log what you actually did</h2>
<p>This is the part other tools skip. Each month you record what you genuinely invested — not what you intended. Contributions, withdrawals, transfers between instruments, and rate changes when a deposit renews lower than you expected.</p>
<p>Miss a month and the plan recomputes. The required monthly rises, because you have lost both the contribution and the compounding it would have earned. Invest more than asked and it falls, and your retirement date moves closer.</p>

<h2>4 · The needle tells you where you stand</h2>
<p>One number: the age you are currently on track to retire, driven by your real contributions. Not a score out of a hundred, not a percentage that moves for reasons you did not cause. A date, in years and months, that you can watch move as you act.</p>

<h2>What it will not do</h2>
<p>It will not tell you which fund to buy. It will not sell you a product, take a commission, or pass your details to a distributor. It describes your position honestly and leaves the decisions where they belong.</p>`,
  },
  {
    slug: 'assumptions',
    section: 'Product',
    title: 'The assumptions we use',
    lede: 'Every number in the projection, where it came from, and when it was last checked.',
    body: `
<p>A projection is only as honest as its inputs. Here is every assumption the engine uses, with its source. All of them are editable — if you disagree, change them and watch what happens.</p>

<h2>Rates that are facts</h2>
<p>Some returns are contractual. You are not guessing; you can look them up.</p>
<table>
<tr><td><b>EPF</b></td><td>8.25%</td><td>EPFO, FY2025-26</td></tr>
<tr><td><b>PPF</b></td><td>7.1%</td><td>Ministry of Finance, reset quarterly</td></tr>
<tr><td><b>Fixed deposits</b></td><td>whatever you booked</td><td>your own rate, per deposit</td></tr>
<tr><td><b>SCSS</b></td><td>8.2%</td><td>Ministry of Finance</td></tr>
</table>

<h2>Rates that are judgements</h2>
<p>Market-linked returns cannot be known in advance. These are long-run figures, deliberately conservative.</p>
<table>
<tr><td><b>Equity</b></td><td>11% nominal</td><td>the Nifty 50 TRI returned 12.44% over the twenty years to February 2026</td></tr>
<tr><td><b>NPS Scheme E</b></td><td>11.5%</td><td>NPS Trust, ten-year</td></tr>
<tr><td><b>Gold</b></td><td>10%</td><td>twenty-year average</td></tr>
</table>

<h2>Inflation is not one number</h2>
<p>This is where most calculators go wrong. Your grocery bill and your hospital bill do not rise at the same rate.</p>
<table>
<tr><td><b>General</b></td><td>6%</td><td>CPI, ten-year average</td></tr>
<tr><td><b>Medical</b></td><td>~13%</td><td>roughly 2.2× CPI, per insurer surveys</td></tr>
<tr><td><b>Education</b></td><td>10–12%</td><td>roughly 1.8× CPI</td></tr>
<tr><td><b>Travel</b></td><td>7.5%</td><td>plus currency drift if overseas</td></tr>
</table>

<h2>How long you live</h2>
<p>Modelled on the Indian Assured Lives Mortality table (2012-14) from the Institute of Actuaries of India. The default plans to ninety rather than to average life expectancy, because planning to the average means a coin-flip chance of outliving your money.</p>

<h2>Tax rules change, so they live in data</h2>
<p>Every tax rule sits in a dated pack — capital gains rates, exemption limits, contribution caps, the NPS annuity requirement. When rules change, a new pack is published and you see exactly what it does to your plan before it takes effect.</p>
<p>You also choose whether to assume today's thresholds stay frozen for the next thirty years, or rise with inflation. The difference is not small: a threshold that never moves is a real tax increase every single year.</p>`,
  },
  {
    slug: 'safe-withdrawal-rate',
    section: 'Product',
    title: 'Why 3.25%, and not the 4% rule',
    lede: 'The most quoted number in retirement planning was built for a country that is not India.',
    body: `
<p>If you have read anything about retirement, you have met the 4% rule: withdraw four percent of your corpus in the first year, raise it with inflation, and the money lasts thirty years. It comes from work by William Bengen in 1994 and the Trinity study that followed.</p>
<p>Both used American data. American inflation, American equity returns, American bond yields, and an American tax system. Transplanted to India without adjustment, it produces a number that is comfortably, dangerously wrong.</p>

<h2>Three reasons it does not survive the journey</h2>
<p><b>Inflation.</b> The American studies assumed roughly two to three percent. India's long-run figure is closer to six or seven, and the categories that dominate late retirement — medical above all — run at double that again. A withdrawal rule calibrated to two percent inflation collapses at six.</p>
<p><b>Volatility.</b> Indian equities have delivered strong long-run returns, but with wider swings. Higher volatility means a larger gap between average return and the return you actually compound at, and it makes a bad first few years far more damaging.</p>
<p><b>No safety net.</b> An American retiree has Social Security and Medicare underneath them. Most Indian retirees have neither, and roughly sixty-two percent of Indian healthcare spending is still out of pocket.</p>

<h2>What the number means in practice</h2>
<blockquote><p><b>At 4%:</b> you need twenty-five times your first year of retired spending.<br><b>At 3.25%:</b> about thirty-one times.<br><b>At 3%:</b> about thirty-three times.</p></blockquote>
<p>On annual spending of twelve lakh, that is the difference between a target of three crore and one of three crore seventy. Not a rounding error — roughly two extra years of saving for most people.</p>

<h2>Why we derive it rather than assert it</h2>
<p>RetireMeter does not hardcode 3.25%. It simulates the drawdown year by year, with each expense category on its own inflation path, and reports the rate your plan actually supports. India's lower figure emerges from India's higher inflation rather than being imposed — which is also why the same engine gives the right answer for someone retiring in Frankfurt.</p>

<h2>The case against being even more conservative</h2>
<p>Some analysts argue for two and a half to three percent. That is defensible, but there is a cost to over-saving too: years of your life spent working for money you will not spend. And the recent rise in the tax-free income threshold genuinely improves the picture for retirees in lower brackets.</p>
<p>What you should not do is use four percent and assume the question is settled.</p>`,
  },
  {
    slug: 'goal-based-planning',
    section: 'Learn',
    title: 'Why goals must compete',
    lede: 'A calculator that treats each goal separately will tell you a comfortable lie.',
    body: `
<p>Open any Indian finance app and you will find a SIP calculator, a retirement calculator, a home loan calculator. Each works perfectly. Each is answering the wrong question.</p>
<p>Ask how much you need for a car in 2029 and you get a number. Ask about a house in 2032 and you get another. Ask about retirement at 58 and you get a third. Add them up and the total may well exceed everything you will ever earn — but no calculator will tell you that, because none of them knows about the others.</p>

<h2>The same rupee cannot do two jobs</h2>
<p>Money you spend on a house in 2032 is not available to compound until 2052. That is obvious when stated plainly and invisible when each goal sits in its own calculator.</p>
<p>A proper engine runs one cash-flow projection across your whole life. Every goal is a dated outflow. Every contribution is an inflow. What survives to retirement is what is left after everything else has been paid for.</p>

<h2>Horizon decides the instrument</h2>
<p>Once goals sit on one timeline, where each should be held becomes a matter of arithmetic rather than preference.</p>
<ul>
<li><b>Inside three years</b> — capital protection only. A market fall the year before you buy cannot be recovered from.</li>
<li><b>Three to seven years</b> — a mix. Some growth, but not enough exposure to be ruined by one bad year.</li>
<li><b>Beyond seven years</b> — growth assets. Long enough to recover, and long enough that inflation is the bigger enemy than volatility.</li>
</ul>

<h2>What to do when it does not fit</h2>
<p>Most honest plans do not close on the first pass. That is not failure; it is information. The useful response is to see the levers and their prices: delay a goal, reduce its size, save more, work longer, or accept a lower retirement lifestyle. Every one of those is a real choice with a real number attached.</p>
<p>What a planning tool should never do is quietly inflate the assumed return until the plan appears to work.</p>`,
  },
  {
    slug: 'epf-ppf-nps',
    section: 'Learn',
    title: 'EPF, PPF and NPS — what each can and cannot do',
    lede: 'Three retirement instruments, three different sets of handcuffs.',
    body: `
<p>India's retirement instruments are generous on tax and strict on access. Understanding which is which matters more than comparing their returns.</p>

<h2>EPF</h2>
<p>Twelve percent of your basic pay from you, matched by your employer, of which a portion goes to the pension scheme. The rate is announced annually — 8.25% for FY2025-26. Tax treatment is exempt at every stage provided you complete five years of service.</p>
<p>The constraint: it is locked until retirement, with narrow exceptions for housing, medical need and marriage. EPF cannot fund a goal in 2032.</p>

<h2>PPF</h2>
<p>Up to one and a half lakh a year, at a rate reset quarterly, exempt at every stage. A fifteen-year lock-in extendable in five-year blocks, with partial withdrawal permitted from year seven.</p>
<p>The detail almost everyone misses: interest is calculated on the lowest balance between the fifth and the end of each month. Contribute on the sixth and you lose a month of interest on that money. Contribute before the fifth.</p>
<p>Because PPF has a definite maturity date, it can fund goals after that date — unlike EPF, which is bound to retirement.</p>

<h2>NPS</h2>
<p>Tier I is the retirement account: locked to sixty, with market-linked returns across equity, corporate debt and government securities, or an automatic lifecycle allocation. Tier II has no lock-in and no additional tax benefit.</p>
<p>The part to plan around carefully: at sixty, a minimum of forty percent of the Tier I corpus must be used to buy an annuity. The sixty percent you take as a lump sum is tax-free; the annuity income is taxed at your slab rate, is not inheritable in the same way, and is priced at whatever rates happen to prevail on that date. Deferral beyond sixty is permitted, which is worth modelling rather than accepting the default.</p>

<h2>The wall at 58</h2>
<p>Plan to retire before sixty and you meet a problem: your largest balances may be inaccessible for the first years of retirement. You can be asset-rich and cash-poor at exactly the wrong moment. Anyone targeting early retirement needs enough outside these instruments to bridge the gap.</p>`,
  },
  {
    slug: 'withdrawal-sequencing',
    section: 'Learn',
    title: 'Withdrawal sequencing',
    lede: 'After you stop earning, which pot you draw from matters more than which fund you picked.',
    body: `
<p>Every Indian retirement tool stops at the corpus. You need three crore seventy, they say, and then nothing. But the thirty years after you stop working contain more decisions, and more expensive mistakes, than the thirty before.</p>

<h2>The order changes how long the money lasts</h2>
<p>At retirement you hold money in several places — equity, debt funds, fixed deposits, PPF, EPF, NPS. Each is taxed differently on exit. Drawing in a tax-efficient order, rather than simply selling whatever is convenient, can extend a corpus by years without changing a single investment decision.</p>

<h2>The exemption that does not wait</h2>
<p>Long-term capital gains on equity are tax-free up to one and a quarter lakh a year. It resets every year. It does not carry forward.</p>
<p>A retiree who realises that much gain every single year, deliberately, accumulates decades of tax-free income. One who ignores it loses the allowance permanently, every year, and pays tax on the same gains later.</p>

<h2>The low-tax runway</h2>
<p>With no salary, most retirees have a large band of income taxed lightly or not at all. Combine the basic threshold, the capital gains exemption and the interest relief available to senior citizens, and a substantial annual income can be drawn at very little tax — but only if the sources are chosen deliberately. Draw everything from taxable interest instead and the same spending costs considerably more.</p>

<h2>Buckets, and why they are not just tidiness</h2>
<ul>
<li><b>Cash</b> — two to three years of spending, immune to markets.</li>
<li><b>Stability</b> — the next seven or so years in debt and guaranteed instruments.</li>
<li><b>Growth</b> — everything beyond, in equity.</li>
</ul>
<p>The point is not organisation. It is that after a market fall you spend from cash and leave equity alone to recover. Selling equity to fund living costs in a bad year is the single most destructive thing a retiree can do, and the bucket structure exists to make it unnecessary.</p>

<h2>Sequence risk</h2>
<p>Two retirees with identical corpuses and identical average returns can end very differently depending on when the bad years arrive. A sharp fall in year two, while you are withdrawing, does damage that the same fall in year twenty does not. This is why the first five years deserve more caution than the twenty-five that follow.</p>`,
  },
  {
    slug: 'health-cover',
    section: 'Learn',
    title: 'Buy your health cover at 45, not 58',
    lede: 'The most expensive thing you can do is wait until you need it.',
    body: `
<p>This is the most under-modelled item in Indian retirement planning, and the one most likely to undo an otherwise sound plan.</p>

<h2>Your cover ends the day you stop working</h2>
<p>Employer group health insurance is not portable in any meaningful sense. It covers you while you are employed and stops when you are not — which is precisely the point at which you become both older and more likely to claim.</p>

<h2>Why 58 is too late</h2>
<p>Buy an individual policy in your late fifties and three things happen at once.</p>
<ul>
<li><b>Pre-existing conditions are excluded</b> — and by fifty-eight most people have at least one.</li>
<li><b>Waiting periods apply</b>, typically two to four years, during which the conditions you most need covered are not.</li>
<li><b>Premiums are age-loaded</b>, and they rise steeply through your sixties and seventies.</li>
</ul>
<p>Buy the same policy at forty-five and the waiting periods expire long before you need them, the conditions you develop afterwards are covered, and you enter retirement with a policy that has years of continuity behind it.</p>

<h2>Medical inflation is the real enemy</h2>
<p>General inflation in India runs around six percent. Medical inflation has been running near thirteen — roughly triple. Over a thirty-year retirement, that gap compounds into something enormous.</p>
<p>This is also why a retirement portfolio cannot be entirely in fixed deposits. Nothing safe grows fast enough to keep pace with thirteen percent.</p>

<h2>What to model</h2>
<p>Plan for your own policy from your mid-forties, a premium that rises faster than general inflation and steps up in your sixties, a top-up rather than one enormous base policy, and out-of-pocket costs that grow as a share of spending precisely as travel and discretionary spending fall away.</p>`,
  },
  {
    slug: 'privacy',
    section: 'Legal',
    title: 'Privacy policy',
    lede: 'What we collect, why, and what we will never do with it.',
    body: `
<p><i>Written plainly. A full legal text would sit here in production.</i></p>

<h2>The free planner stores nothing</h2>
<p>Everything you type into the calculator stays in your browser for the length of the session. It is not transmitted, not logged, and not retained. Close the tab and it is gone.</p>

<h2>An account stores only what makes it work</h2>
<p>If you create an account we hold your plan inputs, your milestones, your ledger entries and your assumption settings — because without them there is nothing to come back to. We hold your email address to let you log in.</p>

<h2>Connected accounts</h2>
<p>If you connect a broker, we receive read-only holdings data. Your broker credentials are never seen by us; authentication happens on the broker's own page and we receive a short-lived token in return. You can disconnect at any time, which revokes our access.</p>

<h2>What we do not do</h2>
<p>We do not sell your data. We do not share it with distributors, insurers or lead-generation businesses. We do not run advertising. We have no commercial relationship with any product you might invest in, which is the only reliable guarantee that the numbers you see are not shaped by someone else's incentive.</p>

<h2>Your rights</h2>
<p>You can see everything we hold, correct it, export it, or delete it entirely. Deletion means deletion, not deactivation.</p>

<h2>Where it lives</h2>
<p>Data is stored in the India region. See the Data and DPDP page for the detail.</p>`,
  },
  {
    slug: 'terms',
    section: 'Legal',
    title: 'Terms of use',
    lede: 'What this tool is, and just as importantly, what it is not.',
    body: `
<h2>This is a calculator, not an adviser</h2>
<p>RetireMeter performs arithmetic on numbers you provide, using assumptions you control. It does not know your full circumstances, cannot assess your risk tolerance, and is not qualified to tell you what to do with your money.</p>
<p>It is not registered with SEBI as an Investment Adviser or Research Analyst. It does not provide investment advice, does not recommend any security, fund, scheme or product, and does not distribute anything or earn commission from anyone.</p>

<h2>Projections are illustrations</h2>
<p>Every forward-looking figure rests on assumptions that will turn out to be wrong in some degree. Markets do not deliver average returns on schedule. Inflation varies. Tax law changes. Treat the output as a structured way of thinking about your position, not a prediction.</p>
<p>Past performance does not indicate future results. This is a cliché because it is true.</p>

<h2>Accuracy</h2>
<p>We take considerable care over the rules encoded here — compounding conventions, lock-in periods, contribution limits, tax treatment — and publish our sources so you can check them. We cannot guarantee they are complete or current, and you should verify anything that materially affects a decision.</p>

<h2>Your responsibility</h2>
<p>Decisions you make remain yours. For advice on your own situation, consult a SEBI-registered Investment Adviser, and for tax matters a qualified chartered accountant.</p>`,
  },
  {
    slug: 'dpdp',
    section: 'Legal',
    title: 'Data and the DPDP Act',
    lede: 'How we handle personal data under India\u2019s data protection law.',
    body: `
<p>The Digital Personal Data Protection Act, 2023, and the Rules notified in November 2025, govern how personal data belonging to people in India must be handled. Financial data sits squarely within scope.</p>

<h2>Consent</h2>
<p>We process your data because you asked us to run a plan, and for nothing else. Consent is specific, purpose-limited, and can be withdrawn. Withdrawing it means we stop processing and delete.</p>

<h2>Purpose limitation</h2>
<p>Your income, holdings and goals are used to compute your projection. They are not used to profile you, target you, or build a product recommendation. There is no secondary use because there is no second business model.</p>

<h2>Your rights</h2>
<p>Access, correction, erasure, and the right to nominate someone to act on your behalf. Requests are answered within the statutory window.</p>

<h2>Breach notification</h2>
<p>If a breach occurs affecting your data, we notify you and the Data Protection Board without delay, with a full report to the Board within seventy-two hours.</p>

<h2>Where data is stored</h2>
<p>In the India region. The Act itself does not mandate blanket localisation, but sectoral regulators impose their own expectations on financial data, and storing it in India avoids the question entirely.</p>

<h2>Retention</h2>
<p>We keep your data while your account is active and for a limited period afterwards, then delete it. We do not retain anything from the free planner, because we never receive it.</p>`,
  },
  {
    slug: 'contact',
    section: 'Legal',
    title: 'Contact',
    lede: 'Corrections especially welcome.',
    body: `
<h2>Found a number that is wrong?</h2>
<p>This is the most useful message you can send. The engine encodes a great many rules — compounding conventions, contribution caps, lock-in periods, tax treatment at exit — and getting one of them wrong produces confidently incorrect output, which is worse than no output at all.</p>
<p>If something does not match your statement, your bank or the regulation, tell us what you expected and what you saw.</p>

<h2>Questions about your own situation</h2>
<p>We cannot answer these. Not reluctance — we are not registered to give investment advice, and a tool that started doing so informally over email would be doing precisely what it warns against. A SEBI-registered Investment Adviser is the right person to ask.</p>

<h2>Everything else</h2>
<p>Feature requests, gaps in the model, or disagreements with an assumption. The assumptions page exists to be argued with.</p>

<blockquote><p><b>hello@retiremeter.example</b><br>A real address would sit here in production.</p></blockquote>`,
  },
];

export const BY_SLUG = Object.fromEntries(ARTICLES.map((a) => [a.slug, a]));

export const learnSlugs = () =>
  ARTICLES.filter((a) => a.section !== 'Legal').map((a) => a.slug);
export const legalSlugs = () =>
  ARTICLES.filter((a) => a.section === 'Legal').map((a) => a.slug);
export const getArticle = (slug: string): Article | undefined => BY_SLUG[slug];
