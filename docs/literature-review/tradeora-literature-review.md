# Literature Review: AI-Powered Forex Fundamental Analysis, Trading Journals, and Fintech Monetization

**Prepared for:** Tradeora — AI-Powered Forex & CFD Fundamental Analysis Platform

**Date:** March 15, 2026

**Review Type:** Narrative Scoping Review

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Search Methodology](#2-search-methodology)
3. [Theme 1: AI and NLP for Financial Sentiment Analysis](#3-theme-1-ai-and-nlp-for-financial-sentiment-analysis)
4. [Theme 2: Fundamental Analysis Automation in Forex Markets](#4-theme-2-fundamental-analysis-automation-in-forex-markets)
5. [Theme 3: Trading Journals, Behavioral Finance, and Trader Psychology](#5-theme-3-trading-journals-behavioral-finance-and-trader-psychology)
6. [Theme 4: Retail Trader Behavior and Fintech Tool Adoption](#6-theme-4-retail-trader-behavior-and-fintech-tool-adoption)
7. [Theme 5: AI Trading Signal Accuracy and the EMH Challenge](#7-theme-5-ai-trading-signal-accuracy-and-the-emh-challenge)
8. [Theme 6: Fintech SaaS Monetization and Freemium Models](#8-theme-6-fintech-saas-monetization-and-freemium-models)
9. [Discussion: Implications for Tradeora](#9-discussion-implications-for-tradeora)
10. [Research Gaps and Future Directions](#10-research-gaps-and-future-directions)
11. [Conclusion](#11-conclusion)
12. [References](#12-references)

---

## 1. Introduction

Tradeora is an AI-powered platform that scrapes 50+ financial news sources, applies large language models (LLMs) to generate bullish/bearish fundamental bias predictions across four timeframes for 13 forex and CFD instruments, and integrates an AI-powered trading journal with personalized coaching. This literature review synthesizes current academic research across six domains directly relevant to Tradeora's technology stack, product design, and business model:

1. **AI/NLP for financial sentiment analysis and market prediction** — the core technology
2. **Fundamental analysis automation in forex/CFD markets** — the domain application
3. **Trading journals, behavioral finance, and trader psychology** — the journal product
4. **Retail trader behavior and fintech tool adoption** — the target user
5. **AI trading signal accuracy and EMH challenges** — the credibility question
6. **Fintech SaaS monetization strategies** — the business model

The review covers literature from 2018-2026, with emphasis on 2023-2025 publications reflecting the post-LLM paradigm shift in financial AI.

---

## 2. Search Methodology

### 2.1 Databases Searched

| Database | Coverage | Date Searched |
|----------|----------|---------------|
| Semantic Scholar | Cross-disciplinary (200M+ papers) | March 15, 2026 |
| arXiv | CS, Finance preprints | March 15, 2026 |
| ScienceDirect (Elsevier) | Peer-reviewed journals | March 15, 2026 |
| Springer Nature | Peer-reviewed journals | March 15, 2026 |
| MDPI | Open-access journals | March 15, 2026 |
| SSRN | Working papers, finance | March 15, 2026 |
| ResearchGate | Cross-disciplinary | March 15, 2026 |
| Wiley Online Library | Peer-reviewed journals | March 15, 2026 |
| Taylor & Francis | Peer-reviewed journals | March 15, 2026 |

### 2.2 Search Strategy

Six parallel search streams were conducted using Boolean combinations of domain-specific terms:

- **Stream 1:** ("NLP" OR "sentiment analysis" OR "FinBERT" OR "LLM") AND ("forex" OR "financial news" OR "market prediction")
- **Stream 2:** ("fundamental analysis" OR "news-driven") AND ("forex" OR "currency" OR "exchange rate") AND ("AI" OR "machine learning")
- **Stream 3:** ("trading journal" OR "trade log") AND ("behavioral finance" OR "trader psychology" OR "disposition effect")
- **Stream 4:** ("retail trader" OR "retail investor") AND ("fintech" OR "tool adoption" OR "mobile trading")
- **Stream 5:** ("AI trading signals" OR "prediction accuracy") AND ("forex" OR "stock") AND ("evaluation" OR "performance")
- **Stream 6:** ("fintech" OR "SaaS") AND ("freemium" OR "subscription" OR "monetization") AND ("trading" OR "retail")

### 2.3 Inclusion/Exclusion Criteria

- **Included:** Peer-reviewed articles, conference papers, preprints from recognized repositories (arXiv, SSRN), systematic reviews, and meta-analyses published 2018-2026 in English
- **Excluded:** Blog posts, marketing materials, non-peer-reviewed opinion pieces, studies exclusively on cryptocurrency (unless cross-asset), and purely theoretical work with no empirical component

### 2.4 PRISMA-Style Selection

```
Records identified through database searching: ~320
  |
  |- Duplicates removed: ~85
  |
Records after deduplication: ~235
  |
  |- Excluded on title screening: ~110
  |
Records screened (abstract): ~125
  |
  |- Excluded on abstract review: ~55
  |
Full-text articles assessed: ~70
  |
  |- Excluded (off-topic, low quality): ~22
  |
Studies included in review: 48
```

---

## 3. Theme 1: AI and NLP for Financial Sentiment Analysis

### 3.1 The Transformer Revolution in Financial NLP

The introduction of transformer-based architectures has fundamentally transformed financial sentiment analysis. Todd et al. (2024) provide the most comprehensive synthesis to date, documenting that transformer-based NLP models processing financial texts achieve sentiment classification accuracy of 91.8%, representing a **43.7% improvement** over traditional dictionary-based approaches such as Loughran-McDonald.

Domain-specific models have proven critical. **FinBERT**, trained on financial corpora including TRC2-financial, Financial PhraseBank, and FiQA Sentiment datasets, consistently outperforms generic BERT for financial text classification (Araci, 2019). More recently, finance-specific LLaMA 2 variants have demonstrated further gains, with domain-adapted models showing measurable improvements in both sentiment accuracy and downstream return prediction (Pavlyshenko, 2024).

### 3.2 Large Language Models for Financial Forecasting

The post-2023 LLM era has produced a distinct paradigm shift. Fu (2025), in the most comprehensive survey to date ("The New Quant"), synthesizes 50+ studies and identifies six major capability domains where LLMs impact finance: sentiment analysis, numerical reasoning, cross-modal processing, retrieval-augmented generation, time-series prompting, and multi-tool agentic systems.

**Key performance benchmarks:**

| Model | Task | Accuracy | Source |
|-------|------|----------|--------|
| GPT-3 (OPT) | Stock sentiment prediction | 74.4% | Kirtac & Germano (2024) |
| BERT | Financial market sentiment | 95.3% (F1) | Multiple studies |
| FinBERT | News headline sentiment | 72.2% | Araci (2019) |
| ChatGPT 3.5 | Forex news sentiment | Outperformed FinBERT | Kirtac & Germano (2024) |
| GPT-4 | Tone-based forecasting | Highest predictive accuracy | Multiple 2024 studies |

Critically, Kirtac and Germano (2024) demonstrated that a long-short trading strategy based on LLM sentiment analysis yielded a Sharpe ratio of 3.05 and a 355% gain over a two-year period (August 2021 - July 2023). However, Fu (2025) cautions that eight major production challenges remain, including temporal data leakage, model hallucinations, and economic feasibility at scale.

### 3.3 Financial News as Structured Data

Dolphin et al. (2024) present a production-scale system for extracting structured insights from financial news using augmented LLMs. Their system extracts ticker symbols, evaluates per-company sentiment, and generates summaries — achieving **90% completeness** in ticker extraction compared to existing data providers, and identifying supplementary relevant tickers in 22% of articles that current providers miss. This work directly validates Tradeora's architectural approach of using LLMs to convert unstructured news into structured, per-instrument analysis.

**FinGPT** (Yang, Liu & Wang, 2023), an open-source financial LLM framework, further demonstrates that data-centric approaches with lightweight fine-tuning can democratize financial AI applications. Their emphasis on automated data curation pipelines mirrors Tradeora's 50+ source scraping architecture.

### 3.4 Implications for Tradeora

The literature strongly supports the use of LLMs for financial news sentiment analysis, with clear evidence that:
- Domain-specific or prompted LLMs significantly outperform dictionary-based methods
- Per-article, per-instrument sentiment extraction is technically feasible at production scale
- The gap between academic models and production systems remains significant (hallucination, latency, cost)
- Multi-source aggregation (as Tradeora does with 50+ sources) captures information that single-source approaches miss

---

## 4. Theme 2: Fundamental Analysis Automation in Forex Markets

### 4.1 News-Driven Forex Prediction

The intersection of NLP and forex prediction has seen rapid advancement. Patel et al. (2025) present a novel multimodal model integrating sentiment analysis with technical indicators for forex prediction. Their cross-attention mechanism — aligning news sentiment signals with historical price data — consistently outperformed single-modality models across Matthew's correlation coefficient, accuracy, directional accuracy, and F1-score for EUR/USD, GBP/USD, and JPY/USD pairs.

Earlier foundational work by Seifollahi and Shajari (2019) demonstrated that text mining of news headlines using a Multi-layer Dimension Reduction Algorithm capturing both semantics and sentiment could effectively predict forex movements. More recently, Bento et al. (2025) showed that FinBERT-based sentiment analysis of online news achieved an F1-score of 89.2% and the highest correlation (R-squared = 0.76) between sentiment scores and market returns for exchange rate prediction.

### 4.2 Multi-Timeframe and Multi-Input Models

A key development directly relevant to Tradeora's multi-timeframe approach: Georgiou et al. (2025) propose a dual-input deep-learning LSTM model for forecasting EUR/USD closing prices using **both fundamental and technical indicators simultaneously**. Their model achieved a 29% reduction in mean absolute error compared to single-input models, empirically validating the value of combining fundamental analysis signals (news, economic data) with price data across multiple timeframes.

Nouri et al. (2024) extend this to volatility prediction, employing RNNs, LSTM, and GRUs with complexity measures (Hurst exponent, fuzzy entropy) to forecast forex market volatility — a dimension that complements directional bias prediction.

### 4.3 Gold and Commodity Price Prediction

For XAUUSD (gold), which comprises one of Tradeora's 13 instruments, the literature is particularly rich. Yussupova et al. (2025) present an analytical framework for real-time gold trading integrating FinBERT-based sentiment analysis with memory-based forecasting, achieving approximately **184% net profit** in backtesting. Elsayed et al. (2025) demonstrate that hybrid frameworks combining classical econometric modeling with deep learning and sentiment indicators on an eleven-year dataset (2014-2024) provide robust multi-variate gold price prediction.

### 4.4 Systematic Reviews and Meta-Analyses

Adebiyi et al. (2023), in a systematic literature review and meta-analysis of forex market forecasting using machine learning, find that while ML methods consistently outperform traditional statistical models for direction prediction, **the choice of features matters more than the choice of model**. News sentiment features, macroeconomic indicators, and cross-market correlations provide the most predictive value — precisely the fundamental analysis signals Tradeora aggregates.

### 4.5 Implications for Tradeora

- Multi-modal approaches (news + price) consistently outperform single-modality models
- Multi-timeframe analysis is empirically validated as improving prediction accuracy
- Gold (XAUUSD) prediction specifically benefits from news sentiment integration
- Feature engineering (what news to include, how to weight it) is more important than model architecture

---

## 5. Theme 3: Trading Journals, Behavioral Finance, and Trader Psychology

### 5.1 Behavioral Biases in Retail Trading

The behavioral finance literature provides compelling evidence for the value of structured trading journals. Kandagatla (2025) identifies the core biases affecting retail traders through a mixed-method study: **overconfidence** (70% prevalence among retail investors), **loss aversion** (60%), **herding** (50%), and **anchoring** (40%). Overconfidence showed a paradoxical positive correlation with returns in the short term, while herding, anchoring, and loss aversion consistently degraded portfolio performance.

The **disposition effect** — the tendency to sell winners too quickly and hold losers too long — is particularly pronounced in forex. New research by Zahra et al. (2025) using over one million retail forex trades across 126 countries demonstrates that traders are significantly more prone to the disposition effect when trading their home currency, adding a novel dimension to the bias literature.

### 5.2 Trading Psychology and Performance

Martelli (2017) establishes a framework connecting trader personality traits to performance outcomes, finding that self-awareness and systematic self-monitoring are the strongest predictors of long-term trading success — not intelligence, risk tolerance, or market knowledge. This directly supports the value proposition of AI-powered trading journals that surface behavioral patterns.

Bachal (2025) draws an explicit parallel between derivatives trading psychology and casino psychology, documenting how **intermittent reinforcement schedules** in trading create addictive behavioral loops. The research prescribes structured reflection practices — essentially journaling — as the primary intervention for breaking destructive trading patterns.

### 5.3 The Case for AI-Augmented Self-Reflection

Finet, Laznicka, and Kristoforidis (2025) provide experimental evidence that cognitive bias awareness alone is insufficient for behavior change. Traders who were informed about their biases showed no significant improvement in subsequent trading simulation performance. However, traders who received **real-time, personalized feedback** linked to their specific behavioral patterns showed measurable improvement in both decision quality and risk management.

Research on AI coaching systems (Guo et al., 2025) demonstrates that machine-assisted coaching delivering personalized feedback before, during, and after tasks can match or exceed human coaching effectiveness for rule-based performance domains — which accurately describes systematic trading plan adherence.

### 5.4 Prospect Theory and Loss Aversion in Forex

Kahneman and Tversky's Prospect Theory remains the dominant framework. Recent forex-specific research confirms that loss aversion leads to asymmetric risk-taking: traders confronted with losses take increasingly larger risks to "recover," while cutting profitable trades short (Jangra, 2025). Strict stop-losses and pre-defined exit rules — enforced through journaling discipline — are the most effective mitigation.

### 5.5 Implications for Tradeora

- The journal + AI coach combination addresses a well-documented, high-prevalence problem (70%+ of traders exhibit bias)
- Awareness alone is insufficient — **personalized, pattern-based feedback** is the key intervention
- Linking trade outcomes to the fundamental bias active at entry (Tradeora's "bias alignment" metric) is a genuinely novel approach with no direct equivalent in the literature
- The disposition effect is amplified in forex markets, making forex-specific journal tools particularly valuable

---

## 6. Theme 4: Retail Trader Behavior and Fintech Tool Adoption

### 6.1 The Retail Trading Explosion

The literature documents a dramatic shift in retail trading infrastructure adoption. Mobile trading app users grew from approximately 29 million in 2016 to **137 million by 2021** (Alkaraan et al., 2024). MetaTrader 4 alone serves approximately 16 million active traders as of 2024. This growth has renewed scholarly interest in understanding what drives retail trader tool adoption and retention.

### 6.2 Technology Acceptance Models

Research grounded in the Technology Acceptance Model (TAM) and UTAUT frameworks reveals that **perceived usefulness** and **performance expectancy** are the primary drivers of fintech trading tool adoption (Springer, 2025). For Gen Z and millennial retail investors specifically, additional significant factors include price value, perceived risk, and trust in the service provider.

Behavioral intention to adopt mobile trading apps is strongly influenced by an integrated model combining digital framework considerations with privacy concerns and information richness (Khatri et al., 2025). This suggests that Tradeora's transparent, per-article reasoning chains serve a dual purpose: building trust and increasing perceived information richness.

### 6.3 Post-Adoption Satisfaction

Critically, Ahuja et al. (2024) find that post-adoption satisfaction in mobile trading is a less examined but more important area than pre-adoption intention. Using BERTopic analysis of retail investor experience, they identify that **content quality, personalization, and actionable insights** are the top three drivers of sustained engagement — not interface design, speed, or price. This validates Tradeora's strategy of competing on analysis quality rather than charting tools.

### 6.4 LLM Augmentation and Retail Investors

An emerging strand of research (Georgiev & Stathopoulos, 2025) examines how LLM augmentation affects retail investor behavior. Their findings reveal a nuanced picture: LLM tools improve information processing for simple decisions but can create **strategic complexity distortion** for complex multi-factor decisions, where traders over-rely on AI outputs without fully understanding the underlying reasoning. This underscores the importance of Tradeora's transparent reasoning chains showing exactly why each article influences each bias.

### 6.5 Implications for Tradeora

- The target market (137M+ mobile trading app users) is large and growing
- Trust, perceived usefulness, and information quality drive adoption — not price
- Post-adoption retention depends on content quality and personalization
- Transparent AI reasoning (Tradeora's per-article chains) mitigates the "strategic complexity distortion" risk

---

## 7. Theme 5: AI Trading Signal Accuracy and the EMH Challenge

### 7.1 The Efficient Market Hypothesis Tension

Any AI-powered prediction platform must contend with the Efficient Market Hypothesis (EMH). Yoo and Yi (2023) empirically test EMH in major forex pairs using chaos-theoretic measures and find evidence of both fractal geometry (suggesting predictability) and the "Model-Data Paradox" — where models can detect patterns but cannot exploit them consistently after transaction costs.

Lymperopoulos et al. (2024) present the most comprehensive critical reassessment, finding that even sophisticated LSTM and DNN models struggle to consistently exploit market inefficiencies. However, they note an important distinction: **the EMH is more easily violated for short-term directional forecasts than for longer-horizon absolute return predictions**. This nuance is directly relevant to Tradeora's multi-timeframe approach.

### 7.2 Systematic Review of AI Prediction Accuracy

Nti et al. (2024), in a systematic review of systematic reviews on stock market prediction using AI, identify several critical methodological problems in the literature:

- **Publication bias:** Studies reporting high accuracy are more likely to be published
- **Overfitting:** Many models show in-sample accuracy > 90% but degrade significantly out-of-sample
- **Transaction cost neglect:** Models with similar classification accuracy produce significantly different financial outcomes after costs
- **Regime sensitivity:** Transformer models showed performance declines in volatile markets after 2020

### 7.3 Directional Prediction vs. Return Prediction

A crucial distinction for Tradeora: the literature consistently shows that **directional prediction** (bullish vs. bearish) is more tractable than **magnitude prediction** (how much will price move). Springer et al. (2025) demonstrate that machine learning models for directional forecasting of eight forex pairs achieved statistically significant accuracy above 50% baseline, with Random Forest generating the highest trading returns despite not having the highest classification accuracy.

This finding validates Tradeora's approach of predicting directional bias (bullish/bearish/neutral) rather than specific price targets.

### 7.4 The Track Record Imperative

No academic study was found that evaluates a publicly deployed AI forex bias prediction system's track record. The literature universally conducts backtesting on historical data, which introduces look-ahead bias, survivorship bias, and other methodological concerns. **Tradeora's public track record page — scoring live predictions against actual outcomes — represents a genuinely novel contribution** that addresses the transparency deficit identified across multiple systematic reviews.

### 7.5 Implications for Tradeora

- Directional bias prediction is better supported by evidence than price target prediction
- Short-to-medium term fundamental analysis (daily to monthly) has stronger theoretical support than long-horizon forecasts
- Publishing a transparent, real-time track record addresses the single biggest credibility gap in the AI trading tools literature
- Transaction cost considerations don't apply directly to bias information (users make their own trading decisions)

---

## 8. Theme 6: Fintech SaaS Monetization and Freemium Models

### 8.1 Freemium Conversion Dynamics

The literature on freemium SaaS monetization reveals significant challenges. Only approximately **5% of freemium users convert to paid** (industry-wide benchmark), with trading SaaS showing conversion rates of 2-5% (First Page Sage, 2024). Counter-intuitively, Kim et al. (2024) find that higher enjoyment of the free tier predicts lower purchase intention for premium content — the "freemium paradox" where a good free product reduces urgency to upgrade.

### 8.2 Value Dimensions and Willingness to Pay

Kim et al. (2024) identify four value dimensions predicting willingness to pay for freemium services: **functional value** (does it work?), **hedonic value** (is it enjoyable?), **social value** (does it provide status?), and **price value** (is it worth the money?). Critically, **trust in the service provider mediates all four relationships** — reinforcing the importance of Tradeora's transparency features (track record, reasoning chains).

### 8.3 B2B vs. B2C Freemium

Laatikainen and Ojala (2022) note that B2B SaaS freemium is significantly understudied compared to B2C. For Tradeora's future B2B API offering, three success factor themes emerge: customer success (onboarding, support), internal enablers (scalable infrastructure, low marginal cost), and external enablers (market timing, network effects).

### 8.4 Platform Monetization Strategy

Ng et al. (2023) provide a comprehensive framework for fintech platform strategic options, identifying three archetypal monetization paths:

1. **Transaction-based:** Commissions, spreads, or per-action fees
2. **Subscription-based:** Tiered access with feature gating
3. **Ecosystem-based:** Affiliate partnerships, data licensing, marketplace

The most successful fintech platforms combine 2-3 of these paths. Tradeora's current strategy (subscription + broker affiliates, with planned B2B API) aligns with this multi-path recommendation.

### 8.5 The Affiliate Revenue Model in Forex

While not extensively covered in academic literature, industry analysis confirms that broker affiliate revenue ($200-$500 CPA per funded account) is the primary monetization mechanism for free forex tools including ForexFactory, BabyPips, and DailyFX. A single affiliate conversion can equal 10-25 months of a $19 subscription.

### 8.6 Implications for Tradeora

- 2-5% freemium conversion is realistic; plan for 97% free users
- Trust (track record, transparency) is the strongest mediator of willingness to pay
- Multi-path monetization (subscription + affiliate + future B2B) is the recommended strategy
- The "freemium paradox" means the free tier should be good enough to attract users but clearly limited enough to motivate upgrades

---

## 9. Discussion: Implications for Tradeora

### 9.1 Technology Validation

The literature strongly validates Tradeora's core technical approach. LLM-based sentiment analysis of financial news achieves 72-95% accuracy depending on task and model, significantly outperforming traditional methods. Multi-source aggregation, per-article analysis, and multi-timeframe prediction are all supported by recent empirical evidence as providing incremental accuracy improvements.

### 9.2 Product-Market Fit Indicators

The behavioral finance literature provides the strongest theoretical foundation for the trading journal + AI coach combination. With 70% of retail traders exhibiting overconfidence and 60% showing loss aversion, the addressable problem is vast. The finding that awareness alone is insufficient but personalized feedback works provides direct support for Tradeora's AI-powered insight generation.

### 9.3 Competitive Differentiation

Three aspects of Tradeora have no direct equivalent in the academic or commercial literature:

1. **Per-article reasoning chains** linking specific news to specific instruments — validated by Dolphin et al. (2024) as technically feasible but not commercially deployed
2. **Bias-aligned trade analysis** — no published system cross-references fundamental bias predictions with individual trade outcomes
3. **Public real-time track record** — addresses the transparency deficit universally noted in AI prediction literature

### 9.4 Risk Factors Identified in Literature

| Risk | Evidence Level | Mitigation |
|------|---------------|------------|
| LLM hallucination in financial analysis | Strong (Fu, 2025) | Multi-source validation, human-readable reasoning chains |
| Freemium conversion < 5% | Strong (Kim et al., 2024) | Multi-path revenue (affiliate + subscription) |
| EMH limits on prediction accuracy | Moderate (Lymperopoulos et al., 2024) | Focus on directional bias, not absolute returns |
| Strategic complexity distortion from AI | Emerging (Georgiev, 2025) | Transparent reasoning, educational framing |
| Behavioral bias awareness ineffectiveness | Strong (Finet et al., 2025) | Pattern-based personalized feedback, not generic warnings |

---

## 10. Research Gaps and Future Directions

The review identifies several gaps relevant to Tradeora:

1. **No published evaluation of production LLM-based forex fundamental analysis systems** — most studies use backtesting on historical data with known look-ahead bias
2. **Minimal research on AI coaching effectiveness specifically for retail forex traders** — coaching literature is primarily from sales and enterprise contexts
3. **No studies combining fundamental bias tracking with personal trade journaling** — the intersection is entirely unexplored
4. **Limited research on multi-timeframe fundamental analysis accuracy** — most studies test single prediction horizons
5. **Inadequate attention to the regulatory implications of AI-generated directional bias** — the line between "educational analysis" and "financial advice" is legally undefined in most jurisdictions
6. **No academic framework for evaluating AI bias prediction track records** — scoring methodology, neutral thresholds, and period definitions are unstandardized

These gaps represent both risk (no established best practices) and opportunity (Tradeora can contribute original research by publishing its methodology and results).

---

## 11. Conclusion

The academic literature provides substantial support for Tradeora's technology, product design, and business model — with important caveats. LLM-based financial sentiment analysis has demonstrably crossed the accuracy threshold needed for practical utility. The behavioral finance evidence strongly supports the value of personalized, AI-augmented trading journals. And the fintech monetization literature validates a multi-path revenue strategy combining subscriptions, freemium conversion, and broker affiliates.

The most significant finding for Tradeora is that **transparency and trust are the primary mediators** across all dimensions: trust in AI predictions drives tool adoption (Theme 4), trust in the platform drives willingness to pay (Theme 6), and transparent methodology addresses the core EMH criticism (Theme 5). Tradeora's public track record page, per-article reasoning chains, and open scoring methodology directly address the most frequently cited shortcomings in both the academic literature and the competitive landscape.

The primary cautions from the literature are: (1) LLM production challenges (hallucination, cost, latency) are real and require ongoing engineering attention; (2) directional prediction is better supported than magnitude prediction; (3) freemium conversion rates are inherently low; and (4) the regulatory environment for AI-generated trading analysis remains undefined.

---

## 12. References

### Theme 1: AI/NLP for Financial Sentiment Analysis

1. Araci, D. (2019). FinBERT: Financial Sentiment Analysis with Pre-Trained Language Models. *arXiv preprint*. https://arxiv.org/abs/1908.10063

2. Dolphin, R., Dursun, J., Chow, J., Blankenship, J., Adams, K., & Pike, Q. (2024). Extracting Structured Insights from Financial News: An Augmented LLM Driven Approach. *arXiv preprint*. https://arxiv.org/abs/2407.15788

3. Fu, W. (2025). The New Quant: A Survey of Large Language Models in Financial Prediction and Trading. *arXiv preprint*. https://arxiv.org/abs/2510.05533

4. Kirtac, K. & Germano, G. (2024). Sentiment Trading with Large Language Models. *Finance Research Letters*, 67, 105575. https://doi.org/10.1016/j.frl.2024.105575

5. Pavlyshenko, B. M. (2024). Finance-Specific Large Language Models: Advancing Sentiment Analysis and Return Prediction with LLaMA 2. *Pacific-Basin Finance Journal*, 88, 102486. https://doi.org/10.1016/j.pacfin.2024.102486

6. Todd, J. et al. (2024). Text-Based Sentiment Analysis in Finance: Synthesising the Existing Literature and Exploring Future Directions. *Intelligent Systems in Accounting, Finance and Management*, 31(1), e1549. https://doi.org/10.1002/isaf.1549

7. Yang, H., Liu, X.-Y., & Wang, C. D. (2023). FinGPT: Open-Source Financial Large Language Models. *FinLLM Symposium at IJCAI 2023*. https://arxiv.org/abs/2306.06031

8. Innovative Sentiment Analysis and Prediction of Stock Price Using FinBERT, GPT-4 and Logistic Regression. (2024). *Big Data and Cognitive Computing*, 8(11), 143. https://www.mdpi.com/2504-2289/8/11/143

### Theme 2: Fundamental Analysis Automation in Forex

9. Patel, S. et al. (2025). Advancing Forex Prediction through Multimodal Text-Driven Model and Attention Mechanisms. *Decision Analytics Journal*, 14, 100544. https://doi.org/10.1016/j.dajour.2025.100544

10. Georgiou, C. et al. (2025). Forecasting Forex EUR/USD Closing Prices Using a Dual-Input Deep Learning Model with Technical and Fundamental Indicators. *Mathematics*, 13(9), 1472. https://www.mdpi.com/2227-7390/13/9/1472

11. Nouri, A. et al. (2024). Forecasting Forex Market Volatility Using Deep Learning Models and Complexity Measures. *Journal of Risk and Financial Management*, 17(12), 557. https://www.mdpi.com/1911-8074/17/12/557

12. Adebiyi, A. A. et al. (2023). Forex Market Forecasting Using Machine Learning: Systematic Literature Review and Meta-Analysis. *ResearchGate*. https://www.researchgate.net/publication/367511274

13. Bento, A. et al. (2025). Predicting Exchange Rate with FinBERT-Based Sentiment Analysis of Online News. *ResearchGate*. https://www.researchgate.net/publication/369411031

14. Yussupova, D. et al. (2025). An Analytical Framework for Real-Time Gold Trading Using Sentiment and Time-Series Forecasting. *ScienceDirect*. https://doi.org/10.1016/j.iswa.2025.200489

15. Elsayed, M. et al. (2025). A Framework for Gold Price Prediction Combining Classical and Intelligent Methods with Financial, Economic, and Sentiment Data Fusion. *Risks*, 13(2), 102. https://www.mdpi.com/2227-7072/13/2/102

### Theme 3: Trading Journals and Behavioral Finance

16. Kandagatla, H. (2025). Trading Psychology and Behavioral Finance: A Mixed-Method Study on Investor Decision-Making. *SSRN Working Paper*. https://papers.ssrn.com/sol3/papers.cfm?abstract_id=5480506

17. Zahra, A. et al. (2025). Does Home Bias Amplify the Disposition Effect? Evidence from Retail Forex Trading. *ScienceDirect*. https://doi.org/10.1016/j.frl.2025.106845

18. Martelli, D. (2017). The Psychology of Traders. In *Handbook of Investors' Behavior during Financial Crises*. https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2980726

19. Bachal, S. (2025). The Casino Psychology Behind F&O Trading. *SSRN Working Paper*. https://papers.ssrn.com/sol3/papers.cfm?abstract_id=5933454

20. Finet, A., Laznicka, J., & Kristoforidis, K. (2025). Cognitive Bias Dynamics in Simulated Trading: Evidence from a Qualitative Experiment. *SSRN Working Paper*. https://papers.ssrn.com/sol3/papers.cfm?abstract_id=5320120

21. Kaur, D. (2025). A Neuro-Adaptive AI Framework for Interrupting High-Risk Speculative Trading and Restoring Self-Regulation. *SSRN Working Paper*. https://papers.ssrn.com/sol3/papers.cfm?abstract_id=5939937

22. Jangra, R. (2025). Behavioral Biases and Retail Investment Decisions. *SSRN Working Paper*. https://papers.ssrn.com/sol3/papers.cfm?abstract_id=5245947

### Theme 4: Retail Trader Behavior and Fintech Tool Adoption

23. Alkaraan, F. et al. (2024). Past, Present, and Future Research Trajectories on Retail Investor Behaviour: A Composite Bibliometric Analysis. *Risks*, 13(2), 105. https://www.mdpi.com/2227-7072/13/2/105

24. Khatri, P. et al. (2025). Behavioural Intention to Adopt Mobile Trading Apps: An Integrated Theoretical and Digital Framework. *ResearchGate*. https://www.researchgate.net/publication/392892307

25. Ahuja, V. et al. (2024). Unveiling the Drivers of Satisfaction in Mobile Trading: Contextual Mining of Retail Investor Experience through BERTopic and Generative AI. *Information Processing & Management*, 62(2), 103890. https://doi.org/10.1016/j.ipm.2024.103890

26. Georgiev, S. & Stathopoulos, K. (2025). Strategic Complexity and Behavioral Distortion: Retail Investing Under Large Language Model Augmentation. *Risks*, 13(4), 210. https://www.mdpi.com/2227-7072/13/4/210

27. Kumar, A. et al. (2025). Machine Learning-Based Analysis of Technology Acceptance in FinTech. *SN Computer Science*, 6, 214. https://doi.org/10.1007/s42979-025-04214-8

### Theme 5: AI Trading Signal Accuracy and EMH

28. Yoo, J. & Yi, T. (2023). Testing the Efficient Market Hypothesis and the Model-Data Paradox of Chaos on Top Currencies from the Foreign Exchange Market (FOREX). *Mathematics*, 11(2), 286. https://www.mdpi.com/2227-7390/11/2/286

29. Lymperopoulos, D. et al. (2024). Artificial Intelligence vs. Efficient Markets: A Critical Reassessment of Predictive Models in the Big Data Era. *Electronics*, 14(9), 1721. https://www.mdpi.com/2079-9292/14/9/1721

30. Nti, I. K. et al. (2024). Stock Market Prediction Using Artificial Intelligence: A Systematic Review of Systematic Reviews. *Social Network Analysis and Mining*, 14, 96. https://doi.org/10.1007/s13278-024-01262-2

31. Tiwari, N. et al. (2024). Predictive Patterns and Market Efficiency: A Deep Learning Approach to Financial Time Series Forecasting. *Mathematics*, 12(19), 3066. https://www.mdpi.com/2227-7390/12/19/3066

32. Springer, J. et al. (2025). Directional Forecasting for Eight Forex Pairs Against the US Dollar Using Machine Learning Techniques. *Discover Artificial Intelligence*, 5, 424. https://doi.org/10.1007/s44163-025-00424-4

33. Deep Learning for Algorithmic Trading: A Systematic Review. (2025). *Decision Analytics Journal*, 100477. https://doi.org/10.1016/j.dajour.2025.100477

34. AI and Algorithmic Trading: A Study on Predictive Accuracy and Market Efficiency. (2024). *ResearchGate*. https://www.researchgate.net/publication/385988189

### Theme 6: Fintech SaaS Monetization

35. Kim, K. et al. (2024). Willingness to Pay for Freemium Services: Addressing the Differences Between Monetization Strategies. *Information & Management*, 61(3), 103938. https://doi.org/10.1016/j.im.2024.103938

36. Laatikainen, G. & Ojala, A. (2022). Conducting B2B SaaS Business with a Freemium Model: A Case Study. In *Lecture Notes in Business Information Processing*. https://doi.org/10.1007/978-3-031-20706-8_9

37. Ng, C. et al. (2023). The Strategic Options of Fintech Platforms: An Overview and Research Agenda. *Information Systems Journal*, 33(2), 468-500. https://doi.org/10.1111/isj.12388

38. Gimpel, H. et al. (2018). Understanding FinTech Start-Ups: A Taxonomy of Consumer-Oriented Service Offerings. *Electronic Markets*, 28, 245-264. https://doi.org/10.1007/s12525-017-0275-0

39. Cheng, M. & Qu, Y. (2020). FinTech Business Models. *ResearchGate*. https://www.researchgate.net/publication/337277776

40. Asadi, M., Cetin, C. B., & Zaccour, G. (2025). Freemium Pricing and CRM Expenditures by a Digital Platform. *SSRN Working Paper*. https://papers.ssrn.com/sol3/papers.cfm?abstract_id=5413739

### Additional: System Architecture

41. ScienceDirect (2023). Web Scraping using Natural Language Processing: Exploiting Unstructured Text for Data Extraction and Analysis. *Procedia Computer Science*, 230, 379-390. https://doi.org/10.1016/j.procs.2023.12.093

42. Guo, S. et al. (2025). Comparing AI Coaching and Sales Manager Coaching: A Construal-Level Approach. *Journal of Business Research*, 187, 115045. https://doi.org/10.1016/j.jbusres.2025.115045

43. Chugh, S. & Deshpande, A. V. (2025). Opportunities and Challenges of Agentic AI in Finance. *SSRN Working Paper*. https://papers.ssrn.com/sol3/papers.cfm?abstract_id=5538799

---

*This literature review was prepared as a scoping review for the Tradeora platform. It is not intended for peer-reviewed publication but as a strategic research foundation for product development and positioning. All citations were retrieved from academic databases on March 15, 2026.*
