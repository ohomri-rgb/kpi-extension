tableau.extensions.initializeAsync().then(() => {
    const worksheet = tableau.extensions.worksheetContent.worksheet;

    const render = () => {
        // שימוש ב-maxRows כדי להבטיח שכל 59 המדינות יכנסו
        worksheet.getSummaryDataAsync({ ignoreSelection: true, maxRows: 0 }).then(dataTable => {
            
            const rawData = dataTable.data.map(row => ({
                date: new Date(row[0].value),
                key: row[1].formattedValue || "Unknown",
                value: parseFloat(row[2].nativeValue) || 0
            })).filter(d => !isNaN(d.date.getTime()));

            rawData.sort((a, b) => a.date - b.date);
            
            if (rawData.length > 0) {
                draw(rawData);
            }
        });
    };

    render();
    worksheet.addEventListener(tableau.TableauEventType.FilterChanged, render);
});

function draw(data) {
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

    // שימוש ב-Wiggle למראה גלי
    const layers = d3.stack().keys(keys).offset(d3.stackOffsetWiggle).order(d3.stackOrderInsideOut)(stackedData);

    const x = d3.scaleTime().domain(d3.extent(dates)).range([0, width]);
    const y = d3.scaleLinear()
        .domain([d3.min(layers, l => d3.min(l, d => d[0])), d3.max(layers, l => d3.max(l, d => d[1]))])
        .range([height, 0]);

    // פלטת צבעים מורחבת (Rainbow) כדי להבדיל בין 59 מדינות
    const color = d3.scaleSequential(d3.interpolateRainbow).domain([0, keys.length]);

    const area = d3.area()
        .x(d => x(d.data.date))
        .y0(d => y(d[0]))
        .y1(d => y(d[1]))
        .curve(d3.curveBasis);

    svg.selectAll("path")
        .data(layers)
        .join("path")
        .attr("d", area)
        .attr("fill", (d, i) => color(i)) // צבע ייחודי לכל מדינה
        .attr("opacity", 0.8)
        .append("title").text(d => d.key); // Tooltip בסיסי בציפה
}
