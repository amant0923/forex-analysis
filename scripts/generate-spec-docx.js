const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat,
  HeadingLevel, BorderStyle, WidthType, ShadingType,
  PageNumber, PageBreak
} = require("docx");

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

const BRAND_GREEN = "2D5A3D";
const BRAND_BURGUNDY = "8B2252";
const BRAND_DARK = "1A1A2E";
const BRAND_MUTED = "6B7280";
const HEADER_BG = "F3F4F6";

function headerCell(text, width) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: BRAND_DARK, type: ShadingType.CLEAR },
    margins: cellMargins,
    verticalAlign: "center",
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: "FFFFFF", font: "Arial", size: 20 })] })],
  });
}

function cell(text, width, opts = {}) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: opts.bg ? { fill: opts.bg, type: ShadingType.CLEAR } : undefined,
    margins: cellMargins,
    children: [new Paragraph({
      children: [new TextRun({
        text,
        font: "Arial",
        size: 20,
        bold: opts.bold || false,
        color: opts.color || BRAND_DARK,
      })],
    })],
  });
}

function heading(text, level) {
  return new Paragraph({
    heading: level,
    spacing: { before: level === HeadingLevel.HEADING_1 ? 360 : 240, after: 120 },
    children: [new TextRun({ text, font: "Georgia", bold: true, size: level === HeadingLevel.HEADING_1 ? 32 : 26, color: BRAND_DARK })],
  });
}

function body(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text, font: "Arial", size: 21, color: opts.color || "374151", ...opts })],
  });
}

function bulletItem(text, ref) {
  return new Paragraph({
    numbering: { reference: ref, level: 0 },
    spacing: { after: 80 },
    children: [new TextRun({ text, font: "Arial", size: 21, color: "374151" })],
  });
}

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 21 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Georgia", color: BRAND_DARK },
        paragraph: { spacing: { before: 360, after: 120 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: "Georgia", color: BRAND_DARK },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
    ],
  },
  numbering: {
    config: [
      { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbers", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbers2", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbers3", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "bullets2", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "bullets3", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "bullets4", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "bullets5", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ],
  },
  sections: [
    // ---- TITLE PAGE ----
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      children: [
        new Paragraph({ spacing: { before: 3600 }, children: [] }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: "TRADEORA", font: "Georgia", size: 56, bold: true, color: BRAND_DARK })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [new TextRun({ text: "Bias Accuracy Track Record", font: "Georgia", size: 36, color: BRAND_DARK })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 600 },
          children: [new TextRun({ text: "Implementation Spec & Plan", font: "Arial", size: 28, color: BRAND_MUTED })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 6, color: BRAND_GREEN, space: 12 } },
          spacing: { before: 200, after: 100 },
          children: [new TextRun({ text: "Phase 1, Improvement #1", font: "Arial", size: 22, color: BRAND_GREEN, bold: true })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Viability Score Impact: Willingness to Pay 5/10 \u2192 7/10", font: "Arial", size: 22, color: BRAND_MUTED })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 200 },
          children: [new TextRun({ text: "March 2026  |  Estimated Effort: 3\u20135 days  |  Cost: $0", font: "Arial", size: 20, color: BRAND_MUTED })],
        }),
        new Paragraph({ children: [new PageBreak()] }),
      ],
    },

    // ---- MAIN CONTENT ----
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BRAND_GREEN, space: 4 } },
            children: [
              new TextRun({ text: "Tradeora  ", font: "Georgia", size: 18, bold: true, color: BRAND_DARK }),
              new TextRun({ text: "|  Track Record Implementation Spec", font: "Arial", size: 16, color: BRAND_MUTED }),
            ],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "Page ", font: "Arial", size: 16, color: BRAND_MUTED }),
              new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: BRAND_MUTED }),
            ],
          })],
        }),
      },
      children: [
        // ---- 1. EXECUTIVE SUMMARY ----
        heading("1. Executive Summary", HeadingLevel.HEADING_1),
        body("The Bias Accuracy Track Record is the single highest-impact improvement identified in Tradeora\u2019s Market Viability Analysis. It creates a public /track-record page that transparently logs every AI-generated bias prediction against actual market outcomes, calculates rolling accuracy percentages, and displays win/loss history."),
        body("No retail forex AI tool currently publishes verified accuracy data. Being the first to do so instantly separates Tradeora from every competitor and directly addresses the #1 objection: \u201CWhy should I trust this?\u201D"),
        new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: "Key facts:", font: "Arial", size: 21, bold: true, color: "374151" })] }),
        bulletItem("Effort: 3\u20135 development days", "bullets"),
        bulletItem("Cost: $0 (uses existing FMP API and database)", "bullets"),
        bulletItem("Viability impact: Willingness to Pay moves from 5/10 to 7/10", "bullets"),
        bulletItem("Overall score contribution: Part of Phase 1 (6.2 \u2192 7.0)", "bullets"),

        // ---- 2. WHAT WE'RE BUILDING ----
        heading("2. What We\u2019re Building", HeadingLevel.HEADING_1),
        body("A public (no authentication required) page at /track-record that shows Tradeora\u2019s bias prediction accuracy across all 13 instruments and 4 timeframes. The page will be linked from the main navigation and accessible to anyone, including non-logged-in visitors."),

        heading("2.1 Page Sections", HeadingLevel.HEADING_2),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2200, 3580, 3580],
          rows: [
            new TableRow({ children: [headerCell("Section", 2200), headerCell("Content", 3580), headerCell("Purpose", 3580)] }),
            new TableRow({ children: [
              cell("Hero Stats", 2200, { bold: true }),
              cell("Overall accuracy %, total predictions scored, current streak, time since first prediction", 3580),
              cell("Immediate credibility signal \u2014 the first thing visitors see", 3580),
            ]}),
            new TableRow({ children: [
              cell("By Timeframe", 2200, { bold: true }),
              cell("Accuracy breakdown for daily, 1-week, 1-month, 3-month biases with total count per timeframe", 3580),
              cell("Shows which prediction horizons are strongest", 3580),
            ]}),
            new TableRow({ children: [
              cell("By Instrument", 2200, { bold: true }),
              cell("13 instrument cards each showing accuracy %, total predictions, and win/loss count", 3580),
              cell("Instrument-level transparency \u2014 no cherry-picking", 3580),
            ]}),
            new TableRow({ children: [
              cell("Recent Predictions", 2200, { bold: true }),
              cell("Scrollable table: date, instrument, timeframe, predicted vs actual direction, price change %, correct/incorrect badge", 3580),
              cell("Full audit trail \u2014 every prediction is visible", 3580),
            ]}),
            new TableRow({ children: [
              cell("Pending Predictions", 2200, { bold: true }),
              cell("Currently open biases whose evaluation period has not yet elapsed", 3580),
              cell("Shows the system is live and making real-time calls", 3580),
            ]}),
            new TableRow({ children: [
              cell("Disclaimer", 2200, { bold: true }),
              cell("Standard \u201Cpast performance does not guarantee future results\u201D legal text", 3580),
              cell("Regulatory protection", 3580),
            ]}),
          ],
        }),

        // ---- 3. SCORING METHODOLOGY ----
        heading("3. Scoring Methodology", HeadingLevel.HEADING_1),
        body("Every bias prediction is scored using a simple, transparent close-to-close comparison:"),

        heading("3.1 How a Prediction is Scored", HeadingLevel.HEADING_2),
        new Paragraph({
          numbering: { reference: "numbers", level: 0 },
          spacing: { after: 80 },
          children: [new TextRun({ text: "When a bias is generated (e.g., \u201CEURUSD 1-week bullish\u201D on March 3rd), the system snapshots the closing price of that instrument on that date.", font: "Arial", size: 21, color: "374151" })],
        }),
        new Paragraph({
          numbering: { reference: "numbers", level: 0 },
          spacing: { after: 80 },
          children: [new TextRun({ text: "When the prediction period elapses (March 10th for a 1-week bias), the system fetches the closing price on the end date.", font: "Arial", size: 21, color: "374151" })],
        }),
        new Paragraph({
          numbering: { reference: "numbers", level: 0 },
          spacing: { after: 80 },
          children: [new TextRun({ text: "The actual direction is determined: if price went up, actual = bullish; if down, actual = bearish; if change < 0.1%, actual = neutral.", font: "Arial", size: 21, color: "374151" })],
        }),
        new Paragraph({
          numbering: { reference: "numbers", level: 0 },
          spacing: { after: 80 },
          children: [new TextRun({ text: "The prediction is marked correct if predicted direction matches actual direction. Neutral predictions are correct if the actual move was < 0.1%.", font: "Arial", size: 21, color: "374151" })],
        }),

        heading("3.2 Period Definitions", HeadingLevel.HEADING_2),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2340, 3510, 3510],
          rows: [
            new TableRow({ children: [headerCell("Timeframe", 2340), headerCell("Open Date", 3510), headerCell("Close Date", 3510)] }),
            new TableRow({ children: [cell("Daily", 2340, { bold: true }), cell("Day bias was generated", 3510), cell("Next trading day close", 3510)] }),
            new TableRow({ children: [cell("1-Week", 2340, { bold: true }), cell("Day bias was generated", 3510), cell("7 calendar days later", 3510)] }),
            new TableRow({ children: [cell("1-Month", 2340, { bold: true }), cell("Day bias was generated", 3510), cell("30 calendar days later", 3510)] }),
            new TableRow({ children: [cell("3-Month", 2340, { bold: true }), cell("Day bias was generated", 3510), cell("90 calendar days later", 3510)] }),
          ],
        }),

        heading("3.3 Neutral Threshold", HeadingLevel.HEADING_2),
        body("A move of less than 0.1% in either direction is classified as \u201Cneutral.\u201D This prevents tiny noise from counting as directional moves. The threshold applies equally to all instruments."),

        // ---- 4. DATABASE CHANGES ----
        heading("4. Database Design", HeadingLevel.HEADING_1),
        body("One new table is required. No changes to existing tables."),

        heading("4.1 New Table: bias_outcomes", HeadingLevel.HEADING_2),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2000, 1800, 1800, 3760],
          rows: [
            new TableRow({ children: [headerCell("Column", 2000), headerCell("Type", 1800), headerCell("Nullable", 1800), headerCell("Description", 3760)] }),
            new TableRow({ children: [cell("id", 2000, { bold: true }), cell("SERIAL PK", 1800), cell("No", 1800), cell("Auto-incrementing primary key", 3760)] }),
            new TableRow({ children: [cell("bias_id", 2000, { bold: true }), cell("INTEGER FK", 1800), cell("No", 1800), cell("References biases.id (UNIQUE constraint)", 3760)] }),
            new TableRow({ children: [cell("instrument", 2000, { bold: true }), cell("TEXT", 1800), cell("No", 1800), cell("Instrument code (denormalized for query speed)", 3760)] }),
            new TableRow({ children: [cell("timeframe", 2000, { bold: true }), cell("TEXT", 1800), cell("No", 1800), cell("daily / 1week / 1month / 3month", 3760)] }),
            new TableRow({ children: [cell("predicted_direction", 2000, { bold: true }), cell("TEXT", 1800), cell("No", 1800), cell("bullish / bearish / neutral (copied from bias)", 3760)] }),
            new TableRow({ children: [cell("open_price", 2000, { bold: true }), cell("DECIMAL(18,6)", 1800), cell("No", 1800), cell("Price when bias was generated", 3760)] }),
            new TableRow({ children: [cell("close_price", 2000, { bold: true }), cell("DECIMAL(18,6)", 1800), cell("Yes", 1800), cell("Price at end of period (NULL = pending)", 3760)] }),
            new TableRow({ children: [cell("price_change_pct", 2000, { bold: true }), cell("DECIMAL(8,4)", 1800), cell("Yes", 1800), cell("Percentage change from open to close", 3760)] }),
            new TableRow({ children: [cell("actual_direction", 2000, { bold: true }), cell("TEXT", 1800), cell("Yes", 1800), cell("bullish / bearish / neutral (determined at settlement)", 3760)] }),
            new TableRow({ children: [cell("is_correct", 2000, { bold: true }), cell("BOOLEAN", 1800), cell("Yes", 1800), cell("Whether prediction matched actual (NULL = pending)", 3760)] }),
            new TableRow({ children: [cell("generated_at", 2000, { bold: true }), cell("TIMESTAMPTZ", 1800), cell("No", 1800), cell("When the bias prediction was made", 3760)] }),
            new TableRow({ children: [cell("settles_at", 2000, { bold: true }), cell("TIMESTAMPTZ", 1800), cell("No", 1800), cell("When the prediction period ends", 3760)] }),
            new TableRow({ children: [cell("settled_at", 2000, { bold: true }), cell("TIMESTAMPTZ", 1800), cell("Yes", 1800), cell("When settlement actually occurred (NULL = pending)", 3760)] }),
          ],
        }),
        new Paragraph({ spacing: { before: 120, after: 80 }, children: [new TextRun({ text: "Indexes:", font: "Arial", size: 21, bold: true, color: "374151" })] }),
        bulletItem("UNIQUE on bias_id (one outcome per bias)", "bullets2"),
        bulletItem("INDEX on (instrument, timeframe) for per-instrument queries", "bullets2"),
        bulletItem("INDEX on (settled_at) for finding unsettled predictions", "bullets2"),
        bulletItem("INDEX on (is_correct) for accuracy calculations", "bullets2"),

        // ---- 5. SYSTEM ARCHITECTURE ----
        heading("5. System Architecture", HeadingLevel.HEADING_1),
        body("Three components work together: the snapshot step, the settlement job, and the API/page."),

        heading("5.1 Price Snapshot (at bias generation)", HeadingLevel.HEADING_2),
        body("When the Python scraper pipeline generates a new bias and inserts it into the biases table, it also:"),
        new Paragraph({
          numbering: { reference: "numbers2", level: 0 },
          spacing: { after: 80 },
          children: [new TextRun({ text: "Fetches the current price for that instrument from the instrument_quotes table", font: "Arial", size: 21, color: "374151" })],
        }),
        new Paragraph({
          numbering: { reference: "numbers2", level: 0 },
          spacing: { after: 80 },
          children: [new TextRun({ text: "Inserts a row into bias_outcomes with the bias_id, open_price, predicted_direction, generated_at, and calculated settles_at", font: "Arial", size: 21, color: "374151" })],
        }),
        new Paragraph({
          numbering: { reference: "numbers2", level: 0 },
          spacing: { after: 80 },
          children: [new TextRun({ text: "close_price, actual_direction, is_correct, and settled_at remain NULL (pending)", font: "Arial", size: 21, color: "374151" })],
        }),
        body("This happens inside the existing analyzer.py pipeline with minimal code changes."),

        heading("5.2 Settlement Job (daily GitHub Action)", HeadingLevel.HEADING_2),
        body("A new Python script (scraper/settle_outcomes.py) runs daily as a GitHub Action step:"),
        new Paragraph({
          numbering: { reference: "numbers3", level: 0 },
          spacing: { after: 80 },
          children: [new TextRun({ text: "Queries all bias_outcomes WHERE settled_at IS NULL AND settles_at <= NOW()", font: "Arial", size: 21, color: "374151" })],
        }),
        new Paragraph({
          numbering: { reference: "numbers3", level: 0 },
          spacing: { after: 80 },
          children: [new TextRun({ text: "For each unsettled outcome, fetches the closing price via FMP historical API (already used in fmp_quotes.py)", font: "Arial", size: 21, color: "374151" })],
        }),
        new Paragraph({
          numbering: { reference: "numbers3", level: 0 },
          spacing: { after: 80 },
          children: [new TextRun({ text: "Calculates price_change_pct, determines actual_direction (bullish if > +0.1%, bearish if < -0.1%, neutral otherwise)", font: "Arial", size: 21, color: "374151" })],
        }),
        new Paragraph({
          numbering: { reference: "numbers3", level: 0 },
          spacing: { after: 80 },
          children: [new TextRun({ text: "Sets is_correct = (predicted_direction == actual_direction) and settled_at = NOW()", font: "Arial", size: 21, color: "374151" })],
        }),

        heading("5.3 Backfill Script (one-time)", HeadingLevel.HEADING_2),
        body("A one-time script (scraper/backfill_outcomes.py) to create bias_outcomes for all historical biases:"),
        bulletItem("Iterates all existing rows in the biases table", "bullets3"),
        bulletItem("Fetches historical open and close prices from FMP\u2019s historical endpoint", "bullets3"),
        bulletItem("Inserts fully-settled bias_outcomes rows with all fields populated", "bullets3"),
        bulletItem("Handles rate limiting with 300ms delay between API calls", "bullets3"),

        heading("5.4 API Route", HeadingLevel.HEADING_2),
        body("New Next.js API route: /api/track-record"),
        bulletItem("No authentication required (public endpoint)", "bullets4"),
        bulletItem("Returns: overall stats, per-timeframe stats, per-instrument stats, recent settled predictions (paginated), pending predictions", "bullets4"),
        bulletItem("Cached with 1-hour revalidation (ISR) since data only changes daily", "bullets4"),

        heading("5.5 Page Component", HeadingLevel.HEADING_2),
        body("New Next.js page: /track-record (outside the (dashboard) route group so it\u2019s not behind auth)"),
        bulletItem("Server-side rendered for SEO (good for search: \u201Cforex AI accuracy\u201D)", "bullets5"),
        bulletItem("Institutional design: serif headings, muted palette, forest green for correct, burgundy for incorrect", "bullets5"),
        bulletItem("Mobile responsive with the same touch-first approach as existing pages", "bullets5"),
        bulletItem("Link added to top navigation visible to all visitors", "bullets5"),

        // ---- 6. IMPLEMENTATION PLAN ----
        new Paragraph({ children: [new PageBreak()] }),
        heading("6. Implementation Plan", HeadingLevel.HEADING_1),
        body("Ordered steps with estimated effort. Each step is a logical commit point."),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [500, 3860, 2500, 2500],
          rows: [
            new TableRow({ children: [headerCell("#", 500), headerCell("Task", 3860), headerCell("Effort", 2500), headerCell("Dependencies", 2500)] }),
            new TableRow({ children: [cell("1", 500, { bold: true }), cell("Create bias_outcomes migration SQL + run on Neon", 3860), cell("30 min", 2500), cell("None", 2500)] }),
            new TableRow({ children: [cell("2", 500, { bold: true }), cell("Add insert_bias_outcome() to scraper/database.py", 3860), cell("30 min", 2500), cell("Step 1", 2500)] }),
            new TableRow({ children: [cell("3", 500, { bold: true }), cell("Modify analyzer.py to snapshot price into bias_outcomes after each bias insert", 3860), cell("1 hour", 2500), cell("Step 2", 2500)] }),
            new TableRow({ children: [cell("4", 500, { bold: true }), cell("Create scraper/settle_outcomes.py (settlement logic)", 3860), cell("2 hours", 2500), cell("Step 2", 2500)] }),
            new TableRow({ children: [cell("5", 500, { bold: true }), cell("Add settlement step to GitHub Actions workflow", 3860), cell("30 min", 2500), cell("Step 4", 2500)] }),
            new TableRow({ children: [cell("6", 500, { bold: true }), cell("Create scraper/backfill_outcomes.py + run against production", 3860), cell("2 hours", 2500), cell("Step 2", 2500)] }),
            new TableRow({ children: [cell("7", 500, { bold: true }), cell("Add track record queries to src/lib/queries.ts", 3860), cell("1 hour", 2500), cell("Step 1", 2500)] }),
            new TableRow({ children: [cell("8", 500, { bold: true }), cell("Create /api/track-record API route", 3860), cell("1 hour", 2500), cell("Step 7", 2500)] }),
            new TableRow({ children: [cell("9", 500, { bold: true }), cell("Build /track-record page + components", 3860), cell("4 hours", 2500), cell("Step 8", 2500)] }),
            new TableRow({ children: [cell("10", 500, { bold: true }), cell("Add Track Record link to top-nav.tsx", 3860), cell("30 min", 2500), cell("Step 9", 2500)] }),
            new TableRow({ children: [cell("11", 500, { bold: true }), cell("Test end-to-end + deploy", 3860), cell("1 hour", 2500), cell("All steps", 2500)] }),
          ],
        }),
        new Paragraph({ spacing: { before: 120 }, children: [new TextRun({ text: "Total estimated effort: ~14 hours (2\u20133 working days)", font: "Arial", size: 21, bold: true, color: BRAND_DARK })] }),

        // ---- 7. OUT OF SCOPE ----
        heading("7. Out of Scope (v1)", HeadingLevel.HEADING_1),
        bulletItem("Date range filtering \u2014 show all data, no filters needed initially", "bullets"),
        bulletItem("Comparison to random/benchmark baseline", "bullets"),
        bulletItem("User-specific track records (this is platform-wide)", "bullets"),
        bulletItem("Charts or equity curves \u2014 clean numbers and tables only in v1", "bullets"),
        bulletItem("Export functionality (CSV/PDF)", "bullets"),
        bulletItem("Email/notification when predictions settle", "bullets"),

        // ---- 8. RISKS ----
        heading("8. Risks & Mitigations", HeadingLevel.HEADING_1),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [3120, 3120, 3120],
          rows: [
            new TableRow({ children: [headerCell("Risk", 3120), headerCell("Impact", 3120), headerCell("Mitigation", 3120)] }),
            new TableRow({ children: [
              cell("Accuracy is embarrassingly low", 3120),
              cell("Public page backfires, hurts credibility", 3120),
              cell("Review backfill results before making page public. If < 55%, investigate methodology before launch.", 3120),
            ]}),
            new TableRow({ children: [
              cell("FMP API historical data gaps", 3120),
              cell("Missing prices for some days/instruments", 3120),
              cell("Fall back to Yahoo Finance API. Skip settlement for days with missing data, retry next run.", 3120),
            ]}),
            new TableRow({ children: [
              cell("Regulatory concern: looks like financial advice", 3120),
              cell("Legal exposure if users treat predictions as advice", 3120),
              cell("Prominent disclaimer on page. Frame as \u201Ceducational analysis accuracy\u201D not \u201Ctrading signals.\u201D", 3120),
            ]}),
            new TableRow({ children: [
              cell("Weekend/holiday price gaps", 3120),
              cell("Forex is closed weekends; some instruments have different hours", 3120),
              cell("Settlement job uses last available close price. Skip weekends in period calculations for daily timeframe.", 3120),
            ]}),
          ],
        }),

        // ---- 9. DISCLAIMER TEXT ----
        heading("9. Disclaimer Text (for page footer)", HeadingLevel.HEADING_1),
        new Paragraph({
          spacing: { after: 120 },
          border: { left: { style: BorderStyle.SINGLE, size: 12, color: BRAND_MUTED, space: 8 } },
          indent: { left: 200 },
          children: [new TextRun({ text: "Past performance is not indicative of future results. The bias predictions shown on this page are generated by AI-powered analysis of publicly available news and economic data. They do not constitute financial advice, trading signals, or recommendations to buy or sell any financial instrument. Trading forex and CFDs carries a high level of risk and may not be suitable for all investors. You should carefully consider your investment objectives, level of experience, and risk appetite before making any trading decisions. Tradeora is an educational and analytical tool only.", font: "Arial", size: 19, italics: true, color: BRAND_MUTED })],
        }),

        // ---- 10. SUCCESS CRITERIA ----
        heading("10. Success Criteria", HeadingLevel.HEADING_1),
        body("The track record page is successful if:"),
        bulletItem("All historical biases are backfilled and scored within 48 hours of launch", "bullets"),
        bulletItem("Settlement job runs reliably daily with no manual intervention", "bullets"),
        bulletItem("Page loads in < 2 seconds (ISR cached)", "bullets"),
        bulletItem("Overall accuracy is displayed accurately and matches manual spot-checks", "bullets"),
        bulletItem("Page is indexed by Google within 2 weeks (public, server-rendered, SEO-friendly)", "bullets"),
        bulletItem("At least one social media share/mention in forex communities within 30 days", "bullets"),

        // ---- NEXT STEPS ----
        heading("Next Steps", HeadingLevel.HEADING_1),
        body("After you approve this spec, I will:"),
        new Paragraph({
          numbering: { reference: "numbers", level: 0 },
          spacing: { after: 80 },
          children: [new TextRun({ text: "Execute the 11-step implementation plan above, step by step", font: "Arial", size: 21, color: "374151" })],
        }),
        new Paragraph({
          numbering: { reference: "numbers", level: 0 },
          spacing: { after: 80 },
          children: [new TextRun({ text: "Review checkpoint after the database + Python work (steps 1\u20136)", font: "Arial", size: 21, color: "374151" })],
        }),
        new Paragraph({
          numbering: { reference: "numbers", level: 0 },
          spacing: { after: 80 },
          children: [new TextRun({ text: "Review checkpoint after the Next.js page is built (steps 7\u201310)", font: "Arial", size: 21, color: "374151" })],
        }),
        new Paragraph({
          numbering: { reference: "numbers", level: 0 },
          spacing: { after: 80 },
          children: [new TextRun({ text: "Then move to Phase 1 item #2: Stripe Payment Integration", font: "Arial", size: 21, color: "374151" })],
        }),
      ],
    },
  ],
});

Packer.toBuffer(doc).then(buffer => {
  const outPath = "/Users/a/Desktop/forex-analysis/docs/track-record-implementation-spec.docx";
  fs.writeFileSync(outPath, buffer);
  console.log("Written to: " + outPath);
});
