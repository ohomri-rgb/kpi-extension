# ECharts Extension — Tableau Viz Extension
### Full Project Documentation | v5

---

## Overview

A Tableau Viz Extension (worksheet extension) that renders interactive ECharts visualizations and an RTL data table inside a Tableau worksheet. Single HTML file, no backend, fully offline.

- **46 chart types** across 14 categories (45 ECharts + 1 RTL Table)
- Marks Card UI inside the extension — assign fields to chart roles via dropdown or drag & drop
- Gallery modal — browse chart types with live previews, search + category filter chips
- **Settings persist in the workbook** — chart type and field assignments saved via `tableau.extensions.settings`
- **Format Extension button** — editor-only access to settings via Tableau's native Marks card button
- Auto-refresh on FilterChanged and MarkSelectionChanged events
- Manual field reload button (↺) — syncs field list from Detail shelf without page reload
- Error bar with clear messages when fields are missing or LOD is undefined
- **Fully offline** — no CDN dependencies, all assets served locally

> **Console warnings note:** Tableau's own runtime emits `@import` CSS warnings and preload warnings in the browser console. These originate from `tableau.css` (Tableau's internal stylesheet) and Tableau's CDN assets — they are not related to extension code and can be safely ignored.

---

## File Structure

| File | Purpose |
|---|---|
| `index.html` | Main extension — all CSS, HTML, JS in one file (~2,570 lines) |
| `echarts-extension.trex` | Tableau manifest — update URL before deploying |
| `tableau.extensions.js` | Tableau Extensions API (local copy) |
| `echarts.min.js` | ECharts 5 library (local copy) |
| `world.js` | ECharts world GeoJSON — auto-registers `'world'` map on load |
| `NotoSansHebrew-Regular.ttf` | Font — weight 400 |
| `NotoSansHebrew-SemiBold.ttf` | Font — weight 500/600 |
| `NotoSansHebrew-ExtraBold.ttf` | Font — weight 700/800 |
| `debug.html` | Debug panel — shows raw API data, column types, field names |
| `debug.trex` | Manifest for debug panel |

> `world.js` source: `echarts-countries-js` package. Registers the map via `echarts.registerMap('world', ...)` automatically when loaded as `<script>`.

---

## Deployment

### Desktop (Development)
1. Run `python -m http.server 8080` from the extension folder
2. Update `echarts-extension.trex` → `<url>` to `https://localhost:8080/index.html`
3. Load `echarts-extension.trex` → Tableau Desktop → Add Extension → Access Local Viz Extensions

### Tableau Cloud / GitHub Pages (Production)
- Push **all 8 files** to GitHub repo (index.html + trex + js libs + fonts + world.js)
- Enable GitHub Pages on the repo
- Update `echarts-extension.trex` → `<url>` to your GitHub Pages URL
- Whitelist in Tableau Cloud → Settings → Extensions → Add URL
- Load `echarts-extension.trex`
- Live debug: open workbook in browser → F12 → Console

---

## Chart Types (46 total)

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
| KPI | Gauge Chart, Progress Bar, Multi Gauge |
| פיננסי | Candlestick, Candlestick + Volume |
| מיוחד | Radar Chart, Multi-series Radar, Funnel Chart, Parallel Coordinates |
| **טבלה** | **RTL Table** |

### Charts Not Included (Out of Scope)

| Chart | Reason |
|---|---|
| Boxplot / Violin | Requires raw distribution data — `getSummaryDataAsync` returns aggregated data only |
| Bar Race / Line Race | Requires `setInterval` animation — Tableau loads data once, no streaming |
| 3D charts (Bar3D, Scatter3D, Globe) | Requires `echarts-gl` library (3MB+, WebGL) — not included in offline bundle |
| GL charts (Scatter GL, Lines GL) | Same as 3D — requires `echarts-gl` |
| Custom Region Map | Requires external GeoJSON file — outside offline scope |
| Clock Gauge | Real-time `setInterval` — not connected to Tableau data |
| Data Transform / Dataset | Tableau handles aggregation server-side — redundant in extension context |

---

## RTL Table

The RTL Table is a full-featured scrollable table rendered directly in the extension. It is based on the `table_rtl` project (v21) and merged into `index.html` as a standalone chart type in the **טבלה** category.

### Features

| Feature | Detail |
|---|---|
| Column order | Controlled by a Tableau String parameter named `Columns` (comma-separated ordered field names) |
| Column visibility | Only fields listed in `Columns` parameter are shown — unlisted Detail fields are dropped |
| Fallback | If `Columns` parameter is missing or empty — all Detail fields shown in alphabetical order |
| Filter dropdowns | Multi-select checkbox panel per column with search, החל / הכל buttons |
| Filter logic | AND across columns, client-side (hides `<tr>` rows) |
| Numeric formatting | `toLocaleString('en-US')` — e.g. `1,234.56`. Wrapped in LTR span so negatives render as `-1,234` not `1,234-` |
| Date formatting | Uses Tableau's `formattedValue` — respects workbook locale |
| Null values | Displays `—` |
| Column widths | Content-aware: `max(80px, headerWidth, dataWidth)`. Long-text strings (>40 chars) fixed at 280px. Hard cap 400px |
| RTL layout | Full RTL with Hebrew font |

### Columns Parameter Setup

1. Create a String parameter named `Columns` in Tableau
2. Set Allowable Values → **List**
3. Add one entry — the Value field contains the full comma-separated ordered string:
   ```
   YEAR(Order Date), Category, Customer Name, SUM(Sales), SUM(Profit)
   ```
4. Field names must match what Tableau sends in `getSummaryDataAsync` — include aggregation wrappers (`SUM(`, `YEAR(`, `CNT(` etc.)

### Marks Card for RTL Table

When RTL Table is selected in the gallery, the Marks Card shows a plain text note instead of role slots: _"כל השדות מה-Detail יוצגו בטבלה. סדר עמודות נקבע ע״י פרמטר Columns."_

The "צייר" button is enabled immediately — no role assignments required.

### Container switching

`index.html` contains two containers inside `.chart-area`:
- `#echarts-container` — ECharts div, shown for all chart types except RTL Table
- `#table-container` — RTL Table wrapper, shown only when chart type is `rtltable`

`applyChart()` toggles `display` on both containers before rendering.

---

## Settings — Persist Across Sessions

Chart type and field assignments are saved inside the workbook using `tableau.extensions.settings`.

```javascript
// Save — called after every successful "צייר"
tableau.extensions.settings.set('chartId', state.chart.id);
tableau.extensions.settings.set('assignments', JSON.stringify(state.assignments));
await tableau.extensions.settings.saveAsync();

// Load — called on initializeAsync
const chartId = tableau.extensions.settings.get('chartId');
const assignments = tableau.extensions.settings.get('assignments');
```

Settings are stored **inside the `.twbx` workbook file** — shared across all users, persists across sessions, works on Tableau Cloud and Desktop.

### Startup flow

```
initializeAsync()
  └── loadSettings() → state.chart + state.assignments
  └── loadFields()
  └── if saved state exists:
        → marks-card hidden
        → app shown
        → renderMarksCard() + applyChart() → chart rendered immediately
      else:
        → onboarding screen shown
```

---

## Format Extension Button (Editor-only access)

The extension uses Tableau's native **Format Extension** mechanism so that only editors can access the settings UI.

### How it works

The `.trex` manifest declares:
```xml
<context-menu>
  <configure-context-menu-item />
</context-menu>
```

`initializeAsync` registers a `configure` callback:
```javascript
await tableau.extensions.initializeAsync({ configure: () => {
  document.getElementById('marks-card').style.display = '';
}});
```

| User type | What they see |
|---|---|
| **Viewer** | Chart only — no UI, no buttons |
| **Editor** | Format Extension button appears in Tableau's Marks panel → click → marks-card opens |

### Marks Card buttons (left to right)

| Button | Action |
|---|---|
| ✕ | Close the marks-card panel |
| ↺ | Reload fields from Detail shelf |
| צייר | Render chart + save settings |
| [Chart name + icon] | Open gallery |

---

## Chart Roles Reference

| Chart | Required Roles | Optional Roles |
|---|---|---|
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
| Pie / Donut | ממד (dim), ערך (measure) | — |
| Nightingale Rose | ממד (dim), ערך (measure) | — |
| Nested Pie | חיצוני (dim), פנימי (dim), ערך (measure) | — |
| Scatter | X (measure), Y (measure) | Color (dim) |
| Bubble | X (measure), Y (measure), גודל (measure) | Color (dim) |
| Effect Scatter | X (measure), Y (measure) | Color (dim) |
| Heatmap | X (dim), Y (dim), ערך (measure) | — |
| Calendar Heatmap | תאריך (dim), ערך (measure) | — |
| Multi-year Calendar | תאריך (dim), ערך (measure) | — |
| Radar | מדדים (dim), ערך (measure) | — |
| Multi-series Radar | מדדים (dim), ערך (measure), סדרה (dim) | — |
| Funnel | שלב (dim), ערך (measure) | — |
| Parallel Coordinates | קטגוריה (dim), מדד 1 (measure), מדד 2 (measure) | מדד 3–5 (measure) |
| Treemap | ממד (dim), ערך (measure) | Parent (dim) |
| Sunburst | רמה 1 (dim), רמה 2 (dim), ערך (measure) | — |
| Tree Chart | רמה 1 (dim), רמה 2 (dim), ערך (measure) | — |
| Radial Tree | רמה 1 (dim), רמה 2 (dim), ערך (measure) | — |
| Sankey | מקור (dim), יעד (dim), ערך (measure) | — |
| Network Graph | מקור (dim), יעד (dim) | משקל (measure) |
| Circular Graph | מקור (dim), יעד (dim) | משקל (measure) |
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
| **RTL Table** | — (no roles) | — |

---

## Tableau Sheet Setup

### Critical — Detail shelf = Level of Detail

The extension reads data via `getSummaryDataAsync()`. This call respects the worksheet's LOD — it aggregates at the level defined by the fields on the sheet.

**The fields on the Detail shelf define the granularity of the data returned.**

| What to drag to Detail | Notes |
|---|---|
| Dimension fields (Segment, Category, Region…) | Define the LOD — one row per unique combination |
| Measure fields (Sales, Profit, Quantity…) | Available as Y/size/value roles in the chart |
| All fields you want to use in the chart | If not on Detail, they will not appear in the extension's field list |

### Detail shelf examples by chart type

| Chart | Example Detail shelf |
|---|---|
| Line Chart | `MONTH(Order Date)`, `Segment`, `SUM(Sales)` |
| Stacked Bar | `Category`, `Region`, `SUM(Profit)` |
| Confidence Band | `MONTH(Order Date)`, `AVG(Sales)`, `MAX(Sales)`, `MIN(Sales)` |
| Geo Bubble Map | `City`, `Latitude (generated)`, `Longitude (generated)`, `SUM(Sales)` |
| Lines Map | `Route`, `Src Lat`, `Src Lon`, `Tgt Lat`, `Tgt Lon`, `SUM(Sales)` |
| World Map | `Country/Region`, `SUM(Sales)` |
| US States Map | `State/Province`, `SUM(Sales)` |
| Calendar Heatmap | `Order Date` (exact date), `SUM(Sales)` |
| Multi-year Calendar | `Order Date` (exact date), `SUM(Sales)` |
| Candlestick | `MONTH(Order Date)`, `SUM(Sales)`, `MIN(Sales)`, `MAX(Sales)` |
| Candlestick + Volume | `MONTH(Order Date)`, open, close, low, high, `SUM(Quantity)` |
| Parallel Coordinates | `Segment`, `SUM(Sales)`, `SUM(Profit)`, `SUM(Quantity)` |
| Gauge | `SUM(Sales)` |
| Progress Bar | `SUM(Sales)` + optional `Category` for multi-bar |
| Multi Gauge | `SUM(Sales)`, `SUM(Profit)`, `SUM(Quantity)` |
| **RTL Table** | All desired fields — column order via `Columns` parameter |

### Why Detail and not Rows/Columns?
The extension renders the chart itself — Tableau's Rows/Columns are unused. Detail is the only shelf that makes fields available to `getSummaryDataAsync` without affecting the Tableau native view.

### Field list not updating?
After adding or removing fields from the Detail shelf, click the **↺ button** in the extension header to reload the field list. This is necessary because Tableau does not fire a reliable event when Detail shelf membership changes.

---

## Map Charts — Special Notes

### World Map
- Field `Country/Region` must match GeoJSON country names exactly (English, e.g. `"United States"`, `"United Kingdom"`)
- Superstore data matches out of the box
- Supports zoom and pan (roam: true)

### US States Map
- Uses the same `world.js` GeoJSON as World Map — no separate file needed
- Centers and zooms on USA (`center: [-96, 38]`, `zoom: 4`)
- Field `State/Province` must match full English state names (e.g. `"California"`, `"New York"`)
- Superstore data matches out of the box

### Geo Bubble Map
- Uses `Latitude (generated)` and `Longitude (generated)` from Tableau — no name matching required
- Works at any geographic level: Country, State, City, Postal Code
- Bubble size = value field (scaled via `Math.sqrt`)
- Optional Color field splits bubbles into colored series with legend
- Optional Label field shows in tooltip on hover

### Lines Map
- Requires 4 measure fields: `Lat מקור`, `Lon מקור`, `Lat יעד`, `Lon יעד`
- Optional `עוצמה` (measure) scales line width
- Optional `תווית` (dim) shows in tooltip on hover
- Animated flow effect (moving dots along lines) via ECharts `lines` series `effect`
- Uses the same `world.js` and `ensureMap()` as other map types

### Map loading
All three map charts use `world.js` loaded as a `<script>` tag. The map is registered automatically on page load via `echarts.registerMap('world', ...)`. The `ensureMap()` function verifies registration before rendering and shows a Hebrew error if `world.js` is missing.

---

## How the Extension Works

### Flow

```
initializeAsync({ configure: () => show marks-card })
  └── loadSettings() → restore state.chart + state.assignments
  └── loadFields() — getSummaryDataAsync({ maxRows:1 })
      → builds state.worksheetFields (fields on Detail shelf only)
  └── if saved state:
        → app shown, marks-card hidden
        → renderMarksCard() + applyChart() → chart rendered immediately
      else:
        → onboarding screen shown

User (Editor): clicks Format Extension in Marks panel
  └── configure callback → marks-card shown

User: clicks chart type button
  └── openGallery() → modal with chart previews + search + category chips
  └── selectChart(chart) → update Marks Card roles

User: assigns fields to roles (dropdown click or drag & drop)
  └── assign(roleId, field) → renderMarksCard()
  └── all required roles filled → enable "צייר" button

User: clicks "צייר"
  └── applyChart()
      ├── switch container (echarts vs table)
      ├── [rtltable] renderTable() → getSummaryDataAsync + applyParamOrder + build DOM
      ├── [other charts] validate assignments
      ├── [map charts only] ensureMap() — verify world.js registered
      ├── getSummaryDataAsync({ maxRows:0 })
      ├── parseDataTable(dt) → { columns, rows }
      ├── detect %many-values% → show error if LOD undefined
      └── renderECharts(chart, columns, rows, assignments) [async]
      └── saveSettings() → tableau.extensions.settings.saveAsync()
```

### API Method

**All chart types** use `getSummaryDataAsync()`.

`getSummaryDataAsync` respects the worksheet LOD and all active filters. The user controls granularity entirely via the Detail shelf. `getUnderlyingDataAsync` is deprecated and no longer used for rendering.

`renderECharts` is **async** to support `await ensureMap()` for map chart types.

---

## Field Names from the API

Validated via the debug panel against Superstore data:

| Field type | Example fieldName from API | dataType |
|---|---|---|
| Dimension (plain) | `"Segment"` | `string` |
| Dimension (date function) | `"MONTH(Order Date)"` | `date-time` |
| Dimension (date function, discrete) | `"YEAR(Order Date)"` | `int` ⚠️ |
| Measure (aggregated) | `"SUM(Sales)"` | `float` |
| Measure (integer) | `"SUM(Quantity)"` | `int` |
| Geographic (generated) | `"Latitude (generated)"` | `float` |

**Key findings:**
- `_fieldName` (with underscore prefix) is the correct property — not `fieldName`
- `_dataType` (with underscore prefix) is the correct property — not `dataType`
- `getSummaryDataAsync` on an empty worksheet returns 1 row with `%many-values%` — this means no dims are on Detail
- Date functions like `YEAR()`, `MONTH()`, `QUARTER()`, `DAY()` return `dataType=int` — they must be detected by field name pattern and treated as **dims**, not measures (see `DATE_FUNC_RE` in code)
- `getSummaryDataAsync` requires explicit `{ maxRows: 0 }` to return all rows — omitting this may return incomplete data in some API versions
- `Latitude (generated)` and `Longitude (generated)` return as `float` — treated as measures, usable in Geo Bubble Map

---

## Marks Card

The extension's Marks Card replaces Tableau's native Marks Card with chart-specific role slots.

Each chart defines a set of roles:

```javascript
{ id: 'x', label: 'ציר X', accepts: 'dim', required: true }
{ id: 'y', label: 'ערך Y', accepts: 'measure', required: true }
{ id: 'group', label: 'Group', accepts: 'dim', required: false }
```

`accepts` values: `'dim'` | `'measure'` | `'both'`

Field type is determined by `_dataType` **and field name**:
- `float` → `measure`
- `int` → `measure`, **unless** field name matches `DATE_FUNC_RE` → `dim`
- everything else → `dim`

```javascript
const DATE_FUNC_RE = /^(YEAR|MONTH|QUARTER|DAY|WEEK|HOUR|MINUTE|SECOND|DATETRUNC|DATEPART)\s*\(/i;
```

### Assigning fields
Two methods:
1. **Click slot** → dropdown opens with compatible fields grouped by type
2. **Drag field** → drag from the field list onto a slot

---

## Data Parsing

```javascript
function parseDataTable(dt) {
  const columns = dt.columns.map(col => ({
    fieldName: col._fieldName,
    displayName: cleanFieldName(col._fieldName), // strips SUM(), MONTH() etc.
    dataType: col._dataType,
    fieldId: col._fieldId,
  }));
  const rows = dt.data.map(row =>
    Object.fromEntries(columns.map((col, i) => [
      col.fieldName,
      normalizeValue(row[i]?.value ?? row[i], col.dataType)
    ]))
  );
  return { columns, rows };
}
```

### normalizeValue rules

| dataType | Transform |
|---|---|
| `date`, `date-time` | Strip ` 00:00:00` suffix → `"2024-12-01"` |
| `float`, `int` | `parseFloat` after stripping `$`, `,`, `%` |
| `boolean` | `Boolean(val)` |
| `string` | `String(val)` |
| null / `%null%` | `null` |

---

## Gallery

Opens as a modal panel from the right. Contains:
- Search input (filters by chart name)
- Category filter chips (הכל, קו ושטח, עמודות, עוגה, פיזור, מפות חום, היררכיה, זרימה, מפה, KPI, פיננסי, מיוחד, **טבלה**)
- Grid of chart cards — each with a live ECharts mini-preview (150×80px canvas)
- RTL Table card shows a static text preview instead of ECharts canvas
- Each card shows chart name + role tags (dim/measure/optional)

Selecting a chart:
1. Sets `state.chart`
2. Clears `state.assignments`
3. Closes gallery
4. Renders Marks Card with the new chart's roles (or table note for RTL Table)

---

## Error Handling

| Situation | Error shown |
|---|---|
| Required role not filled | "חסרים שדות: ציר X, ערך Y" |
| API call fails | "שגיאת טעינה: [message]" |
| `%many-values%` detected | "רמת פירוט לא מוגדרת — גרור ממדים ל-Detail ב-Marks Card של Tableau" |
| Field not found in data | "שדות לא נמצאו בגיליון: [fieldName]" |
| `world.js` not loaded | "world.js לא נטען — בדוק שהקובץ קיים לצד index.html" |
| Map JSON fetch fails | "לא ניתן לטעון מפה: [message]" |
| RTL Table — no fields on Detail | "אין שדות — גרור שדות ל-Detail" |

---

## Known Issues & Fix History

| Issue | Cause | Status |
|---|---|---|
| Clipboard API blocked in Tableau iframe | Tableau's CSP blocks `navigator.clipboard` | Fixed in debug.html v2 — shows JSON in inline textarea instead |
| `tableau is not defined` | Wrong CDN URL for Extensions API | Fixed — must be local `tableau.extensions.js` |
| `.trex` parse error — `http://localhost` invalid | Tableau requires `https://` in URL | Fixed |
| `.trex` parse error — `<resources>` inside wrong element | Must be outside `<worksheet-extension>`, inside `<manifest>` | Fixed |
| `getDataSourcesAsync` not available | Only exists on dashboard extensions, not worksheet extensions | Fixed — use `getSummaryDataAsync` instead |
| Dropdown closes immediately after opening | `click` event bubbled up and triggered `closeDropdownOutside` | Fixed — switched to `mousedown` with 100ms delay |
| Field dropdown shows only dims, no measures for Y slot | `CSS.escape` on field names with `(` `)` broke `onclick` attribute | Fixed — use array index instead of field name in onclick |
| `getSummaryDataAsync` returns 1 row with `%many-values%` | No dims on Detail shelf — LOD undefined | Handled — show error bar with instructions |
| `loadFields` returned all 26 datasource columns | Was using `getUnderlyingDataAsync({ includeAllColumns:true })` — ignores sheet LOD | Fixed — primary is now `getSummaryDataAsync`; returns only fields on Detail shelf |
| `getSummaryDataAsync` returned no data / chart not rendered | Missing `{ maxRows:0 }` parameter | Fixed — all calls now pass explicit options |
| `YEAR(Order Date)` appeared as measure in dropdown | `dataType=int` for date functions — same as numeric measures | Fixed — `DATE_FUNC_RE` detects date function field names and forces type=dim |
| Sankey / Scatter / Bubble used wrong data source | `getUnderlyingDataAsync` returned raw rows, no aggregation, ignores filters | Fixed — all chart types now use `getSummaryDataAsync` |
| Field list stale after Detail shelf changes | Tableau has no event for Detail shelf membership changes | Handled — added ↺ reload button; `FilterChanged` also triggers `loadFields` |
| `getUnderlyingDataAsync` deprecated | Tableau recommends new API | Updated fallback to `getUnderlyingTablesAsync` + `getUnderlyingTableDataAsync` |
| Map charts crashed — `Cannot read properties of undefined (reading 'regions')` | `echarts@5/map/js/world.js` CDN path does not exist in ECharts v5 | Fixed — switched to `world.js` from `echarts-countries-js`, loaded as local `<script>` tag |
| `echarts.min.js` 404 on GitHub Pages | File not pushed to repo | Fixed — all local assets must be committed to repo |
| Two separate GeoJSON files for World + US | US is part of world GeoJSON — no separate file needed | Fixed — single `world.js`, US States Map uses `center/zoom` to focus on USA |
| Debug `console.log` noise in production Console | Leftover development logs | Fixed — all `console.log/warn` removed in v3 |
| Tableau console warnings — `@import` CSS rule and preload warnings | Originate from `tableau.css` (Tableau's own stylesheet) and Tableau CDN assets | Not a bug — safely ignored, unrelated to extension code |
| Marks card visible on workbook open (flicker) | `app` shown before `applyChart()` completed | Fixed v5 — `marks-card` hidden before `app` shown; `app` revealed only after chart renders |
| Settings not persisting across sessions | `localStorage` not available on Tableau Cloud | Fixed v5 — migrated to `tableau.extensions.settings.saveAsync()` |
| Settings UI visible to Viewers | Marks card rendered inside extension visible to all users | Fixed v5 — migrated to Format Extension button (`<configure-context-menu-item />`) — Tableau hides it from Viewers automatically |
| `<configuration>true</configuration>` in `.trex` caused parse error | Not a valid element in `worksheet-extension` schema | Fixed v5 — correct approach is `<context-menu><configure-context-menu-item /></context-menu>` |

### Open Known Issues (not yet fixed)

| Issue | Affected Charts | Notes |
|---|---|---|
| Sort is lexicographic — "10" sorts before "9" | Line, Area, Step Line, Stacked Line, Candlestick | `.sort()` without comparator. Fix: numeric comparator with string fallback |
| Bubble symbol size not normalized | Bubble | `Math.sqrt(d[2])*3` without dividing by maxVal — huge bubbles with large values |
| Treemap `Parent` role ignored in render | Treemap | Role defined in UI but `renderECharts` always renders flat data |
| Waterfall incorrect baseline for negative values | Waterfall | `baseData` logic breaks when cumulative goes negative |
| ThemeRiver `type:'time'` axis may break | ThemeRiver | If Tableau returns `MONTH()` as int (1–12) instead of ISO date string |
| Stacked Area crashes if `groupField` is null | Stacked Area | No null-guard before `groups` map |

---

## State Object

```javascript
state = {
  chart: null,             // selected chart config object
  assignments: {},         // roleId → { fieldName, displayName, dataType }
  worksheetFields: [],     // fields from loadFields() — only fields on Detail shelf
  worksheet: null,         // tableau worksheet reference (stored on init)
  echartsInstance: null,   // ECharts instance on the container div
  activeDropdownRole: null,// role currently being assigned
  galleryFilter: 'הכל',   // active gallery category filter
}
```

---

## Map Loader

```javascript
const _mapCache = {};

async function ensureMap() {
  if (_mapCache['world']) return;
  try {
    echarts.getMap('world'); // throws if not registered
    _mapCache['world'] = true;
  } catch(e) {
    throw new Error('world.js לא נטען — בדוק שהקובץ קיים לצד index.html');
  }
}
```

Called before rendering any map chart type (worldmap, usmap, geomap). `world.js` registers the map automatically on script load — `ensureMap()` only verifies it succeeded.

---

## Version History

| Version | Status | Notes |
|---|---|---|
| v1 | ✅ Superseded | Initial working build. Gallery, Marks Card, 14 chart types, drag & drop + dropdown assignment, FilterChanged listener, onboarding screen, error bar. Debug panel with field types inspector. |
| v2 | ✅ Superseded | Fix loadFields to use getSummaryDataAsync (respects LOD). Fix getSummaryDataAsync options (maxRows:0). Fix YEAR/MONTH/QUARTER treated as measures. Switch Scatter/Bubble/Sankey to getSummaryDataAsync. Replace deprecated getUnderlyingDataAsync with new tables API. Add ↺ reload button. FilterChanged now reloads fields. Store worksheet ref in state. |
| v3 | ✅ Superseded | +14 new chart types (28 total): Gauge, Candlestick, Sunburst, Network Graph, Waterfall, Calendar Heatmap, ThemeRiver, Step Line, Stacked Area, Dual Axis, Pictorial Bar, World Map, US States Map, Geo Bubble Map. Fully offline — all assets local (echarts.min.js, world.js, NotoSansHebrew fonts). Removed all CDN dependencies. Removed debug console.log noise. Fixed map loading via local world.js script tag. Single world.js for all map chart types. renderECharts made async for map support. |
| v4 | ✅ Superseded | +17 new chart types (45 total) across 2 rounds. Round 4 (easy): Stacked Line, Nightingale Rose, Effect Scatter, Histogram, Multi-series Radar, Circular Graph, Tree Chart, Radial Tree, Progress Bar, Multi Gauge. Round 5 (medium): Confidence Band, Polar Bar, Nested Pie, Lines Map, Candlestick + Volume, Multi-year Calendar, Parallel Coordinates. QA audit completed — 6 open bugs documented in Known Issues. |
| v5 | ✅ Current | Settings persistence via `tableau.extensions.settings.saveAsync()`. Format Extension button via `<configure-context-menu-item />` in `.trex` — editor-only access, no UI visible to Viewers. RTL Table merged as chart type #46 in new "טבלה" category — full filter dropdowns, column ordering via Columns parameter, content-aware widths, RTL layout, negative number fix. Startup flicker fixed — marks-card hidden before app shown. |
