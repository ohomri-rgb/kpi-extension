document.addEventListener("DOMContentLoaded", () => {
    const applyBtn = document.getElementById("apply-btn");
    const btnText = document.getElementById("btn-text");

    // הערכים שאתה רוצה להחיל בלחיצה
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
            
            const categorySetName = "Category Set";
            const subCategorySetName = "Sub-Category Set";

            let categoryWorksheet = null;
            let subCategoryWorksheet = null;

            console.log("מתחיל סריקה אוטומטית של הגיליונות עבור שני ה-Sets...");

            // מעבר על כל הגיליונות בדשבורד
            for (const ws of dashboard.worksheets) {
                try {
                    // שליפת הקבוצות (Sets) הפעילות בגיליון הנוכחי
                    const dashboardSets = await ws.getSetValuesAsync();
                    
                    // בדיקה האם ה-Category Set נמצא בגיליון הזה
                    const hasCategorySet = dashboardSets.some(s => s.setName === categorySetName);
                    if (hasCategorySet && !categoryWorksheet) {
                        categoryWorksheet = ws;
                        console.log(`Category Set נמצא בגיליון: ${ws.name}`);
                    }
                    
                    // בדיקה האם ה-Sub-Category Set נמצא בגיליון הזה
                    const hasSubCategorySet = dashboardSets.some(s => s.setName === subCategorySetName);
                    if (hasSubCategorySet && !subCategoryWorksheet) {
                        subCategoryWorksheet = ws;
                        console.log(`Sub-Category Set נמצא בגיליון: ${ws.name}`);
                    }

                    if (categoryWorksheet && subCategoryWorksheet) break;

                } catch (err) {
                    // דילוג על אובייקטים ריקים/עיצוביים
                    console.warn(`דילוג על גיליון ${ws.name}:`, err);
                }
            }

            // עדכון Category Set
            if (categoryWorksheet) {
                await categoryWorksheet.updateSetValuesAsync(
                    categorySetName, 
                    selectedCategories, 
                    tableau.SetUpdateType.Replace
                );
                console.log("Category Set עודכן בהצלחה בטאבלו!");
            } else {
                console.error(`שגיאה: לא נמצא גיליון המשתמש ב-${categorySetName}`);
            }

            // עדכון Sub-Category Set
            if (subCategoryWorksheet) {
                await subCategoryWorksheet.updateSetValuesAsync(
                    subCategorySetName, 
                    selectedSubCategories, 
                    tableau.SetUpdateType.Replace
                );
                console.log("Sub-Category Set עודכן בהצלחה בטאבלו!");
            } else {
                console.error(`שגיאה: לא נמצא גיליון המשתמש ב-${subCategorySetName}`);
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
