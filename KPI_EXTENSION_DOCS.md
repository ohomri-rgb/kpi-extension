# KPI Tableau Extension — Full Project Documentation

## Overview
A Tableau Viz Extension (worksheet extension) that renders a KPI card inside a Tableau worksheet.
Single HTML file, no backend, no setup UI. Auto-detects columns and adapts automatically.
Supports two comparison modes: **Last Year** (YoY automatic) and **Range** (manual date ranges).

---

## File Structure (Production)
```
kpi_39.html               ← Main extension (all logic) — ~209 lines
kpi_39_desktop.trex       ← Tableau manifest for Desktop (localhost:8765)
kpi_39_cloud.trex         ← Tableau manifest for Tableau Cloud (GitHub Pages)
tableau.extensions.js     ← Tableau Extensions API (local copy)
chart.js                  ← Chart.js v4.4.1 (local copy)
NotoSansHebrew-Regular.ttf
NotoSansHebrew-SemiBold.ttf
NotoSansHebrew-ExtraBold.ttf
```

---

## Deployment

### Desktop (development)
1. Run `python -m http.server 8765` from extension folder
2. Load `kpi_39_desktop.trex` → Tableau Desktop → Add Extension → Access Local Viz Extensions

### Tableau Cloud (production)
- GitHub repo: `https://github.com/ohomri-rgb/kpi-extension`
- GitHub Pages URL: `https://ohomri-rgb.github.io/kpi-extension/`
- Whitelist in Tableau Cloud → Settings → Extensions → Add URL:
  `https://ohomri-rgb.github.io/kpi-extension/kpi_39.html`
- Load `kpi_39_cloud.trex`
- Live debug: open workbook in browser → F12 → Console

### Updating the extension
- Edit `kpi_38.html`, bump version watermark (bottom-left)
- Push to GitHub — no-cache meta headers ensure fresh load
- No need to update `.trex`

### Two .trex files
| File | URL |
|---|---|
| `kpi_39_desktop.trex` | `http://localhost:8765/kpi_39.html` |
| `kpi_39_cloud.trex` | `https://ohomri-rgb.github.io/kpi-extension/kpi_39.html` |

---

## Tableau Sheet Setup
Place on **Detail shelf** (Marks card):

| Field | Type | Purpose |
|---|---|---|
| `Truncated` | Date (calculated) | X axis — respects granularity parameter |
| Measure | Float/Int | The KPI value |
| `date` | Date | Raw date — used by range formula |
| `range` | Integer | 1 or 2 — which period each row belongs to |
| `Normalized Date` | Date-time | Maps both periods onto same calendar for overlay |

### Truncated formula
```
DATE(CASE [Parameter 1]
  WHEN 'week'    THEN DATETRUNC('week',    [Order Date])
  WHEN 'month'   THEN DATETRUNC('month',   [Order Date])
  WHEN 'quarter' THEN DATETRUNC('quarter', [Order Date])
  WHEN 'day'     THEN DATETRUNC('day',     [Order Date])
  WHEN 'year'    THEN DATETRUNC('year',    [Order Date])
END)
```

### Range formula
```
IF [frame] = 'range' AND [date] >= [from1] AND [date] <= [to1] THEN 1
ELSEIF [frame] = 'range' AND [date] >= [from2] AND [date] <= [to2] THEN 2
ELSEIF [frame] = 'last year' THEN 1
ELSE 0
END
```
Filter shelf: exclude 0 values.

### Normalized Date formula
```
IF [range] = 2
THEN DATEADD('day', DATEDIFF('day', [from2], [date]), [from1])
ELSE [date]
END
```

---

## Parameters

| Parameter | Type | Values | Purpose |
|---|---|---|---|
| `Parameter 1` | String | month, week, day, quarter, year | Date granularity |
| ~~`Parameter 2`~~ | Removed | — | Color now driven by trend, not parameter |
| `frame` | String | last year, range | Comparison mode |
| `from1` / `to1` | Date | Any date | Range 1 start/end |
| `from2` / `to2` | Date | Any date | Range 2 start/end |
| `from1tmp` / `to1tmp` / `from2tmp` / `to2tmp` | Date | Any date | Staging before confirm |

---

## Card Layout

```
הזמנות
4.3K   ▲+1K (+32%)
תקופה נוכחית: 20/02/2025 - 25/02/2025
השוואה: 20/02/2024 - 25/02/2024      ← range mode only (own line)
[chart]
```

In **last year mode**: תקופה נוכחית and השוואה on **same line**.
In **range mode**: תקופה נוכחית on line 1, השוואה on line 2.

### Change indicator format
```
▲+1K (+32%)     ← positive
▼-54 (-13%)     ← negative
```
Wrapped in `dir="ltr"` span to prevent RTL reversal.

---

## Features

### 1. Two Comparison Modes

**Last Year** (`frame = 'last year'`):
- Groups rows by `Truncated`, sums measure
- Matches each point to closest date 1 year earlier (within 20 days)
- Solid colored line = current, dashed gray = prior year

**Range** (`frame = 'range'`):
- Splits rows by `range` column (1 vs 2)
- Groups each set by `Truncated` (respects granularity)
- Aligns by index position
- 1 point per range → bubble chart (two dots)
- Multiple points → straight line chart (tension=0)

### 2. Column Detection
- `Truncated`: by field name
- `range`: by field name, excluded from measure detection
- Measure: numeric col with largest max value
- Fallback: first date col if Truncated not found

### 3. Language
| Element | Hebrew | English |
|---|---|---|
| Period label | תקופה נוכחית: | Current: |
| Comparison label | השוואה: | vs: |
| YoY text (last year) | לעומת אותה תקופה אשתקד | vs same period last year |
| Comparison text (range) | לעומת תקופה קודמת | vs prior period |

### 4. Chart
- **Last year, many points**: smooth line (tension=0.4)
- **Range mode**: straight line (tension=0)
- **1 point per range**: bubble chart (two dots side by side)
- Canvas restored if previously replaced by error message

### 5. Other
- Color from trend: green (`#16a34a`) when up, red (`#dc2626`) when down, indigo (`#6366f1`) when neutral (diff=0) or no comparison data
- 200ms debounce on data/parameter changes
- No-cache meta headers — GitHub Pages always serves fresh
- All dependencies local — works offline on Desktop

---

## Code Structure (~209 lines)

```
Head         meta no-cache, font, scripts
CSS          layout, val-row, period-cur
HTML         lbl / val-row(val+chg) / period-cur / period-cmp-row / wrap+canvas / version
Global vars  G, fmt, ch, ws, timer
LANG         he/en: vs, dir, lineCur, linePrv
MONTHS       month-name → index map
isHebrew     /[\u0590-\u05FF]/ test
applyLang    sets direction + cur-label text
setFonts     JS-based responsive sizing (NOT vw/vh)
hexToRgba    color helper
parseDate    5 fallbacks: ISO / formatted / Month YYYY / Qn/YYYY / DD/MM/YYYY
cleanName    strips SUM() AVG() etc
getParam     gets param value by name from pre-fetched array
fmtDP        YYYY-MM-DD → DD/MM/YYYY (renamed from fmtDateParam)
sortPts      filter-valid + sort-by-date helper (used in range mode for g1/g2)
mkTip        builds shared Chart.js tooltip config object (used in both chart types)

load()
  S1: read frame param
  S2: getSummaryDataAsync
  S3: detect Truncated / range / measure cols (single-pass loop)
  S4a RANGE: group by Truncated per range value (ternary g1/g2 selection)
            sort via sortPts(), align by index, read date params
            show period-cmp-row, set השוואה label
  S4b LAST YEAR: group by Truncated, YoY match
            inline period-cmp-row, set השוואה label
  Update DOM: lbl, val, cur, prev, chg (LTR span)
  Render: bubble (1pt) or line chart (tooltip via mkTip)

debouncedLoad   200ms debounce
init            initializeAsync + event listeners
```

### Refactoring targets (future)
- Extract `detectColumns(cols, rows)` — ~20 lines
- Extract `groupByTruncated(rows, colIdx, measureIdx)` — ~15 lines
- Extract `renderChart(pts, prv, color, L, frame)` — ~50 lines
- Extract `renderBubble(pts, prv, color, L)` — ~20 lines

---

## Version History

| Version | Status | Notes |
|---|---|---|
| v1–v13 | Superseded | Early iterations, YoY + Hebrew baseline |
| v21 | Working | Truncated detection + grouping fix |
| v24 | Approved baseline | Range mode working — dots + lines, correct granularity |
| v25 | Good | `-` separator, השוואה label |
| v26 | Good | val+chg inline, periods restructured |
| v27 | Good | Single period line, lighter dates |
| v28 | Good | Range dates on separate line |
| v29 | Superseded | LTR fix: `▲+54 (+13%)` / `▼-54 (-13%)` |
| v30 | Superseded | Double minus fix (`pct` uses Math.abs); both period lines responsive (querySelectorAll) |
| v31 | Superseded | Removed dead code: `vsRange`, `yoy` from LANG, `yoyText` variable |
| v32 | Superseded | Chart color driven by trend (green/red/indigo); removed `readParamColor()` |
| v33 | Superseded | Neutral state when diff=0: indigo color, no arrow, `0 (0%)` display |
| v34 | Superseded | Bug #2 fix: reset `period-cmp-row` to `none` at top of `load()`; standardized `'inline'` → `'block'` |
| v35 | Superseded | Bug #3 fix: neutral uses `Math.abs(diff)<0.0001` instead of `diff===0`; Bug #4 fix: catch block shows error in card + stale `v12` log corrected to `v35` |
| v36 | Superseded | Bug #8 fix: replaced async `readParam()` (5 separate API calls) with sync `getParam()` — params fetched once per `load()` call |
| v37 | Superseded | Bug #10 fix: added `id="wrap"` to wrap div; replaced `document.querySelector('.wrap')` with `G('wrap')` for consistency |
| v39 | ✅ Current approved | Refactor: ~31% shorter (303→209 lines). Merged double-loop column detection into single pass; extracted `sortPts()`, `mkTip()`, `fmtDP()` helpers; collapsed range g1/g2 grouping to ternary; removed all inline comments; no features removed |

---

## Known Issues / Fixed

| Issue | Cause | Fix |
|---|---|---|
| Canvas black box | Chart.js GPU corruption on redraw | `ch.destroy(); ch=null` |
| Font sizing broken | vw/vh = full dashboard in iframe | `Math.min(innerWidth, innerHeight)` |
| Wrong measure col | Integer cols confused detection | Exclude `range` col by name |
| Date parsing failures | Tableau locale formats | 5-fallback parseDate |
| Wave on range chart | tension=0.4 overshoots sparse data | tension=0 for range mode |
| Single point wave | Chart.js wave on 1 point | Bubble chart for pts.length===1 |
| Granularity ignored | Grouped by Normalized Date | Use Truncated for grouping |
| Wrong alignment | Date key matching fails across years | Align by index position |
| GitHub caching | Browser cached old HTML | no-cache meta headers |
| Tableau whitelist | Folder URL rejected | Must whitelist exact filename URL |
| RTL flips chg text | Hebrew RTL reverses arrow+number | Wrap in `<span dir="ltr">` |
| `period-cmp-row` state leak | Switching range→last year left השוואה row visible with stale dates | Reset to `display:none` at top of `load()`; standardized show value to `block` everywhere (v34) |
| Neutral color false negative | `diff===0` fails for floating point decimals | Use `Math.abs(diff)<0.0001` epsilon check (v35) |
| Silent error swallowing | try/catch only logged to console — user saw blank card with no feedback | catch block now sets `val` to `'Error'` and `chg` to `e.message` (v35) |
| Stale error log version | `console.error('KPI v12 error')` was never updated | Corrected to `v39` in catch block |
| Fragile measure detection | Picks column with largest max value — could pick wrong col if 2 measures present | N/A for current setup (single measure + date cols only); documented for future awareness |
| `readParam` redundant API calls | 5 separate `getParametersAsync()` calls per `load()` | Replaced with single fetch + sync `getParam()` helper (v36) |
| `querySelector` inconsistency | `.wrap` used class selector, bypassing `G()` helper | Added `id="wrap"`, replaced with `G('wrap')` (v37) |
| Empty date param shows `' - '` | `getParam()` returns `''` if param not set | N/A — all date params have defaults set in Tableau |
| Empty date param alignment | Index alignment could misalign if periods have gaps | N/A — data has no gaps |

---

## Debug Tools

### kpi_inspector.html + kpi_inspector.trex
Load instead of KPI card to inspect live Tableau data:
- All parameters with values/types
- All columns with data types
- First 20 rows color-coded (green=range1, blue=range2)
- Analysis: flags missing cols, type issues, row counts

### kpi_debug.html
Debug version with stage-by-stage error boundaries:
- Ctrl+Shift+D → live debug panel
- Copy Snapshot button → JSON of columns + rows + params
- USE_MOCK flag — runs without Tableau using mock data

---

## Production Checklist
1. Push files to GitHub repo
2. Whitelist exact URL in Tableau Cloud Settings → Extensions
3. Load `kpi_39_cloud.trex` in workbook
4. Verify version watermark matches expected
5. Test both `last year` and `range` modes
6. Test granularities: day / week / month / quarter
