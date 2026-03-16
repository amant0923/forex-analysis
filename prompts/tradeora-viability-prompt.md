# Tradeora Market Viability Prompt — Ready to Run

Copy everything below the line and paste into a fresh Claude conversation.

---

You are a senior strategy consultant with 15 years of experience at McKinsey's TMT practice and deep expertise in SaaS unit economics, competitive intelligence, and go-to-market strategy for developer-built products. You have a reputation for brutal honesty — you never sugarcoat viability assessments.

I need you to produce a **comprehensive Market Viability & Competitive Analysis** for my product. This is a 10-section assessment document that will serve as my strategic north star. It must be analytically rigorous, cite real market data where available (and clearly flag estimates), and be brutally honest about weaknesses.

Make each section comprehensive and deeply substantive. Aim for 5,000-7,000 words total across all 10 sections. This should read like a real McKinsey deliverable, not a surface-level overview.

---

## PRODUCT BRIEF

**Product Name:** Tradeora
**One-Line Description:** AI-powered daily fundamental analysis for forex & CFD traders
**Target User:** Retail forex/CFD traders (beginner to intermediate) who want institutional-quality fundamental analysis without reading hundreds of articles daily
**Core Value Proposition:** Reads 200+ financial articles daily across 50+ sources, uses Claude AI to generate structured bullish/bearish bias with per-article reasoning chains across 4 timeframes (daily, 1W, 1M, 3M) for 13 instruments. The platform automates what would take a human analyst 3-4 hours of daily reading and synthesis.
**Tech Stack:** Next.js on Vercel, Neon Postgres, GitHub Actions (daily scraper pipeline), Anthropic Claude API, TailwindCSS
**Current Status:** MVP live — daily scraping pipeline operational with 50+ news sources, institutional-quality dashboard built, AI bias generation with per-article reasoning chains working, trading journal feature in progress. No payment integration yet. No mobile app. Zero paying users.
**Team Size:** Solo founder/developer
**Monthly Operating Costs:** ~$105/month breakdown: Claude API ~$45-90/month (200 articles/day, categorization + bias generation for 13 instruments x 4 timeframes), Vercel hosting ~$0-20/month, Neon Postgres ~$0-19/month
**Planned Pricing:** Three tiers:
- Free tier: Full dashboard access, daily fundamental analysis for all 13 instruments, all timeframes, article reasoning chains
- Essential ($19/month): Trading journal, basic AI coach, trade tagging, performance stats
- Premium ($39/month): Advanced AI insights, personalized analysis, pattern detection across trade history, monthly "Trader DNA" profile report
**Instruments Covered:** 13 instruments across 4 asset classes:
- Forex: DXY, EURUSD, GBPUSD, USDJPY, EURJPY, GBPJPY, EURGBP
- Precious Metals: XAUUSD (Gold), XAGUSD (Silver)
- Indices: GER40 (DAX), US30 (Dow Jones), NAS100 (Nasdaq), SP500
**Key Features Already Built:**
- 50+ curated and tested news source scraper with automated daily pipeline via GitHub Actions
- AI-powered article categorization by instrument relevance
- Per-article reasoning chains: AI explains exactly why each article is bullish/bearish for each instrument
- Multi-timeframe fundamental bias generation (daily, 1-week, 1-month, 3-month)
- Institutional-quality dashboard UI with clean, professional design
- Structured bias output with confidence levels and source attribution
- Historical analysis archive in Neon Postgres
**Key Features Planned:**
- Trading journal with AI coach integration (in progress)
- Stripe payment integration for Essential/Premium tiers
- Public performance track record page (bias accuracy vs actual price movement)
- Progressive Web App (PWA) for mobile experience with push notifications
- Broker affiliate partnerships (IC Markets, Pepperstone, Oanda) for referral revenue
- Crypto instrument expansion (BTC, ETH, SOL)
- Community features: aggregate user sentiment, anonymous leaderboards
- B2B API for prop trading firms and funded trader programs
- Multi-model AI redundancy (Claude + GPT-4o + Gemini fallback)
- SEO content flywheel: auto-generated weekly analysis pages per instrument
**Known Competitors:**
- Trade Ideas (AI stock scanner, $118-228/month)
- TrendSpider (AI charting, $39-79/month)
- ForexFactory (free forex news/calendar/community)
- Myfxbook (free trade tracking/analytics)
- TradingView ($0-60/month, charting + community)
- Forex.com research (free with broker account)
- DailyFX (free forex news/analysis, IG-owned)
- BabyPips (free forex education/community)
- ZuluTrade (social/copy trading)
- eToro CopyTrader (social/copy trading)
- Autochartist (pattern recognition, sold through brokers)
- Trading Central (institutional analysis, white-labeled by brokers)

---

## OUTPUT FORMAT

Produce a single, flowing document with exactly these 10 sections. Each section must be substantive — multiple paragraphs with real analysis, not just bullet lists. Use markdown tables where data comparison is clearer. Be specific with numbers — ranges are fine, but "it depends" is not an acceptable answer anywhere in this document.

### Section 1: Market Definition & Sizing

- **TAM**: Total addressable market with global figures. Include the number of active forex traders worldwide, regional breakdown (Asia, Europe, North America, rest of world), retail vs institutional split, average annual spend on trading tools/signals/education per active trader, and a calculated TAM range. Cite sources where possible (BIS Triennial Survey, CompareForexBrokers, Mordor Intelligence) or flag as estimates.
- **SAM**: Filter TAM to Tradeora's realistic serviceable segment. Show your filtering math step by step: English-speaking traders → interested in fundamental analysis (vs pure technical) → willing to pay for AI-powered analysis → using web-based tools. Arrive at a SAM number.
- **SOM**: First-year realistic capture for a solo-developer product with zero marketing budget. Use industry-standard freemium SaaS conversion rates (2-5%, industry average ~2.6%). Calculate: realistic free signups Year 1 from organic marketing → conversion rate → paying subscribers → monthly and annual revenue at $19 and $39 price points. Show the math.
- **Market Growth Trajectory**: CAGR for the retail trading tools market (2024-2030) and the AI-powered trading tools subsegment specifically. Identify 2-3 tailwinds (e.g., AI commoditization, retail trading growth) and 2-3 headwinds (e.g., general-purpose AI as free substitute, regulatory tightening).

### Section 2: Competitive Landscape

Organize competitors into 4 tiers by proximity to Tradeora's offering:

- **Tier A: AI-Powered Trading Analysis Platforms** — These are the closest direct competitors offering AI-driven market analysis to retail traders. Name 3-5 real products with pricing, estimated user base, key strength, and key weakness vs Tradeora.
- **Tier B: Forex News Aggregators & Sentiment Tools** — Platforms that aggregate forex news, provide sentiment data, or offer community-driven analysis. Name 3-5 products with the same detail.
- **Tier C: Trading Signal Services & Social Trading** — Services that provide trade signals, copy trading, or algorithmic recommendations. Name 3-5 products.
- **Tier D: Institutional-Grade Platforms (Context)** — Bloomberg Terminal, Refinitiv, Trading Central — these aren't direct competitors but establish the ceiling for what traders expect from professional analysis. Tradeora effectively tries to offer a Bloomberg-lite fundamental analysis experience at a retail price point. Name 3-4 products.

For each product across all tiers: name, pricing model, estimated user base, one key strength, one key weakness relative to Tradeora.

### Section 3: Feature Comparison Matrix

Create a markdown comparison table of Tradeora vs the top 6-8 competitors across these feature dimensions (add more if relevant):

1. AI-Powered Fundamental Analysis
2. Per-Article Reasoning Chains
3. Multi-Timeframe Bias (Daily/1W/1M/3M)
4. Technical Analysis / Charting
5. Backtesting
6. Trading Journal
7. AI Coach / Personalized Insights
8. Economic Calendar Integration
9. Real-Time Alerts
10. Mobile App / PWA
11. Community / Social Features
12. Broker Integration
13. Instrument Coverage Breadth
14. Free Tier Quality
15. API Access

Use this rating scale: **Strong** = market-leading | **Adequate** = functional | **Weak** = exists but limited | **Absent** = not available

End with a "**Key Insight**" paragraph identifying Tradeora's unique strengths that no competitor matches AND critical gaps where competitors offer table-stakes features that Tradeora lacks (specifically: technical analysis, backtesting, mobile app, instrument breadth).

### Section 4: Positioning Analysis

For each of the top 4 competitors (Trade Ideas, TrendSpider, ForexFactory, TradingView), write:
- Their positioning statement using this framework: *For [target] who [need], [Product] is a [category] that [benefit]. Unlike [alternative], it [differentiator].*
- Their actual differentiator (what really makes users choose them over alternatives)

Then write **Tradeora's Optimal Positioning**:
- Positioning statement using the same framework
- **Market Position Map**: Identify:
  - The unclaimed position Tradeora should own
  - The crowded positions to avoid (e.g., "AI trading signals")
  - Emerging positions worth watching (e.g., "AI trading coach")
  - Vulnerable competitor positions Tradeora can attack

### Section 5: Porter's Five Forces

Analyze all five forces with specific evidence from the retail forex/CFD tools market:

1. **Threat of New Entrants** (rate 1-10): Consider how AI APIs have lowered barriers, but also what non-trivial elements exist (data pipeline curation, UI polish, trust building)
2. **Bargaining Power of Buyers** (rate 1-10): Consider low switching costs, abundance of free alternatives, price sensitivity of retail traders
3. **Bargaining Power of Suppliers** (rate 1-10): Consider Anthropic/OpenAI API dependency, news source scraping fragility, Vercel/Neon vendor lock-in
4. **Threat of Substitutes** (rate 1-10): Consider ChatGPT/Gemini/Grok for ad-hoc analysis, free broker research, Twitter/X financial commentary, YouTube analysis
5. **Competitive Rivalry** (rate 1-10): Consider number of forex tools, differentiation level, market growth rate

End with an "**Overall Competitive Intensity**" summary paragraph with an overall rating and what it means for Tradeora's strategy.

### Section 6: SWOT Analysis

This is where brutal honesty matters most.

- **Strengths** (6-8 items): What genuinely differentiates Tradeora? Be specific — "good UI" is not enough; explain what makes it specifically better than competitors' interfaces. Reference the per-article reasoning chains, multi-timeframe bias, journal + AI coach combination, low operating costs, and 50+ source pipeline.

- **Weaknesses (Brutal Honesty)** (6-8 items): Write this section as if you're a skeptical VC doing due diligence. Address:
  - Solo developer as single point of failure
  - No technical analysis, no charting (beyond TradingView embed), no backtesting — table stakes for 60%+ of traders
  - Zero brand recognition and no track record
  - No mobile app
  - Only 13 instruments (competitors cover hundreds/thousands)
  - No verified performance history ("Has following your bias actually made money?")
  - The core fundamental analysis is replicable by a developer with Claude API in a weekend
  - No payment flow yet

- **Opportunities** (6-8 items): AI trading coach as emerging category, content marketing in forex communities, broker affiliate revenue ($200-500 CPA), accumulated trade data creating a moat, economic calendar integration, crypto expansion, B2B API licensing

- **Threats** (6-8 items, each with severity rating 1-10): AI commoditization (ChatGPT adding native forex analysis), TradingView adding AI fundamental analysis to 50M+ users, well-funded VC competitor, news source blocking/paywalls, regulatory risk (bullish/bearish bias as financial advice), market downturn reducing active traders, Anthropic API price increases

### Section 7: Unit Economics & Profitability

Build a detailed cost model with these components:

**Claude API Costs (Daily Pipeline):**
- Based on ~200 articles/day
- Categorization pass: cost per article
- Bias generation: cost per instrument per timeframe
- Total daily pipeline cost estimate

**Per-User AI Costs (Journal Features):**
- Free tier: minimal (just serving pre-generated analysis)
- Essential tier: journal AI interactions estimate per month
- Premium tier: advanced AI analysis per month
- Estimated per-user AI cost by tier

**Infrastructure Costs:**
- Vercel, Neon Postgres, GitHub Actions, domain — itemized monthly

**Total Monthly Cost Model** at different user counts (0, 100, 500, 1000, 5000 users)

**Break-Even Analysis:** How many paying subscribers at $19 and $39 to cover all costs?

**Scenario Analysis Table** with 4 scenarios:

| Metric | Bear Case | Base Case | Bull Case | Moon Case |
| --- | --- | --- | --- | --- |
| Free users | ? | ? | ? | ? |
| Paying users | ? | ? | ? | ? |
| Monthly revenue | ? | ? | ? | ? |
| Monthly costs | ? | ? | ? | ? |
| Net margin | ? | ? | ? | ? |

Fill in realistic numbers for Year 1.

**Developer Opportunity Cost:** At 10-15 hours/week maintaining the platform, what's the implicit cost at market freelance rates? At what revenue level does the project justify the founder's time on pure financial terms? Note any non-financial value (portfolio piece, learning, career asset).

### Section 8: Moat & Critical Risk Analysis

**"Can someone rebuild Tradeora in a weekend?"**
Answer this honestly. Be specific about what a developer could replicate in 1-2 days (basic news scraper + Claude API bias generation) vs what they would NOT have (50+ curated sources, polished UI, journal + AI coach, multi-timeframe reasoning chains, months of historical data). Estimate the full replication effort in weeks.

**Moat Sources Table:**

| Moat Source | Strength Today | Potential (12 months) | What's Required |
| --- | --- | --- | --- |
| (list 5-6 sources) | Weak/Medium/Strong | Weak/Medium/Strong | Specific actions |

Consider: data accumulation (trade history), source curation (50+ tested feeds), content library (SEO), community/network effects, personalization from journal data, brand/trust.

**The "Why Not Just Use ChatGPT?" Problem:**
- Severity rating (1-10)
- The objection stated clearly
- 5-6 specific counter-arguments (automation, consistency, historical context, journal integration, source breadth, structured output)
- Net assessment: are the counter-arguments strong enough? What must be demonstrated vs explained?

**Existential Risk Register:**

| Risk | Likelihood (1-10) | Impact (1-10) | Combined Score | Mitigation Strategy | Timeline |
| --- | --- | --- | --- | --- | --- |
| (list 6-8 risks) | | | | | |

Include: founder burnout, AI vendor lock-in, regulatory action, news source blocking, TradingView entering the space, general-purpose AI commoditization, market downturn.

### Section 9: Strategic Recommendations

**Verdict:** "Can Tradeora produce profit?" — Answer YES, CONDITIONAL YES, or NO. State your confidence level (Low/Medium/High) and the specific conditions required.

**Timeline:** Estimated time to profitability (covering infrastructure costs) and time to meaningful income ($2K+/month).

**Recommended Monetization Strategy:**
- What should be completely free (and why — top of funnel)
- What should be behind Essential ($19/mo) paywall
- What should be behind Premium ($39/mo) paywall
- Non-subscription revenue streams (broker affiliates, B2B API)
- Critical pricing insight: why $5-10 is a trap and $19-39 is the right range

**Top 5 Features to Build Next** (ordered by impact):
For each: name, what it is, why it matters strategically, effort estimate in developer-days.
1. (Revenue blocker)
2. (Trust builder)
3. (Reach expander)
4. (Revenue diversifier)
5. (Audience expander)

**Top 5 Risks to Mitigate** (ordered by severity):
For each: the risk, likelihood rating, impact rating, and 2-3 specific mitigation steps.

**Go-to-Market: First 100 Paying Users on $0 Budget:**
List 5 specific acquisition channels. For each: the channel, the strategy (what to post/create), target signups per month, and why this channel works for Tradeora specifically. Channels should include Reddit (r/forex, r/Daytrading), YouTube, BabyPips, Telegram communities, and SEO content.

**Kill Criteria:** 5 measurable conditions after 6 months that should trigger stopping investment. Use specific numbers (not "if it's not working"). Include: minimum free signups, minimum paying subscribers, maximum churn rate, minimum revenue, maximum weekly maintenance hours.

**Monthly Metrics to Track:** 6-8 KPIs including acquisition, engagement, conversion, retention, revenue, costs, and product quality metrics.

### Section 10: Profitability Scorecard & Improvement Roadmap

**Current Scorecard:**

| Dimension | Score (1-10) | Justification |
| --- | --- | --- |
| Market Size | ? | |
| Growth Potential | ? | |
| Unit Economics | ? | |
| Time to Profit | ? | |
| Monetization Clarity | ? | |
| Defensibility (Moat) | ? | |
| Differentiation | ? | |
| Willingness to Pay | ? | |
| Execution Risk (10=low risk) | ? | |
| Founder-Market Fit | ? | |
| **Overall (weighted avg)** | **?** | |

Fill in scores with 1-2 sentence justifications for each.

**"Path to 9/10" — Improvement Plans:**
For every dimension scoring below 7, write a detailed improvement plan including:
- What specifically to build or change
- Why it moves the needle for that dimension
- Effort estimate in days or weeks
- Projected score improvement (e.g., "3/10 → 6/10")

Number these improvements and organize them into **3 phases**:
- **Phase 1 (Weeks 1-4):** Revenue-critical and low-effort items
- **Phase 2 (Months 2-3):** Moat-building and differentiation items
- **Phase 3 (Months 4-6):** Scale and expansion items

**Projected Scorecard After All Phases:**
Show the updated table with projected scores, and calculate the new overall weighted average.

---

## QUALITY REQUIREMENTS

1. **Real data over guesses**: Use actual market figures (BIS Survey, CompareForexBrokers, Mordor Intelligence), real competitor pricing from their websites, and industry SaaS benchmarks (First Page Sage, ProductLed). When you must estimate, show your math and explicitly flag it as "[Estimate]".
2. **Brutal honesty in weaknesses**: The SWOT weaknesses, moat analysis, and risk sections should read like a skeptical VC's teardown, not a founder's pitch deck. If the product is easily replicated, say so clearly. If the market is crowded, quantify how crowded.
3. **Actionable specificity**: Every recommendation must include what to do, why it matters, and how long it takes. "Improve marketing" is unacceptable. "Post 3x/week on r/forex sharing genuine analysis insights, targeting 30-40 free signups/month" is the standard.
4. **Tables for comparisons**: Use markdown tables for the feature matrix, scenario analysis, risk register, and both scorecards. These must be scannable and well-formatted.
5. **Connected narrative**: Each section must reference and build on previous sections. The scorecard in Section 10 must directly reflect the analysis in Sections 1-9. The recommendations in Section 9 must address the weaknesses from Section 6 and the risks from Section 8.
6. **Sources & Methodology**: End the entire document with a paragraph noting where data was sourced and what methodology was used for estimates.

---

## TONE

Write as a respected strategy consultant delivering a private assessment to a solo founder you genuinely respect. Be direct, analytical, and occasionally blunt. Use "you" when addressing the founder. Avoid corporate jargon and filler phrases. Every sentence should carry information or insight. When something is a serious weakness or risk, don't soften it — state it plainly and then offer a path forward.

---

## FORMAT

Output as clean markdown with proper heading hierarchy (# for title, ## for sections, ### for subsections). This will be converted to a Word document (.docx), so ensure consistent heading levels, clean table formatting, and no raw HTML.
