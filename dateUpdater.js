(function() {
    const VERSION = "v1.3.0";

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
            
            // גישה ישירה לגיליון שלך
            const worksheet = dashboard.worksheets.find(w => w.name === "Product Detail Sheet");
            if (!worksheet) {
                document.getElementById("statusMessage").innerHTML = "❌ לא נמצא גיליון בשם Product Detail Sheet";
                return;
            }

            // שליפת פילטר ספציפי
            const filters = await worksheet.getFiltersAsync();
            const orderDateFilter = filters.find(f => f.fieldName === "Order Date");

            if (!orderDateFilter) {
                document.getElementById("statusMessage").innerHTML = "❌ לא נמצא פילטר בשם Order Date";
                return;
            }

            // חילוץ המינימום הקיים
            let minDate = null;
            if (orderDateFilter.minValue && orderDateFilter.minValue.value) {
                minDate = new Date(orderDateFilter.minValue.value);
            } else if (orderDateFilter.domainMin && orderDateFilter.domainMin.value) {
                minDate = new Date(orderDateFilter.domainMin.value);
            }

            if (!minDate) {
                document.getElementById("statusMessage").innerHTML = "❌ לא ניתן לקרוא את ערך המינימום בפילטר";
                return;
            }

            // יצירת תאריך מקסימום (היום)
            let maxDate = new Date();
            maxDate.setHours(0, 0, 0, 0);

            document.getElementById("statusMessage").innerHTML = `גרסה: ${VERSION}<br>⏳ מעדכן פילטר מ-${minDate.toLocaleDateString()} עד ${maxDate.toLocaleDateString()}...`;

            // החלה ישירה ללא פילטרי Action בדרך
            await worksheet.applyRangeFilterAsync("Order Date", {
                min: minDate,
                max: maxDate
            });

            document.getElementById("statusMessage").innerHTML = `גרסה: ${VERSION}<br>✅ <strong>הצלחה!</strong> הפילטר Order Date עודכן בהצלחה לתאריך של היום.`;

        } catch (error) {
            document.getElementById("statusMessage").innerHTML = `גרסה: ${VERSION}<br>❌ שגיאה: ${error.message}`;
        }
    }
})();
