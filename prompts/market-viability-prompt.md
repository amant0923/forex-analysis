# Market Viability & Competitive Analysis — Master Prompt

Use this prompt with Claude (Opus or Sonnet) to generate a comprehensive market viability report. Fill in the variables in `{{brackets}}` before running.

---

## The Prompt

```
You are a senior strategy consultant with 15 years of experience at McKinsey's TMT practice and deep expertise in SaaS unit economics, competitive intelligence, and go-to-market strategy for developer-built products. You have a reputation for brutal honesty — you never sugarcoat viability assessments.

I need you to produce a **comprehensive Market Viability & Competitive Analysis** for my product. This is a 10-section assessment document that will serve as my strategic north star. It must be analytically rigorous, cite real market data where available (and clearly flag estimates), and be brutally honest about weaknesses.

---

## PRODUCT BRIEF

**Product Name:** {{PRODUCT_NAME}}
**One-Line Description:** {{ONE_LINE_DESCRIPTION}}
**Target User:** {{TARGET_USER}}
**Core Value Proposition:** {{CORE_VALUE_PROP}}
**Tech Stack:** {{TECH_STACK}}
**Current Status:** {{CURRENT_STATUS — e.g., "MVP live with 50 free users", "In development", "Launched 3 months ago"}}
**Team Size:** {{TEAM_SIZE — e.g., "Solo founder", "2-person team"}}
**Monthly Operating Costs:** {{MONTHLY_COSTS — e.g., "$105/month for AI API + infrastructure"}}
**Planned Pricing:** {{PRICING — e.g., "Free tier + $19/mo Essential + $39/mo Premium"}}
**Instruments/Scope:** {{SCOPE — e.g., "13 forex/CFD instruments", "50 SaaS metrics", etc.}}
**Key Features Already Built:** {{FEATURES_BUILT}}
**Key Features Planned:** {{FEATURES_PLANNED}}
**Known Competitors:** {{KNOWN_COMPETITORS — list 5-10 if you know them, or say "Research needed"}}

---

## OUTPUT FORMAT

Produce a single, flowing document with exactly these 10 sections. Each section must be substantive (not just a few bullet points). Use tables where data comparison is clearer. Be specific with numbers — ranges are fine, but "it depends" is not.

### Section 1: Market Definition & Sizing
- **TAM**: Total addressable market with global figures, regional breakdown, and per-user spend data. Cite sources (or flag as estimates).
- **SAM**: Filter TAM to your realistic serviceable segment. Show your math — what % of TAM matches your language, platform, and use-case filters?
- **SOM**: First-year realistic capture. Use industry-standard freemium conversion rates (2-5%). Calculate monthly and annual revenue at your planned price points.
- **Market Growth Trajectory**: CAGR for the broader market and your specific subsegment. Identify 2-3 tailwinds and 2-3 headwinds.

### Section 2: Competitive Landscape
Organize competitors into tiers by proximity to your offering:
- **Tier A**: Direct competitors (same core problem, same target user)
- **Tier B**: Adjacent competitors (related problem or different user segment)
- **Tier C**: Indirect competitors (alternative solutions users currently use)
- **Tier D**: Institutional/enterprise context (sets the ceiling for user expectations)

For each tier, name 3-5 real products. For each product provide: name, pricing, user base estimate, key strength, key weakness relative to my product.

### Section 3: Feature Comparison Matrix
Create a comparison table of my product vs. the top 6-8 competitors across 12-15 feature dimensions relevant to my market. Use this rating scale:
- **Strong** = market-leading
- **Adequate** = functional
- **Weak** = exists but limited
- **Absent** = not available

End with a "Key Insight" paragraph identifying my unique strengths and critical gaps (features competitors have that I don't, which are table-stakes for users).

### Section 4: Positioning Analysis
For each of the top 3-4 competitors, write:
- Their positioning statement (For [target] who [need], [Product] is a [category] that [benefit]. Unlike [alternative], it [differentiator].)
- Their actual differentiator (what really makes them win)

Then write **my optimal positioning**:
- Positioning statement using the same framework
- Market position map: identify the unclaimed position I should own, the crowded positions to avoid, emerging positions worth watching, and vulnerable competitor positions I can attack

### Section 5: Porter's Five Forces
Analyze all five forces with specific evidence from my market:
1. **Threat of New Entrants** (1-10 scale + justification)
2. **Bargaining Power of Buyers** (1-10 scale + justification)
3. **Bargaining Power of Suppliers** (1-10 scale + justification)
4. **Threat of Substitutes** (1-10 scale + justification)
5. **Competitive Rivalry** (1-10 scale + justification)

End with an "Overall Competitive Intensity" summary paragraph.

### Section 6: SWOT Analysis
This is where brutal honesty matters most.
- **Strengths** (6-8 items): What genuinely differentiates me? Be specific, not generic.
- **Weaknesses** (6-8 items, labeled "Brutal Honesty"): What would a skeptical investor or churning user point out? Include the "can someone rebuild this in a weekend?" question and answer it honestly.
- **Opportunities** (6-8 items): Adjacent markets, emerging trends, partnership plays, underserved niches
- **Threats** (6-8 items): Existential risks, platform risk, regulatory risk, market shifts. For each threat, rate severity (1-10).

### Section 7: Unit Economics & Profitability
Build a detailed cost model:
- **Fixed costs**: Infrastructure, APIs, services (itemized with monthly amounts)
- **Variable per-user costs**: Broken down by tier (free, paid tiers)
- **Break-even analysis**: How many paying subscribers at each price point to cover costs?
- **Scenario analysis table** with 4 columns: Bear Case, Base Case, Bull Case, Moon Case — showing subscriber count, revenue, costs, and net margin for each
- **Developer opportunity cost note**: What is the founder's implicit hourly cost, and at what revenue level does the project justify their time?

### Section 8: Moat & Critical Risk Analysis
- **"Can someone rebuild this in a weekend?"**: Answer honestly. What takes a weekend vs. what takes months?
- **Moat sources table**: List 5-6 potential moat sources, rate each as Weak/Medium/Strong today, and project what they could be in 12 months with effort
- **The "[Free Alternative] Problem"**: Identify the single biggest free substitute (e.g., "Why not just use ChatGPT?"). Rate severity (1-10). Write specific counter-arguments and assess whether they're strong enough.
- **Existential Risk Register**: Table with columns for Risk, Likelihood (1-10), Impact (1-10), Mitigation Strategy, and Timeline to address

### Section 9: Strategic Recommendations
- **Verdict**: "Can [Product] produce profit?" Answer: YES / CONDITIONAL YES / NO. State confidence level and conditions.
- **Timeline**: Time to profitability, time to meaningful income ($2K+/month)
- **Recommended Monetization Strategy**: What to give away free vs. what to charge for, and why
- **Top 5 Features to Build Next**: Ordered by impact. For each: what it is, why it matters, and effort estimate in days
- **Top 5 Risks to Mitigate**: Ordered by severity. For each: the risk, likelihood, and specific mitigation steps
- **Go-to-Market Plan**: "First 100 Paying Users on $0 Budget" — 5 specific channels with target signups per month from each
- **Kill Criteria**: 5 specific conditions under which to stop investing time (after 6 months). These must be measurable (not "if it feels like it's not working").
- **Monthly Metrics to Track**: 6-8 KPIs

### Section 10: Profitability Scorecard & Improvement Roadmap
- **Current Scorecard**: Rate the product across 10 dimensions on a 1-10 scale: Market Size, Growth Potential, Unit Economics, Time to Profit, Monetization Clarity, Defensibility (Moat), Differentiation, Willingness to Pay, Execution Risk (inverted: 10 = low risk), Founder-Market Fit. Calculate an overall weighted average. Show the table.
- **"Path to 9/10"**: For each dimension scoring below 7, write a specific improvement plan:
  - What to build or change
  - Why it moves the needle (connect to the specific dimension)
  - Effort estimate
  - Projected score improvement
- **Improvement Roadmap**: Organize all improvements into 3 phases:
  - **Phase 1 (Weeks 1-4)**: Revenue-critical and low-effort items
  - **Phase 2 (Months 2-3)**: Moat-building and differentiation items
  - **Phase 3 (Months 4-6)**: Scale and expansion items
- **Projected Score After All Phases**: Show the updated scorecard table

---

## QUALITY REQUIREMENTS

1. **Real data over guesses**: Use actual market figures, competitor pricing, and industry benchmarks. When estimating, show your math and flag it as an estimate.
2. **Brutal honesty in weaknesses**: The SWOT weaknesses and risk sections should read like a skeptical VC's teardown, not a founder's pitch deck. If the product is easily replicated, say so. If the market is crowded, say so.
3. **Actionable specificity**: Every recommendation must include what to do, why, and how long it takes. No vague advice like "improve marketing."
4. **Tables for comparisons**: Use markdown tables for the feature matrix, scenario analysis, risk register, and scorecard. These should be scannable.
5. **Connected narrative**: Each section should reference and build on previous sections. The scorecard in Section 10 should directly reflect the analysis in Sections 1-9.
6. **Sources & Methodology**: End with a brief paragraph noting where data was sourced and what methodology was used for estimates.

---

## TONE

Write as a respected strategy consultant delivering a private assessment to a founder you respect. Be direct, analytical, and occasionally blunt. Use "you" when addressing the founder. Avoid corporate jargon and filler phrases. Every sentence should carry information or insight.
```

---

## How to Use

1. Copy the prompt above
2. Replace all `{{VARIABLES}}` with your product details
3. Run with Claude Opus for best quality (Sonnet works too, slightly less depth)
4. For a 50+ page report, add: *"Make each section comprehensive — aim for 4,000-6,000 words total across all sections"*
5. If you want .docx output, append: *"Format the output as clean markdown suitable for conversion to a Word document with proper heading hierarchy"*

## Pre-Filled for Tradeora

For quick use with your current project, here are the filled variables:

```
Product Name: Tradeora
One-Line Description: AI-powered daily fundamental analysis for forex & CFD traders
Target User: Retail forex/CFD traders (beginner to intermediate) who want institutional-quality fundamental analysis without reading hundreds of articles daily
Core Value Proposition: Reads 200+ financial articles daily across 50+ sources, uses Claude AI to generate structured bullish/bearish bias with per-article reasoning chains across 4 timeframes (daily, 1W, 1M, 3M) for 13 instruments
Tech Stack: Next.js on Vercel, Neon Postgres, GitHub Actions (daily scraper), Anthropic Claude API, TailwindCSS
Current Status: MVP live — daily pipeline operational, dashboard built, trading journal in progress, no payment integration yet
Team Size: Solo founder/developer
Monthly Operating Costs: ~$105/month (Claude API ~$45-90, Vercel ~$0-20, Neon ~$0-19)
Planned Pricing: Free tier (dashboard + daily analysis) + Essential $19/mo (journal + basic AI coach) + Premium $39/mo (advanced AI insights + personalized analysis)
Instruments/Scope: DXY, EURUSD, GBPUSD, USDJPY, EURJPY, GBPJPY, EURGBP, XAUUSD, XAGUSD, GER40, US30, NAS100, SP500
Key Features Already Built: 50+ source news scraper, daily automated pipeline, AI bias generation with per-article reasoning chains, multi-timeframe analysis (daily/1W/1M/3M), institutional-quality dashboard UI, article categorization by instrument
Key Features Planned: Trading journal with AI coach, Stripe payment integration, performance track record page, PWA mobile experience, broker affiliate partnerships, crypto expansion (BTC/ETH/SOL), B2B API
Known Competitors: Trade Ideas, TrendSpider, ForexFactory, Myfxbook, TradingView, Forex.com research, DailyFX, BabyPips, ZuluTrade, eToro CopyTrader
```
