document.addEventListener("DOMContentLoaded", () => {
    const applyBtn = document.getElementById("apply-btn");
    const btnText = document.getElementById("btn-text");

    // 1. איתחול התוסף מול טאבלו
    tableau.extensions.initializeAsync().then(() => {
        console.log("Tableau Extension initialized!");
        
        // כברירת מחדל - ברגע שהתוסף עולה, מקפיאים את הדאטה
        autoPauseData();
    }).catch(err => {
        console.error("Error initializing extension:", err);
    });

    // פונקציית עזר להקפאה אוטומטית בתחילה
    async function autoPauseData() {
        try {
            await tableau.extensions.dashboardContent.dashboard.pauseAutomaticUpdatesAsync();
            console.log("Data updates successfully paused on start.");
        } catch (e) {
            console.error("Failed to pause on startup:", e);
        }
    }

    // 2. האזנה ללחיצה על הכפתור
    applyBtn.addEventListener("click", async () => {
        try {
            // משנים את הסטטוס הויזואלי ל"מעבד..."
            applyBtn.classList.add("playing");
            btnText.innerText = "מחיל עדכונים...";
            applyBtn.disabled = true;

            // א) מפעילים PLAY (זה מריץ את כל השאילתות שהצטברו)
            await tableau.extensions.dashboardContent.dashboard.resumeAutomaticUpdatesAsync();
            
            // ב) מיד לאחר מכן מחזירים ל-PAUSE
            await tableau.extensions.dashboardContent.dashboard.pauseAutomaticUpdatesAsync();

        } catch (error) {
            console.error("שגיאה בזמן העדכון:", error);
        } finally {
            // החזרת הכפתור למצב הרגיל שלו (פאוס/החל) בכל מקרה
            applyBtn.classList.remove("playing");
            btnText.innerText = "החל שינויים";
            applyBtn.disabled = false;
        }
    });
});