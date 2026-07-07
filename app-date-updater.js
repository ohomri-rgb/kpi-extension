(function() {
    const VERSION = "v1.1.0";
    
    // דגל שימנע ריצה כפולה במהלך חיי הסשן של האקסטנשיין
    let hasUpdatedDate = false;

    const checkTableauLoaded = setInterval(() => {
        if (typeof window.tableau !== 'undefined' && window.tableau.extensions) {
            clearInterval(checkTableauLoaded);
            initializeDateUpdater();
        }
    }, 50);

    function initializeDateUpdater() {
        window.tableau.extensions.initializeAsync().then(() => {
            // הגנה מפני ריצה חוזרת אם האקסטנשיין מאותחל מחדש משום מה
            if (hasUpdatedDate) return; 

            const dashboard = window.tableau.extensions.dashboardContent.dashboard;
            
            // רצים על כל הגיליונות בדשבורד כדי למצוא את פילטר התאריך
            const promises = dashboard.worksheets.map(worksheet => {
                return worksheet.getFiltersAsync().then(filters => {
                    // מחפשים פילטר שהוא מסוג Range ומכיל תאריכים
                    const dateRangeFilter = filters.find(filter => 
                        filter.filterType === window.tableau.FilterType.Range && 
                        (filter.dataType === window.tableau.DataType.Date || filter.dataType === window.tableau.DataType.DateTime)
                    );

                    if (dateRangeFilter) {
                        // יצירת תאריך של היום (מקומי) ללא שעות
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);

                        console.log(`Found date range filter: "${dateRangeFilter.fieldName}" on worksheet "${worksheet.name}". Updating max value to today.`);

                        // עדכון פילטר הטווח: משאירים את ה-min כפי שהוא (null) ומעדכנים רק את ה-max ליום הנוכחי
                        return worksheet.applyRangeFilterAsync(dateRangeFilter.fieldName, {
                            min: null, 
                            max: today
                        }).then(() => {
                            hasUpdatedDate = true; // סימון שהעדכון הצליח
                            addStatusToUI(`הפילטר "${dateRangeFilter.fieldName}" עודכן בהצלחה לתאריך של היום.`);
                            return true; // נמצא ועודכן
                        });
                    }
                    return false;
                });
            });

            // בודקים אם הצלחנו לעדכן לפחות פילטר אחד
            Promise.all(promises).then(results => {
                const updated = results.some(r => r === true);
                if (!updated) {
                    addStatusToUI("לא נמצא פילטר תאריכים מסוג טווח (Range) בדשבורד.");
                }
            });

        }).catch(error => {
            console.error("Error during Tableau init:", error);
            addStatusToUI("שגיאה באתחול האקסטנשיין.");
        });
    }

    function addStatusToUI(message) {
        const statusDiv = document.getElementById("statusMessage");
        if (statusDiv) {
            const timestamp = new Date().toLocaleTimeString();
            statusDiv.innerHTML = `[${timestamp}] ${message}`;
        }
    }
})();