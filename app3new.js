(function() {
    // לולאה שמחכה מספר מילישניות עד שהספרייה משורה 7 תהיה זמינה בזיכרון
    const checkTableauLoaded = setInterval(() => {
        if (typeof window.tableau !== 'undefined' && window.tableau.extensions) {
            clearInterval(checkTableauLoaded); // הספרייה מוכנה, עוצרים את הלולאה
            initializeTracker();              // מתחילים להאזין לפקדים
        }
    }, 50);

    // פונקציית האתחול והאזנה לפילטרים ופרמטרים
    function initializeTracker() {
        window.tableau.extensions.initializeAsync().then(() => {
            const dashboard = window.tableau.extensions.dashboardContent.dashboard;

            // 1. האזנה לשינויים בפרמטרים של הדשבורד
            dashboard.getParametersAsync().then(parameters => {
                parameters.forEach(param => {
                    param.addEventListener(window.tableau.TableauEventType.ParameterChanged, (event) => {
                        event.getParameterAsync().then(updatedParam => {
                            addLogToScreen("param", updatedParam.name, updatedParam.currentValue.formattedValue);
                        });
                    });
                });
            });

            // 2. האזנה לשינויים בפילטרים בכל ה-Worksheets
            dashboard.worksheets.forEach(worksheet => {
                worksheet.addEventListener(window.tableau.TableauEventType.FilterChanged, (event) => {
                    event.getFilterAsync().then(updatedFilter => {
                        let selectedValues = "All";
                        if (updatedFilter.appliedValues && updatedFilter.appliedValues.length > 0) {
                            selectedValues = updatedFilter.appliedValues.map(val => val.formattedValue).join(", ");
                        }
                        addLogToScreen("filter", updatedFilter.fieldName, selectedValues);
                    });
                });
            });

            console.log("Tracker active and listening using local library execution.");
        }).catch(error => {
            console.error("Error during Tableau init:", error);
        });
    }

    // פונקציה שמציגה באופן חי את השינויים על גבי ה-HTML
    function addLogToScreen(type, name, values) {
        const logBox = document.getElementById("liveLog");
        if (!logBox) return;

        // ניקוי הודעת המתנה ראשונית במידה וקיימת
        if (logBox.innerText.includes("ממתין לשינוי ראשון") || logBox.innerText.includes("שגיאה")) {
            logBox.innerHTML = "";
        }

        const timestamp = new Date().toLocaleTimeString();
        const logItem = document.createElement("div");
        logItem.className = "log-item";

        if (type === "filter") {
            logItem.innerHTML = `[${timestamp}] <span class="filter-tag">פילטר</span> <strong>${name}</strong> שונה ל: <span>${values}</span>`;
        } else {
            logItem.innerHTML = `[${timestamp}] <span class="param-tag">פרמטר</span> <strong>${name}</strong> שונה ל: <span>${values}</span>`;
        }

        // הוספת האירוע החדש ביותר לראש הרשימה
        logBox.insertBefore(logItem, logBox.firstChild);
    }
})();
