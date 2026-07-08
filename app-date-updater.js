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
            // 1. אתחול ה-Extension
            await window.tableau.extensions.initializeAsync();
            
            const dashboard = window.tableau.extensions.dashboardContent.dashboard;
            
            // 2. פנייה ישירה לגיליון הנתונים שלך
            const worksheet = dashboard.worksheets.find(w => w.name === "Product Detail Sheet");
            
            if (!worksheet) {
                document.getElementById("statusMessage").innerHTML = "❌ לא נמצא גיליון בשם Product Detail Sheet בדשבורד.";
                return;
            }

            // 3. שליפת הפילטרים של הגיליון ומציאת השדה המדויק
            const filters = await worksheet.getFiltersAsync();
            const orderDateFilter = filters.find(f => f.fieldName === "Order Date");

            if (!orderDateFilter) {
                document.getElementById("statusMessage").innerHTML = "❌ נמצא הגיליון, אך לא נמצא בתוכו פילטר בשם Order Date.";
                return;
            }

            // 4. חילוץ ערך המינימום הקיים בסליידר (צד שמאל) בצורה גולמית ויציבה
            let minDate = null;
            if (orderDateFilter.minValue && orderDateFilter.minValue.value) {
                minDate = new Date(orderDateFilter.minValue.value);
            } else if (orderDateFilter.domainMin && orderDateFilter.domainMin.value) {
                minDate = new Date(orderDateFilter.domainMin.value);
            }

            if (!minDate) {
                document.getElementById("statusMessage").innerHTML = "❌ לא הצלחתי לקרוא את תאריך המינימום הקיים בפילטר.";
                return;
            }

            // 5. יצירת תאריך המקסימום של היום
            let maxDate = new Date();
            maxDate.setHours(0, 0, 0, 0);

            document.getElementById("statusMessage").innerHTML = `⏳ מעדכן פילטר מ-${minDate.toLocaleDateString()} עד היום (${maxDate.toLocaleDateString()})...`;

            // 6. החלת הפילטר בצורה מפורשת ללא שימוש ב-null
            await worksheet.applyRangeFilterAsync("Order Date", {
                min: minDate,
                max: maxDate
            });

            document.getElementById("statusMessage").innerHTML = `✅ <strong>הצלחה!</strong> הפילטר Order Date עודכן בהצלחה לתאריך של היום.`;

        } catch (error) {
            document.getElementById("statusMessage").innerHTML = `❌ שגיאה ישירה: ${error.message}`;
            console.error("Direct update error:", error);
        }
    }
})();
