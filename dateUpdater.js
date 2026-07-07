(function() {
    const VERSION = "v1.2.0";
    let hasUpdatedDate = false;

    // בדיקה שהספרייה של טאבלו נטענה בדפדפן
    const checkTableauLoaded = setInterval(() => {
        if (typeof window.tableau !== 'undefined' && window.tableau.extensions) {
            clearInterval(checkTableauLoaded);
            initializeDateUpdater();
        }
    }, 50);

    async function initializeDateUpdater() {
        try {
            // אתחול האקסטנשיין של טאבלו
            await window.tableau.extensions.initializeAsync();
            
            // הגנה מפני ריצה כפולה
            if (hasUpdatedDate) return;

            const dashboard = window.tableau.extensions.dashboardContent.dashboard;
            const worksheets = dashboard.worksheets;
            
            // יצירת תאריך של היום (התאריך הנוכחי)
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            let debugLog = `<strong>גרסה: ${VERSION}</strong><br>`;
            debugLog += `📊 דשבורד: "${dashboard.name}"<br>`;
            debugLog += `⏳ מנסה לעדכן את סוף הטווח לתאריך של היום (${today.toLocaleDateString()})...<br><hr>`;
            addStatusToUI(debugLog);

            // שלב א': סריקת פילטרים בגיליונות
            for (const worksheet of worksheets) {
                try {
                    const filters = await worksheet.getFiltersAsync();
                    
                    // מחפשים פילטר שקשור לתאריך (לפי סוג או שם שדה)
                    const dateFilter = filters.find(f => 
                        f.dataType === window.tableau.DataType.Date || 
                        f.dataType === window.tableau.DataType.DateTime ||
                        f.fieldName.toLowerCase().includes('date') ||
                        f.fieldName.includes('תאריך')
                    );

                    if (dateFilter) {
                        debugLog += `⚡ נמצא פילטר "${dateFilter.fieldName}" בגיליון "${worksheet.name}". מעדכן...<br>`;
                        addStatusToUI(debugLog);

                        // עדכון סוף הטווח (max) בלבד, משאירים את ההתחלה ללא שינוי (null)
                        await worksheet.applyRangeFilterAsync(dateFilter.fieldName, {
                            min: null, 
                            max: today
                        });

                        hasUpdatedDate = true;
                        debugLog += `<span style="color:green; font-weight:bold;">✅ הפילטר "${dateFilter.fieldName}" עודכן בהצלחה!</span><br>`;
                        addStatusToUI(debugLog);
                        break; 
                    }
                } catch (filterError) {
                    console.error("Error reading filters from worksheet: " + worksheet.name, filterError);
                }
            }

            // שלב ב': אם לא נמצא פילטר, נבדוק אם מדובר בפרמטר גלובלי של תאריך
            if (!hasUpdatedDate) {
                debugLog += `⚠️ לא נמצא פילטר תאריכים רגיל. בודק פרמטרים בדשבורד...<br>`;
                addStatusToUI(debugLog);

                const parameters = await dashboard.getParametersAsync();
                const dateParam = parameters.find(p => 
                    (p.dataType === window.tableau.DataType.Date || p.dataType === window.tableau.DataType.DateTime) &&
                    (p.name.toLowerCase().includes('end') || p.name.toLowerCase().includes('to') || p.name.includes('סוף') || p.name.toLowerCase().includes('date'))
                );

                if (dateParam) {
                    debugLog += `⚡ נמצא פרמטר תאריך בשם "${dateParam.name}". מעדכן אותו להיום...<br>`;
                    addStatusToUI(debugLog);

                    await dateParam.changeValueAsync(today);
                    hasUpdatedDate = true;
                    debugLog += `<span style="color:green; font-weight:bold;">✅ הפרמטר "${dateParam.name}" עודכן בהצלחה!</span><br>`;
                    addStatusToUI(debugLog);
                }
            }

            // אם הגענו לכאן ושום דבר לא השתנה
            if (!hasUpdatedDate) {
                debugLog += `<br><span style="color:orange; font-weight:bold;">⚠️ הסריקה הסתיימה. לא נמצא שום פילטר או פרמטר תאריכים מתאים לעדכון.</span>`;
                addStatusToUI(debugLog);
            }

        } catch (error) {
            console.error("Error during Tableau init:", error);
            addStatusToUI("<span style='color:red;'>שגיאה באתחול האקסטנשיין: " + error.message + "</span>");
        }
    }

    function addStatusToUI(htmlMessage) {
        const statusDiv = document.getElementById("statusMessage");
        if (statusDiv) {
            statusDiv.innerHTML = htmlMessage;
        }
    }
})();