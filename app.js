tableau.extensions.initializeAsync().then(function () {
    // גישה ישירה לגיליון שבו הויזואליזציה נמצאת
    const worksheet = tableau.extensions.worksheetContent.worksheet;

    // שליפת הנתונים מה-Marks Card
    worksheet.getSummaryDataAsync().then(function (dataTable) {
        const data = dataTable.data.map(row => ({
            // ודא שהסדר של השדות ב-Tableau תואם לאינדקסים (0, 1, 2)
            date: row[0].value,
            country: row[1].value,
            sales: row[2].value
        }));

        buildChart(data);
    });
});

function buildChart(data) {
    // מנקה את הצ'ארט הקודם לפני ציור חדש (חשוב לריענון נתונים)
    d3.select("#chart").selectAll("*").remove();

    const margin = {top: 20, right: 30, bottom: 30, left: 40};
    const width = 900 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // ... שאר קוד ה-D3 שלך מצוין ...
    const countries = Array.from(new Set(data.map(d => d.country)));
    const dates = Array.from(new Set(data.map(d => d.date)));

    const grouped = d3.rollup(
        data,
        v => d3.sum(v, d => d.sales),
        d => d.date,
        d => d.country
    );

    const formatted = dates.map(date => {
        const obj = {date};
        countries.forEach(c => {
            obj[c] = grouped.get(date)?.get(c) || 0;
        });
        return obj;
    });

    const stack = d3.stack().keys(countries).offset(d3.stackOffsetWiggle);
    const series = stack(formatted);

    const x = d3.scalePoint().domain(dates).range([0, width]);
    const y = d3.scaleLinear()
        .domain([
            d3.min(series, layer => d3.min(layer, d => d[0])),
            d3.max(series, layer => d3.max(layer, d => d[1]))
        ])
        .range([height, 0]);

    const color = d3.scaleOrdinal().domain(countries).range(d3.schemeTableau10);
    const area = d3.area()
        .x(d => x(d.data.date))
        .y0(d => y(d[0]))
        .y1(d => y(d[1]))
        .curve(d3.curveBasis);

    svg.selectAll("path")
        .data(series)
        .enter()
        .append("path")
        .attr("d", area)
        .attr("fill", d => color(d.key))
        .attr("opacity", 0.9);
}