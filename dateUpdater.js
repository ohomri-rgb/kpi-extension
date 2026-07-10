(function() {
    const VERSION = "v3.0.0-Dynamic";
    let attempts = 0;
    const MAX_ATTEMPTS = 400;

    const checkTableauLoaded = setInterval(() => {
        attempts++;
        if (typeof window.tableau !== 'undefined' && window.tableau.extensions) {
            clearInterval(checkTableauLoaded);
            
            if (!document.getElementById("statusMessage")) {
                console.error(`[Tableau Extension] ❌ Missing HTML element with ID 'statusMessage'`);
                return;
            }
            
            autoDiscoverAndSync();
        } else if (attempts >= MAX_ATTEMPTS) {
            clearInterval(checkTableauLoaded);
            console.error(`[Tableau Extension] Timeout loading Tableau Extensions API.`);
        }
    }, 50);

    async function autoDiscoverAndSync() {
        try {
            await window.tableau.extensions.initializeAsync();
            const dashboard = window.tableau.extensions.dashboardContent.dashboard;
            const dashName = dashboard.name;

            let targetWorksheet = null;
            let targetFilterName = null;

            // --- שלב 1: סריקה אוטומטית לזיהוי הפילטר והגיליון ---
            for (const worksheet of dashboard.worksheets) {
                const filters = await worksheet.getFiltersAsync();
                // מחפשים פילטר שהוא מסוג Range (תאריך או מספר)
                const rangeFilter = filters.find(f => f.filterType === window.tableau.FilterType.Range);
                
                if (rangeFilter) {
                    targetWorksheet = worksheet;
                    targetFilterName = rangeFilter.fieldName;
                    break; // מצאנו את פילטר הטווח הראשון, עוצרים את הסריקה
                }
            }

            // הגנה: אם לא נמצא שום פילטר טווח בדשבורד
            if (!targetWorksheet || !targetFilterName) {
                renderError(`לא נמצא פילטר מסוג Range (סליידר תאריך/מספר) באף אחד מהגיליונות בדשבורד.`);
                return;
            }

            console.log(`[Dynamic Sync] Found target in Dashboard: "${dashName}" | Sheet: "${targetWorksheet.name}" | Filter: "${targetFilterName}"`);

            // --- שלב 2: מתיחה זמנית ל-2030 לחשיפת הדאטה ---
            let initialMinDate = new Date(2024, 0, 1); 
            let temporaryFutureDate = new Date(2030, 11, 31);

            await targetWorksheet.applyRangeFilterAsync(targetFilterName, {
                min: initialMinDate,
                max: temporaryFutureDate
            });

            // --- שלב 3: שליפת הדאטה המוצג בפועל באותו גיליון ---
            let trueVisibleMaxDate = null;
            const summaryData = await targetWorksheet.getSummaryDataAsync();
            
            const dateColumn = summaryData.columns.find(col => col.fieldName === targetFilterName);
            
            if (dateColumn && summaryData.data.length > 0) {
                const dateColumnIndex = dateColumn.index;
                let maxTime = 0;
                
                summaryData.data.forEach(row => {
                    const cellValue = row[dateColumnIndex].value;
                    if (cellValue) {
                        const parsedDate = new Date(cellValue);
                        if (!isNaN(parsedDate.getTime())) {
                            if (parsedDate.getTime() > maxTime) {
                                maxTime = parsedDate.getTime();
                                trueVisibleMaxDate = parsedDate;
                            }
                        }
                    }
                });
            }

            if (!trueVisibleMaxDate) {
                trueVisibleMaxDate = new Date();
            }

            // --- שלב 4: נעילה מחדש על המקס האמיתי הגלוי ---
            await targetWorksheet.applyRangeFilterAsync(targetFilterName, {
                min: initialMinDate,
                max: trueVisibleMaxDate
            });

            // --- שלב 5: הצגת הממשק למשתמש עם שמות המקור הדינמיים ---
            renderUI(trueVisibleMaxDate.toLocaleDateString('he-IL'), targetFilterName, targetWorksheet.name);

        } catch (error) {
            renderError(`שגיאה בתהליך הסנכרון הדינמי: ${error.message}`);
        }
    }

    function renderUI(formattedDate, filterName, sheetName) {
        const container = document.getElementById("statusMessage");
        if (!container) return;
        
        container.innerHTML = `
            <style>
                @keyframes pulse {
                    0% { transform: scale(0.95); opacity: 0.5; }
                    50% { transform: scale(1.1); opacity: 1; }
                    100% { transform: scale(0.95); opacity: 0.5; }
                }
                .status-card {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
                    direction: rtl;
                    text-align: right;
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    padding: 14px;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                    max-width: 290px;
                    margin: 0 auto;
                }
                .status-header {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 10px;
                }
                .status-dot {
                    width: 8px;
                    height: 8px;
                    background-color: #10b981;
                    border-radius: 50%;
                    display: inline-block;
                    animation: pulse 2s infinite ease-in-out;
                }
                .status-title {
                    color: #0f172a;
                    font-weight: 600;
                    font-size: 13px;
                }
                .meta-info {
                    font-size: 11px;
                    color: #64748b;
                    margin-bottom: 8px;
                    line-height: 1.4;
                }
                .date-display {
                    background: #f8fafc;
                    border: 1px dashed #cbd5e1;
                    border-radius: 6px;
                    padding: 8px 12px;
                    text-align: center;
                }
                .date-label {
                    font-size: 11px;
                    color: #64748b;
                    display: block;
                    margin-bottom: 2px;
                }
                .date-value {
                    font-size: 18px;
                    font-weight: 700;
                    color: #1e293b;
                }
            </style>
            
            <div class="status-card">
                <div class="status-header">
                    <span class="status-dot"></span>
                    <span class="status-title">סנכרון פילטר אוטומטי</span>
                </div>
                <div class="meta-info">
                    גיליון זוהה: <strong>${sheetName}</strong><br>
                    פילטר זוהה: <strong>${filterName}</strong>
                </div>
                <div class="date-display">
                    <span class="date-label">טווח עליון מכויל ל-</span>
                    <span class="date-value">${formattedDate}</span>
                </div>
            </div>
        `;
    }

    function renderError(msg) {
        const container = document.getElementById("statusMessage");
        if (!container) return;
        
        container.innerHTML = `
            <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; color: #dc2626; padding: 12px; border: 1px solid #fca5a5; background: #fef2f2; border-radius: 6px; font-size: 13px;">
                <strong>❌ שגיאה בסריקה הדינמית:</strong><br>${msg}
            </div>
        `;
    }
})();
