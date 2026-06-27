// מערך זמני לשמירת הבחירות של המשתמש בתוך ה-Extension (לפני ה-Apply)
let selectedSegments = [];   // דוגמה לערכים זמניים: ['Consumer', 'Corporate']
let selectedCategories = []; // דוגמה לערכים זמניים: ['Furniture', 'Technology']

// 1. אתחול ה-Extension עם עליית ה-Dashboard
tableau.extensions.initializeAsync().then(function () {
    console.log("Superstore Extension Ready.");
    // כאן הקוד שלך ירנדר את תיבות הסימון (Checkboxes) של ה-UI
});

// 2. פונקציה שמדמה בחירה של משתמש ב-UI (מעדכנת רק את ה-State המקומי ב-JS)
function userChangedUISelection(type, valuesArray) {
    if (type === 'segment') {
        selectedSegments = valuesArray;
    } else if (type === 'category') {
        selectedCategories = valuesArray;
    }
    // שים לב: בשלב זה טאבלו לא יודע כלום ולא מתרחש שום רענון!
}

// 3. כפתור ה-APPLY ALL האמיתי
async function onApplyAllClick() {
    const dashboard = tableau.extensions.dashboardContent.dashboard;
    
    // השגת אובייקטי הפרמטרים מטאבלו
    const parameters = await dashboard.getParametersAsync();
    
    // מציאת הפרמטרים הספציפיים שלנו מתוך הרשימה
    const segmentParam = parameters.find(p => p.name === 'P_Segment_List');
    const categoryParam = parameters.find(p => p.name === 'P_Category_List');
    
    // הכנת המחרוזות המופרדות בפסיקים (הפורמט הנדרש עבור אופרטור IN בטאבלו)
    const segmentString = selectedSegments.join(',');   // תוצאה: "Consumer,Corporate"
    const categoryString = selectedCategories.join(','); // תוצאה: "Furniture,Technology"
    
    // מערך ה-Promises לביצוע העדכון במקביל
    const updatePromises = [];
    
    if (segmentParam) {
        updatePromises.push(segmentParam.changeValueAsync(segmentString));
    }
    if (categoryParam) {
        updatePromises.push(categoryParam.changeValueAsync(categoryString));
    }
    
    try {
        // שליחת כל העדכונים בבת אחת - מונע הרצות חוזרות של ה-Dashboard
        await Promise.all(updatePromises);
        console.log("Dashboard refreshed once with all parameters!");
    } catch (error) {
        console.error("Error updating Superstore parameters via API:", error);
    }
}