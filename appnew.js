document.addEventListener("DOMContentLoaded", () => {
    const applyBtn = document.getElementById("apply-btn");
    const btnText = document.getElementById("btn-text");

    // הערכים שאתה רוצה להחיל (בהמשך תחבר אותם דינמית ל-HTML שלך)
    let selectedCategories = ["Furniture", "Technology"]; 
    let selectedSubCategories = ["Accessories", "Appliances"];

    tableau.extensions.initializeAsync().then(() => {
        console.log("Tableau Extension initialized successfully!");
    }).catch(err => {
        console.error("Error during initialization:", err);
    });

    applyBtn.addEventListener("click", async () => {
        try {
            // שינוי מצב ויזואלי של הכפתור בזמן הריצה
            applyBtn.classList.add("playing");
            btnText.innerText = "מחיל שינויים...";
            applyBtn.disabled = true;

            const dashboard = tableau.extensions.dashboardContent.dashboard;
            
            // פנייה ישירה לגיליון הנכון לפי השם שנתת
            const targetWorksheet = dashboard.worksheets.find(ws => ws.name === "Product Detail Sheet");

            if (targetWorksheet) {
                console.log("הגיליון Product Detail Sheet נמצא, מתחיל עדכון ה-Sets...");

                // 1. עדכון ה-Category Set
                await targetWorksheet.updateSetValuesAsync(
                    "Category Set", 
                    selectedCategories, 
                    tableau.SetUpdateType.Replace
                );
                console.log("Category Set עודכן בהצלחה!");

                // 2. עדכון ה-Sub-Category Set
                await targetWorksheet.updateSetValuesAsync(
                    "Sub-Category Set", 
                    selectedSubCategories, 
                    tableau.SetUpdateType.Replace
                );
                console.log("Sub-Category Set עודכן בהצלחה!");

            } else {
                console.error("שגיאה: הגיליון 'Product Detail Sheet' לא נמצא בדשבורד הנוכחי. ודא שהשם מדויק ב-100%.");
            }

        } catch (error) {
            console.error("שגיאה בזמן עדכון ה-Sets:", error);
        } finally {
            // החזרת הכפתור למצב רגיל
            applyBtn.classList.remove("playing");
            btnText.innerText = "החל שינויים";
            applyBtn.disabled = false;
        }
    });
});
