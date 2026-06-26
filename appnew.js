document.addEventListener("DOMContentLoaded", () => {
    const applyBtn = document.getElementById("apply-btn");
    const btnText = document.getElementById("btn-text");

    tableau.extensions.initializeAsync().then(() => {
        console.log("Tableau Extension initialized!");
        autoPauseData();
    }).catch(err => {
        console.error("Error initializing extension:", err);
    });

    async function autoPauseData() {
        try {
            await tableau.extensions.dashboardContent.dashboard.pauseAutomaticUpdatesAsync();
            console.log("Data updates successfully paused on start.");
        } catch (e) {
            console.error("Failed to pause on startup:", e);
        }
    }

    applyBtn.addEventListener("click", async () => {
        try {
            applyBtn.classList.add("playing");
            btnText.innerText = "מחיל עדכונים...";
            applyBtn.disabled = true;

            await tableau.extensions.dashboardContent.dashboard.resumeAutomaticUpdatesAsync();
            await tableau.extensions.dashboardContent.dashboard.pauseAutomaticUpdatesAsync();

        } catch (error) {
            console.error("שגיאה בזמן העדכון:", error);
        } finally {
            applyBtn.classList.remove("playing");
            btnText.innerText = "החל שינויים";
            applyBtn.disabled = false;
        }
    });
});