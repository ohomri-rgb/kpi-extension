tableau.extensions.initializeAsync().then(() => {
    const worksheet = tableau.extensions.worksheetContent.worksheet;

    const render = () => {
        // Fetching with maxRows: 0 to ensure all 50+ dimensions are captured 
        worksheet.getSummaryDataAsync({ maxRows: 0 }).then(dataTable => {
            const fieldMap = {};
            dataTable.columns.forEach((col, i) => fieldMap[col.fieldName.toLowerCase()] = i);

            const findIdx = (names) => {
                for (let name of names) {
                    for (let key in fieldMap) {
                        if (key.includes(name)) return fieldMap[key];
                    }
                }
                return -1;
            };

            const dateIdx = findIdx(['date', 'month', 'year']);
            const catIdx = findIdx(['country', 'category', 'segment', 'region']);
            const valIdx = findIdx(['sales', 'profit', 'sum', 'value']);

            const data = dataTable.data.map(row => {
                const d = row[dateIdx >= 0 ? dateIdx : 0].value;
                const v = parseFloat(row[valIdx >= 0 ? valIdx : 2].nativeValue);
                
                return {
                    date: new Date(d),
                    key: row[catIdx >= 0 ? catIdx : 1].formattedValue || "Other",
                    value: isNaN(v) ? 0 : v
                };
            }).filter(d => !isNaN(d.date.getTime()));

            data.sort((a, b) => a.date - b.date);
            if (data.length > 0) buildStreamgraph(data);
        });
    };

    render();
    worksheet.addEventListener(tableau.TableauEventType.FilterChanged, render);
});

function buildStreamgraph(data) {
    d3.select("#chart").selectAll("*").remove();
    
    const margin = {top: 20, right: 30, bottom: 40, left: 30};
    const width = window.innerWidth - margin.left - margin.right;
    const height = window.innerHeight - margin.top - margin.bottom;

    const svg = d3.select("#chart").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // --- OPTIMIZED DATA TRANSFORMATION ---
    const keys = Array.from(new Set(data.map(d => d.key)));
    const dates = Array.from(new Set(data.map(d => d.date.getTime()))).sort().map(t => new Date(t));

    // Create a Map for O(1) lookup speed
    const dataMap = new Map();
    data.forEach(d => dataMap.set(`${d.date.getTime()}_${d.key}`, d.value));

    const stackedData = dates.map(d => {
        const time = d.getTime();
        const obj = { date: d };
        keys.forEach(k => {
            obj[k] = dataMap.get(`${time}_${k}`) || 0; // Fill missing gaps with 0
        });
        return obj;
    });

    const stack = d3.stack().keys(keys).offset(d3.stackOffsetWiggle).order(d3.stackOrderInsideOut);
    const layers = stack(stackedData);

    const x = d3.scaleTime().domain(d3.extent(dates)).range([0, width]);
    const y = d3.scaleLinear()
        .domain([d3.min(layers, l => d3.min(l, d => d[0])), d3.max(layers, l => d3.max(l, d => d[1]))])
        .range([height, 0]);

    // Use a Turbo scale for better visibility across 50+ items
    const color = d3.scaleSequential(d3.interpolateTurbo).domain([0, keys.length]);

    const area = d3.area()
        .x(d => x(d.data.date))
        .y0(d => y(d[0]))
        .y1(d => y(d[1]))
        .curve(d3.curveBasis);

    // --- DRAWING & INTERACTION ---
    const paths = svg.selectAll("path")
        .data(layers)
        .join("path")
        .attr("d", area)
        .attr("fill", (d, i) => color(i))
        .attr("opacity", 0.8)
        .on("mouseover", function(event, d) {
            d3.selectAll("path").style("opacity", 0.2);
            d3.select(this).style("opacity", 1);
        })
        .on("mouseleave", function() {
            d3.selectAll("path").style("opacity", 0.8);
        });

    // Simple Tooltip (Title tag)
    paths.append("title").text(d => d.key);

    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(6).tickFormat(d3.timeFormat("%b %Y")))
        .selectAll("text").style("fill", "#666").style("font-size", "10px");
}
