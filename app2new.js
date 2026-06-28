// מחכים שהדפדפן יסיים לטעון את ה-DOM והספריות חיצוניות
document.addEventListener("DOMContentLoaded", function () {
    
    // בדיקת בטיחות שה-API של טאבלו אכן נטען בהצלחה
    if (typeof tableau !== 'undefined') {
        // אתחול ה-Extension מול הדשבורד
        tableau.extensions.initializeAsync().then(function () {
            console.log("Tableau Extension Initialized Successfully!");
            
            // הצמדת אירוע הלחיצה לכפתור ה-Apply
            document.getElementById('applyBtn').addEventListener('click', onApplyAllClick);
        }).catch(function (error) {
            console.error("Extension initialization failed:", error);
        });
    } else {
        console.error("Critical Error: Tableau Extensions API library was not loaded.");
    }
});

// פונקציית ה-Apply All שמבצעת את עדכון ה-Batch
async function onApplyAllClick() {
    try {
        // 1. איסוף הערכים שסומנו ב-HTML ע"י המשתמש
        const selectedSegments = Array.from(document.querySelectorAll('.segment-chk:checked')).map(el => el.value);
        const selectedCategories = Array.from(document.querySelectorAll('.category-chk:checked')).map(el => el.value);

        // 2. גישה לאובייקט הדשבורד הנוכחי בטאבלו
        const dashboard = tableau.extensions.dashboardContent.dashboard;
        
        // 3. משיכת כל הפרמטרים הקיימים בדשבורד
        const parameters = await dashboard.getParametersAsync();
        
        // 4. איתור הפרמטרים לפי השמות המדויקים שלהם בטאבלו
        // שונה לערכים שרואים אצלך במסך:
        const segmentParam = parameters.find(p => p.name === 'Segment Parameter');
        const categoryParam = parameters.find(p => p.name === 'Category Parameter');
        
        // בדיקת ניתוח קלה בקונסול כדי שתראה אם הוא מצא אותם
        console.log("Segment parameter found:", segmentParam ? "YES" : "NO");
        console.log("Category parameter found:", categoryParam ? "YES" : "NO");
        
        // 5. המרת מערך הבחירות למחרוזת פסיקים (עבור אופרטור IN)
        const segmentString = selectedSegments.join(',');
        const categoryString = selectedCategories.join(',');
        
        // 6. יצירת מערך Promises לעדכון מקבילי (Batch)
        const updatePromises = [];
        
        if (segmentParam) {
            updatePromises.push(segmentParam.changeValueAsync(segmentString));
        }
        if (categoryParam) {
            updatePromises.push(categoryParam.changeValueAsync(categoryString));
        }
        
        // 7. שליחת השינויים לטאבלו בבת אחת ומניעת ריצות ביניים
        await Promise.all(updatePromises);
        console.log("Batch update completed! Dashboard refreshed once.");
        
    } catch (error) {
        console.error("Error during applyAll operation:", error);
    }
}
