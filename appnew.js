document.addEventListener("DOMContentLoaded", () => {
    const applyBtn = document.getElementById("apply-btn");
    const btnText = document.getElementById("btn-text");

    // מערך הערכים שאתה מנהל בתוסף (דוגמה)
    let selectedValues = ["Israel", "United States", "Canada"]; 

    tableau.extensions.initializeAsync().then(() => {
        console.log("Tableau Extension initialized successfully!");
    });

    applyBtn.addEventListener("click", async () => {
        try {
            applyBtn.classList.add("playing");
            btnText.innerText = "מחיל שינויים...";
            applyBtn.disabled = true;

            const dashboard = tableau.extensions.dashboardContent.dashboard;
            const setNameToFind = "שם_הסד_שלך"; // <-- שנה לשם ה-Set האמיתי שלך בטאבלו
            let targetWorksheet = null;

            console.log("מתחיל סריקה אוטומטית של גיליונות בדשבורד...");

            // 1. לולאה שעוברת על כל הגיליונות בדשבורד כדי למצוא מי משתמש ב-Set
            for (const ws of dashboard.worksheets) {
                try {
                    // שליפת המסננים/קבוצות הפעילים בגיליון הנוכחי
                    const filters = await ws.getFiltersAsync();
                    
                    // בדיקה האם אחד מהם תואם לשם ה-Set שלך
                    const hasSet = filters.some(f => f.fieldName === setNameToFind);
                    
                    if (hasSet) {
                        targetWorksheet = ws;
                        console.log(`ה-Set נמצא! הגיליון האחראי עליו הוא: ${ws.name}`);
                        break; // מצאנו, אפשר לעצור את הלולאה
                    }
                } catch (err) {
                    // גיליונות מסוימים (כמו אובייקטים ריקים או טקסט) עלולים לזרוק שגיאה ב-getFilters, נדלג עליהם בבטחה
                    console.warn(`לא ניתן היה לסרוק את הגיליון ${ws.name}, ממשיך לגיליון הבא.`);
                }
            }

            // 2. אם מצאנו את הגיליון הנכון - מעדכנים אותו
            if (targetWorksheet) {
                await targetWorksheet.updateSetValuesAsync(
                    setNameToFind, 
                    selectedValues, 
                    tableau.SetUpdateType.Replace
                );
                console.log(`ה-Set [${setNameToFind}] עודכן בהצלחה דרך הגיליון ${targetWorksheet.name}!`);
            } else {
                console.error(`שגיאה: ה-Set בשם "${setNameToFind}" לא נמצא בשימוש באף אחד מהגיליונות בדשבורד הזה. ודא שהוא גרוע בתוך Filters או באחד הטאבים בתוך הדשבורד.`);
            }

        } catch (error) {
            console.error("שגיאה כללית בזמן החלת העדכון:", error);
        } finally {
            applyBtn.classList.remove("playing");
            btnText.innerText = "החל שינויים";
            applyBtn.disabled = false;
        }
    });
});
