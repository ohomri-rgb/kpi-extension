(function() {
    const VERSION = "v1.3.1";

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
                document.getElementById("statusMessage").innerHTML = `גרסה: ${VERSION}<br>❌ לא נמצא גיליון בשם Product Detail Sheet בדשבורד.`;
                return;
            }

            // 3. יצירת תאריך המקסימום של היום
            let maxDate = new Date();
            maxDate.setHours(0, 0, 0, 0);

            document.getElementById("statusMessage").innerHTML = `גרסה: ${VERSION}<br>⏳ מעדכן את הקצה הימני של Order Date ל-${maxDate.toLocaleDateString()}...`;

            // 4. החלת הפילטר בפורמט האובייקטים הרשמי של Tableau API 
            // הגדרת min: null בצורה הזו אומרת לטאבלו: "אל תיגע בצד שמאל, תשאיר אותו כמו שהוא".
            await worksheet.applyRangeFilterAsync("Order Date", {
                min: null,
                max: maxDate
            });

            document.getElementById("statusMessage").innerHTML = `גרסה: ${VERSION}<br>✅ <strong>הצלחה!</strong> הפילטר Order Date עודכן בהצלחה לתאריך של היום.`;

        } catch (error) {
            document.getElementById("statusMessage").innerHTML = `גרסה: ${VERSION}<br>❌ שגיאה בהחלת הפילטר: ${error.message}`;
            console.error("Direct update error:", error);
        }
    }
})();
