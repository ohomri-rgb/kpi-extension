document.addEventListener("DOMContentLoaded", () => {
    const applyBtn = document.getElementById("apply-btn");
    const btnText = document.getElementById("btn-text");

    // הערכים שיוחלו בלחיצה (תקשר אותם לממשק שלך בהמשך)
    let selectedCategories = ["Furniture", "Technology"]; 
    let selectedSubCategories = ["Accessories", "Appliances"];

    tableau.extensions.initializeAsync().then(() => {
        console.log("Tableau Extension initialized successfully!");
    }).catch(err => {
        console.error("Error during initialization:", err);
    });

    applyBtn.addEventListener("click", async () => {
        try {
            applyBtn.classList.add("playing");
            btnText.innerText = "מחיל שינויים...";
            applyBtn.disabled = true;

            const dashboard = tableau.extensions.dashboardContent.dashboard;
            const targetWorksheet = dashboard.worksheets.find(ws => ws.name === "Product Detail Sheet");

            if (targetWorksheet) {
                console.log("הגיליון Product Detail Sheet נמצא, מעדכן ערכים...");

                // 1. עדכון Category Set באמצעות מחרוזת ישירה "replace"
                await targetWorksheet.updateSetValuesAsync(
                    "Category Set", 
                    selectedCategories, 
                    "replace"
                );
                console.log("Category Set עודכן!");

                // 2. עדכון Sub-Category Set באמצעות מחרוזת ישירה "replace"
                await targetWorksheet.updateSetValuesAsync(
                    "Sub-Category Set", 
                    selectedSubCategories, 
                    "replace"
                );
                console.log("Sub-Category Set עודכן!");

            } else {
                console.error("הגיליון 'Product Detail Sheet' לא נמצא בדשבורד.");
            }

        } catch (error) {
            console.error("שגיאה בזמן עדכון ה-Sets:", error);
        } finally {
            applyBtn.classList.remove("playing");
            btnText.innerText = "החל שינויים";
            applyBtn.disabled = false;
        }
    });
});
