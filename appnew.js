document.addEventListener("DOMContentLoaded", () => {
    const applyBtn = document.getElementById("apply-btn");
    const btnText = document.getElementById("btn-text");

    tableau.extensions.initializeAsync().then(() => {
        console.log("Tableau Extension initialized successfully!");
        autoPauseData();
    }).catch(err => {
        console.error("Error initializing extension:", err);
    });

    // פונקציה להקפאה אוטומטית עם הנתיב המתוקן
    async function autoPauseData() {
        try {
            await tableau.extensions.dashboardContent.dashboard.automaticUpdates.pauseAsync();
            console.log("Data updates successfully paused on start.");
        } catch (e) {
            console.error("Failed to pause on startup:", e);
        }
    }

    // האזנה ללחיצה על כפתור ההחלה
    applyBtn.addEventListener("click", async () => {
        try {
            applyBtn.classList.add("playing");
            btnText.innerText = "מחיל עדכונים...";
            applyBtn.disabled = true;

            // 1. מפעילים את העדכונים (מריץ את השאילתות שנעצרו)
            await tableau.extensions.dashboardContent.dashboard.automaticUpdates.resumeAsync();
            
            // 2. מיד מחזירים למצב השהייה (Pause)
            await tableau.extensions.dashboardContent.dashboard.automaticUpdates.pauseAsync();

        } catch (error) {
            console.error("שגיאה בזמן העדכון:", error);
        } finally {
            applyBtn.classList.remove("playing");
            btnText.innerText = "החל שינויים";
            applyBtn.disabled = false;
        }
    });
});
