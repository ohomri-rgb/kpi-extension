document.addEventListener("DOMContentLoaded", () => {
    const applyBtn = document.getElementById("apply-btn");
    const btnText = document.getElementById("btn-text");
    let dashboardObj = null;

    tableau.extensions.initializeAsync().then(() => {
        console.log("Tableau Extension initialized successfully!");
        dashboardObj = tableau.extensions.dashboardContent;
        
        // מפעילים השהייה אוטומטית מיד כשהתוסף עולה
        autoPauseData();
    }).catch(err => {
        console.error("Error initializing extension:", err);
    });

    // פונקציה דינמית לביצוע PAUSE
    async function autoPauseData() {
        try {
            if (!dashboardObj) return;

            // בדיקה 1: האם הפונקציה יציבה ישירות על dashboardContent (גרסאות ענן/שרת נפוצות)
            if (typeof dashboardObj.pauseAutomaticUpdatesAsync === "function") {
                await dashboardObj.pauseAutomaticUpdatesAsync();
                console.log("Paused via dashboardContent");
            } 
            // בדיקה 2: האם היא יושבת תחת automaticUpdates של ה-dashboard
            else if (dashboardObj.dashboard && dashboardObj.dashboard.automaticUpdates && typeof dashboardObj.dashboard.automaticUpdates.pauseAsync === "function") {
                await dashboardObj.dashboard.automaticUpdates.pauseAsync();
                console.log("Paused via automaticUpdates");
            } 
            // בדיקה 3: גרסאות דסקטופ ישנות יותר
            else if (dashboardObj.dashboard && typeof dashboardObj.dashboard.pauseAutomaticUpdatesAsync === "function") {
                await dashboardObj.dashboard.pauseAutomaticUpdatesAsync();
                console.log("Paused via dashboard");
            } else {
                console.error("לא נמצאה פונקציית Pause מתאימה ב-API של טאבלו.");
            }
        } catch (e) {
            console.error("שגיאה בזמן הקפאת הנתונים:", e);
        }
    }

    // פונקציה דינמית לביצוע RESUME (PLAY)
    async function resumeData() {
        if (!dashboardObj) return;

        if (typeof dashboardObj.resumeAutomaticUpdatesAsync === "function") {
            await dashboardObj.resumeAutomaticUpdatesAsync();
        } else if (dashboardObj.dashboard && dashboardObj.dashboard.automaticUpdates && typeof dashboardObj.dashboard.automaticUpdates.resumeAsync === "function") {
            await dashboardObj.dashboard.automaticUpdates.resumeAsync();
        } else if (dashboardObj.dashboard && typeof dashboardObj.dashboard.resumeAutomaticUpdatesAsync === "function") {
            await dashboardObj.dashboard.resumeAutomaticUpdatesAsync();
        }
    }

    // האזנה ללחיצה על הכפתור שלך
    applyBtn.addEventListener("click", async () => {
        try {
            applyBtn.classList.add("playing");
            btnText.innerText = "מחיל עדכונים...";
            applyBtn.disabled = true;

            // 1. מפעילים את העדכונים (מבצע את כל הפילטרים שהצטברו)
            await resumeData();
            
            // 2. מחזירים מיד למצב השהייה (Pause)
            await autoPauseData();

        } catch (error) {
            console.error("שגיאה בזמן החלת העדכון:", error);
        } finally {
            applyBtn.classList.remove("playing");
            btnText.innerText = "החל שינויים";
            applyBtn.disabled = false;
        }
    });
});
