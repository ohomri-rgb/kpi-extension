tableau.extensions.initializeAsync().then(() => {
    const worksheet = tableau.extensions.worksheetContent.worksheet;

    const render = () => {
        // Fetching with maxRows: 0 to ensure we get the full list of countries
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

            const dateIdx = findIdx(['date', 'year']);
            const catIdx = findIdx(['country', 'category', 'state']);
            const valIdx = findIdx(['sales', 'sum', 'value']);

            const dataMap = new Map();
            const keysSet = new Set();
            const datesSet = new Set();

            // 1. Parse and Map the data
            dataTable.data.forEach(row => {
                const rawDate = row[dateIdx].value;
                // Handle both full dates and Year-only strings from your image
                const dateParsed = isNaN(rawDate) ? new Date(rawDate) : new Date(rawDate, 0, 1);
                const key = row[catIdx].formattedValue || "Unknown";
                const val = parseFloat(row[valIdx].nativeValue) || 0;

                if (!isNaN(dateParsed.getTime())) {
                    const t = dateParsed.getTime();
                    datesSet.add(t);
                    keysSet.add(key);
                    dataMap.set(`${t}_${key}`, val);
                }
            });

            const keys = Array.from(keysSet).sort();
            const sortedDates = Array.from(datesSet).sort((a, b) => a - b).map(t => new Date(t));

            // 2. Build a complete grid (Crucial for Streamgraphs)
            const stackedData = sortedDates.map(d => {
                const obj = { date: d };
                keys.forEach(k => {
                    // If country k is missing for year d, default to 0
                    obj[k] = dataMap.get(`${d.getTime()}_${k}`) || 0;
                });
                return obj;
            });

            if (stackedData.length > 0) buildStreamgraph(stackedData, keys);
        });
    };

    render();
    worksheet.addEventListener(tableau.TableauEventType.FilterChanged, render);
});

function buildStreamgraph(data, keys) {
    d3.select("#chart").selectAll("*").remove();
    
    const margin = {top: 20, right: 30, bottom: 40, left: 30};
    const width = window.innerWidth - margin.left - margin.right;
    const height = window.innerHeight - margin.top - margin.bottom;

    const svg = d3.select("#chart").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Use Wiggle offset for the classic "Stream" look
    const stack = d3.stack()
        .keys(keys)
        .offset(d3.stackOffsetWiggle)
        .order(d3.stackOrderInsideOut);

    const layers = stack(data);

    const x = d3.scaleTime()
        .domain(d3.extent(data, d => d.date))
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([
            d3.min(layers, l => d3.min(l, d => d[0])), 
            d3.max(layers, l => d3.max(l, d => d[1]))
        ])
        .range([height, 0]);

    // High-resolution color scale for 50+ dimensions
    const color = d3.scaleSequential(d3.interpolateTurbo).domain([0, keys.length]);

    const area = d3.area()
        .x(d => x(d.data.date))
        .y0(d => y(d[0]))
        .y1(d => y(d[1]))
        .curve(d3.curveBasis); // Smooths out the year-to-year jumps

    svg.selectAll("path")
        .data(layers)
        .join("path")
        .attr("d", area)
        .attr("fill", (d, i) => color(i))
        .attr("opacity", 0.8)
        .append("title")
        .text(d => d.key); // Hover over a layer to see the Country name

    // Add X-Axis
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(sortedDates.length).tickFormat(d3.timeFormat("%Y")))
        .selectAll("text").style("fill", "#666");
}
