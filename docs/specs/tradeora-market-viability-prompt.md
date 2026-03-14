# Tradeora Market Viability Analysis — Master Prompt

**Purpose:** Use this prompt with Claude (or any capable LLM) to conduct a comprehensive competitive analysis and market research study to determine whether Tradeora can produce profit in the forex/CFD analysis tools market.

---

## The Prompt

```
You are a senior market research analyst and strategy consultant with 15+ years of experience at McKinsey, Gartner, and Forrester. You specialize in fintech, retail trading platforms, and B2C SaaS monetization.

Your task: Conduct a comprehensive competitive analysis and market viability assessment for **Tradeora** — a forex/CFD fundamental analysis platform — to determine whether it can produce sustainable profit.

---

## ABOUT TRADEORA

Tradeora is a web-based platform (Next.js on Vercel) that provides daily AI-powered fundamental analysis for forex and CFD traders. Here is exactly what it does:

**Core Product:**
- Automated scraping of 50+ financial news sources (Reuters, Bloomberg, FT, ForexFactory, DailyFX, central bank feeds, Reddit, etc.)
- AI categorization of each article by instrument relevance and sentiment (bullish/bearish/neutral)
- Claude AI generates directional bias analysis (bullish/bearish) across 4 timeframes: Daily, 1-Week, 1-Month, 3-Month
- Per-article AI reasoning chains showing how each news item affects each instrument
- Daily Telegram reports delivered automatically

**Instruments Covered:**
DXY, EURUSD, GBPUSD, USDJPY, EURJPY, GBPJPY, EURGBP, XAUUSD, XAGUSD, GER40, US30, NAS100, SP500

**Architecture:**
- GitHub Actions runs daily scraper + AI analysis pipeline
- Neon Postgres database stores articles, categorizations, and analysis
- Next.js dashboard with institutional research portal aesthetic (JPMorgan/Goldman Sachs style)
- Anthropic Claude API for all AI analysis
- Trading journal feature for users to log and review trades

**Design Aesthetic:** Clean, institutional — serif headings, muted color palette (forest green for bullish, burgundy for bearish), thin borders, no flashy UI. Designed to feel like reading a professional research PDF.

**Current Stage:** Built and functional. No paying users yet. Solo developer project.

**Target User:** Retail forex/CFD traders (beginner to intermediate) who want fundamental analysis without spending hours reading news themselves.

---

## ANALYSIS REQUIREMENTS

Think step by step through each section. For every claim, provide specific data points, competitor names, pricing figures, and market statistics. Do not use vague qualifiers — use numbers.

### SECTION 1: MARKET DEFINITION & SIZING

Answer these questions with data:

1. **What is the Total Addressable Market (TAM) for retail trading tools/platforms globally?**
   - Number of active retail forex/CFD traders worldwide (cite sources)
   - Average annual spend on trading tools, signals, and education per trader
   - Total market value

2. **What is the Serviceable Addressable Market (SAM)?**
   - Filter to: English-speaking traders who would use a web-based fundamental analysis tool
   - Willingness to pay for AI-powered analysis specifically

3. **What is the Serviceable Obtainable Market (SOM)?**
   - Realistic first-year capture for a solo-developer product with no marketing budget
   - Conversion rate benchmarks for freemium trading tools

4. **Market Growth Trajectory:**
   - CAGR for retail trading tools market (2024-2030)
   - Growth of AI-powered trading tools specifically
   - Impact of AI commoditization on this market

### SECTION 2: COMPETITIVE LANDSCAPE — DIRECT COMPETITORS

For each competitor, provide: name, URL, what they do, pricing, estimated user base, funding, and how Tradeora compares.

Map these categories:

**A. AI-Powered Forex/Trading Analysis Platforms**
(Products that use AI to analyze news and generate trading signals/bias)
- List at least 8-10 direct competitors
- Include both established players and startups

**B. Forex News Aggregators & Sentiment Tools**
(Products that aggregate financial news and provide sentiment analysis)
- List at least 5-7 competitors

**C. Trading Signal Services**
(Products that provide buy/sell signals, even if not AI-powered)
- List at least 5-7 competitors

**D. Institutional-Grade Research Platforms**
(Bloomberg Terminal, Refinitiv, etc. — not direct competitors but set expectations)
- List the top 3-5 and explain why they matter as context

### SECTION 3: FEATURE COMPARISON MATRIX

Build a detailed comparison matrix with this structure:

| Capability | Tradeora | [Competitor 1] | [Competitor 2] | [Competitor 3] | [Competitor 4] | [Competitor 5] |
|---|---|---|---|---|---|---|
| AI-Powered Analysis | ✓ Claude AI | ? | ? | ? | ? | ? |
| Multi-Timeframe Bias | ✓ 4 timeframes | ? | ? | ? | ? | ? |
| Per-Article Reasoning | ✓ Unique | ? | ? | ? | ? | ? |
| News Source Coverage | ✓ 50+ sources | ? | ? | ? | ? | ? |
| Instrument Coverage | ✓ 13 instruments | ? | ? | ? | ? | ? |
| Telegram Delivery | ✓ Daily | ? | ? | ? | ? | ? |
| Trading Journal | ✓ Built-in | ? | ? | ? | ? | ? |
| Technical Analysis | ✗ None | ? | ? | ? | ? | ? |
| Price Charts | ✗ None | ? | ? | ? | ? | ? |
| Backtesting | ✗ None | ? | ? | ? | ? | ? |
| Mobile App | ✗ Web only | ? | ? | ? | ? | ? |
| Free Tier | ? | ? | ? | ? | ? | ? |
| Pricing | TBD | ? | ? | ? | ? | ? |

Rate each as: Strong / Adequate / Weak / Absent

### SECTION 4: POSITIONING ANALYSIS

For Tradeora and each major competitor, extract:

1. **Positioning Statement** (For [target] who [need], [Product] is a [category] that [benefit]. Unlike [alternative], [Product] [differentiator].)
2. **Unique Value Proposition**
3. **Claimed Differentiators**
4. **Actual Differentiators** (based on product reality, not marketing)

Then identify:
- **Unclaimed positions** in the market that Tradeora could own
- **Crowded positions** that Tradeora should avoid
- **Tradeora's strongest potential positioning** given its actual capabilities

### SECTION 5: PORTER'S FIVE FORCES ANALYSIS

Rate each force as High / Medium / Low with detailed justification:

1. **Threat of New Entrants**: How easy is it to build what Tradeora built? (Consider: AI APIs are commoditized, news scraping is straightforward, Next.js is common)
2. **Bargaining Power of Suppliers**: Dependence on Anthropic API, news sources, data providers
3. **Bargaining Power of Buyers**: How price-sensitive are retail traders? Switching costs?
4. **Threat of Substitutes**: Free alternatives (Twitter/X, YouTube, TradingView community, ChatGPT directly)
5. **Competitive Rivalry**: How intense is competition in this space?

### SECTION 6: SWOT ANALYSIS

**Strengths** (be honest, not promotional):
- What does Tradeora genuinely do better than alternatives?
- What is defensible?

**Weaknesses** (be brutally honest):
- Solo developer = single point of failure
- No technical analysis, no charts, no backtesting
- No track record or brand recognition
- Running costs (Claude API) vs revenue
- What features are table stakes that Tradeora lacks?

**Opportunities:**
- Underserved segments
- Emerging trends Tradeora could ride
- Partnership or distribution opportunities
- Feature gaps Tradeora could fill

**Threats:**
- AI commoditization (ChatGPT, Gemini, Grok can all do this)
- Established platforms adding AI features
- Regulatory risks
- Market downturns reducing trader count

### SECTION 7: UNIT ECONOMICS & PROFITABILITY ANALYSIS

This is the critical section. Be specific with numbers.

1. **Cost Structure:**
   - Claude API costs per daily analysis run (estimate based on: ~200 articles/day, categorization + bias generation for 13 instruments across 4 timeframes)
   - Vercel hosting costs at various user scales (100, 1K, 10K, 100K users)
   - Neon Postgres costs at various scales
   - GitHub Actions compute costs
   - Domain, monitoring, misc infrastructure
   - Developer time opportunity cost

2. **Revenue Model Options** (analyze each):
   - **Freemium + Premium subscription**: What features gate? What price point? What conversion rate is realistic?
   - **Pure subscription**: What would users pay? $5/mo? $10/mo? $20/mo? $50/mo?
   - **Telegram-only subscription**: Deliver analysis via Telegram for a fee
   - **API access**: Sell the analysis data to other platforms
   - **Advertising**: Is ad revenue viable at realistic traffic levels?
   - **Affiliate (broker partnerships)**: Revenue per referral, realistic conversion

3. **Break-Even Analysis:**
   - At each price point ($5, $10, $20, $50/mo), how many paying subscribers to break even?
   - Is break-even achievable within 12 months? 24 months?
   - What is the Customer Acquisition Cost (CAC) likely to be?
   - What is the realistic Lifetime Value (LTV)?
   - LTV:CAC ratio — is this a viable business?

4. **Scenario Analysis:**
   - **Bear case**: Minimum realistic revenue in year 1
   - **Base case**: Most likely revenue in year 1
   - **Bull case**: Optimistic but plausible revenue in year 1
   - For each: monthly revenue, costs, profit/loss

### SECTION 8: CRITICAL RISKS & MOAT ANALYSIS

1. **Defensibility Assessment:**
   - Can someone rebuild Tradeora in a weekend with ChatGPT + a scraper? Be honest.
   - What would create a moat? (Network effects, data advantages, brand, switching costs)
   - Does Tradeora have ANY moat today? If not, can it build one?

2. **Existential Risks:**
   - What if Anthropic raises API prices 10x?
   - What if ChatGPT/Gemini/Grok adds native forex analysis?
   - What if a well-funded competitor clones this?
   - What if news sources block scraping?
   - Regulatory risk: Is providing "bias" analysis close to financial advice?

3. **The "Why Not Just Use ChatGPT?" Problem:**
   - A user can paste news into ChatGPT and ask for forex bias analysis for free
   - Why would someone pay for Tradeora instead?
   - How strong is this objection? Rate 1-10.
   - What is the counter-argument?

### SECTION 9: STRATEGIC RECOMMENDATIONS

Based on ALL of the above analysis, provide:

1. **Verdict: Can Tradeora produce profit?**
   - Yes / No / Conditional (explain conditions)
   - Confidence level (High / Medium / Low)
   - Timeline to profitability if yes

2. **Recommended Monetization Strategy:**
   - Specific pricing model with price points
   - Feature gating strategy (what's free vs paid)
   - Target customer segment to focus on first

3. **Top 5 Features to Build Next** (prioritized by revenue impact):
   - For each: what it is, why it matters for monetization, effort estimate

4. **Top 5 Risks to Mitigate** (prioritized by severity):
   - For each: the risk, likelihood, impact, and specific mitigation action

5. **Go-to-Market Recommendation:**
   - How to acquire the first 100 paying users with $0 marketing budget
   - Distribution channels ranked by expected ROI
   - Content marketing / SEO opportunities specific to this niche

6. **Kill Criteria:**
   - What signals should indicate "stop investing time in this"?
   - What metrics should be tracked monthly?
   - At what point should the founder pivot or shut down?

### SECTION 10: FINAL PROFITABILITY SCORECARD

Rate each dimension 1-10 and provide an overall viability score:

| Dimension | Score (1-10) | Rationale |
|---|---|---|
| Market Size & Growth | ? | ? |
| Competitive Differentiation | ? | ? |
| Defensibility / Moat | ? | ? |
| Unit Economics | ? | ? |
| Scalability | ? | ? |
| Execution Risk | ? | ? |
| Monetization Clarity | ? | ? |
| Customer Willingness to Pay | ? | ? |
| Time to Profitability | ? | ? |
| Overall Viability | ? | ? |

---

## OUTPUT FORMAT

- Use markdown with clear headers and subheaders
- Include comparison tables wherever possible
- Use bullet points for lists, not paragraphs
- Bold key numbers and verdicts
- Be specific: names, URLs, prices, user counts — no vague hand-waving
- Total length: aim for 5,000-8,000 words of substantive analysis
- End with a single-paragraph executive summary that a founder could read in 30 seconds

## TONE

- Consultant giving honest advice to a founder, not a cheerleader
- If the answer is "this won't work," say so clearly and explain why
- If the answer is "this could work but only if X," be specific about X
- Treat the founder's time as the scarcest resource — don't recommend things that waste it
```

---

## Usage Notes

- **Best with:** Claude Opus, GPT-4, or Gemini Ultra — models with strong reasoning and current market knowledge
- **Supplement with:** Web search enabled (for current competitor data, pricing, market stats)
- **Follow up with:** Ask the model to deep-dive on any section that needs more detail
- **Update regularly:** Competitor landscape changes fast — re-run quarterly
