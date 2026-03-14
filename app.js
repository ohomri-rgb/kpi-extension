tableau.extensions.initializeAsync().then(() => {
    const worksheet = tableau.extensions.worksheetContent.worksheet;

    const render = () => {
        // משיכת כל השורות ללא הגבלה
        worksheet.getSummaryDataAsync({ ignoreSelection: true, maxRows: 0 }).then(dataTable => {
            
            // עיבוד בסיסי וניקוי שורות ריקות
            const rawData = dataTable.data.map(row => {
                const dateVal = row[0].value;
                const catVal = row[1].formattedValue || "Other";
                const numVal = row[2] ? parseFloat(row[2].nativeValue || row[2].value) : 0;

                return {
                    date: new Date(dateVal),
                    key: catVal,
                    value: isNaN(numVal) ? 0 : numVal
                };
            }).filter(d => !isNaN(d.date.getTime()));

            if (rawData.length === 0) return;

            // מיון וארגון מחדש של הנתונים כדי ש-D3 לא יקרוס
            const keys = Array.from(new Set(rawData.map(d => d.key)));
            const dates = Array.from(new Set(rawData.map(d => d.date.getTime()))).sort().map(t => new Date(t));

            // יצירת מטריצה מלאה (מילוי אפסים למדינות חסרות בתאריכים מסוימים)
            const dataMap = new Map();
            rawData.forEach(d => {
                const id = `${d.date.getTime()}-${d.key}`;
                dataMap.set(id, (dataMap.get(id) || 0) + d.value);
            });

            const stackedData = dates.map(d => {
                const obj = { date: d };
                keys.forEach(k => {
                    obj[k] = dataMap.get(`${d.getTime()}-${k}`) || 0;
                });
                return obj;
            });

            draw(stackedData, keys, dates);
        });
    };

    render();
    worksheet.addEventListener(tableau.TableauEventType.FilterChanged, render);
});

function draw(stackedData, keys, dates) {
    const container = d3.select("#chart");
    container.selectAll("*").remove();

    const margin = {top: 20, right: 30, bottom: 40, left: 30};
    const width = window.innerWidth - margin.left - margin.right;
    const height = window.innerHeight - margin.top - margin.bottom;

    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // הגדרת ה-Stack עם אופסט Wiggle למראה זורם
    const stack = d3.stack().keys(keys).offset(d3.stackOffsetWiggle).order(d3.stackOrderInsideOut);
    const layers = stack(stackedData);

    const x = d3.scaleTime().domain(d3.extent(dates)).range([0, width]);
    const y = d3.scaleLinear()
        .domain([
            d3.min(layers, l => d3.min(l, d => d[0])),
            d3.max(layers, l => d3.max(l, d => d[1]))
        ])
        .range([height, 0]);

    // פלטת צבעים גדולה (Turbo) שמתאימה ל-50+ מדינות
    const color = d3.scaleSequential(d3.interpolateTurbo).domain([0, keys.length]);

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
        .attr("stroke-width", 0.1) // קו דק מאוד בין המדינות להפרדה
        .append("title").text(d => d.key);

    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(8).tickFormat(d3.timeFormat("%b %y")))
        .attr("font-family", "sans-serif")
        .attr("font-size", "10px");
}
