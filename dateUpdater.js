(function() {
    const VERSION = "v1.3.2";

    const checkTableauLoaded = setInterval(() => {
        if (typeof window.tableau !== 'undefined' && window.tableau.extensions) {
            clearInterval(checkTableauLoaded);
            updateDateDirectly();
        }
    }, 50);

    async function updateDateDirectly() {
        try {
            await window.tableau.extensions.initializeAsync();
            const dashboard = window.tableau.extensions.dashboardContent.dashboard;
            
            const worksheet = dashboard.worksheets.find(w => w.name === "Product Detail Sheet");
            if (!worksheet) {
                document.getElementById("statusMessage").innerHTML = `גרסה: ${VERSION}<br>❌ לא נמצא גיליון בשם Product Detail Sheet`;
                return;
            }

            // 1. יצירת תאריך מינימום קשיח (למשל 1 בינואר 2024 - כדי לכסות את כל הדאטה של 2025/2026)
            let minDate = new Date(2024, 0, 1); // 0 = January

            // 2. יצירת תאריך מקסימום (היום)
            let maxDate = new Date();
            maxDate.setHours(0, 0, 0, 0);

            document.getElementById("statusMessage").innerHTML = `גרסה: ${VERSION}<br>⏳ מעדכן פילטר...`;

            // 3. החלה ישירה עם שני אובייקטי תאריך תקינים לחלוטין שטאבלו חייב לקבל
            await worksheet.applyRangeFilterAsync("Order Date", {
                min: minDate,
                max: maxDate
            });

            document.getElementById("statusMessage").innerHTML = `גרסה: ${VERSION}<br>✅ <strong>הצלחה!</strong> הפילטר Order Date עודכן בהצלחה לתאריך של היום.`;

        } catch (error) {
            document.getElementById("statusMessage").innerHTML = `גרסה: ${VERSION}<br>❌ שגיאה: ${error.message}`;
            console.error("Error details:", error);
        }
    }
})();
