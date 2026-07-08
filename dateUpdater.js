(function() {
    const VERSION = "v1.6.5";

    const checkTableauLoaded = setInterval(() => {
        if (typeof window.tableau !== 'undefined' && window.tableau.extensions) {
            clearInterval(checkTableauLoaded);
            fixDateSliderBug();
        }
    }, 50);

    async function fixDateSliderBug() {
        try {
            await window.tableau.extensions.initializeAsync();
            const dashboard = window.tableau.extensions.dashboardContent.dashboard;
            
            const worksheet = dashboard.worksheets.find(w => w.name === "Product Detail Sheet");
            if (!worksheet) {
                document.getElementById("statusMessage").innerHTML = `❌ לא נמצא גיליון בשם Product Detail Sheet`;
                return;
            }

            const filters = await worksheet.getFiltersAsync();
            const orderDateFilter = filters.find(f => f.fieldName === "Order Date");

            if (!orderDateFilter) {
                document.getElementById("statusMessage").innerHTML = `❌ לא נמצא פילטר בשם Order Date`;
                return;
            }

            // שלב 1: שליפת ערך המינימום הנוכחי כפי שהוא מוצג כרגע בסליידר (צד שמאל)
            let currentMinFormatted = orderDateFilter.minValue.formattedValue; // מחזיר מחרוזת כמו "3/4/2025"

            // שלב 2: המרה ידנית בטוחה לאובייקט תאריך של JS כדי שטאבלו לא יזרוק שגיאת טיפוס
            let minDateParts = currentMinFormatted.split(/[\/\-\.]/);
            let minDateObj;
            
            // בדיקה האם הפורמט הוא DD/MM/YYYY או MM/DD/YYYY (נשבץ לפי המבנה הנפוץ של טאבלו)
            if (minDateParts[0] > 12) {
                // פורמט DD/MM/YYYY
                minDateObj = new Date(minDateParts[2], minDateParts[1] - 1, minDateParts[0]);
            } else {
                // פורמט MM/DD/YYYY
                minDateObj = new Date(minDateParts[2], minDateParts[0] - 1, minDateParts[1]);
            }

            // שלב 3: הגדרת תאריך מקסימום עתידי קיצוני (שנת 2035) בפורמט אובייקט נקי
            // זה יאלץ את טאבלו למתוח את הסליידר ימינה עד הסוף המוחלט של הדאטה הקיים והעתידי
            let futureMaxObj = new Date(2035, 11, 31);

            document.getElementById("statusMessage").innerHTML = `גרסה: ${VERSION}<br>⏳ מותח את הסליידר ימינה משומר על שמאל (${minDateObj.toLocaleDateString()})...`;

            // שלב 4: החלת הפילטר
            await worksheet.applyRangeFilterAsync("Order Date", {
                min: minDateObj,
                max: futureMaxObj
            });

            document.getElementById("statusMessage").innerHTML = `גרסה: ${VERSION}<br>✅ <strong>הצלחה!</strong> הסליידר נמתח ימינה בהצלחה ויקלוט נתונים חדשים באופן אוטומטי.`;

        } catch (error) {
            document.getElementById("statusMessage").innerHTML = `גרסה: ${VERSION}<br>❌ שגיאה: ${error.message}`;
            console.error("Error details:", error);
        }
    }
})();
