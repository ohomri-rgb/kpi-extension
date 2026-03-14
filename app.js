tableau.extensions.initializeAsync().then(() => {
    const worksheet = tableau.extensions.worksheetContent.worksheet;

    const redraw = () => {
        worksheet.getSummaryDataAsync().then(dataTable => {
            // חילוץ נתונים (עמודה 0 תאריך, עמודה 1 קטגוריה, עמודה 2 ערך)
            const rawData = dataTable.data.map(row => ({
                date: new Date(row[0].value),
                key: row[1].value,
                value: parseFloat(row[2].nativeValue || row[2].value) || 0
            }));

            // מיון התאריכים - קריטי למראה ה-Streamgraph
            rawData.sort((a, b) => a.date - b.date);

            // בניית רשימת מפתחות (מדינות) ותאריכים ייחודיים
            const keys = Array.from(new Set(rawData.map(d => d.key)));
            const dates = Array.from(new Set(rawData.map(d => d.date.getTime()))).sort().map(t => new Date(t));

            // הכנת הנתונים למבנה Stack (ערימה)
            const stackedData = dates.map(d => {
                const obj = { date: d };
                keys.forEach(k => {
                    const found = rawData.find(item => item.date.getTime() === d.getTime() && item.key === k);
                    obj[k] = found ? found.value : 0;
                });
                return obj;
            });

            drawChart(stackedData, keys, dates);
        });
    };

    redraw();
    worksheet.addEventListener(tableau.TableauEventType.FilterChanged, redraw);
});

function drawChart(data, keys, dates) {
    const container = d3.select("#chart");
    container.selectAll("*").remove();

    const margin = {top: 20, right: 20, bottom: 40, left: 20};
    const width = window.innerWidth - margin.left - margin.right;
    const height = window.innerHeight - margin.top - margin.bottom;

    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // הגדרת ה-Stack
    const stack = d3.stack().keys(keys).offset(d3.stackOffsetWiggle).order(d3.stackOrderInsideOut);
    const layers = stack(data);

    const x = d3.scaleTime().domain(d3.extent(dates)).range([0, width]);
    const y = d3.scaleLinear()
        .domain([d3.min(layers, l => d3.min(l, d => d[0])), d3.max(layers, l => d3.max(l, d => d[1]))])
        .range([height, 0]);

    const color = d3.scaleOrdinal().domain(keys).range(d3.schemeTableau10);

    const area = d3.area()
        .x(d => x(d.data.date))
        .y0(d => y(d[0]))
        .y1(d => y(d[1]))
        .curve(d3.curveBasis); // נותן את המראה הגלי

    svg.selectAll("path")
        .data(layers)
        .join("path")
        .attr("d", area)
        .attr("fill", d => color(d.key))
        .attr("opacity", 0.8);

    // הוספת ציר זמן למטה
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(5));
}
