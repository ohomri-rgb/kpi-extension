(function() {
    const VERSION = "v2.0.0";

    const checkTableauLoaded = setInterval(() => {
        if (typeof window.tableau !== 'undefined' && window.tableau.extensions) {
            clearInterval(checkTableauLoaded);
            syncToTrueVisibleMax();
        }
    }, 50);

    async function syncToTrueVisibleMax() {
        try {
            await window.tableau.extensions.initializeAsync();
            const dashboard = window.tableau.extensions.dashboardContent.dashboard;
            
            const worksheet = dashboard.worksheets.find(w => w.name === "Product Detail Sheet");
            if (!worksheet) {
                document.getElementById("statusMessage").innerHTML = `❌ לא נמצא גיליון בשם Product Detail Sheet`;
                return;
            }

            // --- שלב 1: מתיחה זמנית ל-2030 כדי לחשוף את הדאטה החדש ביותר ---
            let initialMinDate = new Date(2024, 0, 1); // נקודת התחלה קשיחה
            let temporaryFutureDate = new Date(2030, 11, 31);

            await worksheet.applyRangeFilterAsync("Order Date", {
                min: initialMinDate,
                max: temporaryFutureDate
            });

            // --- שלב 2: שליפת הדאטה המוצג בפועל (מושפע משאר הפילטרים בדשבורד) ---
            let trueVisibleMaxDate = null;
            
            // שימוש ב-getSummaryDataAsync רגיל (ללא ignoreFilters) כדי לכבד את שאר הפילטרים
            const summaryData = await worksheet.getSummaryDataAsync();
            const dateColumnIndex = summaryData.columns.find(col => col.fieldName === "Order Date")?.index;
            
            if (dateColumnIndex !== undefined && summaryData.data.length > 0) {
                let maxTime = 0;
                summaryData.data.forEach(row => {
                    const cellValue = row[dateColumnIndex].value;
                    if (cellValue) {
                        const parsedDate = new Date(cellValue);
                        if (parsedDate.getTime() > maxTime) {
                            maxTime = parsedDate.getTime();
                            trueVisibleMaxDate = parsedDate;
                        }
                    }
                });
            }

            // אם לא הצלחנו לשלוף, נשתמש בתאריך של היום כגיבוי
            if (!trueVisibleMaxDate) {
                trueVisibleMaxDate = new Date();
            }

            // --- שלב 3: נעילת הסליידר על המקס האמיתי והצגת ההודעה למשתמש ---
            await worksheet.applyRangeFilterAsync("Order Date", {
                min: initialMinDate,
                max: trueVisibleMaxDate
            });

            const maxFormattedStr = trueVisibleMaxDate.toLocaleDateString('he-IL');
            document.getElementById("statusMessage").innerHTML = `
                <div style="font-family: Arial, sans-serif; line-height: 1.5; direction: rtl; text-align: right;">
                    <span style="color: #2e7d32; font-weight: bold; font-size: 14px;">✅ סנכרון תאריכים הושלם בהצלחה</span><br>
                    <span style="color: #444; font-size: 13px;">📅 הנתונים בדשבורד והסליידר עודכנו למקס האמיתי: <strong>${maxFormattedStr}</strong></span>
                </div>
            `;

        } catch (error) {
            document.getElementById("statusMessage").innerHTML = `❌ שגיאה: ${error.message}`;
        }
    }
})();
