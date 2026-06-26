document.addEventListener("DOMContentLoaded", () => {
    const applyBtn = document.getElementById("apply-btn");
    const btnText = document.getElementById("btn-text");

    tableau.extensions.initializeAsync().then(() => {
        console.log("Tableau Extension initialized successfully!");
        autoPauseData();
    }).catch(err => {
        console.error("Error initializing extension:", err);
    });

    // פונקציה להקפאה אוטומטית בהפעלה
    async function autoPauseData() {
        try {
            // בגרסה זו, הפונקציה יושבת ישירות תחת dashboardContent
            await tableau.extensions.dashboardContent.pauseAutomaticUpdatesAsync();
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

            // 1. מפעילים את העדכונים כדי להריץ את השינויים
            await tableau.extensions.dashboardContent.resumeAutomaticUpdatesAsync();
            
            // 2. מיד מחזירים למצב השהייה (Pause)
            await tableau.extensions.dashboardContent.pauseAutomaticUpdatesAsync();

        } catch (error) {
            console.error("שגיאה בזמן העדכון:", error);
        } finally {
            applyBtn.classList.remove("playing");
            btnText.innerText = "החל שינויים";
            applyBtn.disabled = false;
        }
    });
});
