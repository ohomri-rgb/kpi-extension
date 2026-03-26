# ECharts Extension — Tableau Viz Extension
### Full Project Documentation | v7

---

## Overview

A Tableau Viz Extension (worksheet extension) that renders interactive ECharts visualizations, an RTL data table, and premium KPI BAN cards inside a Tableau worksheet. Single HTML file, no backend, fully offline.

- **48 chart types** across 14 categories (45 ECharts + 1 RTL Table + 2 KPI BAN Cards)
- Marks Card UI inside the extension — assign fields to chart roles via dropdown or drag & drop
- Gallery modal — browse chart types with live previews, search + category filter chips
- **Settings persist in the workbook** — chart type, field assignments, custom colors, BAN colors, border radius, and background color saved via `tableau.extensions.settings`
- **Format Extension button** — editor-only access to settings via Tableau's native Marks card button
- **Auto-refresh on FilterChanged** — chart re-renders automatically when any worksheet filter changes
- Manual field reload button (↺) — syncs field list from Detail shelf without page reload
- **🎨 Color editor** — context-aware: shows 4 chart palette colors for ECharts, or 3 BAN card colors when a BAN chart is active
- **🖼 Background color picker** — set or reset extension background color per sheet, saved to workbook
- **⌐ Border radius control** — 4-corner independent border radius popover, applies to all chart types
- **KPI BAN Card** — two premium dark-style KPI cards with responsive font scaling, RTL/LTR auto-detection, period comparison, and color control
- **Click-to-filter disabled** — clicking chart elements does not trigger Tableau mark selection
- **Transparent background by default** — Tableau sheet background shows through
- Error bar with clear messages when fields are missing or LOD is undefined
- **Fully offline** — no CDN dependencies, all assets served locally

> **Console warnings note:** Tableau's own runtime emits `@import` CSS warnings and preload warnings in the browser console. These originate from `tableau.css` and are unrelated to extension code — safely ignored.

---

## File Structure

| File | Purpose |
|---|---|
| `index.html` | Main extension — all CSS, HTML, JS in one file (~1,935 lines) |
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

## Chart Types (48 total)

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
| **KPI** | **BAN Card — Style 1, BAN Card — Style 2**, Gauge Chart, Progress Bar, Multi Gauge |
| פיננסי | Candlestick, Candlestick + Volume |
| מיוחד | Radar Chart, Multi-series Radar, Funnel Chart, Parallel Coordinates |
| טבלה | RTL Table |

---

## KPI BAN Card

Two premium dark-style KPI cards rendered as pure HTML (no ECharts). Both share identical shelves and settings.

### Chart IDs
- `ban1` — **Style 1**: badge and main value on the same row
- `ban2` — **Style 2**: main value full-width, badge on its own row below

### Layout

**Style 1 (same row):**
```
[KPI Name]          [Current Period]     ← top block, inline-start aligned
[Badge] [Value]                          ← middle row: RTL = badge right, value left | LTR = value left, badge right
────────────────────────────────────
[Prev Value]        [nothing]            ← bottom block
[Comparison Period]
```

**Style 2 (stacked):**
```
[KPI Name]          [Current Period]     ← top block
             [Value]                     ← full-width, inline-start aligned
                    [Badge]              ← badge on own row, inline-start (right in RTL)
────────────────────────────────────
[Prev Value]
[Comparison Period]
```

### Field Roles (5 shelves, same for both styles)

| Role ID | Label | Type | Required |
|---|---|---|---|
| `name` | שם KPI | dim | ✅ |
| `val` | ערך נוכחי | measure | ✅ |
| `period` | תקופה נוכחית | dim | optional |
| `prev` | ערך קודם | measure | optional |
| `prevper` | תקופה להשוואה | dim | optional |

### RTL / LTR Auto-detection

The card detects Hebrew characters (`/[\u0590-\u05FF]/`) in the KPI name and period labels:
- **Hebrew detected** → `direction:rtl`, currency symbol `₪`, badge label `שינוי`, comparison word `לעומת`
- **No Hebrew** → `direction:ltr`, currency symbol `$`, badge label `change`, comparison word `vs`

### Badge Colors (automatic, not user-controlled)
| State | Border | Arrow | Background |
|---|---|---|---|
| Positive (pct > 0) | `rgba(80,200,60,0.55)` | `rgba(80,200,60,0.9)` | `rgba(255,255,255,0.04)` |
| Negative (pct < 0) | `rgba(220,60,50,0.55)` | `rgba(220,80,70,0.9)` | `rgba(255,255,255,0.04)` |
| Neutral (pct = 0 or no prev) | `rgba(150,150,150,0.4)` | `rgba(160,160,160,0.8)` | `rgba(255,255,255,0.04)` |

### BAN Color Editor (🎨 modal, context-aware)

When a BAN chart is active, the color editor title changes to **"ערוך צבעי BAN"** and shows 3 BAN-specific swatches:

| Swatch | Controls | Default |
|---|---|---|
| רקע כרטיס | Card background fill | `#1e1e1e` |
| טקסט עליון | KPI name + main value | `#ffffff` |
| טקסט תחתון | Prev value + period labels below divider | `#8a8a8a` |

Saved to `state.banColors` (array of 3 hex strings) → persisted as `banColors` in workbook settings.

When any other chart is active, the modal shows the standard 4 ECharts palette colors as before.

### Responsive Scaling

`renderBan()` uses a `ResizeObserver` on `#echarts-container`. On every resize, a unit `u = Math.min(containerWidth, containerHeight × 2.2) / 460` scales all font sizes, padding, and badge dimensions proportionally.

### Data Aggregation

All rows are summed: `val = SUM(valF across all rows)`, `prev = SUM(prevF across all rows)`. The KPI name is taken from the first non-null row. Period labels collect all distinct values — the first distinct value is displayed (user controls filtering via Tableau worksheet filters).

### Container Switching

BAN cards are pure HTML rendered into `#echarts-container`. When switching from BAN → any ECharts chart:
1. `showPlaceholder()` disposes the ECharts instance, nulls it, and clears `container.innerHTML`
2. `renderECharts()` always disposes + clears + reinitializes fresh — no stale instance reused

---

## Border Radius Control (⌐ button)

A new `⌐` button in the marks card toolbar opens a small popover with 4 independent corner inputs (0–80px):

| Input | Corner |
|---|---|
| ↖ עליון שמאל | Top-left |
| ↗ עליון ימין | Top-right |
| ↙ תחתון שמאל | Bottom-left |
| ↘ תחתון ימין | Bottom-right |

`applyBorderRadius()` sets `border-radius: tl tr br bl` + `overflow:hidden` on both `#echarts-container` and `#table-container`. Called on every chart render and on load from saved settings.

Saved as `borderRadius: {tl, tr, bl, br}` in workbook settings.

---

## RTL Table

The RTL Table is a full-featured scrollable table rendered directly in the extension, merged into `index.html` as a standalone chart type in the **טבלה** category.

### Features

| Feature | Detail |
|---|---|
| Column order | Controlled by a Tableau String parameter named `Columns` (comma-separated ordered field names) |
| Column visibility | Only fields listed in `Columns` parameter are shown — unlisted Detail fields are dropped |
| Fallback | If `Columns` parameter is missing or empty — all Detail fields shown |
| Filter dropdowns | Multi-select checkbox panel per column with search, החל / הכל buttons |
| Filter logic | AND across columns, client-side (hides `<tr>` rows) |
| Numeric formatting | `toLocaleString('en-US')` — e.g. `1,234.56`. Wrapped in LTR span so negatives render as `-1,234` not `1,234-` |
| Date formatting | Uses Tableau's `formattedValue` — respects workbook locale |
| Null values | Displays `—` |
| Column widths | Content-aware: `max(80px, headerWidth, dataWidth)`. Long text fixed at 280px. Hard cap 400px |
| RTL layout | Full RTL with Hebrew font |

### Columns Parameter Setup

1. Create a String parameter named `Columns` in Tableau
2. Set Allowable Values → **List**
3. Add one entry — the Value field contains the full comma-separated ordered string:
   ```
   YEAR(Order Date), Category, Customer Name, SUM(Sales), SUM(Profit)
   ```
4. Field names must match what Tableau sends in `getSummaryDataAsync` — include aggregation wrappers (`SUM(`, `YEAR(`, `CNT(` etc.)

---

## Settings — Persist Across Sessions

All settings are saved inside the workbook via `tableau.extensions.settings`.

```javascript
tableau.extensions.settings.set('chartId',      state.chart.id);
tableau.extensions.settings.set('assignments',   JSON.stringify(state.assignments));
tableau.extensions.settings.set('customColors',  JSON.stringify(state.customColors || null));
tableau.extensions.settings.set('banColors',     JSON.stringify(state.banColors || null));
tableau.extensions.settings.set('borderRadius',  JSON.stringify(state.borderRadius || {tl:0,tr:0,bl:0,br:0}));
tableau.extensions.settings.set('bgColor',       state.bgColor || '');
await tableau.extensions.settings.saveAsync();
```

Settings are stored **inside the `.twbx` workbook file** — shared across all users, persists across sessions.

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
  banColors: null,          // array of 3 hex strings [boxCol, topCol, botCol], or null = BAN_COLOR_DEFAULTS
  borderRadius: {tl:0,tr:0,bl:0,br:0}, // corner radii in px
  bgColor: null,            // hex string for extension background, or null = transparent
}
```

---

## Marks Card Toolbar Buttons

| Button | Action |
|---|---|
| ✕ | Close the marks-card panel |
| ↺ | Reload fields from Detail shelf |
| צייר | Render chart + save settings |
| 🎨 | Color editor — ECharts palette (4 swatches) or BAN colors (3 swatches) depending on active chart |
| 🖼 | Background color picker (single click = pick, double click = reset to transparent) |
| ⌐ | Border radius popover — 4 independent corner inputs, 0–80px |
| [Chart name + icon] | Open gallery |

---

## Chart Roles Reference

| Chart | Required Roles | Optional Roles |
|---|---|---|
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
| Histogram | Bin / קטגוריה (dim), ספירה / ערך (measure) | — |
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

## How the Extension Works — Flow

```
initializeAsync({ configure: () => show marks-card })
  └── loadSettings() → restore full state (chart, assignments, colors, banColors, borderRadius, bgColor)
  └── loadFields() — getSummaryDataAsync({ maxRows:1 })
  └── applyBorderRadius() — restore border radius on containers
  └── if saved state:
        → app shown, marks-card hidden
        → renderMarksCard() + applyChart() → chart rendered immediately
      else:
        → onboarding screen shown

applyChart()
  ├── [rtltable]  → renderTable()
  ├── [ban1/ban2] → renderBan(rows, assignments, banStyle) → applyBorderRadius()
  └── [other]     → renderECharts() [always disposes + clears + reinits fresh] → applyBorderRadius()
```

### Container switching detail

`#echarts-container` is used by both ECharts charts and BAN cards (pure HTML). Switching between them:

- **BAN → ECharts**: `showPlaceholder()` disposes ECharts instance, nulls it, clears `innerHTML`. `renderECharts()` then does a fresh init on the clean container.
- **ECharts → BAN**: `renderBan()` disposes any existing ECharts instance and writes its own HTML.
- **Any → Any (via gallery)**: `selectChart()` calls `showPlaceholder()` which always fully clears the container.

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

## Known Issues & Fix History

| Issue | Cause | Status |
|---|---|---|
| Clipboard API blocked in Tableau iframe | Tableau's CSP blocks `navigator.clipboard` | Fixed in debug.html v2 |
| `tableau is not defined` | Wrong CDN URL for Extensions API | Fixed — must be local `tableau.extensions.js` |
| `.trex` parse error — `http://localhost` invalid | Tableau requires `https://` in URL | Fixed |
| `getDataSourcesAsync` not available | Only exists on dashboard extensions | Fixed — use `getSummaryDataAsync` |
| Dropdown closes immediately after opening | `click` event bubbled up | Fixed — switched to `mousedown` with 100ms delay |
| `getSummaryDataAsync` returns 1 row with `%many-values%` | No dims on Detail shelf | Handled — show error bar |
| `loadFields` returned all datasource columns | Was using `getUnderlyingDataAsync` | Fixed — use `getSummaryDataAsync` |
| `YEAR(Order Date)` appeared as measure | `dataType=int` for date functions | Fixed — `DATE_FUNC_RE` forces type=dim |
| Map charts crashed on load | `echarts@5/map/js/world.js` CDN path invalid | Fixed — local `world.js` |
| Settings not persisting across sessions | `localStorage` not available on Tableau Cloud | Fixed v5 — `tableau.extensions.settings` |
| Marks card visible to Viewers | UI was rendered inside extension visible to all | Fixed v5 — Format Extension button, editor-only |
| FilterChanged required manual click | `refreshChart()` skipped re-fetch | Fixed v6 — `FilterChanged` calls `applyChart()` directly |
| BAN card switching to other chart left stale HTML | `echarts.init()` mounted inside BAN HTML | Fixed v7 — `showPlaceholder()` + `renderECharts()` both clear `innerHTML` before init |
| BAN currency symbol wrong ($ shown for Hebrew) | Currency derived from language after init | Fixed v7 — currency detected from Hebrew regex on name + period fields |
| BAN RTL badge on wrong side (Style 1) | `direction:rtl` on flex row conflicted with badge position | Fixed v7 — DOM order swap: Hebrew puts value first (left), badge last (right) |
| BAN period labels duplicated in bottom row | Period label used for both current and prev rows | Fixed v7 — `periodLabel` (current period) → top block only; `prevperLabel` → bottom block only |

### Open Known Issues

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
| v7 | ✅ Current | **KPI BAN Cards** — 2 new chart types (`ban1`, `ban2`) in KPI category. Dark premium design, responsive font scaling via ResizeObserver, RTL/LTR auto-detection, ₪/$ currency, Hebrew/English labels. 5 shelves: KPI name, current value, current period, prev value, comparison period. Context-aware 🎨 color editor: 3 BAN-specific color swatches (box fill, top text, bottom text). **⌐ Border radius control** — new toolbar button, 4-corner independent popover, applies to all chart types, persisted in settings. **Container switching fixes** — `showPlaceholder()` and `renderECharts()` both fully dispose + clear container before reinitializing, eliminating stale BAN HTML when switching chart types. |
