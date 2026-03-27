# ECharts Extension — Full Project Documentation
### Unified Doc | v10 (index.html)

---

## Overview

A Tableau Viz Extension (worksheet extension) that renders interactive charts, KPI cards, a multi-line time-series chart, an RTL data table, and premium KPI cards inside a Tableau worksheet. Single HTML file, no backend, fully offline.

- **49 chart types** across 15 categories (45 ECharts + KPI Card + Multi-Line Chart + RTL Table + KPI Table)
- Marks Card UI inside the extension — assign fields to chart roles via dropdown or drag & drop
- Gallery modal — browse chart types with live previews, search + category filter chips
- **Settings persist in the workbook** via `tableau.extensions.settings`
- **Format Extension button** — editor-only access to settings via Tableau's native Marks card button
- **Auto-refresh on FilterChanged** — chart re-renders automatically when any worksheet filter changes
- Manual field reload button (↺) — syncs field list from Detail shelf without page reload
- **🎨 Color editor** — context-aware: ECharts palette / BAN colors / KPI Table dedicated controls
- **🖼 Background color picker** — set or reset extension background color per sheet
- **⌐ Border radius control** — 4-corner independent border radius popover
- **Aa Font size control** — BAN-only popover with 4 independent sliders
- **KPI BAN Card** — two premium dark-style KPI cards (Style 1 & Style 2)
- **KPI Table (מדדים)** — up to 4 typed KPI names mapped to separate measure fields
- **KPI Card (Sparkline)** — single KPI with trend sparkline, YoY or range comparison, auto-detected Hebrew/English
- **Multi-Line Chart** — multi-series time-series line chart, per-line color picker, BG color slot
- **Click-to-filter disabled** — clicking chart elements does not trigger Tableau mark selection
- **Transparent background by default** — Tableau sheet background shows through
- **Fully offline** — no CDN dependencies, all assets served locally

> **Console warnings note:** Tableau's own runtime emits `@import` CSS warnings and preload warnings in the browser console. These originate from `tableau.css` and are unrelated to extension code — safely ignored.

---

## File Structure

| File | Purpose |
|---|---|
| `index.html` | Main extension — all CSS, HTML, JS in one file (~3,030 lines) |
| `echarts-extension.trex` | Tableau manifest — update URL before deploying |
| `tableau.extensions.js` | Tableau Extensions API (local copy) |
| `echarts.min.js` | ECharts 5 library (local copy) |
| `chart.js` | Chart.js v4.4.1 (local copy) — used by KPI Card and Multi-Line Chart |
| `world.js` | ECharts world GeoJSON — auto-registers `'world'` map on load |
| `NotoSansHebrew-Regular.ttf` | Font — weight 400 |
| `NotoSansHebrew-SemiBold.ttf` | Font — weight 500/600 |
| `NotoSansHebrew-ExtraBold.ttf` | Font — weight 700/800 |
| `debug.html` | Debug panel — shows raw API data, column types, field names |
| `debug.trex` | Manifest for debug panel |

---

## Deployment

### Desktop (Development)
1. Run `python -m http.server 8080` from the extension folder
2. Update `echarts-extension.trex` → `<url>` to `http://localhost:8080/index.html`
3. Load `echarts-extension.trex` → Tableau Desktop → Add Extension → Access Local Viz Extensions

### Tableau Cloud / GitHub Pages (Production)
- Push **all files** to GitHub repo (index.html + trex + js libs + fonts + world.js + chart.js)
- Enable GitHub Pages on the repo
- Update `echarts-extension.trex` → `<url>` to your GitHub Pages URL
- Whitelist in Tableau Cloud → Settings → Extensions → Add URL
- Load `echarts-extension.trex`
- Live debug: open workbook in browser → F12 → Console

---

## Chart Types (49 total)

| Category | Charts |
|---|---|
| קו ושטח | Line Chart, Area Chart, Step Line, Stacked Area, Stacked Line, Confidence Band |
| עמודות | Bar Chart, Horizontal Bar, Stacked Bar, Waterfall, Dual Axis, Pictorial Bar, Histogram, Polar Bar |
| עוגה | Pie Chart, Donut Chart, Nightingale Rose, Nested Pie |
| פיזור | Scatter Plot, Bubble Chart, Effect Scatter |
| מפות חום | Heatmap, Calendar Heatmap, Multi-year Calendar |
| היררכיה | Treemap, Sunburst, Tree Chart, Radial Tree |
| זרימה | Sankey Diagram, Network Graph, ThemeRiver, Circular Graph |
| מפה | World Map, US States Map, Geo Bubble Map, Lines Map |
| **KPI** | **KPI Table (מדדים)**, **BAN Card — Style 1**, **BAN Card — Style 2**, Gauge Chart, Progress Bar, Multi Gauge |
| פיננסי | Candlestick, Candlestick + Volume |
| מיוחד | Radar Chart, Multi-series Radar, Funnel Chart, Parallel Coordinates |
| טבלה | RTL Table |
| **סדרות זמן** | **KPI Card (Sparkline)**, **Multi-Line Chart** |

---

## KPI Card (Sparkline) — `kpi_card`

A single-KPI card with a trend sparkline, headline value, and period comparison. Ported from the standalone `kpi_40.html` (v70) extension and integrated as a chart type in the unified extension.

### Chart ID
`kpi_card`

### Field Roles

| Role ID | Label | Type | Required |
|---|---|---|---|
| `date` | תאריך (Truncated) | dim | ✅ |
| `val` | ערך מדד | measure | ✅ |
| `range` | טווח (range field) | both | Optional |
| `rawdate` | תאריך גולמי | dim | Optional |

Assign the `Truncated` calculated field to `date`. Assign the raw date field (e.g. `Order Date`) to `rawdate` — this is used only in **year granularity** mode to scan monthly sub-totals for the YTD headline and trend direction. If left empty, the extension auto-detects the raw date column.

### Tableau Sheet Setup

Place on **Detail shelf** (Marks card):

| Field | Type | Purpose |
|---|---|---|
| `Truncated` | Date (calculated) | X axis — respects granularity parameter |
| Measure | Float/Int | The KPI value |
| Raw date field (e.g. `Order Date`) | Date/Datetime | Used for year-mode raw date scanning |
| `range` | Integer | 1 or 2 — which period each row belongs to |
| `Normalized Date` | Date-time | Maps both periods onto same calendar for overlay |

### Truncated Formula
```
DATE(CASE [Parameter 1]
  WHEN 'week'    THEN DATETRUNC('week',    [Order Date])
  WHEN 'month'   THEN DATETRUNC('month',   [Order Date])
  WHEN 'quarter' THEN DATETRUNC('quarter', [Order Date])
  WHEN 'day'     THEN DATETRUNC('day',     [Order Date])
  WHEN 'year'    THEN DATETRUNC('year',    [Order Date])
END)
```

### Time Filter Formula
Controls which rows are sent to the extension. In range mode, the time filter must pass all rows through — the `[range]` field + filter-shelf exclusion of 0 handles period scoping.

```
// Pass all rows in range mode
[frame] = 'range'
OR
// Current year YTD (last year mode)
(
    YEAR([Order Date]) = YEAR([Max Date])
    AND (
        ([Parameter 1] = 'year'    AND [Order Date] <= [Max Date]) OR
        ([Parameter 1] = 'day'     AND [Order Date] <= [Max Date]) OR
        ([Parameter 1] = 'week'    AND [Order Date] < DATETRUNC('week', [Max Date])) OR
        ([Parameter 1] = 'month'   AND [Order Date] < DATETRUNC('month', [Max Date])) OR
        ([Parameter 1] = 'quarter' AND [Order Date] < DATETRUNC('quarter', [Max Date]))
    )
    AND [Order Date] >= DATETRUNC('year', [Max Date])
)
OR
// Prior year same period (last year mode)
(
    YEAR([Order Date]) = YEAR([Max Date]) - 1
    AND (
        ([Parameter 1] = 'year'    AND [Order Date] <= DATEADD('year', -1, [Max Date])) OR
        ([Parameter 1] = 'day'     AND [Order Date] <= DATEADD('year', -1, [Max Date])) OR
        ([Parameter 1] = 'week'    AND [Order Date] < DATEADD('year', -1, DATETRUNC('week', [Max Date]))) OR
        ([Parameter 1] = 'month'   AND [Order Date] < DATEADD('year', -1, DATETRUNC('month', [Max Date]))) OR
        ([Parameter 1] = 'quarter' AND [Order Date] < DATEADD('year', -1, DATETRUNC('quarter', [Max Date])))
    )
    AND [Order Date] >= DATEADD('year', -1, DATETRUNC('year', [Max Date]))
)
```

Note: week/month/quarter only include **complete** periods. `[Max Date]` is a calculated field returning `MAX([Order Date])`.

### Range Field Formula
```
IF [frame] = 'range' AND [date] >= [from1] AND [date] <= [to1] THEN 1
ELSEIF [frame] = 'range' AND [date] >= [from2] AND [date] <= [to2] THEN 2
ELSEIF [frame] = 'last year' THEN 1
ELSE 0
END
```
Filter shelf: exclude 0.

### Parameters

| Parameter | Type | Values | Purpose |
|---|---|---|---|
| `Parameter 1` | String | month, week, day, quarter, year | Date granularity |
| `frame` | String | last year, range | Comparison mode |
| `from1` / `to1` | Date | Any date | Range 1 start/end |
| `from2` / `to2` | Date | Any date | Range 2 start/end |

### Comparison Modes

**Last Year** (`frame = 'last year'`):
- Splits data by `getFullYear()`: current year vs prior year
- Matches points by **period number** (ISO week / month / quarter / day-of-year / constant 0 for year)
- Both series rendered indexed (X = 0,1,2…) — lines overlay cleanly
- Tension = 0 (straight lines)
- Tooltip title shows both dates: `27.12.2026 / 28.12.2025`

**Year granularity special behavior:**
- DATETRUNC collapses all rows to `01.01.YYYY` — only 1 point from Truncated
- Extension scans the raw date column, groups by month, takes first + last month as 2 data points → flat horizontal line
- **KPI headline = total sum of all months** in current year period
- **Comparison = total sum of all months** in prior year period
- Labels show full YTD range: `01.01.2026 – 30.09.2026`

**Range** (`frame = 'range'`):
- Splits rows by `range` column (1 vs 2), groups by Truncated, aligns by index
- 1 point per range → bubble chart; multiple points → straight line (tension=0)

### Card Layout
```
[KPI Name]
[₪2.3M]  [▲+302.8K (+13%)]
תקופה נוכחית: 27.12.2026
השוואה:       28.12.2025
[sparkline chart]
```

Change color: green (`#16a34a`) when up, red (`#dc2626`) when down, indigo (`#6366f1`) when neutral or no comparison.

### RTL / LTR Auto-detection
Hebrew characters (`/[\u0590-\u05FF]/`) detected in measure name:
- **Hebrew** → `direction:rtl`, `₪`, labels `תקופה נוכחית:` / `השוואה:`
- **No Hebrew** → `direction:ltr`, `$`, labels `Current:` / `vs:`

---

## Multi-Line Chart — `multiline`

A multi-series time-series line chart bucketed by month or quarter. One line per group value. Ported from the standalone `multi.html` (v31) extension.

### Chart ID
`multiline`

### Field Roles

| Role ID | Label | Type | Required |
|---|---|---|---|
| `date` | תאריך | dim | ✅ |
| `val` | ערך מדד | measure | ✅ |
| `group` | קיבוץ (Group By) | dim | Optional |
| `bg` | צבע רקע (BG) | dim | Optional |

Drag a **continuous Month** date to `date` (right-click the pill → Continuous → Month). If `group` is empty, all data renders as a single line named after the measure.

### Parameters

| Parameter | Type | Values | Purpose |
|---|---|---|---|
| `Parameter 1` or `timeframe` | String | month, quarter | Controls X axis buckets and labels |

### Features

**Multi-Line Chart:**
- One line per unique value in the Group By field; up to 10 lines (cycles if more)
- X axis: fixed Hebrew month names (ינואר–דצמבר) or quarter names (רבעון 1–4)
- Multiple rows with the same group + bucket are summed
- Months/quarters with no data show as gaps (`spanGaps: false`)
- No dots — lines only; dots appear on hover (`pointRadius: 0`, `pointHoverRadius: 5`)
- No grid lines on either axis

**Color Editor (inline legend popovers):**
- Click any legend swatch at the bottom of the chart
- Popover opens near the cursor with a native color picker + hex input field
- Line color, fill, hover dots, and tooltip swatches update **live** on pick
- Colors saved in `state.mlColorMap` and persisted in workbook settings

**BG Color Slot:**
- Drag any string/dimension field to the `bg` role slot
- One swatch pill per unique value appears in the header (next to חודשי badge)
- Clicking a swatch opens the color picker labelled `BG: <value>`
- Color applies immediately as the extension background
- Colors saved in `state.mlBgColorMap` and persisted in workbook settings

**Timeframe Badge:**
- Top-right: **חודשי** or **רבעוני** — updates on parameter change

**Tooltip:**
- Mode: `index` (vertical crosshair across all lines)
- Title: Hebrew bucket label, right-aligned
- Body: `value :GroupLabel` (RTL order), right-aligned
- Swatch reads live `dataset.borderColor`

**RTL Layout:**
- Measure name header right-aligned (`direction: rtl`)
- Tooltip title + body right-aligned (`titleAlign: 'right'`, `bodyAlign: 'right'`)

### Column Resolution (fallback if roles not assigned)
Three layers tried in order:
1. **Role slot** — reads assigned `fieldName` directly from `state.assignments`
2. **DataType float-first** — first `float`/`real`/`number`/`double` column for measure
3. **DataType integer** — first `integer`/`int` column whose name doesn't match `year|month|quarter|day|week`

`bgIdx` resolved before `groupIdx` to prevent BG field from being mistakenly picked as group.

---

## KPI Table (מדדים) — `bantable2`

A dark-themed multi-KPI comparison table rendered as pure HTML. Up to 4 KPIs, each driven by a separate measure field with a name typed directly in the Marks card UI.

### Chart ID
`bantable2`

### Field Roles

| Role ID | Label | Type | Required |
|---|---|---|---|
| `val1` | ערך 1 | measure | ✅ |
| `val2` | ערך 2 | measure | Optional |
| `val3` | ערך 3 | measure | Optional |
| `val4` | ערך 4 | measure | Optional |
| `prev1` | קודם 1 | measure | Optional |
| `prev2` | קודם 2 | measure | Optional |
| `prev3` | קודם 3 | measure | Optional |
| `prev4` | קודם 4 | measure | Optional |
| `period` | תקופה נוכחית | dim | Optional |
| `prevper` | תקופה להשוואה | dim | Optional |

### Marks Card UI

The marks card renders a custom UI — not the standard role slots:
- **KPI 1–4**: each block has a free-text name input + ערך נוכחי measure slot + ערך קודם measure slot
- Only **KPI 1 ערך** is required — KPI 2–4 are fully optional
- Names typed in the UI are stored in `state.kpiNames[]` and persisted as `kpiNames`
- Shared `period` / `prevper` dim slots at the bottom apply to all KPI rows

### Layout — CSS Grid

Header and all data rows share one CSS grid so columns are guaranteed to align:

```
grid-template-columns: auto  1fr   auto   auto
                        ↑     ↑      ↑      ↑
                       מדד   ערך   שינוי  קודם (hidden if no prev assigned)
```

### RTL / LTR Auto-detection

Hebrew characters detected in KPI names or period label:
- **Hebrew** → `direction:rtl`, `₪`
- **No Hebrew** → `direction:ltr`, `$`

### Value Formatting

| Magnitude | Format | Example |
|---|---|---|
| ≥ 1B | cur + value + B | ₪2.33B |
| ≥ 1M | cur + value + M | ₪2.33M |
| ≥ 1K | cur + value + K | ₪38.7K |
| < 1K | cur + toLocaleString | ₪842 |

### Badge Colors (automatic)

| State | Border | Arrow Fill |
|---|---|---|
| Positive (pct > 0) | `rgba(80,200,60,0.55)` | `rgba(80,200,60,0.9)` |
| Negative (pct < 0) | `rgba(220,60,50,0.55)` | `rgba(220,80,70,0.9)` |
| Neutral / no prev | `rgba(150,150,150,0.4)` | `rgba(160,160,160,0.8)` |

### 🎨 Color Editor (context-aware for KPI Table)

When `bantable2` is active, the color editor shows 4 dedicated controls:

| Swatch | Controls | Default |
|---|---|---|
| ערך טקסט | KPI names + all values text | `#ffffff` |
| כותרת טקסט | Header row label text | `#9a9a9a` |
| כותרת רקע | Header row background | `#2a2a2a` |
| רקע גיליון | Full table background | `#1e1e1e` |

All 4 update live on color pick. **אפס** resets all including sheet background.

---

## KPI BAN Cards — `ban1` / `ban2`

Two premium dark-style KPI cards rendered as pure HTML.

### Chart IDs
- `ban1` — **Style 1**: main value and badge pill on the same row
- `ban2` — **Style 2**: main value full-width on its own row, badge pill below it

### Field Roles (same for both)

| Role ID | Label | Type | Required |
|---|---|---|---|
| `name` | שם KPI | dim | ✅ |
| `val` | ערך נוכחי | measure | ✅ |
| `period` | תקופה נוכחית | dim | Optional |
| `prev` | ערך קודם | measure | Optional |
| `prevper` | תקופה להשוואה | dim | Optional |

### RTL / LTR Auto-detection

Hebrew characters detected in KPI name and period labels:
- **Hebrew** → `direction:rtl`, `₪`, badge label `שינוי`, comparison word `תקופה קודמת`
- **No Hebrew** → `direction:ltr`, `$`, badge label `change`, comparison word `prev period`

### 🎨 BAN Color Editor

When a BAN chart is active, the color editor shows 3 swatches:

| Swatch | Controls | Default |
|---|---|---|
| רקע כרטיס | Card background fill | `#1e1e1e` |
| טקסט עליון | KPI name + main value | `#ffffff` |
| טקסט תחתון | Prev value + period labels below divider | `#9a9a9a` |

### Aa Font Size Control

Visible only when `ban1` or `ban2` is active. 4 independent sliders:

| Slider | Controls | Range |
|---|---|---|
| שם KPI | KPI name label | 8–36px |
| ערך ראשי | Main value number | 20–120px |
| תג שינוי | Badge % text | 8–32px |
| תקופה / ערך קודם | Period labels + prev value | 8–28px |

Live preview on drag. Reset clears overrides and reverts to auto-scaling. Persisted as `banFontSizes`.

### Responsive Scaling

`renderBan()` uses a balanced scale unit `u = Math.min(w/400, h/220)` to scale fonts, padding, and badge. Main value font capped at `42% of container height`.

---

## RTL Table — `rtltable`

A full-featured scrollable table rendered directly in the extension. No role slots — all fields on the Detail shelf are included automatically.

### Features

| Feature | Detail |
|---|---|
| Column order | Controlled by a Tableau String parameter named `Columns` (comma-separated field names) |
| Column visibility | Only fields listed in `Columns` parameter shown; unlisted fields dropped |
| Fallback | If `Columns` parameter missing or empty — all Detail fields shown |
| Filter dropdowns | Multi-select checkbox panel per column with search, החל / הכל buttons |
| Filter logic | AND across columns, client-side |
| Numeric formatting | `toLocaleString('en-US')` — wrapped in LTR span |
| Date formatting | Uses Tableau's `formattedValue` |
| Null values | Displays `—` |
| RTL layout | Full RTL with Hebrew font |

### Columns Parameter Setup

1. Create a String parameter named `Columns` in Tableau
2. Set Allowable Values → **List**
3. Add one entry — the Value contains the comma-separated ordered field names:
   ```
   YEAR(Order Date), Category, Customer Name, SUM(Sales), SUM(Profit)
   ```
4. Field names must match what Tableau sends in `getSummaryDataAsync` — include aggregation wrappers

---

## Chart Roles Reference

| Chart | Required Roles | Optional Roles |
|---|---|---|
| **KPI Card (Sparkline)** | תאריך (dim), ערך מדד (measure) | טווח (both), תאריך גולמי (dim) |
| **Multi-Line Chart** | תאריך (dim), ערך מדד (measure) | קיבוץ (dim), צבע רקע (dim) |
| **KPI Table (מדדים)** | ערך 1 (measure) | ערך 2–4 (measure), קודם 1–4 (measure), תקופה נוכחית (dim), תקופה להשוואה (dim) |
| **BAN Card — Style 1 & 2** | שם KPI (dim), ערך נוכחי (measure) | תקופה נוכחית (dim), ערך קודם (measure), תקופה להשוואה (dim) |
| Line / Area / Step Line / Stacked Line | X (dim), Y (measure) | Group (dim) |
| Stacked Area | X (dim), Y (measure), Group (dim) | — |
| Confidence Band | X (dim), קו מרכזי (measure), גבול עליון (measure), גבול תחתון (measure) | — |
| Bar / Horizontal Bar | X/Y axis (dim), value (measure) | Color (dim) |
| Stacked Bar | X (dim), Y (measure), Stack (dim) | — |
| Waterfall | X (dim), Y (measure) | — |
| Dual Axis | X (dim), עמודות (measure), קו (measure) | — |
| Pictorial Bar | X (dim), Y (measure) | — |
| Histogram | Bin (dim), ספירה (measure) | — |
| Polar Bar | קטגוריה (dim), ערך (measure) | Color (dim) |
| Pie / Donut / Nightingale Rose | ממד (dim), ערך (measure) | — |
| Nested Pie | חיצוני (dim), פנימי (dim), ערך (measure) | — |
| Scatter / Effect Scatter | X (measure), Y (measure) | Color (dim) |
| Bubble | X (measure), Y (measure), גודל (measure) | Color (dim) |
| Heatmap | X (dim), Y (dim), ערך (measure) | — |
| Calendar / Multi-year Calendar | תאריך (dim), ערך (measure) | — |
| Radar | מדדים (dim), ערך (measure) | — |
| Multi-series Radar | מדדים (dim), ערך (measure), סדרה (dim) | — |
| Funnel | שלב (dim), ערך (measure) | — |
| Parallel Coordinates | קטגוריה (dim), מדד 1 (measure), מדד 2 (measure) | מדד 3–5 (measure) |
| Treemap | ממד (dim), ערך (measure) | Parent (dim) |
| Sunburst / Tree Chart / Radial Tree | רמה 1 (dim), רמה 2 (dim), ערך (measure) | — |
| Sankey | מקור (dim), יעד (dim), ערך (measure) | — |
| Network Graph / Circular Graph | מקור (dim), יעד (dim) | משקל (measure) |
| ThemeRiver | זמן (dim), נושא (dim), ערך (measure) | — |
| Gauge | ערך (measure) | מקסימום (measure) |
| Progress Bar | ערך (measure) | מקסימום (measure), קטגוריה (dim) |
| Multi Gauge | ערך 1 (measure) | ערך 2, ערך 3 (measure) |
| Candlestick | תאריך (dim), פתיחה, סגירה, מינימום, מקסימום (measures) | — |
| Candlestick + Volume | תאריך (dim), פתיחה, סגירה, מינימום, מקסימום (measures) | נפח (measure) |
| World Map | מדינה (dim), ערך (measure) | — |
| US States Map | מדינה US (dim), ערך (measure) | — |
| Geo Bubble Map | Latitude (measure), Longitude (measure), ערך (measure) | תווית (dim), צבע (dim) |
| Lines Map | Lat מקור, Lon מקור, Lat יעד, Lon יעד (measures) | עוצמה (measure), תווית (dim) |
| RTL Table | — (no roles) | — |

---

## Marks Card Toolbar Buttons

| Button | Action |
|---|---|
| ✕ | Close the marks-card panel |
| ↺ | Reload fields from Detail shelf |
| צייר | Render chart + save settings |
| 🎨 | Color editor — ECharts palette / BAN colors / KPI Table dedicated controls. For KPI Card and Multi-Line Chart, click legend swatches directly instead |
| 🖼 | Background color picker (single click = pick, double click = reset to transparent) |
| ⌐ | Border radius popover — 4 independent corner inputs, 0–80px |
| Aa | Font size popover — 4 sliders for BAN text. Only visible when ban1 or ban2 is active |
| [Chart name + icon] | Open gallery |

---

## How the Extension Works — Flow

```
initializeAsync({ configure: () => show marks-card })
  └── loadSettings() → restore full state
  └── loadFields() — getSummaryDataAsync({ maxRows:1 })
  └── applyBorderRadius()
  └── if saved state:
        → app shown, marks-card hidden
        → renderMarksCard() + applyChart() → chart rendered immediately
      else:
        → onboarding screen shown

applyChart()
  ├── [rtltable]    → renderTable()
  ├── [kpi_card]    → renderKpiCard(dt, assignments, params)
  ├── [multiline]   → renderMultiLine(dt, assignments, params)
  ├── [bantable2]   → renderBanTable2(rows, assignments, kpiNames)
  ├── [ban1/ban2]   → renderBan(rows, assignments, banStyle)
  └── [other]       → renderECharts() [always disposes + clears + reinits fresh]
  └── applyBorderRadius()
```

---

## Settings — Persist Across Sessions

All settings saved inside the workbook via `tableau.extensions.settings`. Stored in the `.twbx` file — shared across all users opening the workbook.

```javascript
tableau.extensions.settings.set('chartId',      state.chart.id);
tableau.extensions.settings.set('assignments',   JSON.stringify(state.assignments));
tableau.extensions.settings.set('customColors',  JSON.stringify(state.customColors || null));
tableau.extensions.settings.set('banColors',     JSON.stringify(state.banColors || null));
tableau.extensions.settings.set('banFontSizes',  JSON.stringify(state.banFontSizes || null));
tableau.extensions.settings.set('borderRadius',  JSON.stringify(state.borderRadius || {tl:0,tr:0,bl:0,br:0}));
tableau.extensions.settings.set('bgColor',       state.bgColor || '');
tableau.extensions.settings.set('kpiNames',      JSON.stringify(state.kpiNames || ['','','','']));
tableau.extensions.settings.set('mlColorMap',    JSON.stringify(state.mlColorMap || {}));
tableau.extensions.settings.set('mlBgColorMap',  JSON.stringify(state.mlBgColorMap || {}));
await tableau.extensions.settings.saveAsync();
```

---

## State Object

```javascript
state = {
  chart: null,              // selected chart config object
  assignments: {},          // roleId → { fieldName, displayName, dataType }
  worksheetFields: [],      // fields from loadFields() — only fields on Detail shelf
  worksheet: null,          // tableau worksheet reference (stored on init)
  echartsInstance: null,    // ECharts instance on the container div
  activeDropdownRole: null, // role currently being assigned
  galleryFilter: 'הכל',    // active gallery category filter
  customColors: null,       // array of 4 hex strings, or null = use DEFAULT_COLORS
  banColors: null,          // array of 4 hex strings [boxCol, topCol, botCol, hdrCol], or null = BAN_COLOR_DEFAULTS
  banFontSizes: null,       // { name, value, badge, bot } px overrides, or null = auto-scale
  borderRadius: {tl:0,tr:0,bl:0,br:0}, // corner radii in px
  bgColor: null,            // hex string for extension background, or null = transparent
  kpiNames: ['','','',''],  // KPI names typed in bantable2 marks card UI
  mlColorMap: {},           // label → hex, line colors for multiline chart
  mlBgColorMap: {},         // label → hex, background colors for multiline BG slot
  mlChartInstance: null,    // Chart.js instance — shared by kpi_card and multiline
}
```

### BAN_COLOR_DEFAULTS

```javascript
// Index:  [0]       [1]        [2]        [3]
//         box bg    val text   hdr text   hdr bg
['#1e1e1e','#ffffff','#9a9a9a','#2a2a2a']
```

Used by `ban1`, `ban2`, and `bantable2`.

---

## Error Handling

| Situation | Error shown |
|---|---|
| Required role not filled | "חסרים שדות: [role labels]" |
| API call fails | "שגיאת טעינה: [message]" |
| `%many-values%` detected | "רמת פירוט לא מוגדרת — גרור ממדים ל-Detail ב-Marks Card של Tableau" |
| `world.js` not loaded | "world.js לא נטען — בדוק שהקובץ קיים לצד index.html" |
| Map JSON fetch fails | "לא ניתן לטעון מפה: [message]" |
| RTL Table — no fields on Detail | "אין שדות — גרור שדות ל-Detail" |
| KPI Card — missing date or value | "חסרים שדות — שייך תאריך וערך" |
| Multi-Line — no measure found | "לא נמצא מדד. שייך מדד לשדה 'ערך מדד'." |
| Multi-Line — no date found | "לא נמצא שדה תאריך. שייך תאריך לשדה 'תאריך'." |
| Multi-Line — no data returned | "אין נתונים. בדוק פילטרים ושדות." |

---

## Open Known Issues

| Issue | Affected Charts | Notes |
|---|---|---|
| Sort is lexicographic — "10" sorts before "9" | Line, Area, Step Line, Stacked Line, Candlestick | Fix: numeric comparator with string fallback |
| Bubble symbol size not normalized | Bubble | `Math.sqrt(d[2])*3` without dividing by maxVal |
| Treemap `Parent` role ignored in render | Treemap | Role defined in UI but `renderECharts` renders flat data |
| Waterfall incorrect baseline for negative values | Waterfall | `baseData` logic breaks when cumulative goes negative |
| ThemeRiver `type:'time'` axis may break | ThemeRiver | If Tableau returns `MONTH()` as int (1–12) |
| Stacked Area crashes if `groupField` is null | Stacked Area | No null-guard before `groups` map |
| KPI Card — stagger on multi-card load | KPI Card | `getSummaryDataAsync()` served sequentially ~80-90ms apart per card; `animation:false` makes stagger imperceptible |

---

## Version History

| Version | Status | Notes |
|---|---|---|
| v1 | ✅ Superseded | Initial build. Gallery, Marks Card, 14 chart types, drag & drop, FilterChanged, onboarding. |
| v2 | ✅ Superseded | Fix loadFields to use getSummaryDataAsync. Fix date functions treated as measures. Add ↺ reload button. |
| v3 | ✅ Superseded | +14 chart types (28 total). Fully offline — all assets local. Fixed map loading via local world.js. |
| v4 | ✅ Superseded | +17 chart types (45 total). QA audit. 6 open bugs documented. |
| v5 | ✅ Superseded | Settings persistence via `tableau.extensions.settings`. Format Extension button. RTL Table merged as chart #46. Startup flicker fixed. |
| v6 | ✅ Superseded | Auto-refresh on FilterChanged. 🎨 Color editor. 🖼 Background color picker. Transparent background default. Gauge fixes. Click-to-filter disabled. |
| v7 | ✅ Superseded | **KPI BAN Cards** (`ban1`, `ban2`) — dark premium design, ResizeObserver scaling, RTL/LTR detection, ₪/$ currency, 5 field shelves. Context-aware 🎨 color editor with 3 BAN swatches. **⌐ Border radius control** — 4-corner independent popover, persisted in settings. Container switching fixes. |
| v8 | ✅ Superseded | **BAN layout & proportion overhaul** — balanced scale unit, value font capped at 42% card height, opacity fixes, badge padding tightened. **RTL/LTR layout fixed** — unified `direction:ltr` flex row with DOM order swap. **Aa Font size control** — BAN-only, 4 sliders, live preview, persisted as `banFontSizes`. |
| v9 | ✅ Superseded | **KPI Table (מדדים)** (`bantable2`) — up to 4 typed KPI names mapped to separate measure fields. CSS grid layout guarantees column alignment between header and data rows. Context-aware 🎨 color editor with 4 dedicated table controls. Old dimension-driven `bantable` removed. |
| v10 | ✅ Current | **Unified extension** — merged KPI Card (Sparkline) and Multi-Line Chart into `index.html` as chart types `kpi_card` and `multiline`. Added `chart.js` dependency. New category "סדרות זמן". KPI Card: full port of `kpi_40.html` v70 — last-year + range modes, all granularities, RTL/LTR, year-mode YTD. Multi-Line: full port of `multi.html` v31 — per-line color popover, BG color slot, Hebrew month/quarter labels, `mlColorMap`/`mlBgColorMap` persisted in settings. State extended with `mlColorMap`, `mlBgColorMap`, `mlChartInstance`. |
