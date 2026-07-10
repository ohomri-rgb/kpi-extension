(function() {
    const VERSION = "v3.2.0-SafeDynamic";
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
            
            // --- שלב 2: חילוץ ושמירה של הטווח המקורי מהפילטר הקיים כדי לא לקצר אותו ---
            let originalMinDate = targetFilter.minValue ? new Date(targetFilter.minValue.value) : new Date(2023, 0, 1);
            if (isNaN(originalMinDate.getTime())) {
                originalMinDate = new Date(2023, 0, 1); // Fallback למקרה של קריאה משובשת
            }

            // --- שלב 3: מתיחה זמנית קדימה לחשיפת הנתונים החדשים ---
            let temporaryFutureDate = new Date(2030, 11, 31);
            await targetWorksheet.applyRangeFilterAsync(targetFilterName, {
                min: originalMinDate,
                max: temporaryFutureDate
            });

            // --- שלב 4: שליפת הדאטה המוצג וניתוח תאריכים מתקדם ---
            let trueVisibleMaxDate = null;
            const summaryData = await targetWorksheet.getSummaryDataAsync();
            const dateColumn = summaryData.columns.find(col => col.fieldName === targetFilterName);
            
            if (dateColumn && summaryData.data.length > 0) {
                const dateColumnIndex = dateColumn.index;
                let maxTime = 0;
                
                summaryData.data.forEach(row => {
                    const rawCell = row[dateColumnIndex];
                    if (!rawCell) return;

                    let parsedDate = new Date(rawCell.value);
                    
                    // מנגנון הגנה: אם ה-value הנייטיבי לא פוענח, מפרקים את ה-formattedValue (dd/mm/yyyy)
                    if (isNaN(parsedDate.getTime()) && rawCell.formattedValue) {
                        const parts = rawCell.formattedValue.split(/[-/.]/);
                        if (parts.length === 3) {
                            // בודק אם הפורמט הוא יום/חודש/שנה ומסדר עבור ה-Constructor של JS
                            const day = parseInt(parts[0], 10);
                            const month = parseInt(parts[1], 10) - 1;
                            const year = parseInt(parts[2], 10);
                            const testDate = new Date(year, month, day);
                            if (!isNaN(testDate.getTime())) {
                                parsedDate = testDate;
                            }
                        }
                    }

                    // השוואה למציאת התאריך המקסימלי
                    if (!isNaN(parsedDate.getTime())) {
                        if (parsedDate.getTime() > maxTime) {
                            maxTime = parsedDate.getTime();
                            trueVisibleMaxDate = parsedDate;
                        }
                    }
                });
            }

            // הגנה קריטית: אם השליפה נכשלה, לא נועלים על היום אלא נשארים פתוחים על המקסימום המוחלט
            if (!trueVisibleMaxDate) {
                trueVisibleMaxDate = temporaryFutureDate; 
            }

            // --- שלב 5: נעילה מחדש תוך שמירה מלאה על נקודת המינימום המקורית ---
            await targetWorksheet.applyRangeFilterAsync(targetFilterName, {
                min: originalMinDate,
                max: trueVisibleMaxDate
            });

            // --- שלב 6: עדכון ה-UI למשתמש ---
            renderUI(trueVisibleMaxDate.toLocaleDateString('he-IL'), targetFilterName, targetWorksheet.name);

        } catch (error) {
            renderError(`שגיאה בתהליך הסנכרון האוטומטי: ${error.message}`);
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
                    גיליון: <strong>${sheetName}</strong><br>
                    פילטר: <strong>${filterName}</strong>
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
                <strong>❌ שגיאה בסנכרון הדינמי:</strong><br>${msg}
            </div>
        `;
    }
})();
