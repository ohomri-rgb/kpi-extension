document.addEventListener("DOMContentLoaded", () => {
    const applyBtn = document.getElementById("apply-btn");
    const btnText = document.getElementById("btn-text");

    // משתנה מקומי שיחזיק את הערכים שהמשתמש בחר בתוך התוסף (לדוגמה)
    // אתה תמלא אותו דינמית לפי מה שהמשתמש מסמן ב-HTML שלך
    let selectedValues = ["Israel", "United States", "Canada"]; 

    tableau.extensions.initializeAsync().then(() => {
        console.log("Tableau Extension initialized!");
    });

    applyBtn.addEventListener("click", async () => {
        try {
            // 1. שינוי מצב ויזואלי של הכפתור
            applyBtn.classList.add("playing");
            btnText.innerText = "מחיל שינויים...";
            applyBtn.disabled = true;

            // 2. שליפת ה-Dashboard וה-Worksheets
            const dashboard = tableau.extensions.dashboardContent.dashboard;
            
            // תוספים חייבים לעדכן Set דרך Worksheet ספציפי שמכיל את ה-Set הזה או משתמש בו
            const targetWorksheet = dashboard.worksheets.find(ws => ws.name === "שם_הרקשיט_שלך");

            if (targetWorksheet) {
                // 3. העדכון האמיתי של ה-Set בטאבלו
                // Replace אומר שכל מה שבמערך ייכנס ל-Set, ומה שלא - יצא
                await targetWorksheet.updateSetValuesAsync(
                    "שם_הסד_שלך", 
                    selectedValues, 
                    tableau.SetUpdateType.Replace
                );
                console.log("ה-Set עודכן בהצלחה בטאבלו!");
            } else {
                console.error("ה-Worksheet המבוקש לא נמצא בדשבורד");
            }

        } catch (error) {
            console.error("שגיאה בזמן עדכון ה-Set:", error);
        } finally {
            // 4. החזרת הכפתור למצב הרגיל
            applyBtn.classList.remove("playing");
            btnText.innerText = "החל שינויים";
            applyBtn.disabled = false;
        }
    });
});
