# RTL Table — Tableau Extension
### Full Project Documentation | v7

---

## Overview

A Tableau Viz Extension (worksheet extension) that renders a scrollable RTL data table inside a Tableau worksheet. Single HTML file, no backend, no setup UI.

- Supports 16+ columns of mixed data types (strings, numbers, dates)
- Column order and visibility controlled by a Tableau String parameter named `Columns`
- Each column has a multi-select filter dropdown in the header row
- Negative numbers render correctly in RTL layout (minus sign always on the left)
- Only fields listed in the `Columns` parameter are displayed — unlisted Detail fields are silently dropped

---

## File Structure

| File | Purpose |
|---|---|
| `table_rtl.html` | Main extension — all logic, 257 lines (v7) |
| `table_rtl.trex` | Tableau manifest — update URL before deploying |
| `tableau.extensions.js` | Tableau Extensions API (local copy) |

---

## Deployment

### Desktop (Development)
1. Run `python -m http.server 8765` from the extension folder
2. Update `table_rtl.trex` → `<url>` to `http://localhost:8765/table_rtl.html`
3. Load `table_rtl.trex` → Tableau Desktop → Add Extension → Access Local Viz Extensions

### Tableau Cloud (Production)
- Push files to GitHub repo
- Enable GitHub Pages on the repo
- Update `table_rtl.trex` → `<url>` to your GitHub Pages URL
- Whitelist in Tableau Cloud → Settings → Extensions → Add URL
- Load `table_rtl.trex`
- Live debug: open workbook in browser → F12 → Console

### Updating the Extension
- Edit `table_rtl.html`, bump version in footer (`v7`, `v8`, …) on every change
- Push to GitHub — no-cache meta headers ensure fresh load
- No need to update `.trex`

---

## Tableau Sheet Setup

### Marks Card

Drag all desired fields to the **Detail** shelf on the Marks card. The extension reads all fields placed on Detail — there are no named encoding slots.

| What to drag | Notes |
|---|---|
| Any dimension or measure | Strings, integers, floats, dates all supported |
| Up to 16+ fields | No hard limit — all become available for the `Columns` parameter |

### Columns Parameter

The `Columns` parameter is the **single source of truth** for what appears in the table and in what order.

| Parameter | Type | Purpose |
|---|---|---|
| `Columns` | String — List | Controls which columns are displayed and in what left-to-right order |

#### Setting up the Columns parameter

1. Create a String parameter named `Columns`
2. Set Allowable Values → **List**
3. Add one entry — the Value field contains the full comma-separated ordered string, e.g.:
   ```
   YEAR(Order Date), YEAR(Ship Date), CNT(Orders), SUM(Profit), SUM(Quantity), SUM(Sales), Category, Customer Name, Order ID
   ```
4. Field names must match what Tableau sends in `getSummaryDataAsync` — include aggregation wrappers (`SUM(`, `YEAR(`, `CNT(` etc.)
5. The extension normalises both sides before matching (strips wrappers, lowercases, removes spaces) so minor casing differences are tolerated

#### Column visibility rules

| Situation | Result |
|---|---|
| Field in `Columns` param, exists on Detail | Shown in the order listed ✅ |
| Field in `Columns` param, not on Detail | Skipped silently (logged in console as `No match`) |
| Field on Detail, not in `Columns` param | Dropped — never shown (logged as `Dropped`) |
| `Columns` param empty or missing | Falls back to alphabetical order of all Detail fields |

#### Why not drag-to-reorder or localStorage?
- `getVisualSpecificationAsync` returns an empty detail encoding list on Tableau Cloud — marks card order cannot be read via API
- `localStorage` doesn't persist across Tableau Cloud sessions or between users
- A workbook-embedded parameter is the only approach that is reliable, shared, and editable without touching code

---

## Column Order Resolution Logic

```
1. Read "Columns" parameter currentValue
   → split by comma, trim each entry
   → normalise: strip aggregation wrappers recursively, lowercase, remove spaces
   → match against rawCols by normalised fieldName
   → build ordered col list (unmatched param entries silently skipped)

2. Drop any rawCols not in the param (logged to console as "Dropped")

3. If param is empty or missing → fall back to alphabetical rawCols order
```

> **Note:** `getSummaryDataAsync` always returns columns in alphabetical order regardless of marks card arrangement. This is a Tableau Cloud API limitation — `getVisualSpecificationAsync` returns an empty detail encoding list on Cloud and cannot be used for ordering.

---

## Filter Dropdowns

Each column header has a **▼ הכל** button that opens a multi-select checkbox panel.

| Behaviour | Detail |
|---|---|
| Open | Click the column's filter button |
| Close | Click button again, click outside, or click החל |
| Search | Type in the search box to narrow the checkbox list |
| Select values | Check one or more values |
| Apply | Click **החל** — rows not matching are hidden |
| Clear | Click **הכל** — all rows shown for that column |
| Multi-column | Filters across columns combine with AND logic |
| Active indicator | Button turns purple and shows count (`3 נבחרו`) or single value name |
| Reset on reload | Filters reset whenever data refreshes (`SummaryDataChanged`) |

Filtering is client-side — it hides `<tr>` rows in the DOM, it does not re-query Tableau.

---

## Data Formatting

| Data type | Display format |
|---|---|
| `float`, `real`, `double`, `number` | `toLocaleString('en-US')` — e.g. `1,234.56`. Wrapped in LTR span so negatives render as `-1,234.56` not `1,234.56-` |
| `int`, `integer` | `toLocaleString('en-US')` — e.g. `1,234`. Also LTR-wrapped. |
| `date`, `datetime` | Uses Tableau's `formattedValue` — respects workbook locale |
| `string`, `boolean` | Uses Tableau's `formattedValue` as-is |
| null / empty / `%null%` | Displays `—` |

> **Negative number fix (v6):** numeric cells use `direction:ltr; unicode-bidi:embed` inside an inline `<span>` so the minus sign always renders on the left, while the `<td>` remains right-aligned for consistent column layout.

---

## Architecture

```
init()
  └── tableau.extensions.initializeAsync()
  └── ws = worksheetContent.worksheet
  └── load()
  └── SummaryDataChanged → debounced load (150ms)
  └── ParameterChanged   → debounced load (150ms)

load()
  ├── getParametersAsync() → read "Columns" param value
  ├── getSummaryDataAsync({ ignoreSelection: true }) → rawCols + rows
  ├── applyParamOrder(rawCols, paramValue) → ordered cols (drops unlisted)
  ├── build colIdxMap[] (ordered col index → rawCols index)
  ├── collect uniqueVals[] per column (for filter dropdowns)
  ├── build <thead> row 1 (column names)
  ├── build <thead> row 2 (filter buttons)
  └── build <tbody> rows via DocumentFragment

applyParamOrder(rawCols, paramValue)
  ├── split paramValue by ","
  ├── norm() each entry and each rawCol.fieldName
  ├── match + reorder, log unmatched param entries
  └── drop rawCols not covered by param (log dropped list)

applyFilters()
  └── iterate all <tbody> <tr> elements
  └── for each active filter: check td.textContent against selected Set
  └── toggle .hidden-row class
```

---

## Console Logs (F12)

| Log | Meaning |
|---|---|
| `[RTL Table] All params: [...]` | Full list of all parameters found on the sheet |
| `[RTL Table] Columns param raw value: ...` | Full string read from parameter |
| `[RTL Table] Columns param order: [...]` | Parsed array of column names from parameter |
| `[RTL Table] Final col order: [...]` | Resolved column order after matching against rawCols |
| `[RTL Table] No match for param entry: X` | A name in the parameter didn't match any rawCol — check spelling |
| `[RTL Table] Dropped (not in param): [...]` | rawCols that were available but excluded because not listed in param |
| `[RTL Table] No parameter named "Columns" found` | Parameter missing — table falls back to alphabetical order |

---

## Known Issues & Fix History

| Issue | Cause | Fixed in |
|---|---|---|
| Column order didn't match marks card | `getVisualSpecificationAsync` returns empty detail list on Tableau Cloud | v4 |
| Parameter value empty on Tableau Cloud | `currentValue.value` was null on Cloud | v4 |
| Filters were single-select dropdowns | Used `<select>` element | v3 |
| Columns in alphabetical order | `getSummaryDataAsync` always returns alphabetical | v4 |
| Unlisted Detail fields appearing in table | Unmatched rawCols were appended at end | v7 |
| Negative numbers rendering as `1,234-` instead of `-1,234` | RTL bidi reordering of weak minus character | v6 |
| Code bloat — 385 lines | Redundant loops, verbose helpers | v5 (refactor) |

---

## Production Checklist

1. Push `table_rtl.html` and `tableau.extensions.js` to GitHub repo
2. Update `<url>` in `table_rtl.trex` to your GitHub Pages URL
3. Whitelist URL in Tableau Cloud → Settings → Extensions
4. Load `table_rtl.trex` in workbook
5. Drag all desired fields to **Detail** on the Marks card
6. Create a `Columns` String parameter (List type) with one entry — comma-separated ordered field names
7. Confirm version footer shows **v7**
8. Open F12 console — verify `Final col order` matches expected sequence and no unexpected `Dropped` fields
9. Test filter dropdowns — multi-select, search, clear
10. Verify RTL layout and Hebrew font render correctly
11. Verify negative numbers show minus on the left (e.g. `-1,234.56` not `1,234.56-`)

---

## Version History

| Version | Status | Notes |
|---|---|---|
| v1 | Superseded | Initial build. Reads Detail marks card order via `getVisualSpecificationAsync`. Single-select `<select>` filter per column. |
| v2 | Superseded | Attempted fix for column order: more aggressive `normField()` matching, added console logging. `getVisualSpecificationAsync` confirmed to return `Array(0)` on Tableau Cloud — spec approach abandoned. |
| v3 | Superseded | Filter upgraded to multi-select checkbox dropdown panel with search box, החל/הכל buttons, active state indicator. Column order still alphabetical (no param yet). |
| v4 | Superseded | Column order driven by `Columns` String parameter. `norm()` strips aggregation wrappers on both sides. Parameter listener added. Cloud fix: tries all `currentValue` fields + allowable values fallback. |
| v5 | Superseded | Refactor: 385 → 257 lines (−33%). Merged CSS rules, regex type checks, `Object.fromEntries` normMap, delegated dropdown listeners, `DocumentFragment` for tbody. |
| v6 | Superseded | Negative number fix: numeric cells wrapped in `direction:ltr; unicode-bidi:embed` `<span>` so minus sign renders correctly in RTL layout. `<td>` stays right-aligned. |
| v7 | ✅ Current | Unlisted columns dropped: fields on Detail but not in `Columns` param are now silently excluded (logged as `Dropped`) instead of appended. `Columns` param is now the single source of truth for both order and visibility. |
