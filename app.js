tableau.extensions.initializeAsync().then(() => {
    const worksheet = tableau.extensions.worksheetContent.worksheet;

    const render = () => {
        // GET DATA OPTIONS: maxRows 0 pulls all data, ignoreSelection ensures viz doesn't break on click
        const options = { maxRows: 0, ignoreSelection: true };

        worksheet.getSummaryDataAsync(options).then(dataTable => {
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
            const catIdx = findIdx(['country', 'category', 'segment', 'region', 'state']);
            const valIdx = findIdx(['sales', 'profit', 'sum', 'value']);

            // Process data into a Map to handle missing dates for specific countries
            const dataMap = new Map();
            const keysSet = new Set();
            const datesSet = new Set();

            dataTable.data.forEach(row => {
                const rawDate = row[dateIdx >= 0 ? dateIdx : 0].value;
                const date = new Date(rawDate);
                if (isNaN(date.getTime())) return;

                const key = row[catIdx >= 0 ? catIdx : 1].formattedValue || "Unknown";
                const val = parseFloat(row[valIdx >= 0 ? valIdx : 2].nativeValue) || 0;

                const time = date.getTime();
                datesSet.add(time);
                keysSet.add(key);
                
                // Aggregating in JS in case Tableau sends multiple rows for one key/date
                const mapKey = `${time}_${key}`;
                dataMap.set(mapKey, (dataMap.get(mapKey) || 0) + val);
            });

            const keys = Array.from(keysSet);
            const sortedDates = Array.from(datesSet).sort().map(t => new Date(t));

            const stackedData = sortedDates.map(d => {
                const obj = { date: d };
                keys.forEach(k => {
                    obj[k] = dataMap.get(`${d.getTime()}_${k}`) || 0;
                });
                return obj;
            });

            if (stackedData.length > 0) buildStreamgraph(stackedData, keys);
        });
    };

    render();
    worksheet.addEventListener(tableau.TableauEventType.FilterChanged, render);
    worksheet.addEventListener(tableau.TableauEventType.SummaryDataChanged, render);
});

function buildStreamgraph(stackedData, keys) {
    d3.select("#chart").selectAll("*").remove();
    
    const margin = {top: 20, right: 30, bottom: 40, left: 30};
    const width = window.innerWidth - margin.left - margin.right;
    const height = window.innerHeight - margin.top - margin.bottom;

    const svg = d3.select("#chart").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const stack = d3.stack()
        .keys(keys)
        .offset(d3.stackOffsetWiggle)
        .order(d3.stackOrderInsideOut);

    const layers = stack(stackedData);

    const x = d3.scaleTime()
        .domain(d3.extent(stackedData, d => d.date))
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([
            d3.min(layers, l => d3.min(l, d => d[0])), 
            d3.max(layers, l => d3.max(l, d => d[1]))
        ])
        .range([height, 0]);

    // Use Rainbow or Turbo for 50+ unique colors
    const color = d3.scaleSequential(d3.interpolateTurbo)
        .domain([0, keys.length]);

    const area = d3.area()
        .x(d => x(d.data.date))
        .y0(d => y(d[0]))
        .y1(d => y(d[1]))
        .curve(d3.curveBasis);

    svg.selectAll("path")
        .data(layers)
        .join("path")
        .attr("d", area)
        .attr("fill", (d, i) => color(i))
        .attr("stroke", "#fff")
        .attr("stroke-width", 0.2)
        .append("title")
        .text(d => d.key);

    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(6).tickFormat(d3.timeFormat("%b %Y")));
}
