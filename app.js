tableau.extensions.initializeAsync().then(function () {
    const worksheet = tableau.extensions.worksheetContent.worksheet;

    // פונקציה לשליפת נתונים וציור מחדש
    const updateViz = () => {
        worksheet.getSummaryDataAsync().then(function (dataTable) {
            // מיפוי עמודות לפי שם השדה ב-Tableau
            const fieldMap = {};
            dataTable.columns.forEach((col, idx) => {
                fieldMap[col.fieldName] = idx;
            });

            // עיבוד נתונים
            const rawData = dataTable.data.map(row => ({
                date: new Date(row[0].value), // מניח שתאריך הוא העמודה הראשונה
                group: row[1] ? row[1].value : "All", // קטגוריה
                value: row[2] ? parseFloat(row[2].value) : 0 // ערך מספרי
            }));

            // מיון כרונולוגי - קריטי ל-D3 Streamgraph
            rawData.sort((a, b) => a.date - b.date);

            renderStreamgraph(rawData);
        });
    };

    // הרצה ראשונית
    updateViz();

    // האזנה לשינויים ב-Tableau (פילטרים/בחירה)
    worksheet.addEventListener(tableau.TableauEventType.FilterChanged, updateViz);
});

function renderStreamgraph(data) {
    d3.select("#chart").selectAll("*").remove();

    const margin = {top: 20, right: 30, bottom: 50, left: 30};
    const width = window.innerWidth - margin.left - margin.right;
    const height = window.innerHeight - margin.top - margin.bottom;

    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const keys = Array.from(new Set(data.map(d => d.group)));
    const dates = Array.from(new Set(data.map(d => d.date.getTime()))).map(t => new Date(t));

    // בניית מבנה נתונים עבור Stack
    const formattedData = dates.map(date => {
        const obj = { date };
        keys.forEach(key => {
            const entry = data.find(d => d.date.getTime() === date.getTime() && d.group === key);
            obj[key] = entry ? entry.value : 0;
        });
        return obj;
    });

    const stack = d3.stack().keys(keys).offset(d3.stackOffsetWiggle).order(d3.stackOrderNone);
    const series = stack(formattedData);

    const x = d3.scaleTime().domain(d3.extent(dates)).range([0, width]);
    const y = d3.scaleLinear()
        .domain([
            d3.min(series, layer => d3.min(layer, d => d[0])),
            d3.max(series, layer => d3.max(layer, d => d[1]))
        ])
        .range([height, 0]);

    const color = d3.scaleOrdinal().domain(keys).range(d3.schemeTableau10);

    const area = d3.area()
        .x(d => x(d.data.date))
        .y0(d => y(d[0]))
        .y1(d => y(d[1]))
        .curve(d3.curveBasis);

    svg.selectAll("path")
        .data(series)
        .join("path")
        .attr("d", area)
        .attr("fill", d => color(d.key))
        .append("title").text(d => d.key);

    // הוספת ציר זמן (X)
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(5));
}
