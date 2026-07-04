document.addEventListener("DOMContentLoaded", () => {
    // אובייקט מרכזי שיאגור את המידע על השימוש בסשן הנוכחי
    const usageLog = {
        sessionStart: new Date().toISOString(),
        dashboardName: "",
        usedFilters: {},
        usedParameters: {}
    };

    // אתחול ה-Extension API של טאבלו
    tableau.extensions.initializeAsync().then(() => {
        const dashboard = tableau.extensions.dashboardContent.dashboard;
        usageLog.dashboardName = dashboard.name;

        // 1. האזנה לשינויים בפרמטרים (Parameters הם גלובליים לדשבורד)
        dashboard.getParametersAsync().then(parameters => {
            parameters.forEach(param => {
                param.addEventListener(tableau.TableauEventType.ParameterChanged, (event) => {
                    event.getParameterAsync().then(updatedParam => {
                        logParameterChange(updatedParam);
                    });
                });
            });
        });

        // 2. האזנה לשינויים בפילטרים (Filters משויכים ל-Worksheets ספציפיים)
        dashboard.worksheets.forEach(worksheet => {
            worksheet.addEventListener(tableau.TableauEventType.FilterChanged, (event) => {
                event.getFilterAsync().then(updatedFilter => {
                    logFilterChange(updatedFilter, worksheet.name);
                });
            });
        });

        console.log("Tracking initialized successfully.");
    }).catch(error => {
        console.error("Error initializing Tableau Extension:", error);
    });

    // פונקציה לתיעוד שינוי בפילטר
    function logFilterChange(filter, worksheetName) {
        const filterName = filter.fieldName;
        
        // במידה והפילטר הוא מסוג All/נקו פילטר, הערכים יכולים להיות ריקים
        let selectedValues = [];
        if (filter.appliedValues) {
            selectedValues = filter.appliedValues.map(val => val.formattedValue);
        }

        // אם הפילטר עדיין לא תועד, ניצור לו רשומה
        if (!usageLog.usedFilters[filterName]) {
            usageLog.usedFilters[filterName] = {
                firstUsed: new Date().toISOString(),
                worksheets: new Set(),
                history: []
            };
        }

        usageLog.usedFilters[filterName].worksheets.add(worksheetName);
        usageLog.usedFilters[filterName].history.push({
            timestamp: new Date().toISOString(),
            values: selectedValues
        });

        console.log(`Filter changed: ${filterName}`, selectedValues);
    }

    // פונקציה לתיעוד שינוי בפרמטר
    function logParameterChange(parameter) {
        const paramName = parameter.name;
        const currentValue = parameter.currentValue.formattedValue;

        if (!usageLog.usedParameters[paramName]) {
            usageLog.usedParameters[paramName] = {
                firstUsed: new Date().toISOString(),
                history: []
            };
        }

        usageLog.usedParameters[paramName].history.push({
            timestamp: new Date().toISOString(),
            value: currentValue
        });

        console.log(`Parameter changed: ${paramName}`, currentValue);
    }

    // כפתור זמני לצפייה והורדה של ה-JSON ב-POC
    document.getElementById("downloadJsonBtn").addEventListener("click", () => {
        // המרת ה-Sets למערכים רגילים לצורך ה-JSON
        const outputLog = { ...usageLog };
        for (let filter in outputLog.usedFilters) {
            outputLog.usedFilters[filter].worksheets = Array.from(outputLog.usedFilters[filter].worksheets);
        }

        // יצירת קובץ להורדה בדפדפן
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(outputLog, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `dashboard_usage_${Date.now()}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    });
});