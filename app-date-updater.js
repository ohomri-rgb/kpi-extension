(function() {
    const VERSION = "v1.2.1";
    let hasUpdatedDate = false;

    const checkTableauLoaded = setInterval(() => {
        if (typeof window.tableau !== 'undefined' && window.tableau.extensions) {
            clearInterval(checkTableauLoaded);
            initializeDateUpdater();
        }
    }, 50);

    async function initializeDateUpdater() {
        try {
            await window.tableau.extensions.initializeAsync();
            if (hasUpdatedDate) return;

            const dashboard = window.tableau.extensions.dashboardContent.dashboard;
            const worksheets = dashboard.worksheets;
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            let debugLog = `<strong>גרסה: ${VERSION}</strong><br>`;
            debugLog += `📊 דשבורד: "${dashboard.name}"<br><hr>`;
            addStatusToUI(debugLog);

            // סריקת גיליונות
            for (const worksheet of worksheets) {
                try {
                    const filters = await worksheet.getFiltersAsync();
                    
                    // סינון מדויק: מחפשים פילטר שהוא Range, קשור לתאריך, ולא פילטר מסוג Action
                    const dateFilter = filters.find(f => 
                        f.filterType === window.tableau.TableauEventType.FilterChanged || // בדיקת סוג הטווח
                        (f.dataType === window.tableau.DataType.Date || f.dataType === window.tableau.DataType.DateTime) &&
                        !f.fieldName.startsWith("Action (") // התעלמות מפילטרים אוטומטיים של דשבורד אקשן
                    );

                    if (dateFilter) {
                        debugLog += `⚡ נמצא פילטר תאריכים מתאים: "${dateFilter.fieldName}"<br>`;
                        
                        // שליפת ערך המינימום הנוכחי של הסליידר כדי לא לדרוס אותו
                        let currentMin = null;
                        if (dateFilter.minValue && dateFilter.minValue.value) {
                            currentMin = new Date(dateFilter.minValue.value);
                        }

                        if (!currentMin) {
                            debugLog += `⚠️ לא הצלחתי לקרוא את תאריך המינימום הקיים, משתמש בברירת מחדל.<br>`;
                            currentMin = new Date(dateFilter.domainMin.value); // גיבוי לערך המינימלי של הדאטה
                        }

                        debugLog += `📅 טווח חדש מתוכנן: מ-${currentMin.toLocaleDateString()} עד ${today.toLocaleDateString()}<br>`;
                        addStatusToUI(debugLog);

                        // עדכון הטווח - שולחים את המינימום המקורי ואת המקסימום של היום
                        await worksheet.applyRangeFilterAsync(dateFilter.fieldName, {
                            min: currentMin, 
                            max: today
                        });

                        hasUpdatedDate = true;
                        debugLog += `<span style="color:green; font-weight:bold;">✅ הפילטר "${dateFilter.fieldName}" עודכן בהצלחה להיום!</span><br>`;
                        addStatusToUI(debugLog);
                        break; 
                    }
                } catch (filterError) {
                    console.error("Error updating filter on worksheet: " + worksheet.name, filterError);
                }
            }

            if (!hasUpdatedDate) {
                debugLog += `<br><span style="color:orange; font-weight:bold;">⚠️ לא נמצא פילטר תאריכים (Range) רגיל שניתן לעדכן.</span>`;
                addStatusToUI(debugLog);
            }

        } catch (error) {
            console.error("Error during Tableau init:", error);
            addStatusToUI("<span style='color:red;'>שגיאה באתחול: " + error.message + "</span>");
        }
    }

    function addStatusToUI(htmlMessage) {
        const statusDiv = document.getElementById("statusMessage");
        if (statusDiv) {
            statusDiv.innerHTML = htmlMessage;
        }
    }
})();
