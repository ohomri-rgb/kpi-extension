# RTL Table Tableau Extension — Full Project Documentation

## Overview
A Tableau Viz Extension (worksheet extension) that renders a scrollable RTL data table inside a Tableau worksheet.
Single HTML file, no backend, no setup UI.
Supports up to 16+ columns of mixed data types (strings, numbers, dates).
Column order is controlled by a Tableau String parameter named `Columns`.
Each column has a multi-select filter dropdown in the header row.

---

## File Structure (Production)
```
table_rtl.html          ← Main extension (all logic) — 385 lines (v4)
table_rtl.trex          ← Tableau manifest (update URL before use)
tableau.extensions.js   ← Tableau Extensions API (local copy)
```

---

## Deployment

### Desktop (development)
1. Run `python -m http.server 8765` from extension folder
2. Update `table_rtl.trex` → `<url>` to `http://localhost:8765/table_rtl.html`
3. Load `table_rtl.trex` → Tableau Desktop → Add Extension → Access Local Viz Extensions

### Tableau Cloud (production)
- Push files to GitHub repo
- Enable GitHub Pages on the repo
- Update `table_rtl.trex` → `<url>` to your GitHub Pages URL
- Whitelist in Tableau Cloud → Settings → Extensions → Add URL
- Load `table_rtl.trex`
- Live debug: open workbook in browser → F12 → Console

### Updating the extension
- Edit `table_rtl.html`, bump version in footer (`v4`, `v5`, …) on every change
- Push to GitHub — no-cache meta headers ensure fresh load
- No need to update `.trex`

---

## Tableau Sheet Setup

### Marks Card
Drag all desired columns to the **Detail** shelf on the Marks card.
The extension reads all fields placed on Detail — there are no named encoding slots.

| What to drag | Notes |
|---|---|
| Any dimension or measure | Strings, integers, floats, dates all supported |
| Up to 16+ fields | No hard limit |

### Parameters

| Parameter | Type | Purpose |
|---|---|---|
| `Columns` | String — List | Controls column display order. Value is a comma-separated list of field names in the desired left-to-right order |

#### Setting up the Columns parameter
1. Create a String parameter named `Columns`
2. Set Allowable Values → **List**
3. Add one entry in the list — the Value field contains the full comma-separated ordered string, e.g.:
   ```
   YEAR(Order Date), YEAR(Ship Date), CNT(Orders), SUM(Profit), SUM(Quantity), SUM(Sales Forecast), SUM(Sales), Category, Customer ID, Customer Name, Order ID, Order Profitable?, Product ID, Row ID, Segment, Ship Mode, Ship Status
   ```
4. Field names must match exactly what Tableau sends in `getSummaryDataAsync` — use the field name as it appears in the Data pane including any aggregation wrapper (`SUM(`, `YEAR(`, `CNT(` etc.)
5. The extension normalises both sides before matching (strips aggregation wrappers, lowercases, removes spaces), so minor casing differences are tolerated

#### What happens if a field is missing from the parameter
- Fields in the parameter that don't match any rawCol → silently skipped (logged in console)
- Fields in rawCols that aren't in the parameter → appended at the end of the table

#### Why not drag-to-reorder or localStorage?
- `getVisualSpecificationAsync` returns an empty detail encoding list on Tableau Cloud — marks card order cannot be read via API
- `localStorage` doesn't persist across Tableau Cloud sessions or between users
- A workbook-embedded parameter is the only approach that is reliable, shared, and editable without touching code

---

## Column Order Resolution Logic

```
1. Read "Columns" parameter currentValue
   → split by comma, trim each entry
   → for each entry, normalise: strip aggregation wrappers (SUM/YEAR/CNT/etc.) recursively,
     lowercase, remove spaces
   → match against rawCols by normalised fieldName
   → build ordered col list

2. If parameter is empty or missing
   → fall back to rawCols alphabetical order (Tableau's internal order from getSummaryDataAsync)

3. Any rawCols not matched by parameter → appended at end
```

> **Note:** `getSummaryDataAsync` always returns columns in alphabetical order regardless of marks card arrangement. This is a Tableau Cloud API limitation — the spec API (`getVisualSpecificationAsync`) returns an empty detail encoding list on Cloud and cannot be used for ordering.

---

## Filter Dropdowns

Each column header has a **▼ הכל** button that opens a multi-select checkbox panel.

| Behaviour | Detail |
|---|---|
| Open | Click column's filter button |
| Close | Click button again, click outside, or click החל |
| Search | Type in the search box to narrow the checkbox list |
| Select values | Check one or more values |
| Apply | Click **החל** — rows not matching are hidden |
| Clear | Click **הכל** — all rows shown for that column |
| Multi-column | Filters across columns combine with AND logic |
| Active indicator | Button turns purple and shows count (`3 נבחרו`) or single value name |
| Reset on reload | Filters reset whenever data refreshes (SummaryDataChanged) |

Filtering is client-side — it hides `<tr>` rows in the DOM, it does not re-query Tableau.

---

## Data Formatting

| Data type | Display format |
|---|---|
| `float`, `real`, `double`, `number` | `toLocaleString('en-US')` — e.g. `1,234.56` |
| `int`, `integer` | `toLocaleString('en-US')` — e.g. `1,234` |
| `date`, `datetime` | Uses Tableau's `formattedValue` — respects workbook locale |
| `string`, `boolean` | Uses Tableau's `formattedValue` as-is |
| null / empty / `%null%` | Displays `—` |

---

## Architecture

```
init()
  └── tableau.extensions.initializeAsync()
  └── ws = worksheetContent.worksheet
  └── load()
  └── SummaryDataChanged → debouncedLoad (150ms)
  └── ParameterChanged → debouncedLoad (150ms)   ← reorders on param edit

load()
  ├── getParametersAsync() → read "Columns" param value
  ├── getSummaryDataAsync({ ignoreSelection: true }) → rawCols + rows
  ├── applyParamOrder(rawCols, paramValue) → ordered cols
  ├── build colIdxMap[] (ordered col index → rawCols index)
  ├── collect uniqueVals[] per column (for filter dropdowns)
  ├── build <thead> row 1 (column names)
  ├── build <thead> row 2 (filter buttons)
  └── build <tbody> rows

applyParamOrder(rawCols, paramValue)
  ├── split paramValue by ","
  ├── norm() each entry and each rawCol.fieldName
  └── match + reorder, append unmatched at end

applyFilters()
  └── iterate all <tbody> <tr> elements
  └── for each active filter: check td.textContent against selected Set
  └── toggle .hidden-row class
```

---

## Console Logs (F12)

| Log | Meaning |
|---|---|
| `[RTL Table] Columns param raw value: ...` | Full string read from parameter |
| `[RTL Table] Columns param order: [...]` | Parsed array of column names from parameter |
| `[RTL Table] Final col order: [...]` | Resolved column order after matching against rawCols |
| `[RTL Table] No match for param entry: X` | A name in the parameter didn't match any rawCol — check spelling |
| `[RTL Table] No parameter named "Columns" found` | Parameter missing — table falls back to alphabetical order |

---

## Known Issues / Fixed

| Issue | Cause | Fix |
|---|---|---|
| Column order didn't match marks card | `getVisualSpecificationAsync` returns empty detail list on Tableau Cloud | Switched to Columns parameter approach (v4) |
| Parameter value empty on Tableau Cloud | `currentValue.value` was null on Cloud | Try `value ?? formattedValue ?? nativeValue`, fallback to first allowableValues list entry (v4) |
| Filters were single-select dropdowns | Used `<select>` element | Replaced with floating checkbox panel (v3) |
| Columns in alphabetical order (Tableau internal) | `getSummaryDataAsync` always returns alphabetical | Columns parameter drives order (v4) |

---

## Production Checklist
1. Push `table_rtl.html` and `tableau.extensions.js` to GitHub repo
2. Update `<url>` in `table_rtl.trex` to your GitHub Pages URL
3. Whitelist URL in Tableau Cloud → Settings → Extensions
4. Load `table_rtl.trex` in workbook
5. Drag all desired fields to **Detail** on the Marks card
6. Create a `Columns` String parameter (List type) with one entry — comma-separated ordered field names
7. Confirm version footer shows **v4**
8. Open F12 console — verify `Final col order` matches expected sequence
9. Test filter dropdowns — multi-select, search, clear
10. Verify RTL layout and Hebrew font render correctly

---

## Version History

| Version | Status | Notes |
|---|---|---|
| v1 | Superseded | Initial build. Reads Detail marks card order via `getVisualSpecificationAsync`. Single-select `<select>` filter per column. |
| v2 | Superseded | Attempted fix for column order: more aggressive `normField()` matching, added console logging. `getVisualSpecificationAsync` confirmed to return `Array(0)` on Tableau Cloud — spec approach abandoned. |
| v3 | Superseded | Filter upgraded to multi-select checkbox dropdown panel with search box, החל/הכל buttons, active state indicator. Column order still alphabetical (no param yet). |
| v4 | ✅ Current | Column order driven by `Columns` String parameter (comma-separated list). `norm()` strips aggregation wrappers on both sides for robust matching. Parameter listener added — table reorders live on param change. Cloud fix: tries all `currentValue` fields + allowable values fallback. |
