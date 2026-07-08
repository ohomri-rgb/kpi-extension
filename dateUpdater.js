(function() {
    const VERSION = "v1.6.0-Fix";

    const checkTableauLoaded = setInterval(() => {
        if (typeof window.tableau !== 'undefined' && window.tableau.extensions) {
            clearInterval(checkTableauLoaded);
            updateDateToCurrentDay();
        }
    }, 50);

    async function updateDateToCurrentDay() {
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

            // שלב 1: לוקחים את נקודת האפס האמיתית של הנתונים בדשבורד (Domain Min)
            let absoluteMin = new Date(orderDateFilter.domainMin.value);

            // שלב 2: לוקחים את התאריך של היום הנוכחי (זמן אמת)
            let today = new Date();
            today.setHours(0, 0, 0, 0);

            document.getElementById("statusMessage").innerHTML = `גרסה: ${VERSION}<br>⏳ מעדכן פילטר מ-${absoluteMin.toLocaleDateString()} עד היום (${today.toLocaleDateString()})...`;

            // שלב 3: החלת הטווח המעודכן
            await worksheet.applyRangeFilterAsync("Order Date", {
                min: absoluteMin,
                max: today
            });

            document.getElementById("statusMessage").innerHTML = `גרסה: ${VERSION}<br>✅ <strong>הצלחה!</strong> הפילטר נפתח מנקודת ההתחלה ועד לתאריך של היום בהצלחה.`;

        } catch (error) {
            document.getElementById("statusMessage").innerHTML = `גרסה: ${VERSION}<br>❌ שגיאה: ${error.message}`;
        }
    }
})();
