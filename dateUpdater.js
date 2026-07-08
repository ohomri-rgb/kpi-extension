(function() {
    const VERSION = "v1.8.0";

    const checkTableauLoaded = setInterval(() => {
        if (typeof window.tableau !== 'undefined' && window.tableau.extensions) {
            clearInterval(checkTableauLoaded);
            syncFilterAndDisplayRealMax();
        }
    }, 50);

    async function syncFilterAndDisplayRealMax() {
        try {
            await window.tableau.extensions.initializeAsync();
            const dashboard = window.tableau.extensions.dashboardContent.dashboard;
            
            const worksheet = dashboard.worksheets.find(w => w.name === "Product Detail Sheet");
            if (!worksheet) {
                document.getElementById("statusMessage").innerHTML = `❌ לא נמצא גיליון בשם Product Detail Sheet`;
                return;
            }

            // --- שלב 1: שליפת התאריכים המוחלטים מהדאטה הגולמי (מתעלם מפילטרים קיימים) ---
            let finalMinDate = new Date(2024, 0, 1); // ברירת מחדל לגיבוי
            let maxDataDateStr = "מתעדכן...";
            
            try {
                // גורמים לטאבלו להביא את כל ה-Domain המקורי בלי קשר לפילטר התקוע כרגע
                const summaryData = await worksheet.getSummaryDataAsync({ ignoreFilters: true });
                
                const dateColumnIndex = summaryData.columns.find(col => col.fieldName === "Order Date")?.index;
                
                if (dateColumnIndex !== undefined && summaryData.data.length > 0) {
                    let maxTime = 0;
                    let minTime = Infinity;
                    let latestDateObj = null;
                    let earliestDateObj = null;

                    summaryData.data.forEach(row => {
                        const cellValue = row[dateColumnIndex].value;
                        if (cellValue) {
                            const parsedDate = new Date(cellValue);
                            const time = parsedDate.getTime();
                            
                            if (time > maxTime) {
                                maxTime = time;
                                latestDateObj = parsedDate;
                            }
                            if (time < minTime) {
                                minTime = time;
                                earliestDateObj = parsedDate;
                            }
                        }
                    });

                    if (latestDateObj) {
                        maxDataDateStr = latestDateObj.toLocaleDateString('he-IL');
                    }
                    if (earliestDateObj) {
                        finalMinDate = earliestDateObj;
                    }
                }
            } catch (dataError) {
                console.error("Failed to fetch absolute summary data:", dataError);
                maxDataDateStr = "לא ניתן לחילוץ";
            }

            // --- שלב 2: הצגת הסטטוס האמיתי והנקי למשתמש ---
            document.getElementById("statusMessage").innerHTML = `
                <div style="font-family: Arial, sans-serif; line-height: 1.5; direction: rtl; text-align: right;">
                    <span style="color: #2e7d32; font-weight: bold; font-size: 14px;">✅ סנכרון תאריכים הושלם</span><br>
                    <span style="color: #444; font-size: 13px;">📅 הנתונים בדשבורד מעודכנים עד לתאריך: <strong>${maxDataDateStr}</strong></span>
                </div>
            `;

            // --- שלב 3: הפעלת ה-Hack מאחורי הקלעים כדי לפתוח את הסליידר ---
            // צד שמאל מקבל את התאריך המינימלי האמיתי שנמצא בדאטה, וצד ימין נדחף ל-2030
            let experimentalFutureDate = new Date(2030, 11, 31); 

            await worksheet.applyRangeFilterAsync("Order Date", {
                min: finalMinDate,
                max: experimentalFutureDate
            });

        } catch (error) {
            document.getElementById("statusMessage").innerHTML = `❌ שגיאה: ${error.message}`;
        }
    }
})();
