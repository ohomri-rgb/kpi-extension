(function() {
    // בדיקה שהספרייה של טאבלו אכן נטענה בהצלחה
    if (typeof tableau === 'undefined') {
        console.error("Tableau Extensions API library is not loaded yet.");
        const logBox = document.getElementById("liveLog");
        if (logBox) logBox.innerHTML = "<div class='log-item' style='color:red;'>שגיאה: ספריית טאבלו לא נטענה כראוי.</div>";
        return;
    }

    // אתחול ה-Extension
    tableau.extensions.initializeAsync().then(() => {
        const dashboard = tableau.extensions.dashboardContent.dashboard;
        const logBox = document.getElementById("liveLog");

        // 1. האזנה לשינויים בפרמטרים
        dashboard.getParametersAsync().then(parameters => {
            parameters.forEach(param => {
                param.addEventListener(tableau.TableauEventType.ParameterChanged, (event) => {
                    event.getParameterAsync().then(updatedParam => {
                        addLogToScreen("param", updatedParam.name, updatedParam.currentValue.formattedValue);
                    });
                });
            });
        });

        // 2. האזנה לשינויים בפילטרים
        dashboard.worksheets.forEach(worksheet => {
            worksheet.addEventListener(tableau.TableauEventType.FilterChanged, (event) => {
                event.getFilterAsync().then(updatedFilter => {
                    let selectedValues = "All";
                    if (updatedFilter.appliedValues && updatedFilter.appliedValues.length > 0) {
                        selectedValues = updatedFilter.appliedValues.map(val => val.formattedValue).join(", ");
                    }
                    addLogToScreen("filter", updatedFilter.fieldName, selectedValues);
                });
            });
        });

    }).catch(error => {
        console.error("Error during initialization:", error);
    });

    // פונקציה להצגת השינוי ישירות על המסך בתוך ה-HTML
    function addLogToScreen(type, name, values) {
        const logBox = document.getElementById("liveLog");
        
        // ניקוי הודעת ברירת המחדל בשינוי הראשון
        if (logBox.innerText.includes("ממתין לשינוי ראשון")) {
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

        // הוספת השינוי החדש לראש הרשימה
        logBox.insertBefore(logItem, logBox.firstChild);
    }
})();
