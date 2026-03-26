# ECharts Extension — Tableau Viz Extension
### Full Project Documentation | v9

---

## Overview

A Tableau Viz Extension (worksheet extension) that renders interactive ECharts visualizations, an RTL data table, and premium KPI cards inside a Tableau worksheet. Single HTML file, no backend, fully offline.

- **47 chart types** across 14 categories (45 ECharts + 1 RTL Table + 1 KPI Table)
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
- **Click-to-filter disabled** — clicking chart elements does not trigger Tableau mark selection
- **Transparent background by default** — Tableau sheet background shows through
- **Fully offline** — no CDN dependencies, all assets served locally

> **Console warnings note:** Tableau's own runtime emits `@import` CSS warnings and preload warnings in the browser console. These originate from `tableau.css` and are unrelated to extension code — safely ignored.

---

## File Structure

| File | Purpose |
|---|---|
| `index.html` | Main extension — all CSS, HTML, JS in one file (~2,400 lines) |
| `echarts-extension.trex` | Tableau manifest — update URL before deploying |
| `tableau.extensions.js` | Tableau Extensions API (local copy) |
| `echarts.min.js` | ECharts 5 library (local copy) |
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
2. Update `echarts-extension.trex` → `<url>` to `https://localhost:8080/index.html`
3. Load `echarts-extension.trex` → Tableau Desktop → Add Extension → Access Local Viz Extensions

### Tableau Cloud / GitHub Pages (Production)
- Push **all files** to GitHub repo (index.html + trex + js libs + fonts + world.js)
- Enable GitHub Pages on the repo
- Update `echarts-extension.trex` → `<url>` to your GitHub Pages URL
- Whitelist in Tableau Cloud → Settings → Extensions → Add URL
- Load `echarts-extension.trex`
- Live debug: open workbook in browser → F12 → Console

---

## Chart Types (47 total)

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

---

## KPI Table (מדדים)

A dark-themed multi-KPI comparison table rendered as pure HTML. Up to 4 KPIs, each driven by a separate measure field with a name typed directly in the marks card UI.

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
- Names typed in the UI are stored in `state.kpiNames[]` and persisted in workbook settings as `kpiNames`
- Shared `period` / `prevper` dim slots at the bottom apply to all KPI rows

### Layout — CSS Grid

Header and all data rows share **one single CSS grid** so columns are guaranteed to align:

```
grid-template-columns: auto  1fr   auto   auto
                        ↑     ↑      ↑      ↑
                       מדד   ערך   שינוי  קודם (hidden if no prev assigned)
```

| Column | Content | Sizing |
|---|---|---|
| מדד | KPI name | `auto` — shrinks to content |
| ערך | Current value (formatted) | `1fr` — takes remaining space, centered |
| שינוי | Change badge (▲/▼ + %) | `auto` |
| קודם | Previous value | `auto` — column omitted entirely if no prev measure assigned |

### RTL / LTR Auto-detection

Hebrew characters (`/[\u0590-\u05FF]/`) detected in KPI names or period label:
- **Hebrew detected** → `direction:rtl`, currency symbol `₪`
- **No Hebrew** → `direction:ltr`, currency symbol `$`

### Value Formatting

| Magnitude | Format | Example |
|---|---|---|
| ≥ 1B | cur + value + B | ₪2.33B |
| ≥ 1M | cur + value + M | ₪2.33M |
| ≥ 1K | cur + value + K | ₪38.7K |
| < 1K | cur + toLocaleString | ₪842 |

### Badge Colors (automatic, not user-controlled)

| State | Border | Arrow Fill |
|---|---|---|
| Positive (pct > 0) | `rgba(80,200,60,0.55)` | `rgba(80,200,60,0.9)` |
| Negative (pct < 0) | `rgba(220,60,50,0.55)` | `rgba(220,80,70,0.9)` |
| Neutral / no prev | `rgba(150,150,150,0.4)` | `rgba(160,160,160,0.8)` |

Badge shows arrow + % only. The word "שינוי"/"change" appears in the header column label only.

### 🎨 Color Editor (context-aware for KPI Table)

When `bantable2` is active, the color editor shows 4 dedicated controls:

| Swatch | Controls | Default |
|---|---|---|
| ערך טקסט | KPI names + all values text | `#ffffff` |
| כותרת טקסט | Header row label text | `#9a9a9a` |
| כותרת רקע | Header row background | `#2a2a2a` |
| רקע גיליון | Full table background | `#1e1e1e` |

All 4 update live on color pick. **אפס** resets all including sheet background.

Stored as: `state.banColors[0–3]` (box, value text, header text, header bg) + `state.bgColor` (sheet bg).

---

## KPI BAN Cards

Two premium dark-style KPI cards rendered as pure HTML. Both share identical shelves and settings.

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

### BAN Color Editor (🎨 modal, context-aware)

When a BAN chart is active, the color editor title changes to **"ערוך צבעי BAN"** and shows 3 swatches:

| Swatch | Controls | Default |
|---|---|---|
| רקע כרטיס | Card background fill | `#1e1e1e` |
| טקסט עליון | KPI name + main value | `#ffffff` |
| טקסט תחתון | Prev value + period labels below divider | `#9a9a9a` |

### BAN Font Size Control (Aa button)

Visible only when `ban1` or `ban2` is active. 4 independent sliders:

| Slider | Controls | Range |
|---|---|---|
| שם KPI | KPI name label | 8–36px |
| ערך ראשי | Main value number | 20–120px |
| תג שינוי | Badge % text | 8–32px |
| תקופה / ערך קודם | Period labels + prev value | 8–28px |

Live preview on drag. Reset clears overrides and reverts to auto-scaling. Persisted as `banFontSizes`.

### Responsive Scaling

`renderBan()` attaches a `ResizeObserver` to `#echarts-container`. Balanced unit `u = Math.min(w/400, h/220)` scales fonts, padding, badge. Main value font capped at `42% of container height`.

---

## RTL Table

A full-featured scrollable table rendered directly in the extension.

### Features

| Feature | Detail |
|---|---|
| Column order | Controlled by a Tableau String parameter named `Columns` (comma-separated field names) |
| Column visibility | Only fields listed in `Columns` parameter shown — unlisted Detail fields dropped |
| Fallback | If `Columns` parameter missing or empty — all Detail fields shown |
| Filter dropdowns | Multi-select checkbox panel per column with search, החל / הכל buttons |
| Filter logic | AND across columns, client-side |
| Numeric formatting | `toLocaleString('en-US')` — wrapped in LTR span so negatives render as `-1,234` not `1,234-` |
| Date formatting | Uses Tableau's `formattedValue` — respects workbook locale |
| Null values | Displays `—` |
| RTL layout | Full RTL with Hebrew font |

### Columns Parameter Setup

1. Create a String parameter named `Columns` in Tableau
2. Set Allowable Values → **List**
3. Add one entry — the Value contains the full comma-separated ordered string:
   ```
   YEAR(Order Date), Category, Customer Name, SUM(Sales), SUM(Profit)
   ```
4. Field names must match what Tableau sends in `getSummaryDataAsync` — include aggregation wrappers

---

## Settings — Persist Across Sessions

All settings saved inside the workbook via `tableau.extensions.settings`. Stored in the `.twbx` file — shared across all users.

```javascript
tableau.extensions.settings.set('chartId',      state.chart.id);
tableau.extensions.settings.set('assignments',   JSON.stringify(state.assignments));
tableau.extensions.settings.set('customColors',  JSON.stringify(state.customColors || null));
tableau.extensions.settings.set('banColors',     JSON.stringify(state.banColors || null));
tableau.extensions.settings.set('banFontSizes',  JSON.stringify(state.banFontSizes || null));
tableau.extensions.settings.set('borderRadius',  JSON.stringify(state.borderRadius || {tl:0,tr:0,bl:0,br:0}));
tableau.extensions.settings.set('bgColor',       state.bgColor || '');
tableau.extensions.settings.set('kpiNames',      JSON.stringify(state.kpiNames || ['','','','']));
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
}
```

### BAN_COLOR_DEFAULTS

```javascript
// Index:  [0]       [1]        [2]        [3]
//         box bg    val text   hdr text   hdr bg
['#1e1e1e','#ffffff','#9a9a9a','#2a2a2a']
```

Used by `ban1`, `ban2`, and `bantable2`. For BAN cards slot[2] = prev/bottom text; for KPI Table slot[2] = header text.

---

## Marks Card Toolbar Buttons

| Button | Action |
|---|---|
| ✕ | Close the marks-card panel |
| ↺ | Reload fields from Detail shelf |
| צייר | Render chart + save settings |
| 🎨 | Color editor — ECharts palette (4 swatches) / BAN colors (3 swatches) / KPI Table (4 dedicated controls) |
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
  ├── [rtltable]   → renderTable()
  ├── [bantable2]  → renderBanTable2(rows, assignments, kpiNames)
  ├── [ban1/ban2]  → renderBan(rows, assignments, banStyle)
  └── [other]      → renderECharts() [always disposes + clears + reinits fresh]
  └── applyBorderRadius()
```

---

## Chart Roles Reference

| Chart | Required Roles | Optional Roles |
|---|---|---|
| **KPI Table (מדדים)** | ערך 1 (measure) | ערך 2–4 (measure), קודם 1–4 (measure), תקופה נוכחית (dim), תקופה להשוואה (dim) |
| **BAN Card — Style 1** | שם KPI (dim), ערך נוכחי (measure) | תקופה נוכחית (dim), ערך קודם (measure), תקופה להשוואה (dim) |
| **BAN Card — Style 2** | שם KPI (dim), ערך נוכחי (measure) | תקופה נוכחית (dim), ערך קודם (measure), תקופה להשוואה (dim) |
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

## Error Handling

| Situation | Error shown |
|---|---|
| Required role not filled | "חסרים שדות: [role labels]" |
| API call fails | "שגיאת טעינה: [message]" |
| `%many-values%` detected | "רמת פירוט לא מוגדרת — גרור ממדים ל-Detail ב-Marks Card של Tableau" |
| `world.js` not loaded | "world.js לא נטען — בדוק שהקובץ קיים לצד index.html" |
| Map JSON fetch fails | "לא ניתן לטעון מפה: [message]" |
| RTL Table — no fields on Detail | "אין שדות — גרור שדות ל-Detail" |

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
| v9 | ✅ Current | **KPI Table (מדדים)** (`bantable2`) — up to 4 typed KPI names mapped to separate measure fields. CSS grid layout guarantees column alignment between header and data rows. Context-aware 🎨 color editor with 4 dedicated table controls (ערך טקסט, כותרת טקסט, כותרת רקע, רקע גיליון) — all live-updating. Old dimension-driven `bantable` removed. |
