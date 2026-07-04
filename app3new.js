(function() {
    let currentUsername = "Unknown User";

    const checkTableauLoaded = setInterval(() => {
        if (typeof window.tableau !== 'undefined' && window.tableau.extensions) {
            clearInterval(checkTableauLoaded);
            initializeTracker();
        }
    }, 50);

    function initializeTracker() {
        window.tableau.extensions.initializeAsync().then(() => {
            const dashboard = window.tableau.extensions.dashboardContent.dashboard;
            const dashName = dashboard.name;

            // הדפסת בדיקה כדי לראות מה השרת חושף
            console.log("Tableau Environment Context:", window.tableau.extensions.environment);

            // 1. האזנה לשינויים בפרמטרים
            dashboard.getParametersAsync().then(parameters => {
                if (parameters && parameters.length > 0) {
                    parameters.forEach(param => {
                        param.addEventListener(window.tableau.TableauEventType.ParameterChanged, (event) => {
                            event.getParameterAsync().then(updatedParam => {
                                addLogToScreen("param", updatedParam.name, updatedParam.currentValue.formattedValue, dashName, "Global (Dashboard)");
                            });
                        });
                    });
                }
            }).catch(err => console.error("Error fetching parameters:", err));

            // 2. האזנה לשינויים בפילטרים ברמת הגיליון (Worksheet)
            dashboard.worksheets.forEach(worksheet => {
                worksheet.addEventListener(window.tableau.TableauEventType.FilterChanged, (event) => {
                    event.getFilterAsync().then(updatedFilter => {
                        let selectedValues = "All";
                        if (updatedFilter.appliedValues && updatedFilter.appliedValues.length > 0) {
                            selectedValues = updatedFilter.appliedValues.map(val => val.formattedValue).join(", ");
                        }
                        addLogToScreen("filter", updatedFilter.fieldName, selectedValues, dashName, worksheet.name);
                    });
                });
            });

        }).catch(error => {
            console.error("Error during Tableau init:", error);
        });
    }

    // פונקציה שמציגה את מקור השינוי כולל ניסיון שליפה דינמי של שם המשתמש
    function addLogToScreen(type, name, values, dashboardName, worksheetName) {
        const logBox = document.getElementById("liveLog");
        if (!logBox) return;

        if (logBox.innerText.includes("ממתין לשינוי ראשון") || logBox.innerText.includes("שגיאה")) {
            logBox.innerHTML = "";
        }

        // ניסיון שליפה דינמי בכל אירוע למקרה שהמשתנה התעדכן מאוחר יותר
        if (window.tableau.extensions.environment && window.tableau.extensions.environment.username) {
            currentUsername = window.tableau.extensions.environment.username;
        }

        const timestamp = new Date().toLocaleTimeString();
        const logItem = document.createElement("div");
        logItem.className = "log-item";

        if (type === "filter") {
            logItem.innerHTML = `[${timestamp}] <strong>(${currentUsername})</strong> <span class="dash-tag">[דשבורד: ${dashboardName}]</span> בקוביית <span class="sheet-tag">${worksheetName}</span> - <span class="filter-tag">פילטר</span> <strong>${name}</strong> שונה ל: <span>${values}</span>`;
        } else {
            logItem.innerHTML = `[${timestamp}] <strong>(${currentUsername})</strong> <span class="dash-tag">[דשבורד: ${dashboardName}]</span> <span class="param-tag">פרמטר גלובלי</span> <strong>${name}</strong> שונה ל: <span>${values}</span>`;
        }

        logBox.insertBefore(logItem, logBox.firstChild);
    }
})();
