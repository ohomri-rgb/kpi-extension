# Tableau ECharts Extension — Architectural Analysis & Development Strategy

## 1. The Tableau Extensions API — How It Actually Works

### 1.1 Extension Types: Dashboard vs Worksheet (Viz)

Your extension uses **worksheet-extension** (viz extension), not a dashboard extension. This is a critical distinction:

| Aspect | Dashboard Extension | Worksheet (Viz) Extension |
|---|---|---|
| Manifest tag | `<dashboard-extension>` | `<worksheet-extension>` |
| Entry point | `tableau.extensions.dashboardContent` | `tableau.extensions.worksheetContent` |
| Scope | Can access ALL worksheets in the dashboard | Can ONLY access its own worksheet |
| Placement | Dragged onto dashboard as an object | Replaces the marks in a worksheet |
| Settings access | `tableau.extensions.settings` (shared across extension) | Same — but scoped to this extension instance |
| Configure callback | Via `initializeAsync({configure})` | Same |
| Multiple instances | One per dashboard object | One per worksheet using the extension |

**Your trex confirms this:** `<worksheet-extension id="com.echarts.extension">` — each worksheet that loads this extension gets its own isolated iframe, its own `settings` namespace, and its own `worksheetContent.worksheet` reference.

### 1.2 The Lifecycle — What Actually Happens on Load

```
Browser loads index.html in iframe
  ↓
DOMContentLoaded fires
  ↓
tableau.extensions.initializeAsync({ configure: fn })
  ↓  (Tableau injects the API, resolves the promise)
  ↓
worksheetContent.worksheet is now available
  ↓
loadSettings() — reads from tableau.extensions.settings (sync, already in memory)
  ↓
If settings exist:
  ├── renderMarksCard() — builds the UI
  └── applyChart() — fetches data via getSummaryDataAsync(), renders chart
If no settings:
  ├── loadFields() — fetches 1 row to discover column metadata  
  └── Shows onboarding screen
  ↓
Registers FilterChanged listener (debounced 300ms)
```

**Key insight:** `initializeAsync` is the gatekeeper. Nothing Tableau-related works before it resolves. The `configure` callback fires when the user right-clicks the extension zone and selects "Configure" — in your case, you use it to show the marks card.

### 1.3 Data Access — The Two APIs

Your extension uses `getSummaryDataAsync()`. Here's how both APIs differ:

**getSummaryDataAsync()** — "What's on the viz"
- Returns data at the **aggregation level defined by the marks card**
- Columns = whatever is on Detail, Rows, Columns, Color, etc.
- Rows = one per mark (after Tableau's aggregation)
- Respects Tableau filters (worksheet filters, context filters, action filters)
- `ignoreSelection: true` — critical, prevents data from changing when user clicks a mark
- `maxRows: 0` — means "all rows" (not zero rows)

**getUnderlyingTableDataAsync()** — "What's in the data source"
- Returns raw, unaggregated data from the underlying table
- Requires `<permission>full data</permission>` in the trex (you have this)
- Much larger result sets
- Does NOT respect aggregation — gives you every row

**Your approach is correct:** You use `getSummaryDataAsync` for rendering (gets exactly what Tableau has aggregated) and fall back to `getUnderlyingTableDataAsync` only when summary data fails (line 591-605 in loadFields).

### 1.4 The Column Object — What You're Actually Parsing

When you get data from `getSummaryDataAsync`, each column has:

```javascript
column._fieldName    // "SUM(Sales)" or "Category" — includes aggregation wrapper
column._dataType     // "float", "int", "string", "date", "date-time", "bool"
column._fieldId      // internal Tableau ID
column._index        // position in the columns array
```

**The underscore prefix** (`_fieldName`, `_dataType`) is intentional — these are "private" properties of the Tableau API objects. They work, but they're not officially documented as public API. The official way is `column.fieldName`, `column.dataType` — but in practice both work identically. Your code uses the underscore versions throughout.

### 1.5 FilterChanged — The Event Model

```javascript
ws.addEventListener(tableau.TableauEventType.FilterChanged, callback)
```

This fires when:
- User changes a worksheet filter (dropdown, slider, etc.)
- An action filter from another sheet changes
- A parameter-driven filter changes (if the calculated field changes)
- The extension's own configure dialog closes (Tableau sometimes fires it spuriously)

It does NOT fire when:
- The user selects/deselects marks (that's MarkSelectionChanged — you disabled it, correctly)
- The user resizes the worksheet
- Data source refreshes (that's a different event)

**Your debounce + suppress strategy is correct:**
- 300ms debounce: prevents cascade of rapid filter changes from triggering N renders
- Configure suppress (1s window): prevents the spurious fire after the configure dialog closes
- Render lock (`_applyChartRunning`): prevents concurrent renders from stepping on each other

### 1.6 Settings Persistence — saveAsync() Gotchas

```javascript
tableau.extensions.settings.set(key, stringValue)  // sync, in-memory
await tableau.extensions.settings.saveAsync()        // async, writes to workbook
```

**Critical behavior you've already discovered:**
- `saveAsync()` on Tableau Desktop marks the workbook dirty → can trigger iframe reload
- Calling it inside FilterChanged creates a reload loop (your v12 fix)
- Settings are stored as strings — you JSON.stringify/parse complex objects
- Settings persist in the .twbx file — shared across all users opening the workbook
- Each extension instance has its own settings namespace (isolated per worksheet)

**What you store:** chartId, assignments, customColors, banColors, borderRadius, bgColor, banFontSizes, kpiNames, mlColorMap, mlBgColorMap

### 1.7 Multiple Instances in One Dashboard

When the same extension appears in multiple worksheets on a dashboard:

- Each gets its own iframe (complete isolation)
- Each has its own `worksheetContent.worksheet` (pointing to its own sheet)
- Each has its own `settings` namespace
- FilterChanged on Sheet A does NOT fire in Sheet B's extension
- BUT: if Sheet A has an action filter that affects Sheet B's data, then Sheet B's FilterChanged WILL fire when the user interacts with Sheet A

This is your "filter sync" use case — it works automatically through Tableau's native filter propagation. Your extension doesn't need to do anything special; it just responds to FilterChanged.

---

## 2. Your Extension's Architecture — Deep Analysis

### 2.1 Data Flow (Current)

```
Tableau Worksheet
  ├── Detail shelf: dimensions + measures
  ├── Worksheet filters
  └── Action filters from other sheets
        ↓
getSummaryDataAsync({maxRows:0, ignoreSelection:true})
        ↓
parseDataTable(dt)
  ├── Maps columns → {fieldName, displayName, dataType}
  ├── Maps rows → {fieldName: normalizedValue, ...}
  └── Side-effect: updates state.worksheetFields (eliminates separate loadFields call)
        ↓
Routing by chart.id:
  ├── rtltable → renderTable() — reads raw dt directly
  ├── ban1/ban2 → renderBan() — pure HTML, no ECharts
  ├── bantable2 → renderBanTable2() — pure HTML grid
  ├── kpi_card → renderKpiCard() — Chart.js sparkline
  ├── multiline → renderMultiLine() — Chart.js multi-series
  └── everything else → ensureECharts() → renderECharts() — ECharts
```

### 2.2 What's Working Well

1. **Lazy loading** — ECharts (1.4MB) only loads when needed. BAN/KPI users pay zero cost.
2. **Single data fetch path** — `parseDataTable` syncs field metadata as a side effect, eliminating redundant API calls.
3. **Render guards** — debounce, suppression, and locking prevent race conditions.
4. **Settings isolation** — `saveAsync` only on user actions, never on filter-triggered re-renders.
5. **Role-based field assignment** — clean mapping from chart roles to Tableau fields.

### 2.3 Known Bugs & Structural Issues

| # | Issue | Root Cause | Impact | Fix Complexity |
|---|---|---|---|---|
| 1 | Lexicographic sort ("10" before "9") | `uniqSorted` uses string `.sort()` | Wrong axis order for numeric categories | Low — add numeric comparator |
| 2 | Bubble size not normalized | `Math.sqrt(d[2])*3` without `/maxVal` | Bubbles don't scale relative to each other | Low |
| 3 | Treemap ignores Parent role | `renderECharts` builds flat data, ignores `parentField` | No hierarchy in treemap | Medium — need tree-building logic |
| 4 | Waterfall negative baseline | `baseData` math breaks when cumulative < 0 | Bars drawn at wrong position | Medium |
| 5 | ThemeRiver with int months | `type:'time'` axis gets int (1-12) not dates | Axis renders incorrectly | Low — convert to date strings |
| 6 | Stacked Area null guard | No check if `groupField` is null before `.map()` | Crash | Low |
| 7 | `_fieldName` underscored props | Using private API properties | Could break in future API updates | Low — but risky |
| 8 | `findRow` cache not cleared | `_rowIndexCache` is module-level Map, never cleared | Stale lookups after data change | Low — clear at top of renderECharts |

### 2.4 Architectural Debt

1. **2,550-line single file** — HTML, CSS, and JS in one file makes iteration hard. Consider splitting into modules.
2. **No error boundaries** — a crash in one chart renderer can leave the UI in a broken state.
3. **No data validation layer** — raw Tableau data goes directly to chart renderers with minimal validation.
4. **No telemetry/diagnostics** — when something breaks, you need Chrome DevTools + screenshots.

---

## 3. ECharts ↔ Tableau Integration Patterns

### 3.1 How ECharts Expects Data vs How Tableau Provides It

**ECharts wants:**
- Category axis: `['Jan', 'Feb', 'Mar']`
- Series data: `[10, 20, 30]`
- Named data points: `[{name: 'A', value: 10}, ...]`
- Tree data: `{name: 'root', children: [{name: 'child', value: 5}]}`

**Tableau gives you:**
- Flat rows: `[{Category: 'Jan', Sales: 10}, {Category: 'Feb', Sales: 20}]`
- One row per mark (pre-aggregated by Tableau)
- Field metadata: names, types, aggregation wrappers

**The transformation layer** (your `renderECharts` function) bridges this gap. Each chart type has its own transformation logic:
- Line/Bar: extract unique X values, map Y values per group
- Pie/Donut: map dimension→name, measure→value
- Sankey: extract unique nodes from src+tgt columns, build links array
- Hierarchical (sunburst/tree): build parent→children tree from flat rows

### 3.2 Reliable Patterns for New Chart Types

When adding a new chart type, follow this template:

```javascript
case 'newchart': {
  // 1. Extract field references
  const field1 = a.role1?.fieldName;
  const field2 = a.role2?.fieldName;
  
  // 2. Extract and deduplicate categories  
  const categories = [...new Set(rows.map(r => r[field1]))];
  
  // 3. Handle grouping (if applicable)
  const groups = a.group ? [...new Set(rows.map(r => r[a.group.fieldName]))] : null;
  
  // 4. Build ECharts option
  option = {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: categories },
    yAxis: { type: 'value' },
    series: groups 
      ? groups.map((g, i) => ({
          name: String(g),
          type: 'bar',
          data: categories.map(c => {
            const r = findRow(rows, field1, c, a.group.fieldName, g);
            return r ? r[field2] : null;
          }),
          itemStyle: { color: COLORS[i % COLORS.length] }
        }))
      : [{ type: 'bar', data: categories.map(c => {
            const r = findRow(rows, field1, c);
            return r ? r[field2] : null;
          }),
          itemStyle: { color: COLORS[0] }
        }]
  };
  break;
}
```

### 3.3 Sort Fix Pattern (For All Category-Based Charts)

Replace `uniqSorted` with a smart sorter:

```javascript
function smartSort(arr) {
  const allNumeric = arr.every(v => !isNaN(parseFloat(v)));
  if (allNumeric) return [...new Set(arr)].sort((a, b) => parseFloat(a) - parseFloat(b));
  // Try date sort
  const allDates = arr.every(v => !isNaN(Date.parse(v)));
  if (allDates) return [...new Set(arr)].sort((a, b) => new Date(a) - new Date(b));
  return [...new Set(arr)].sort();
}
```

---

## 4. Development Strategy — What to Build Next

### 4.1 Priority 1: Diagnostic Extension (build this first)

A separate `.trex` extension that runs alongside your charts in the dashboard. It shows:
- All events firing in real-time (FilterChanged, ParameterChanged, etc.)
- Current worksheet fields with types and sample values
- Current settings stored in the workbook
- Data shape: row count, column count, sample rows
- Error log: any errors caught during rendering

This eliminates the Chrome DevTools screenshot cycle entirely.

### 4.2 Priority 2: Fix the Known Bugs

The 8 bugs listed above are all independently fixable. Do them in order of impact:
1. `_rowIndexCache` clearing (data corruption risk)
2. Sort fix (affects many chart types)
3. Null guards (crash prevention)
4. Waterfall baseline
5. Bubble normalization
6. Treemap hierarchy
7. ThemeRiver date handling
8. Underscore property migration

### 4.3 Priority 3: Modularization

Split the monolith into:
```
index.html          — shell + CSS + marks card + gallery
charts/line.js      — line/area/step renderers
charts/bar.js       — bar/stacked/waterfall renderers
charts/pie.js       — pie/donut/rose/nested renderers
charts/special.js   — radar/funnel/treemap/parallel
charts/map.js       — world/us/geo/lines maps
charts/ban.js       — BAN card + KPI table renderers
charts/table.js     — RTL table renderer
lib/data.js         — fetchData, parseDataTable, smartSort, findRow
lib/settings.js     — save/load/defaults
lib/diagnostics.js  — event logging, error capture
```

Each module exports a render function with the same signature: `(container, rows, assignments, colors) → void`

### 4.4 Priority 4: New Chart Types

With the above foundation, each new chart type is:
1. Add entry to `CHARTS` array with roles
2. Add preview function
3. Add case to `renderECharts` (or a new renderer file)
4. Test via the diagnostic extension

---

## 5. Filter Sync — How It Works Across Sheets

### 5.1 Automatic (No Code Needed)

If Sheet A has a filter action that targets Sheet B, and Sheet B has your extension:
- User clicks a mark on Sheet A
- Tableau applies the action filter to Sheet B
- Sheet B's FilterChanged fires
- Your extension's debounced handler calls applyChart()
- Chart re-renders with the filtered data

This is already working in your code. The key is that `getSummaryDataAsync` always returns the current filtered state.

### 5.2 Dashboard-Level Filters

Dashboard filters (the "apply to all worksheets" kind) also trigger FilterChanged. No extra code needed.

### 5.3 Parameter-Driven Filters

Parameters change → calculated fields update → if those fields are used as filters, FilterChanged fires. Your RTL Table already uses this pattern with the `Columns` parameter.

To listen for parameter changes directly (not just through filters):

```javascript
// Not available in worksheet extensions — only dashboard extensions
// This is a limitation of the viz extension API
```

**Workaround:** Use a calculated field driven by the parameter, place it on Detail, and watch for changes via FilterChanged or data changes.

---

## 6. Quick Reference: Tableau Extensions API Surface

### Events You Can Listen To

| Event | Fires When | Your Usage |
|---|---|---|
| `FilterChanged` | Any filter on this worksheet changes | ✅ Main re-render trigger |
| `MarkSelectionChanged` | User clicks marks | ❌ Disabled (causes flash) |
| `SummaryDataChanged` | Summary data changes for any reason | Not used |

### Methods You Use

| Method | Purpose | Notes |
|---|---|---|
| `initializeAsync({configure})` | Bootstrap | Must be first call |
| `getSummaryDataAsync(opts)` | Get aggregated data | Main data source |
| `getUnderlyingTableDataAsync(id, opts)` | Get raw data | Fallback only |
| `getUnderlyingTablesAsync()` | List tables | Used to find table ID |
| `settings.set(key, value)` | Store setting | Sync, in-memory |
| `settings.get(key)` | Read setting | Sync |
| `settings.saveAsync()` | Persist to workbook | Async, triggers dirty flag |
| `getParametersAsync()` | Read parameters | Used by RTL Table |

### Settings Size Limits

Each setting value is a string. Total settings per extension instance should stay under ~100KB. JSON.stringify of your state is well within this limit.
