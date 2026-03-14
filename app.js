tableau.extensions.initializeAsync().then(() => {
    const worksheet = tableau.extensions.worksheetContent.worksheet;

    const render = () => {
        worksheet.getSummaryDataAsync().then(dataTable => {
            // זיהוי עמודות לפי שם (גמיש יותר מאינדקסים)
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
                    value: isNaN(v) ? 0 : v // הגנה מפני NaN
                };
            }).filter(d => !isNaN(d.date.getTime())); // הסרת תאריכים לא תקינים

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

    const keys = Array.from(new Set(data.map(d => d.key)));
    const dates = Array.from(new Set(data.map(d => d.date.getTime()))).sort().map(t => new Date(t));

    const stackedData = dates.map(d => {
        const obj = { date: d };
        keys.forEach(k => {
            const match = data.find(i => i.date.getTime() === d.getTime() && i.key === k);
            obj[k] = match ? match.value : 0;
        });
        return obj;
    });

    const stack = d3.stack().keys(keys).offset(d3.stackOffsetWiggle).order(d3.stackOrderInsideOut);
    const layers = stack(stackedData);

    const x = d3.scaleTime().domain(d3.extent(dates)).range([0, width]);
    const y = d3.scaleLinear()
        .domain([d3.min(layers, l => d3.min(l, d => d[0])), d3.max(layers, l => d3.max(l, d => d[1]))])
        .range([height, 0]);

    const color = d3.scaleOrdinal().domain(keys).range(d3.schemeTableau10);

    const area = d3.area()
        .x(d => x(d.data.date))
        .y0(d => y(d[0]))
        .y1(d => y(d[1]))
        .curve(d3.curveBasis);

    svg.selectAll("path")
        .data(layers)
        .join("path")
        .attr("d", area)
        .attr("fill", d => color(d.key))
        .attr("opacity", 0.85);

    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(6).tickFormat(d3.timeFormat("%b %Y")))
        .selectAll("text").style("fill", "#666").style("font-size", "10px");
}
