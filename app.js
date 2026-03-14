tableau.extensions.initializeAsync().then(() => {
    const worksheet = tableau.extensions.worksheetContent.worksheet;

    // פונקציית ציור מחדש
    const render = () => {
        worksheet.getSummaryDataAsync().then(dataTable => {
            const fieldMap = {};
            dataTable.columns.forEach((col, i) => fieldMap[col.fieldName] = i);

            // עיבוד נתונים דינמי
            const rawData = dataTable.data.map(row => ({
                date: new Date(row[0].value), // תאריך
                key: row[1].value,           // קטגוריה (למשל Country)
                value: parseFloat(row[2].value) || 0 // ערך מספרי
            }));

            // מיון חובה לציר זמן תקין
            rawData.sort((a, b) => a.date - b.date);
            buildStreamgraph(rawData);
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

    // יצירת מבנה הנתונים ל-D3 Stack
    const stackedData = dates.map(d => {
        const obj = { date: d };
        keys.forEach(k => {
            const found = data.find(item => item.date.getTime() === d.getTime() && item.key === k);
            obj[k] = found ? found.value : 0;
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
        .attr("opacity", 0.8)
        .append("title").text(d => d.key);

    // הוספת ציר זמן בסיסי
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(5))
        .attr("class", "axis-text");
}
