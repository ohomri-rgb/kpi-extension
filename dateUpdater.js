(function() {
    const VERSION = "v1.7.0";

    const checkTableauLoaded = setInterval(() => {
        if (typeof window.tableau !== 'undefined' && window.tableau.extensions) {
            clearInterval(checkTableauLoaded);
            updateAndDisplayMaxDate();
        }
    }, 50);

    async function updateAndDisplayMaxDate() {
        try {
            await window.tableau.extensions.initializeAsync();
            const dashboard = window.tableau.extensions.dashboardContent.dashboard;
            
            const worksheet = dashboard.worksheets.find(w => w.name === "Product Detail Sheet");
            if (!worksheet) {
                document.getElementById("statusMessage").innerHTML = `❌ לא נמצא גיליון בשם Product Detail Sheet`;
                return;
            }

            // --- שלב 1: שליפת התאריך המקסימלי האמיתי מתוך הנתונים של הגיליון ---
            let maxDataDateStr = "מתעדכן...";
            try {
                const summaryData = await worksheet.getSummaryDataAsync();
                
                // מציאת האינדקס של העמודה Order Date
                const dateColumnIndex = summaryData.columns.find(col => col.fieldName === "Order Date")?.index;
                
                if (dateColumnIndex !== undefined && summaryData.data.length > 0) {
                    let maxTime = 0;
                    let latestDateObj = null;

                    // רצים על פני השורות ומוצאים את התאריך המאוחר ביותר
                    summaryData.data.forEach(row => {
                        const cellValue = row[dateColumnIndex].value;
                        if (cellValue) {
                            const parsedDate = new Date(cellValue);
                            if (parsedDate.getTime() > maxTime) {
                                maxTime = parsedDate.getTime();
                                latestDateObj = parsedDate;
                            }
                        }
                    });

                    if (latestDateObj) {
                        maxDataDateStr = latestDateObj.toLocaleDateString('he-IL');
                    }
                }
            } catch (dataError) {
                console.error("Failed to fetch summary data for date:", dataError);
                maxDataDateStr = "לא ניתן לחילוץ";
            }

            // --- שלב 2: הצגת סטטוס נקי ומובן למשתמש הקצה ---
            document.getElementById("statusMessage").innerHTML = `
                <div style="font-family: Arial, sans-serif; line-height: 1.5;">
                    <span style="color: #2e7d32; font-weight: bold; font-size: 15px;">✅ סנכרון תאריכים הושלם בהצלחה</span><br>
                    <span style="color: #555; font-size: 13px;">📅 הנתונים בדשבורד מעודכנים עד לתאריך: <strong>${maxDataDateStr}</strong></span>
                </div>
            `;

            // --- שלב 3: הפעלת ה-Hack שעבד מאחורי הקלעים כדי למתוח את הסליידר ---
            let minDate = new Date(2024, 0, 1); 
            let experimentalFutureDate = new Date(2030, 11, 31); 

            await worksheet.applyRangeFilterAsync("Order Date", {
                min: minDate,
                max: experimentalFutureDate
            });

        } catch (error) {
            document.getElementById("statusMessage").innerHTML = `❌ שגיאה: ${error.message}`;
        }
    }
})();
