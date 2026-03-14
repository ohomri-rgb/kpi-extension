// ============================================================
//  Streamgraph Viz Extension  |  v2.1.0
// ============================================================

const VERSION = "v2.1.0";

// ── Config state ────────────────────────────────────────────
let cfg = {
    dateField:    null,   // column name chosen by user
    measureField: null,
    groupByField: null,
};

let worksheetRef = null;

// ── Bootstrap ────────────────────────────────────────────────
tableau.extensions.initializeAsync().then(() => {
    worksheetRef = tableau.extensions.worksheetContent.worksheet;

    injectStyles();
    buildConfigPanel();
    buildChartContainer();

    // First: get data, populate dropdowns, THEN render once config is set
    worksheetRef.getSummaryDataAsync().then(dt => {
        prefillConfig(dt);   // sets cfg fields + populates <select> options
        renderWithData(dt);  // render immediately using the same data fetch
    });

    worksheetRef.addEventListener(tableau.TableauEventType.FilterChanged, render);
});

// ── Auto-detect sensible defaults ────────────────────────────
function prefillConfig(dataTable) {
    const names = dataTable.columns.map(c => c.fieldName);

    const pick = (hints) => {
        for (const h of hints) {
            const found = names.find(n => n.toLowerCase().includes(h));
            if (found) return found;
        }
        return names[0] || null;
    };

    if (!cfg.dateField)    cfg.dateField    = pick(['date','month','year','time','period']);
    if (!cfg.measureField) cfg.measureField = pick(['sales','profit','revenue','sum','value','amount','measure']);
    if (!cfg.groupByField) cfg.groupByField = pick(['country','state','region','category','segment','group','name']);

    // Populate dropdowns
    names.forEach(name => {
        ['date-select','measure-select','groupby-select'].forEach(id => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            document.getElementById(id).appendChild(opt);
        });
    });

    document.getElementById('date-select').value    = cfg.dateField    || '';
    document.getElementById('measure-select').value = cfg.measureField || '';
    document.getElementById('groupby-select').value = cfg.groupByField || '';
}

// ── Main render (fetches fresh data then delegates) ──────────
function render() {
    if (!worksheetRef) return;
    worksheetRef.getSummaryDataAsync().then(dt => renderWithData(dt));
}

// ── Core render with a dataTable already in hand ─────────────
function renderWithData(dataTable) {
    const columns = dataTable.columns;
    if (!columns || columns.length === 0) return;

    // Build fieldName → index map (exact match)
    const nameToIdx = {};
    columns.forEach((col, i) => { nameToIdx[col.fieldName] = i; });

    // Resolve column indices — prefer user cfg, then fuzzy guess, then 0
    const dateCol  = resolveCol(nameToIdx, cfg.dateField,    ['date','month','year','time','period'],       0);
    const valCol   = resolveCol(nameToIdx, cfg.measureField, ['sales','profit','revenue','sum','value'],    Math.min(2, columns.length - 1));
    const groupCol = resolveCol(nameToIdx, cfg.groupByField, ['country','state','region','category','segment','group'], Math.min(1, columns.length - 1));

    console.log(`[Streamgraph] cols → date:${dateCol}(${columns[dateCol]?.fieldName}) | val:${valCol}(${columns[valCol]?.fieldName}) | group:${groupCol}(${columns[groupCol]?.fieldName})`);

    const raw = [];
    dataTable.data.forEach((row, ri) => {
        try {
            const dateCell  = row[dateCol];
            const groupCell = row[groupCol];
            const valCell   = row[valCol];

            if (!dateCell || !groupCell || !valCell) return;  // skip incomplete rows

            const dateStr = dateCell.value;
            const grpStr  = groupCell.formattedValue || groupCell.value || 'Other';
            const numVal  = parseFloat(valCell.nativeValue);

            const dateObj = new Date(dateStr);
            if (isNaN(dateObj.getTime())) return;  // skip bad dates

            raw.push({
                date:  dateObj,
                key:   String(grpStr),
                value: isNaN(numVal) ? 0 : numVal,
            });
        } catch(e) {
            console.warn(`[Streamgraph] skipping row ${ri}:`, e.message);
        }
    });

    raw.sort((a, b) => a.date - b.date);
    if (raw.length > 0) buildStreamgraph(raw);
    else console.warn('[Streamgraph] no valid rows after parsing');
}

// Resolve a column index: exact cfg match → fuzzy guess → fallback
function resolveCol(nameToIdx, cfgField, hints, fallback) {
    // 1. Exact match from cfg
    if (cfgField && nameToIdx[cfgField] !== undefined) return nameToIdx[cfgField];
    // 2. Fuzzy match from hints
    for (const h of hints) {
        const key = Object.keys(nameToIdx).find(k => k.toLowerCase().includes(h));
        if (key !== undefined) return nameToIdx[key];
    }
    // 3. Numeric fallback
    return fallback;
}

// ── D3 Streamgraph ───────────────────────────────────────────
function buildStreamgraph(data) {
    d3.select("#chart").selectAll("*").remove();

    const margin = { top: 30, right: 30, bottom: 50, left: 40 };
    const W = window.innerWidth  - margin.left - margin.right;
    const H = window.innerHeight - margin.top  - margin.bottom - 64; // leave room for config bar

    const svg = d3.select("#chart").append("svg")
        .attr("width",  W + margin.left + margin.right)
        .attr("height", H + margin.top  + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // ── All distinct keys & dates ─────────────────────────────
    const keys  = Array.from(new Set(data.map(d => d.key)));
    const times = Array.from(new Set(data.map(d => d.date.getTime()))).sort();
    const dates = times.map(t => new Date(t));

    // ── Build a COMPLETE grid (fill missing combos with 0) ───
    const stackedData = dates.map(d => {
        const obj = { date: d };
        keys.forEach(k => {
            const match = data.find(i =>
                i.date.getTime() === d.getTime() && i.key === k
            );
            // If a country has no data for this date → 0
            obj[k] = match ? match.value : 0;
        });
        return obj;
    });

    const stack = d3.stack()
        .keys(keys)
        .offset(d3.stackOffsetWiggle)
        .order(d3.stackOrderInsideOut);

    const layers = stack(stackedData);

    const x = d3.scaleTime()
        .domain(d3.extent(dates))
        .range([0, W]);

    const y = d3.scaleLinear()
        .domain([
            d3.min(layers, l => d3.min(l, d => d[0])),
            d3.max(layers, l => d3.max(l, d => d[1]))
        ])
        .range([H, 0]);

    // Use a large categorical palette that covers many countries
    const palette = [
        ...d3.schemeTableau10,
        ...d3.schemePaired,
        ...d3.schemeSet3,
        '#e63946','#457b9d','#2a9d8f','#e9c46a','#f4a261',
        '#264653','#6a4c93','#1982c4','#8ac926','#ff595e',
    ];
    const color = d3.scaleOrdinal().domain(keys).range(palette);

    const area = d3.area()
        .x(d => x(d.data.date))
        .y0(d => y(d[0]))
        .y1(d => y(d[1]))
        .curve(d3.curveBasis);

    // ── Tooltip ───────────────────────────────────────────────
    const tooltip = d3.select("body").select("#sg-tooltip").node()
        ? d3.select("#sg-tooltip")
        : d3.select("body").append("div").attr("id","sg-tooltip");

    // ── Paths ─────────────────────────────────────────────────
    svg.selectAll("path.layer")
        .data(layers)
        .join("path")
        .attr("class","layer")
        .attr("d", area)
        .attr("fill", d => color(d.key))
        .attr("opacity", 0.85)
        .on("mousemove", function(event, d) {
            d3.selectAll("path.layer").attr("opacity", 0.3);
            d3.select(this).attr("opacity", 1);
            tooltip
                .style("display","block")
                .style("left", (event.pageX + 12) + "px")
                .style("top",  (event.pageY - 28) + "px")
                .html(`<strong>${d.key}</strong>`);
        })
        .on("mouseleave", function() {
            d3.selectAll("path.layer").attr("opacity", 0.85);
            tooltip.style("display","none");
        });

    // ── X axis ────────────────────────────────────────────────
    svg.append("g")
        .attr("transform", `translate(0,${H})`)
        .call(d3.axisBottom(x).ticks(6).tickFormat(d3.timeFormat("%b %Y")))
        .selectAll("text")
        .style("fill","#888")
        .style("font-size","10px");

    // ── Legend ────────────────────────────────────────────────
    const legendCols = Math.ceil(keys.length / 4);
    const leg = svg.append("g")
        .attr("transform", `translate(${W - legendCols * 130}, ${-20})`);

    keys.forEach((k, i) => {
        const col = Math.floor(i / 4);
        const row = i % 4;
        const g = leg.append("g")
            .attr("transform", `translate(${col * 130}, ${row * 16})`);
        g.append("rect")
            .attr("width", 10).attr("height", 10)
            .attr("rx", 2)
            .attr("fill", color(k));
        g.append("text")
            .attr("x", 14).attr("y", 9)
            .style("font-size","9px")
            .style("fill","#555")
            .text(k.length > 14 ? k.slice(0,13)+'…' : k);
    });

    // ── Version watermark ─────────────────────────────────────
    svg.append("text")
        .attr("x", W)
        .attr("y", H + 44)
        .attr("text-anchor","end")
        .style("font-size","9px")
        .style("fill","#bbb")
        .style("font-family","monospace")
        .text(`Streamgraph Viz ${VERSION}`);
}

// ── Config panel UI ──────────────────────────────────────────
function buildConfigPanel() {
    const bar = document.createElement('div');
    bar.id = 'config-bar';
    bar.innerHTML = `
        <div class="cfg-box">
            <span class="cfg-label">① Date</span>
            <select id="date-select" class="cfg-select"></select>
        </div>
        <div class="cfg-box">
            <span class="cfg-label">② Measure</span>
            <select id="measure-select" class="cfg-select"></select>
        </div>
        <div class="cfg-box">
            <span class="cfg-label">③ Group By</span>
            <select id="groupby-select" class="cfg-select"></select>
        </div>
        <button id="apply-btn">Apply</button>
    `;
    document.body.prepend(bar);

    document.getElementById('apply-btn').addEventListener('click', () => {
        cfg.dateField    = document.getElementById('date-select').value    || null;
        cfg.measureField = document.getElementById('measure-select').value || null;
        cfg.groupByField = document.getElementById('groupby-select').value || null;
        render();
    });
}

function buildChartContainer() {
    const div = document.createElement('div');
    div.id = 'chart';
    document.body.appendChild(div);
}

// ── Styles ───────────────────────────────────────────────────
function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            background: #f7f8fa;
            overflow-x: hidden;
        }

        /* ── Config bar ── */
        #config-bar {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 14px;
            background: #ffffff;
            border-bottom: 1px solid #e0e3ea;
            box-shadow: 0 1px 4px rgba(0,0,0,0.06);
            flex-wrap: wrap;
            position: sticky;
            top: 0;
            z-index: 100;
        }

        .cfg-box {
            display: flex;
            flex-direction: column;
            gap: 2px;
            background: #f0f2f7;
            border: 1px solid #d5d9e5;
            border-radius: 8px;
            padding: 5px 10px;
            min-width: 150px;
        }

        .cfg-label {
            font-size: 10px;
            font-weight: 700;
            color: #6b7894;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .cfg-select {
            border: none;
            background: transparent;
            font-size: 12px;
            color: #1a2340;
            cursor: pointer;
            outline: none;
            padding: 0;
            font-weight: 600;
        }

        #apply-btn {
            padding: 7px 18px;
            background: #4a6cf7;
            color: #fff;
            border: none;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
            letter-spacing: 0.3px;
            transition: background 0.15s;
        }
        #apply-btn:hover { background: #3352d0; }

        /* ── Chart ── */
        #chart {
            width: 100%;
            padding: 0;
            background: #f7f8fa;
        }

        /* ── Tooltip ── */
        #sg-tooltip {
            display: none;
            position: fixed;
            background: rgba(26,35,64,0.92);
            color: #fff;
            padding: 5px 10px;
            border-radius: 6px;
            font-size: 12px;
            pointer-events: none;
            z-index: 999;
        }
    `;
    document.head.appendChild(style);

    // Tooltip element
    const tt = document.createElement('div');
    tt.id = 'sg-tooltip';
    document.body.appendChild(tt);
}
