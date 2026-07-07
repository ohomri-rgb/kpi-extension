(function() {
    const VERSION = "v1.2.2";
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
            
            // יצירת תאריך של היום (מקומי)
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            let debugLog = `<strong>גרסה: ${VERSION}</strong><br>`;
            debugLog += `📊 דשבורד: "${dashboard.name}"<br><hr>`;
            addStatusToUI(debugLog);

            // סריקת גיליונות בדשבורד
            for (const worksheet of worksheets) {
                try {
                    const filters = await worksheet.getFiltersAsync();
                    
                    // סינון אגרסיבי: מחפשים שדה תאריך, ומתעלמים לחלוטין מכל מה שמתחיל ב-Action או מכיל אקשן
                    const dateFilter = filters.find(f => 
                        (f.dataType === window.tableau.DataType.Date || f.dataType === window.tableau.DataType.DateTime) &&
                        !f.fieldName.toLowerCase().includes("action") && 
                        !f.fieldName.startsWith("Action")
                    );

                    if (dateFilter) {
                        debugLog += `⚡ נמצא פילטר תאריכים אמיתי: "${dateFilter.fieldName}" בגיליון "${worksheet.name}"<br>`;
                        
                        // קריאת ערך המינימום הקיים כפי שטאבלו מחזיק אותו
                        let currentMin = null;
                        if (dateFilter.minValue && dateFilter.minValue.value) {
                            currentMin = new Date(dateFilter.minValue.value);
                        } else if (dateFilter.domainMin && dateFilter.domainMin.value) {
                            currentMin = new Date(dateFilter.domainMin.value);
                        }

                        if (!currentMin) {
                            debugLog += `❌ לא ניתן היה לחלץ את תאריך המינימום מהפילטר.<br>`;
                            addStatusToUI(debugLog);
                            continue;
                        }

                        debugLog += `📅 טווח נוכחי מזהה: מ-${currentMin.toLocaleDateString()} עד היום (${today.toLocaleDateString()})<br>`;
                        addStatusToUI(debugLog);

                        // תיקון פורמט קריטי: מעבירים לטאבלו את ערכי ה-Date בדיוק בפורמט שהוא דורש (אובייקטי תאריך נקיים)
                        await worksheet.applyRangeFilterAsync(dateFilter.fieldName, {
                            min: currentMin, 
                            max: today
                        });

                        hasUpdatedDate = true;
                        debugLog += `<span style="color:green; font-weight:bold;">✅ הפילטר "${dateFilter.fieldName}" עודכן בהצלחה!</span><br>`;
                        addStatusToUI(debugLog);
                        break; // מצאנו ועדכנו, עוצרים את הלולאה
                    }
                } catch (filterError) {
                    console.error("Error updating filter on worksheet: " + worksheet.name, filterError);
                    debugLog += `<span style="color:red;">❌ שגיאה בהחלת הפילטר: ${filterError.message}</span><br>`;
                    addStatusToUI(debugLog);
                }
            }

            if (!hasUpdatedDate) {
                debugLog += `<br><span style="color:orange; font-weight:bold;">⚠️ לא נמצא פילטר תאריכים רגיל (שאינו Action) בדשבורד.</span>`;
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
