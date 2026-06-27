document.addEventListener("DOMContentLoaded", () => {
    const applyBtn = document.getElementById("apply-btn");
    const btnText = document.getElementById("btn-text");

    // הערכים שאתה רוצה להחיל (תחבר אותם בהמשך ל-HTML שלך)
    let selectedCategories = ["Furniture", "Technology"]; 
    let selectedSubCategories = ["Accessories", "Appliances"];

    tableau.extensions.initializeAsync().then(() => {
        console.log("Tableau Extension initialized successfully!");
    });

    applyBtn.addEventListener("click", async () => {
        try {
            applyBtn.classList.add("playing");
            btnText.innerText = "מחיל שינויים...";
            applyBtn.disabled = true;

            const dashboard = tableau.extensions.dashboardContent.dashboard;
            
            // כאן אתה חייב לרשום את השם המדויק של הגיליון (Worksheet) שבו ה-Sets נמצאים!
            // לפי צילום המסך שלך, הגיליון שרואים נקרא "Order Details" או "Product Detail Sheet"
            const targetWorksheet = dashboard.worksheets.find(ws => ws.name === "שם_הגיליון_המדויק_שלך");

            if (targetWorksheet) {
                // 1. עדכון ה-Category Set
                await targetWorksheet.updateSetValuesAsync(
                    "Category Set", 
                    selectedCategories, 
                    tableau.SetUpdateType.Replace
                );
                console.log("Category Set עודכן!");

                // 2. עדכון ה-Sub-Category Set
                await targetWorksheet.updateSetValuesAsync(
                    "Sub-Category Set", 
                    selectedSubCategories, 
                    tableau.SetUpdateType.Replace
                );
                console.log("Sub-Category Set עודכן!");
            } else {
                console.error("הגיליון שהגדרת לא נמצא בדשבורד. ודא שהשם תואם ב-100%.");
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
