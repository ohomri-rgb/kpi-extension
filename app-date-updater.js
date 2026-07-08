(function() {
    const checkTableauLoaded = setInterval(() => {
        if (typeof window.tableau !== 'undefined' && window.tableau.extensions) {
            clearInterval(checkTableauLoaded);
            updateDateDirectly();
        }
    }, 50);

    async function updateDateDirectly() {
        try {
            // 1. אתחול רגיל של טאבלו
            await window.tableau.extensions.initializeAsync();
            
            const dashboard = window.tableau.extensions.dashboardContent.dashboard;
            
            // 2. גישה ישירה לגיליון שלך (לפי השם המדויק שלו בדשבורד)
            const worksheet = dashboard.worksheets.find(w => w.name === "Product Detail Sheet");
            
            if (!worksheet) {
                document.getElementById("statusMessage").innerHTML = "❌ לא נמצא גיליון בשם Product Detail Sheet בדשבורד.";
                return;
            }

            // 3. שליפת הפילטר הספציפי לפי השם המדויק שלו
            const filters = await worksheet.getFiltersAsync();
            const orderDateFilter = filters.find(f => f.fieldName === "Order Date");

            if (!orderDateFilter) {
                document.getElementById("statusMessage").innerHTML = "❌ נמצא הגיליון, אך לא נמצא בתוכו פילטר בשם Order Date.";
                return;
            }

            // 4. חילוץ תאריך המינימום הקיים כרגע בסליידר (הצד השמאלי)
            let minDate = orderDateFilter.minValue.value; 

            // 5. יצירת תאריך המקסימום (היום)
            let maxDate = new Date();
            maxDate.setHours(0, 0, 0, 0);

            document.getElementById("statusMessage").innerHTML = `מנסה לעדכן ישירות: מ-${new Date(minDate).toLocaleDateString()} עד ${maxDate.toLocaleDateString()}...`;

            // 6. החלת הפילטר בצורה הכי פשוטה וישירה
            await worksheet.applyRangeFilterAsync("Order Date", {
                min: minDate,
                max: maxDate
            });

            document.getElementById("statusMessage").innerHTML = "✅ הצלחה! הפילטר Order Date עודכן ישירות להיום.";

        } catch (error) {
            document.getElementById("statusMessage").innerHTML = "❌ שגיאה ישירה: " + error.message;
        }
    }
})();
