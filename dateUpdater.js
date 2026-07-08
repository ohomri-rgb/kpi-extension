(function() {
    const VERSION = "v1.3.5";

    const checkTableauLoaded = setInterval(() => {
        if (typeof window.tableau !== 'undefined' && window.tableau.extensions) {
            clearInterval(checkTableauLoaded);
            updateDateDirectly();
        }
    }, 50);

    async function updateDateDirectly() {
        try {
            // אתחול האקסטנשיין
            await window.tableau.extensions.initializeAsync();
            const dashboard = window.tableau.extensions.dashboardContent.dashboard;
            
            // פנייה ישירה לגיליון
            const worksheet = dashboard.worksheets.find(w => w.name === "Product Detail Sheet");
            if (!worksheet) {
                document.getElementById("statusMessage").innerHTML = `גרסה: ${VERSION}<br>❌ לא נמצא גיליון בשם Product Detail Sheet`;
                return;
            }

            // 1. תאריך מינימום קשיח (כמו ב-POC שעבד - לא נוגעים בזה)
            let minDate = new Date(2024, 0, 1); 

            // 2. תאריך מקסימום עתידי לבדיקת מתיחת הסליידר (הניסוי שלך)
            let maxDate = new Date(2030, 11, 31); 

            document.getElementById("statusMessage").innerHTML = `גרסה: ${VERSION}<br>⏳ מפעיל את ה-POC על הפילטר Order Date...`;

            // 3. החלת הפילטר במבנה המדויק שעבד
            await worksheet.applyRangeFilterAsync("Order Date", {
                min: minDate,
                max: maxDate
            });

            document.getElementById("statusMessage").innerHTML = `גרסה: ${VERSION}<br>✅ <strong>הצלחה!</strong> הפילטר Order Date עודכן למקסימום המוחלט.`;

        } catch (error) {
            document.getElementById("statusMessage").innerHTML = `גרסה: ${VERSION}<br>❌ שגיאה: ${error.message}`;
        }
    }
})();
