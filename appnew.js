document.addEventListener("DOMContentLoaded", () => {
    const applyBtn = document.getElementById("apply-btn");
    const btnText = document.getElementById("btn-text");

    // 1. הערכים שאתה מנהל בתוסף עבור כל קבוצה (דוגמה)
    // אתה תמלא את המערכים האלו דינמית מתוך ממשק ה-HTML שלך
    let selectedCategories = ["Technology", "Office Supplies"]; 
    let selectedSubCategories = ["Phones", "Chairs", "Paper"];

    tableau.extensions.initializeAsync().then(() => {
        console.log("Tableau Extension initialized successfully!");
    });

    applyBtn.addEventListener("click", async () => {
        try {
            applyBtn.classList.add("playing");
            btnText.innerText = "מחיל שינויים...";
            applyBtn.disabled = true;

            const dashboard = tableau.extensions.dashboardContent.dashboard;
            
            // הגדרת השמות המדויקים של ה-Sets כפי שהם מופיעים בטאבלו
            const categorySetName = "Category Set";
            const subCategorySetName = "Sub-Category Set";

            // אובייקטים שיחזיקו את הגיליונות שמצאנו עבור כל סט
            let categoryWorksheet = null;
            let subCategoryWorksheet = null;

            console.log("מתחיל סריקה אוטומטית של הגיליונות עבור שני ה-Sets...");

            // 2. סריקת הגיליונות למציאת המיקום של ה-Sets
            for (const ws of dashboard.worksheets) {
                try {
                    const filters = await ws.getFiltersAsync();
                    
                    // בדיקה עבור Category Set
                    if (!categoryWorksheet && filters.some(f => f.fieldName === categorySetName)) {
                        categoryWorksheet = ws;
                        console.log(`Category Set נמצא בגיליון: ${ws.name}`);
                    }
                    
                    // בדיקה עבור Sub-Category Set
                    if (!subCategoryWorksheet && filters.some(f => f.fieldName === subCategorySetName)) {
                        subCategoryWorksheet = ws;
                        console.log(`Sub-Category Set נמצא בגיליון: ${ws.name}`);
                    }

                    // אם מצאנו את שניהם, אין צורך להמשיך לסרוק את שאר הדשבורד
                    if (categoryWorksheet && subCategoryWorksheet) break;

                } catch (err) {
                    console.warn(`דילוג על גיליון ${ws.name} בשל מגבלת גישה.`);
                }
            }

            // 3. עדכון Category Set (אם נמצא)
            if (categoryWorksheet) {
                await categoryWorksheet.updateSetValuesAsync(
                    categorySetName, 
                    selectedCategories, 
                    tableau.SetUpdateType.Replace
                );
                console.log("Category Set עודכן בהצלחה!");
            } else {
                console.error(`לא נמצא גיליון המשתמש ב-${categorySetName}`);
            }

            // 4. עדכון Sub-Category Set (אם נמצא)
            if (subCategoryWorksheet) {
                await subCategoryWorksheet.updateSetValuesAsync(
                    subCategorySetName, 
                    selectedSubCategories, 
                    tableau.SetUpdateType.Replace
                );
                console.log("Sub-Category Set עודכן בהצלחה!");
            } else {
                console.error(`לא נמצא גיליון המשתמש ב-${subCategorySetName}`);
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
