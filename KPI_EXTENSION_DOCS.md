# KPI Tableau Extension — Full Project Documentation

## Overview
A Tableau Viz Extension (worksheet extension) that renders a KPI card inside a Tableau worksheet.
Single HTML file, no backend, no setup UI. Auto-detects columns and adapts automatically.
Supports two comparison modes: **Last Year** (YoY automatic) and **Range** (manual date ranges).

---

## File Structure (Production)
```
kpi_40.html               ← Main extension (all logic) — ~273 lines (v70)
kpi_40_desktop.trex       ← Tableau manifest for Desktop (localhost:8765)
kpi_40_cloud.trex         ← Tableau manifest for Tableau Cloud (GitHub Pages)
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
2. Load `kpi_40_desktop.trex` → Tableau Desktop → Add Extension → Access Local Viz Extensions

### Tableau Cloud (production)
- GitHub repo: `https://github.com/ohomri-rgb/kpi-extension`
- GitHub Pages URL: `https://ohomri-rgb.github.io/kpi-extension/`
- Whitelist in Tableau Cloud → Settings → Extensions → Add URL:
  `https://ohomri-rgb.github.io/kpi-extension/kpi_40.html`
- Load `kpi_40_cloud.trex`
- Live debug: open workbook in browser → F12 → Console

### Updating the extension
- Edit `kpi_40.html`, bump version watermark (bottom-left) on every change
- Push to GitHub — no-cache meta headers ensure fresh load
- No need to update `.trex`

### Two .trex files
| File | URL |
|---|---|
| `kpi_40_desktop.trex` | `http://localhost:8765/kpi_40.html` |
| `kpi_40_cloud.trex` | `https://ohomri-rgb.github.io/kpi-extension/kpi_40.html` |

---

## Tableau Sheet Setup
Place on **Detail shelf** (Marks card):

| Field | Type | Purpose |
|---|---|---|
| `Truncated` | Date (calculated) | X axis — respects granularity parameter |
| Measure | Float/Int | The KPI value |
| Raw date field (e.g. `Order Date`) | Date/Datetime | Used for year-mode raw date scanning |
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

### Time Filter formula (Last Year mode + Range mode passthrough)
Controls which rows are sent to the extension. In range mode, the time filter must pass all rows through — the `[range]` field + filter-shelf exclusion of 0 handles period scoping. In last year mode, handles all granularities including complete-period-only logic for week/month/quarter and YTD for year. Replace `[Order Date]` with your raw date field name.

```
// Pass all rows when in range mode — [range] field + filter shelf handles scoping
[frame] = 'range'

OR

// Current year YTD (last year mode)
(
    YEAR([Order Date]) = YEAR([Max Date])
    AND
    (
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
    AND
    (
        ([Parameter 1] = 'year'    AND [Order Date] <= DATEADD('year', -1, [Max Date])) OR
        ([Parameter 1] = 'day'     AND [Order Date] <= DATEADD('year', -1, [Max Date])) OR
        ([Parameter 1] = 'week'    AND [Order Date] < DATEADD('year', -1, DATETRUNC('week', [Max Date]))) OR
        ([Parameter 1] = 'month'   AND [Order Date] < DATEADD('year', -1, DATETRUNC('month', [Max Date]))) OR
        ([Parameter 1] = 'quarter' AND [Order Date] < DATEADD('year', -1, DATETRUNC('quarter', [Max Date])))
    )
    AND [Order Date] >= DATEADD('year', -1, DATETRUNC('year', [Max Date]))
)
```

Note: week/month/quarter only include **complete** periods. `[Max Date]` is a calculated field returning `MAX([Order Date])` or a parameter holding today's date.

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
Total Amount
2.7M   ▲+302.8K (+13%)
Current: 27.12.2026
vs: 28.12.2025
[chart]
```

In **last year mode**: Current and vs on separate lines, showing last data point of each period.
In **last year / year granularity**: shows full YTD range e.g. `01.01.2026 – 30.09.2026`
In **range mode**: Current on line 1, vs on line 2, showing full date range from params.

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
- Tableau time filter supplies exactly 2 calendar years of data
- Extension splits by `getFullYear()`: current year vs prior year
- Matches points by **period number** (ISO week / month number / quarter / day-of-year)
  - Week: ISO week number so week 52 of 2026 matches week 52 of 2025
  - Month: month number (0–11)
  - Quarter: quarter number (0–3)
  - Day: day of year
  - Year: constant key 0 (always pairs the two single points)
- Solid colored line = current, dashed gray = prior year
- Both series rendered **indexed** (X axis = 0,1,2…) so lines overlay cleanly regardless of granularity
- Tension = 0 (straight lines, like range mode)
- Tooltip title shows actual dates of both series at hovered position e.g. `27.12.2026 / 28.12.2025`

**Year granularity special behaviour:**
- DATETRUNC collapses all rows to `01.01.YYYY` → only 1 point per year from Truncated
- Extension ignores Truncated for year mode, instead scans the raw date column (auto-detected as the non-Truncated date col with the most precise/max values)
- Groups raw rows by month for each year, takes first and last month as 2 data points → line chart (not bubble)
- **KPI headline value = total sum of all months** in the current year period (not just the last month)
- **Comparison value = total sum of all months** in the prior year period
- Labels show full YTD range: `01.01.2026 – 30.09.2026` / `01.01.2025 – 30.09.2025`
- The line shows trend direction (start vs end of year), the number shows the aggregate

**Range** (`frame = 'range'`):
- Splits rows by `range` column (1 vs 2)
- Groups each set by `Truncated` (respects granularity)
- Aligns by index position
- 1 point per range → bubble chart (two dots)
- Multiple points → straight line chart (tension=0)

### 2. Column Detection
- `Truncated`: by field name (case-insensitive)
- `range`: by field name, excluded from measure detection
- Measure: numeric col with largest max value
- Raw date col (year mode): any date col that is not `Truncated` and not `range`, auto-detected by finding the col with the maximum date value across all rows
- Fallback: first date col if Truncated not found

### 3. Language
| Element | Hebrew | English |
|---|---|---|
| Period label | תקופה נוכחית: | Current: |
| Comparison label | השוואה: | vs: |

### 4. Chart
- **Last year mode**: straight line (tension=0), indexed X axis, two lines overlaid
- **Range mode**: straight line (tension=0), indexed X axis
- **1 data point**: bubble chart (two dots side by side)
- **Year granularity**: 2-point line (first month + last month), KPI = full period sum
- Canvas restored if previously replaced by error message

### 5. Other
- Color from trend: green (`#16a34a`) when up, red (`#dc2626`) when down, indigo (`#6366f1`) when neutral (diff=0) or no comparison data
- 150ms debounce on data/parameter changes
- No-cache meta headers — GitHub Pages always serves fresh
- All dependencies local — works offline on Desktop

---

## Code Structure (~328 lines)

```
Head         meta no-cache, font, scripts
CSS          layout, val-row, period-cur; #app opacity:0 initially (no transition)
HTML         lbl / val-row(val+chg) / period-cur / period-cmp-row / wrap+canvas / version
             (all initial text content empty — no "—" flash)
Global vars  G, fmt, ch, ws, timer, firstLoad
LANG         he/en: vs, dir, lineCur, linePrv
MONTHS       month-name → index map
isHebrew     /[\u0590-\u05FF]/ test
applyLang    sets direction + cur-label text
setFonts     JS-based responsive sizing (NOT vw/vh)
hexToRgba    color helper
parseDate    5 fallbacks: ISO / formatted / Month YYYY / Qn/YYYY / DD/MM/YYYY
cleanName    strips SUM() AVG() etc
getParam     gets param value by name from pre-fetched array
normDate     unified date normalizer → always DD.MM.YYYY (replaces fmtDP)
             handles: YYYY-MM-DD / DD/MM/YYYY / D.M.YYYY / already DD.MM.YYYY
             non-date labels (month name, quarter) returned as-is
sortPts      filter-valid + sort-by-date helper (used in range mode for g1/g2)
mkTip        builds shared Chart.js tooltip config object (used in both chart types)
periodNum    returns period index for a date given granularity:
             week→ISO week, month→month#, quarter→quarter#, day→day-of-year, year→0

load()
  S1: read frame + Parameter 1 (granularity)
  S2: getSummaryDataAsync
  S3: detect Truncated / range / measure cols (single-pass loop)
  S4a RANGE: group by Truncated per range value (ternary g1/g2 selection)
            sort via sortPts(), align by index, read date params via normDate()
            show period-cmp-row, set vs label
  S4b LAST YEAR:
            split allPts by getFullYear() → pts (current year) + prvAll (prior year)
            build prvMap: periodNum → prior point
            prv = pts.map(p → prvMap[periodNum(p.d, gran)])
            YEAR mode override: scan raw date col, group by month, take first+last,
                                compute totalCur/totalPrv sums, build YTD range labels
            labels: normDate of last point each series (or YTD range for year)
            show period-cmp-row, set vs label
  Update DOM: lbl, val, cur, prev, chg (LTR span)
  Render: bubble (1pt) or indexed line chart with date tooltip
  Reveal: if firstLoad → set #app opacity:1 and clear firstLoad flag

debouncedLoad   150ms debounce (animation:false makes stagger imperceptible)
init            poll every 50ms for tableau object → tighter multi-card sync
                initializeAsync + event listeners
```

### Refactoring targets (future)
- Extract `detectColumns(cols, rows)` — ~20 lines
- Extract `groupByTruncated(rows, colIdx, measureIdx)` — ~15 lines
- Extract `renderChart(pts, prv, color, L, frame)` — ~50 lines
- Extract `periodNum(d, gran)` as standalone helper (currently inline)

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
| v39 | Superseded | Refactor: ~31% shorter (303→209 lines). Merged double-loop column detection into single pass; extracted `sortPts()`, `mkTip()`, `fmtDP()` helpers; collapsed range g1/g2 grouping to ternary; removed all inline comments; no features removed |
| v40 | Superseded | Bug fixes: multi-card stagger (init poll 50ms), blank flash (opacity:0→1), date format (normDate DD.MM.YYYY) |
| v41 | Superseded | Attempted sync fix: debounce 200ms→600ms + 400ms initial load delay. Stagger reduced, not eliminated |
| v42 | Superseded | Attempted sync fix: BroadcastChannel('kpi_sync') — cards broadcast reload signal to each other to align debounce deadline. Stagger still visible on server |
| v43 | Superseded | Attempted anchor-based sync: BroadcastChannel with absolute wall-clock timestamp so all cards schedule `load()` at same moment. Still staggered — BroadcastChannel confirmed blocked by Tableau Cloud iframe sandbox |
| v44 | Superseded | Removed BroadcastChannel. `opacity:0→1` only on `firstLoad`; subsequent updates in-place. Broken: cards still staggered because data fetches arrive sequentially from Tableau server |
| v45 | Superseded | Attempted chart reuse via `ch.update('none')` to avoid destroy/blank flash. Broken: `sameType` logic corrupted charts when dataset structure changed (e.g. frame switch) |
| v46 | Superseded | Two-phase fetch/commit with `localStorage` anchor sync. Broken: race condition — commit timer fired before async `load()` stored `pendingRender`; param switching stopped working |
| v47 | Superseded | Simplified: always destroy+recreate chart, `animation:{duration:0}`, `firstLoad` reveal. Broken: `sameType` reuse code left in caused bubble/line corruption |
| v48 | Superseded | Final sync fix: `animation:false` everywhere. `opacity:0→1` on first load only. Clean destroy+recreate each time. No BroadcastChannel, no localStorage, no pendingRender |
| v49 | Superseded | Experimental `yoy` frame mode — abandoned, merged into last year mode instead |
| v50 | Superseded | Last year mode redesigned: half-index split, indexed X axis, two lines overlaid like range mode. Tooltip date fix |
| v51 | Superseded | Date labels fixed to show last point of each half only. Version bump discipline started |
| v52 | Superseded | Date-based cutoff split (lastDate minus 1 year) instead of index half-split, to handle unequal year lengths |
| v53 | Superseded | Per-point YOY match by ±16 day proximity — still drifted for weekly due to 52/53 week years |
| v54 | Superseded | Period-number matching introduced (`periodNum` function): ISO week / month / quarter / day-of-year. Prior split still used date cutoff causing 2024 bleed-through |
| v55 | Superseded | Fixed prior pool to only include 12 months before cutoff — DATETRUNC week boundary (29.12.2024 from Jan 2025) still caused wrong year match |
| v56 | Superseded | Switched to `getFullYear()` split: current year vs prior year. Eliminates DATETRUNC boundary issues entirely |
| v57 | Superseded | Fixed year granularity: `periodNum` returned different keys for 2026/2025 so they never matched. Fixed by returning constant `0` for year granularity |
| v58 | Superseded | Year mode label fix: scanned raw date cols for actual max date to show YTD range. Max date still wrong (28.09 instead of 30.09) |
| v59 | Superseded | Improved raw date scan: scanned all non-Truncated date cols. YTD value recalculation in JS — removed after Tableau-side filter was implemented |
| v60 | Superseded | Attempted JS YTD sum cap by month — used Truncated col which is always 01.01, giving wrong capMonth |
| v61 | Superseded | Scanned all non-Truncated date cols for capMonth/capDay. Date still wrong due to datetime precision issues |
| v62 | Superseded | Removed JS YTD recalculation entirely — Tableau time filter now handles correct data supply. Year label scan kept for display only |
| v63 | Superseded | Year mode: regroup raw rows by month, take first+last as 2 pts for line chart (not bubble). KPI value still wrong (only last month, not full period sum) |
| v64 | Superseded | Year mode: KPI headline = total sum of all months in period. Comparison = total sum of prior year period. Tooltip shows year string not month key. Line remains first+last month for visual direction |
| v65 | Superseded | Year mode flat line fix: both chart points now carry the full period total (not individual month values) → perfectly horizontal line. Both points share the same x label (full period range string) so tooltip is identical at start and end — no more doubled month labels |
| v66 | Superseded | Range mode silent exit replaced with visible "No data for Period 1" state — card shows `—` plus the configured date range so misconfigured params are immediately obvious instead of leaving stale chart |
| v67 | Superseded | Chart destroy moved to top of `load()` — stale canvas no longer persists when any early-return path is hit (e.g. no data). Previously old chart survived no-data returns making Parameter 1 appear to have no effect |
| v68 | Superseded | Range mode single-point flat line: when a range period collapses to 1 aggregated point, duplicate into 2 points with identical y (flat horizontal line) using from/to dates as x labels. Matches year-mode visual behaviour. Bubble chart now only used in last-year non-year granularities |
| v69 | Superseded | Code rewrite: ~23% line reduction (354→273 lines). Converted `var`→`const`/`let`, all callbacks to arrow functions, `getParam` rewritten with `.find()`, `setFonts` extracted inner helper, `normDate` uses `.padStart()`, shared `baseOpts` object for Chart.js options, dead `fmtDMY2` and duplicate `curLabel`/`prevLabel` assignments removed. Zero logic or feature changes |
| v70 | ✅ Current | Bug fix: "Canvas is already in use" error on reload. Removed conditional `if(!wrap.querySelector('canvas'))` guard — canvas is now always replaced with a fresh element before chart creation, ensuring Chart.js never attempts to reuse a canvas with a stale internal registration |

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
| Stale error log version | `console.error('KPI v12 error')` was never updated | Corrected and kept in sync with version watermark each release |
| `readParam` redundant API calls | 5 separate `getParametersAsync()` calls per `load()` | Replaced with single fetch + sync `getParam()` helper (v36) |
| `querySelector` inconsistency | `.wrap` used class selector, bypassing `G()` helper | Added `id="wrap"`, replaced with `G('wrap')` (v37) |
| Multi-card stagger on load | Each iframe polled for `tableau` every 400ms independently | Reduced poll interval to 50ms → all cards initialize near-simultaneously (v40) |
| Multi-card stagger on parameter change ⚠️ PARTIALLY RESOLVED | BroadcastChannel blocked by Tableau Cloud iframe sandbox; localStorage events unreliable cross-iframe; `getSummaryDataAsync()` served sequentially ~80-90ms apart per card | `animation:false` makes each card render instantly on arrival — stagger imperceptible (v48) |
| Blank "—" flash on load | HTML had `—` as initial placeholder text | Initial content emptied; `#app opacity:0` → revealed after full render (v40) |
| Date format inconsistency | Range mode used slashes; last year mode used dots | `normDate`: all dates normalized to DD.MM.YYYY (v40) |
| Weekly comparison wrong year | Index-based split with date cutoff; DATETRUNC week boundary (29.12.2024) fell in prior year block causing week 52 to match 2024 instead of 2025 | Split by `getFullYear()` — clean year boundary, no DATETRUNC confusion (v56) |
| Weekly 52/53 week drift | 52 vs 53 week years cause index misalignment | Period-number matching: ISO week 52 of 2026 → ISO week 52 of 2025 (v54/v56) |
| Year granularity shows bubble | DATETRUNC year collapses all rows to 01.01.YYYY → 1 point | Scan raw date col, group by month, take first+last → 2-point line chart (v63) |
| Year KPI shows last month only | `last.y` was last month's value not full period | `totalCur`/`totalPrv` = sum of all months in period (v64) |
| Year tooltip shows month key | `x` label was `2025-12` from month grouping | `last.x` overridden to year string `"2025"` / `"2024"` (v64) |
| Year comparison includes full prior year | DATETRUNC sends all 12 months even when current year is partial | Tableau time filter formula handles YTD capping per granularity (v62+) |
| Year mode chart not flat — dips/spikes between start and end | Both chart pts carried individual month y-values, not full period total | After year label block, patch both pts and prv to carry totalCur/totalPrv; both x labels set to full period range string → perfectly horizontal line, identical tooltip at both ends (v65) |
| Range mode card freezes on stale chart when params have no data | `pts.length===0` hit silent `return` leaving old canvas intact; subsequent param changes re-hit same return | Replaced silent return with visible `— / No data for Period 1` state + configured date range shown (v66) |
| Parameter 1 appears to have no effect in range mode | `ch.destroy()` only ran just before drawing — any early return left old canvas; every reload re-rendered the same stale chart | Moved `ch.destroy()` to very top of `load()` so every path starts with blank canvas (v67) |
| Range mode shows bubble for single-point period | 1 aggregated point fell into `pts.length===1` bubble branch | Duplicate single point into 2 identical-y points using from/to dates as labels → flat horizontal line; bubble branch now only reachable in last-year non-year granularity (v68) |
| "Canvas is already in use" error | `ch.destroy()` clears Chart.js internal state but old canvas element stays in DOM; conditional `if(!wrap.querySelector('canvas'))` skipped replacement, leaving Chart.js to detect its own stale registration and throw | Always replace canvas element unconditionally before chart creation — removes the `if` guard so a fresh `<canvas>` is inserted on every `load()` call (v70) |

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
3. Load `kpi_40_cloud.trex` in workbook
4. Verify version watermark matches expected (currently v70)
5. Test both `last year` and `range` modes
6. Test all granularities: day / week / month / quarter / year
7. Confirm Tableau time filter formula is applied to the sheet
8. Confirm `[Max Date]` calculated field exists and returns correct max date
