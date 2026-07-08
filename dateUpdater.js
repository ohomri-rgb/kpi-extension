(function() {
    const VERSION = "v1.5.0-Experiment";

    const checkTableauLoaded = setInterval(() => {
        if (typeof window.tableau !== 'undefined' && window.tableau.extensions) {
            clearInterval(checkTableauLoaded);
            runDateExperiment();
        }
    }, 50);

    async function runDateExperiment() {
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

            // --- שלב 1: שליפת והדפסת הערכים הקיימים לפני השינוי ---
            let currentMin = orderDateFilter.minValue ? orderDateFilter.minValue.value : "לא מוגדר";
            let currentMax = orderDateFilter.maxValue ? orderDateFilter.maxValue.value : "לא מוגדר";
            let domainMin = orderDateFilter.domainMin ? orderDateFilter.domainMin.value : "לא מוגדר";
            let domainMax = orderDateFilter.domainMax ? orderDateFilter.domainMax.value : "לא מוגדר";

            let reportHtml = `<strong>📊 נתוני פילטר נוכחיים (לפני שינוי):</strong><br>`;
            reportHtml += `• בחירה נוכחית בשמאלי (Min): ${currentMin}<br>`;
            reportHtml += `• בחירה נוכחית בימני (Max): ${currentMax}<br>`;
            reportHtml += `• גבול תחתון מוחלט בדאטה (Domain Min): ${domainMin}<br>`;
            reportHtml += `• גבול עליון מוחלט בדאטה (Domain Max): ${domainMax}<br><hr>`;
            
            document.getElementById("statusMessage").innerHTML = reportHtml;

            // --- שלב 2: הגדרת הערכים לניסוי ---
            // הבסיס לצד שמאל: ניקח בדיוק את מה שמוגדר כרגע בסליידר
            let minToApply = orderDateFilter.minValue && orderDateFilter.minValue.value ? 
                             new Date(orderDateFilter.minValue.value) : new Date(orderDateFilter.domainMin.value);

            // הבסיס לצד ימין: תאריך עתידי קיצוני כדי "למשוך" את הסליידר לסוף
            let experimentalFutureDate = new Date(2030, 11, 31); // 31 לדצמבר 2030

            reportHtml += `⏳ <strong>מבצע ניסוי:</strong> מנסה להחיל את הטווח:<br>`;
            reportHtml += `מ-${minToApply.toLocaleDateString()} עד 31/12/2030 (ערך עתידי)<br>`;
            document.getElementById("statusMessage").innerHTML = reportHtml;

            // --- שלב 3: החלת הפילטר ---
            await worksheet.applyRangeFilterAsync("Order Date", {
                min: minToApply,
                max: experimentalFutureDate
            });

            reportHtml += `<br><span style="color:green; font-weight:bold;">✅ הניסוי בוצע בהצלחה! הפילטר נמתח למקסימום.</span>`;
            document.getElementById("statusMessage").innerHTML = reportHtml;

        } catch (error) {
            document.getElementById("statusMessage").innerHTML += `<br><span style="color:red;">❌ שגיאה בניסוי: ${error.message}</span>`;
            console.error("Experiment error:", error);
        }
    }
})();
