(function() {
    const VERSION = "v1.9.0";

    const checkTableauLoaded = setInterval(() => {
        if (typeof window.tableau !== 'undefined' && window.tableau.extensions) {
            clearInterval(checkTableauLoaded);
            perfectDateSync();
        }
    }, 50);

    async function perfectDateSync() {
        try {
            await window.tableau.extensions.initializeAsync();
            const dashboard = window.tableau.extensions.dashboardContent.dashboard;
            
            const worksheet = dashboard.worksheets.find(w => w.name === "Product Detail Sheet");
            if (!worksheet) {
                document.getElementById("statusMessage").innerHTML = `❌ לא נמצא גיליון בשם Product Detail Sheet`;
                return;
            }

            // --- שלב 1: שליפת תאריכי הקצה המוחלטים ישירות מהנתונים (מתעלם מפילטרים) ---
            let finalMinDate = new Date(2024, 0, 1); // ערך ברירת מחדל לגיבוי צד שמאל
            let finalMaxDate = new Date();           // ערך ברירת מחדל לגיבוי צד ימין
            let maxDataDateStr = "מתעדכן...";
            
            try {
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
                        finalMaxDate = latestDateObj;
                        maxDataDateStr = latestDateObj.toLocaleDateString('he-IL');
                    }
                    if (earliestDateObj) {
                        finalMinDate = earliestDateObj;
                    }
                }
            } catch (dataError) {
                console.error("Failed to fetch summary data:", dataError);
                maxDataDateStr = "שגיאה בשליפת תאריך מקסימלי";
            }

            // --- שלב 2: עדכון פיזי של הפילטר בדשבורד לערכים האמיתיים בלבד ---
            // אנחנו מעבירים את האובייקטים הנקיים של התאריכים ישירות. 
            // צד ימין יקבל בדיוק את היום האחרון בדאטה (למשל 24.11.2026) ולא יום אחד מעבר!
            await worksheet.applyRangeFilterAsync("Order Date", {
                min: finalMinDate,
                max: finalMaxDate
            });

            // --- שלב 3: הצגת הודעת אישור נקייה ומקצועית למשתמש ---
            document.getElementById("statusMessage").innerHTML = `
                <div style="font-family: Arial, sans-serif; line-height: 1.5; direction: rtl; text-align: right;">
                    <span style="color: #2e7d32; font-weight: bold; font-size: 14px;">✅ סנכרון תאריכים הושלם בהצלחה</span><br>
                    <span style="color: #444; font-size: 13px;">📅 הנתונים בדשבורד והסליידר עודכנו עד לתאריך: <strong>${maxDataDateStr}</strong></span>
                </div>
            `;

        } catch (error) {
            document.getElementById("statusMessage").innerHTML = `❌ שגיאה: ${error.message}`;
        }
    }
})();
