# Multi-Line Chart Tableau Extension — Full Project Documentation

## Overview
A Tableau Viz Extension (worksheet extension) that renders a multi-line time-series chart inside a Tableau worksheet.
Single HTML file, no backend, no setup UI.
Supports any measure, any date field, and any dimension for grouping (one line per group value).
Timeframe granularity (month / quarter) is controlled by a Tableau Parameter.

---

## File Structure (Production)
```
multiline.html              ← Main extension (all logic) — current v19
multiline_desktop.trex      ← Tableau manifest for Desktop (localhost:8765)
multiline_cloud.trex        ← Tableau manifest for Tableau Cloud (GitHub Pages)
tableau.extensions.js       ← Tableau Extensions API (local copy)
chart.js                    ← Chart.js v4.4.1 (local copy)
```

---

## Deployment

### Desktop (development)
1. Run `python -m http.server 8765` from extension folder
2. Load `multiline_desktop.trex` → Tableau Desktop → Add Extension → Access Local Viz Extensions

### Tableau Cloud (production)
- Push files to GitHub repo
- Enable GitHub Pages on the repo
- Whitelist in Tableau Cloud → Settings → Extensions → Add URL:
  `https://YOUR-USERNAME.github.io/YOUR-REPO/multiline.html`
- Load `multiline_cloud.trex`
- Live debug: open workbook in browser → F12 → Console

### Updating the extension
- Edit `multiline.html`, bump version badge (top-right, yellow) on every change
- Push to GitHub — no-cache meta headers ensure fresh load
- No need to update `.trex` files

### Two .trex files
| File | URL |
|---|---|
| `multiline_desktop.trex` | `http://localhost:8765/multiline.html` |
| `multiline_cloud.trex` | `https://YOUR-USERNAME.github.io/YOUR-REPO/multiline.html` |

---

## Tableau Sheet Setup

### Marks Card Slots
Drag fields to the custom encoding slots on the Marks card:

| Slot | Label | What to drag | Notes |
|---|---|---|---|
| A | Measure (KPI) | `SUM(Sales)`, any numeric measure | Y axis values |
| B | Date | Continuous Month date — right-click field → Continuous → Month | X axis bucketing. Must be continuous Month, not discrete, not YEAR() |
| C | Group By | `Segment`, `YEAR([Order Date])`, any dimension | One line per value. Optional — leave empty for single line |

### Parameter
| Parameter | Type | Values | Purpose |
|---|---|---|---|
| `Parameter 1` | String | `month`, `quarter` | Controls X axis bucketing and labels |

Parameter name is case-insensitive. Extension also accepts `timeframe` as an alternative name.

### Filters
- Place a date range filter on `Order Date` to control which years of data are sent
- No calculated fields required — extension reads raw data directly

---

## Marks Card — Custom Encodings (`.trex`)
The `.trex` manifest declares three named encoding slots:

```xml
<encoding id="measure">  <!-- Slot A -->
<encoding id="date">     <!-- Slot B -->
<encoding id="group">    <!-- Slot C -->
```

These appear as labelled pill targets on the Marks card (Measure (KPI) / Date / Group By).

---

## Column Resolution Logic

Three layers, tried in order per column. Each layer only runs if the previous one returned -1.

### Layer 1: Visual Spec (primary — reads A/B/C slots directly)
Calls `getVisualSpecificationAsync()` and reads `marksSpecificationList[0].encodingList`.
Field name is read from `enc.field.name` — the correct property shape returned by Tableau Cloud.
Matched exactly against `getSummaryDataAsync` column names.

> **Note:** Earlier versions incorrectly read `enc.fieldList[0].fieldName`, which doesn't exist in the Tableau Cloud API response shape. This caused layer 1 to silently return -1 on every load, making the dataType fallback do all the work (unreliably). Fixed in v19.

### Layer 2: Visual Spec (prefix-stripped match)
If layer 1 returns -1, retries after stripping the aggregation prefix via `cleanName()`.
Handles the mismatch where spec returns `SUM(Sales)` but the data column is named `Sales`.
Also keeps `fieldList[0].fieldName` as a secondary read for older API versions.

### Layer 3: DataType Sniffing
Safety net only — runs if `getVisualSpecificationAsync` throws entirely.
- **Measure**: first `float`/`real`/`number`/`double` column; if none, first `integer`/`int` column whose name doesn't match `year|month|quarter|day|week`
- **Date**: first `date` column that isn't the measure
- **Group**: any remaining column that is neither measure nor date

This layer should rarely fire in practice now that layer 1 reads the correct property.

---

## Features

### 1. Multi-Line Chart
- One line per unique value in the Group By field
- Up to 10 lines (COLORS palette); cycles if more
- X axis: fixed Jan–Dec (monthly) or Q1–Q4 (quarterly) — not a continuous date axis
- Each data point plotted in the correct bucket for its month/quarter
- Multiple rows with the same group+bucket are summed
- Months/quarters with no data show as gaps (`spanGaps: false`)

### 2. Color Editor
- **Legend swatches** at bottom of chart are clickable
- Clicking a swatch opens a popover near the cursor with:
  - Native browser color picker (color wheel)
  - Hex code input field (`#RRGGBB`)
- Both inputs stay in sync
- Line color, fill, dots, hover dots, and tooltip swatches all update **live** on pick
- Colors persist in `colorMap{}` across data reloads (parameter changes, filter changes)
- Colors reset only on full page reload (Tableau refresh/re-open)

### 3. Timeframe Switching
- `Parameter 1 = 'month'` → X axis shows Jan, Feb, ..., Dec (12 buckets)
- `Parameter 1 = 'quarter'` → X axis shows Q1, Q2, Q3, Q4 (4 buckets)
- Badge top-right shows current mode: **Monthly** or **Quarterly**
- Chart re-renders immediately on parameter change

### 4. Tooltip
- Mode: `index` (vertical crosshair, all lines shown at hovered X)
- Title: bucket label (e.g. `Jul` or `Q3`)
- Body: one row per line — `GroupLabel: value`
- Swatch color: always reads live `dataset.borderColor` — updates with color picker

### 5. Version Badge
- Top-right corner, yellow background, black text
- Always visible — used to confirm which version is loaded
- Format: `v19`, etc.

---

## Chart Internal — Color Update Mechanism

Chart.js v4 caches element styles in two layers:
1. `dataset.borderColor` etc — the source of truth, updated by `applyColor()`
2. `meta.dataset._options` — line segment element cache
3. `meta.data[i]._options` — per-point element cache

All three layers must be patched for color changes to appear without a full reload:

```javascript
// 1. Update dataset properties
ds.borderColor = hex;
ds.pointBackgroundColor = hex;

// 2. Null element caches (Chart.js rebuilds from dataset on next render)
meta.dataset._options = null;
meta.data.forEach(el => el._options = null);

// 3. Trigger redraw
ch.update('none');
```

The `labelColor` tooltip callback reads `ctx.dataset.borderColor` directly, bypassing the element cache entirely for tooltip swatches.

---

## Code Structure

```
Head          meta no-cache, Google font (DM Sans), scripts
CSS           layout: header / error / chart-wrap / legend / version badge
              color-pop: position:fixed popover, hex input, native color input
HTML          color-pop div (fixed overlay)
              app: header(measure-name + timeframe-badge + version)
                   error div
                   chart-wrap + canvas
                   legend
Global vars   G, fmt, cleanName, getParam helpers
              COLORS[10], MONTH_LABELS, QUARTER_LABELS
              parseDate: raw => new Date(raw)  (single line — requires continuous Month date in slot B)

Column resolution
  Layer 1: enc.field.name → exact match against col.fieldName
  Layer 2: cleanName() strip + fieldList[0].fieldName fallback
  Layer 3: dataType sniff (safety net only)
              ch, ws, timer, firstLoad, colorMap{}

Color popover
  openColorPop(label, currentColor, swatchEl, event)
    positions popover near click, sets label + inputs
  applyColor(hex)
    updates dataset properties + Chart.js element caches + redraws
  Event listeners: native input, hex input, close button, outside click

buildLegend(datasets)
  creates clickable swatch + label per dataset
  wires click → openColorPop

load()
  S1: getParametersAsync → timeframe (month/quarter) → xLabels, numBuckets
  S2: getSummaryDataAsync → cols, rows
  S3: getVisualSpecificationAsync → measureIdx, dateIdx, groupIdx
        Layer 1: enc.field.name → exact match (primary — drives A/B/C)
        Layer 2: cleanName() strip + fieldList fallback
        Layer 3: dataType sniff if spec throws (safety net)
  S4: aggregate rows → groups[groupLabel][bucketIndex] = sum
  S5: build Chart.js datasets (apply colorMap if available)
  S6: buildLegend, destroy old canvas, create new Chart
  S7: reveal (#app opacity 0→1 on firstLoad only)

debouncedLoad   150ms debounce on SummaryDataChanged + ParameterChanged
init            poll 50ms for tableau object → initializeAsync → load()
                attach SummaryDataChanged + ParameterChanged listeners
```

---

## Code Reduction (v19 Refactor)

Applied after v19 to reduce file size without changing behaviour.

| Metric | Before | After | Change |
|---|---|---|---|
| Lines | 388 | 257 | −34% |
| File size | ~14 KB | ~12.4 KB | ~−14% |

### Changes Made

**`applyColor()`** — Removed manual meta-patching block that explicitly set `meta.dataset.options.borderColor`, `meta.dataset.options.backgroundColor`, and looped over all `meta.data` elements to set point colors. This was redundant — updating the dataset-level properties (`ds.borderColor`, `ds.pointBackgroundColor`, etc.) and then nulling `_options` cache is sufficient for Chart.js to rebuild correctly on `ch.update('none')`. The cache-reset loop was consolidated into a single pass already covering all datasets.

**`buildLegend()`** — Replaced the imperative DOM-building loop (`createElement` × 4 per dataset) with a template string + `innerHTML`, followed by a single `querySelectorAll` pass to attach click listeners.

**Minor cleanups:**
- Collapsed `G('color-pop-native').value = ...; G('color-pop-hex').value = ...;` to one assignment line
- Removed the one-line `parseDate` wrapper function — inlined as `new Date(...)` directly
- Tightened Chart.js scale/tick option objects onto fewer lines

---

## Version History

| Version | Status | Notes |
|---|---|---|
| v1 | Superseded | Initial skeleton. Visual spec reading attempted, positional A/B/C fallback. Color popover built in. |
| v2 | Superseded | Bug fix: `getVisualSpecificationAsync` not returning fields. Added console logging + positional fallback (A=measure, B=date, C=group). |
| v3 | Superseded | Broke: positional assumption wrong — Tableau doesn't guarantee column order. Reverted to spec + dataType sniffing. Fallback priority: string/bool → integer → low-variance date. |
| v4 | Superseded | Yellow version badge moved to top-right header. Group fallback: integer col (catches YEAR() → int), string col, low-variance date col. Still misdetecting when data scope changes. |
| v5 | Superseded | Dots now filled (pointBackgroundColor=color, pointBorderColor='#fff'). applyColor updated to patch pointBackgroundColor. |
| v6 | Superseded | Fix: applyColor was setting pointBorderColor=hex (old scheme) instead of pointBackgroundColor=hex. Corrected to match v5 dot scheme. |
| v7 | Superseded | Fix: ch.update('none') skips style re-renders. Patched Chart.js internal meta.data element cache. Used ch.draw() instead of ch.update('none'). |
| v8 | Superseded | Broke: back to pure positional A=0, B=1, C=2. Tableau column order still unreliable. Reverted. |
| v9 | Superseded | Fix: meta.dataset.options.borderColor patched for line element (dots worked, line didn't). |
| v10 | Superseded | Rewrote spec reading: reads enc.fieldList[0].fieldName (correct Tableau viz API property). Full console logging of raw spec keys. DataType fallback retained for measure + date only. Group fallback: process of elimination (any col ≠ measure ≠ date). |
| v11 | Superseded | Fix: group process-of-elimination fallback was missing. Added explicit: if groupIdx<0, find any col that is not measureIdx and not dateIdx. |
| v12 | Superseded | Fix: tooltip swatches showing stale colors. Added labelColor callback reading ctx.dataset.borderColor live. |
| v13 | Superseded | Fix: hover dot color not updating. Nulled _options cache on meta.dataset and meta.data elements. Switched to ch.update('none') to trigger cache rebuild. |
| v14 | Superseded | Refactor: removed MONTHS_MAP, collapsed parseDate to single line, stripped all dataType fallback logic. Strict setup required. 448 → 378 lines. |
| v15 | Superseded | Fix: measure not resolving when spec field name includes aggregation prefix (e.g. `SUM(מכירות)`). Added cleanName() strip as layer 2 match in pickIdx. |
| v16 | Superseded | Fix: entire spec call silently throwing on Tableau Cloud with `he_IL` locale / Hebrew field names. Restored minimal 3-line dataType fallback (layer 3) that runs only when spec returns -1, not as primary logic. |
| v17 | Superseded | Fix: layer 3 measure fallback missed integer columns (`כמות` / Quantity). Added `integer`/`int` to accepted dataTypes. |
| v18 | Superseded | Fix: layer 3 integer fallback picking `YEAR(Order Date)` before actual measure. Split into two passes: float first, then integer excluding date-part field names. Added debug build (v18-debug) with `console.log('SPEC:',...)` to capture live API response shape. |
| v19 | ✅ Current | Root cause fix: layer 1 was reading `enc.fieldList[0].fieldName` which does not exist in Tableau Cloud API response. Correct property is `enc.field.name`. Layer 1 now drives A/B/C slot resolution correctly. Layer 3 retained as safety net only. |

---

## Known Issues / Fixed

| Issue | Cause | Fix |
|---|---|---|
| Hundreds of lines rendered | groupIdx resolved to Order Date (thousands of distinct values) | Spec-first + process-of-elimination fallback (v10/v11) |
| Single line instead of one per year | groupIdx = -1 (spec didn't match group field) | Explicit remaining-col fallback (v11) |
| Dot colors don't update on color pick | ch.update('none') skips style re-renders | Patch meta.data element cache + ch.update('none') (v7/v13) |
| Line color doesn't update on color pick | meta.dataset element cache not patched | Null meta.dataset._options before redraw (v9/v13) |
| Hover dot shows old color | _options cache rebuilt from stale values | Null _options so Chart.js rebuilds from dataset (v13) |
| Tooltip swatches show old color | Chart.js reads element cache for swatch color | labelColor callback reads ctx.dataset.borderColor live (v12) |
| Measure not resolving despite slot filled | Spec returns `SUM(Field)`, column named `Field` — prefix mismatch | cleanName() strip as layer 2 match (v15) |
| All slots returning -1 on Tableau Cloud | `getVisualSpecificationAsync` throws silently on `he_IL` locale with Hebrew field names | 3-line dataType fallback as layer 3 (v16) |
| Layer 1 always returning -1 despite spec succeeding | Code read `enc.fieldList[0].fieldName` — property doesn't exist in Tableau Cloud API; correct property is `enc.field.name` | Read `enc.field.name` first (v19) |
| Wrong measure selected when multiple integer columns present | Layer 3 integer fallback picked `YEAR(Order Date)` before actual measure | Float-first pass + exclude date-part field names from integer pass (v18) |
| .trex parse error: extension-mode | Not a valid attribute in manifest schema 0.1 | Removed extension-mode attribute (v1 trex fix) |
| .trex parse error: allowed-types | Not declared for encoding element | Removed allowed-types from all encoding elements (v1 trex fix) |
| GitHub caching | Browser cached old HTML | no-cache meta headers |

---

## Debug

### If the chart shows an error message
- **"No numeric measure found"** → slot A is empty, or spec + dataType sniffing both failed. Check F12 console for `spec failed:` warning.
- **"No date column found"** → slot B is empty, or the date field is not recognized as a date dataType by Tableau. Ensure slot B has a continuous Month date.

### Console (F12)
If `getVisualSpecificationAsync` throws, you will see:
```
spec failed: <error message>
```
The extension will then fall back to dataType sniffing silently and render normally if the sheet has the standard one measure / one date / one dimension layout.

---

## Production Checklist
1. Push files to GitHub repo
2. Whitelist exact HTML URL in Tableau Cloud Settings → Extensions
3. Load `multiline_cloud.trex` in workbook
4. Confirm version badge shows **v19**
5. Drag `SUM(measure)` → slot A
6. Drag a **continuous Month** date → slot B (right-click pill → Continuous → Month)
7. Drag a dimension → slot C (optional)
8. Set Parameter 1 to `month` or `quarter`
9. Verify correct number of lines matches distinct group values
10. Test color picker: click legend swatch → line + dots + tooltip swatch should all update
