(function() {
    const VERSION = "v3.5.0-Turbo";
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

            let targetWorksheet = null;
            let targetFilter = null;

            // --- שלב 1: סריקה וזיהוי פילטר הטווח הפעיל ---
            for (const worksheet of dashboard.worksheets) {
                const filters = await worksheet.getFiltersAsync();
                const rangeFilter = filters.find(f => f.filterType === window.tableau.FilterType.Range);
                
                if (rangeFilter) {
                    targetWorksheet = worksheet;
                    targetFilter = rangeFilter;
                    break;
                }
            }

            if (!targetWorksheet || !targetFilter) {
                renderError(`לא נמצא פילטר מסוג Range (סליידר) באף גיליון בדשבורד.`);
                return;
            }

            const targetFilterName = targetFilter.fieldName;
            
            // --- שלב 2: שליפת ה-Domain המלא (Min ו-Max המוחלטים) בפעולה אחת מהירה ---
            let absoluteMinDate = null;
            let absoluteMaxDate = null;

            try {
                const domainInfo = await targetFilter.getDomainAsync();
                if (domainInfo) {
                    if (domainInfo.min && domainInfo.min.value) {
                        absoluteMinDate = new Date(domainInfo.min.value);
                    }
                    if (domainInfo.max && domainInfo.max.value) {
                        absoluteMaxDate = new Date(domainInfo.max.value);
                    }
                }
            } catch (domainError) {
                console.warn("[Tableau Extension] Could not fetch domain via getDomainAsync, using fallback logic.");
            }

            // --- שלב 3: מנגנון הגנה (Fallback) רק אם ה-Domain API נכשל או חזר ריק ---
            if (!absoluteMinDate || isNaN(absoluteMinDate.getTime()) || !absoluteMaxDate || isNaN(absoluteMaxDate.getTime())) {
                
                // במקרה של כישלון, נשחזר את שיטת המתיחה המהירה, אך רק כמוצא אחרון
                absoluteMinDate = targetFilter.minValue ? new Date(targetFilter.minValue.value) : new Date(2023, 0, 1);
                
                let temporaryFutureDate = new Date(2030, 11, 31);
                await targetWorksheet.applyRangeFilterAsync(targetFilterName, {
                    min: absoluteMinDate,
                    max: temporaryFutureDate
                });

                const summaryData = await targetWorksheet.getSummaryDataAsync();
                const dateColumn = summaryData.columns.find(col => 
                    col.dataType === 'date' || col.dataType === 'date-time' || col.fieldName === targetFilterName
                );
                
                if (dateColumn && summaryData.data.length > 0) {
                    const dateColumnIndex = dateColumn.index;
                    let maxTime = 0;
                    summaryData.data.forEach(row => {
                        const rawCell = row[dateColumnIndex];
                        if (rawCell) {
                            let parsedDate = new Date(rawCell.value);
                            if (!isNaN(parsedDate.getTime()) && parsedDate.getTime() > maxTime) {
                                maxTime = parsedDate.getTime();
                                absoluteMaxDate = parsedDate;
                            }
                        }
                    });
                }
            }

            // הגנה סופית על ה-Max
            if (!absoluteMaxDate || isNaN(absoluteMaxDate.getTime())) {
                absoluteMaxDate = new Date();
            }
            if (!absoluteMinDate || isNaN(absoluteMinDate.getTime())) {
                absoluteMinDate = new Date(2023, 0, 1);
            }

            // --- שלב 4: עדכון יחיד וסופי של הפילטר (חוסך ריצה כפולה של הדשבורד) ---
            await targetWorksheet.applyRangeFilterAsync(targetFilterName, {
                min: absoluteMinDate,
                max: absoluteMaxDate
            });

            // --- שלב 5: עדכון ה-UI למשתמש ---
            renderUI(absoluteMaxDate.toLocaleDateString('he-IL'), targetFilterName, targetWorksheet.name);

        } catch (error) {
            renderError(`שגיאה בתהליך הסנכרון המהיר: ${error.message}`);
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
                    <span class="status-title">סנכרון מהיר הושלם</span>
                </div>
                <div class="meta-info">
                    גיליון: <strong>${sheetName}</strong><br>
                    פילטר: <strong>${filterName}</strong>
                </div>
                <div class="date-display">
                    <span class="date-label">הסליידר עודכן לקצה העדכני:</span>
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
                <strong>❌ שגיאה בסנכרון:</strong><br>${msg}
            </div>
        `;
    }
})();
