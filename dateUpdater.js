(function() {
    const MAX_ATTEMPTS = 400;
    let attempts = 0;

    const poll = setInterval(() => {
        attempts++;
        if (window.tableau?.extensions) {
            clearInterval(poll);
            if (!document.getElementById("statusMessage")) {
                console.error(`[Tableau Extension] ❌ Missing HTML element with ID 'statusMessage'`);
                return;
            }
            autoDiscoverAndSync();
        } else if (attempts >= MAX_ATTEMPTS) {
            clearInterval(poll);
            console.error(`[Tableau Extension] Timeout loading Tableau Extensions API.`);
        }
    }, 50);

    async function autoDiscoverAndSync() {
        try {
            await tableau.extensions.initializeAsync();
            const { worksheets } = tableau.extensions.dashboardContent.dashboard;

            let ws = null, filter = null;
            for (const w of worksheets) {
                const f = (await w.getFiltersAsync()).find(f => f.filterType === tableau.FilterType.Range);
                if (f) { ws = w; filter = f; break; }
            }
            if (!ws || !filter) return renderError(`לא נמצא פילטר מסוג Range (סליידר) באף גיליון בדשבורד.`);

            const filterName = filter.fieldName;

            // מינימום מוחלט (עם פולבק)
            let minDate = null;
            try {
                const domain = await filter.getDomainAsync();
                if (domain?.min?.value) minDate = new Date(domain.min.value);
            } catch { console.warn("[Tableau Extension] getDomainAsync failed, using filter config fallback."); }
            if (!minDate || isNaN(minDate)) {
                minDate = filter.minValue ? new Date(filter.minValue.value) : new Date(2023, 0, 1);
                if (isNaN(minDate)) minDate = new Date(2023, 0, 1);
            }

            // מתיחה זמנית ל-2030 כדי לחשוף דאטה חדש
            await ws.applyRangeFilterAsync(filterName, { min: minDate, max: new Date(2030, 11, 31) });

            // זיהוי המקסימום האמיתי מתוך הדאטה
            let maxDate = null;
            const summary = await ws.getSummaryDataAsync();
            const dateCol = summary.columns.find(c =>
                c.dataType === 'date' || c.dataType === 'date-time' ||
                c.fieldName.toLowerCase().includes('date') || c.fieldName === filterName);

            if (dateCol && summary.data.length) {
                let maxTime = 0;
                for (const row of summary.data) {
                    const cell = row[dateCol.index];
                    if (!cell) continue;

                    let d = new Date(cell.value);
                    if (isNaN(d) && cell.formattedValue) {
                        const [p1, p2, p3] = cell.formattedValue.split(/[-/.]/).map(Number);
                        const t = new Date(p3, p2 - 1, p1);
                        if (!isNaN(t)) d = t;
                    }
                    if (!isNaN(d) && d.getTime() > maxTime) { maxTime = d.getTime(); maxDate = d; }
                }
            }
            if (!maxDate) {
                maxDate = filter.maxValue ? new Date(filter.maxValue.value) : new Date();
                if (isNaN(maxDate)) maxDate = new Date();
            }

            // נעילה סופית לטווח האמיתי
            await ws.applyRangeFilterAsync(filterName, { min: minDate, max: maxDate });

            renderUI(maxDate.toLocaleDateString('he-IL'), filterName, ws.name);
        } catch (err) {
            renderError(`שגיאה בתהליך הסנכרון האוטומטי: ${err.message}`);
        }
    }

    const style = `
        <style>
            @keyframes pulse { 0%{transform:scale(.95);opacity:.5} 50%{transform:scale(1.1);opacity:1} 100%{transform:scale(.95);opacity:.5} }
            .status-card{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;direction:rtl;text-align:right;background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:14px;box-shadow:0 4px 6px -1px rgba(0,0,0,.05);max-width:290px;margin:0 auto}
            .status-header{display:flex;align-items:center;gap:8px;margin-bottom:10px}
            .status-dot{width:8px;height:8px;background:#10b981;border-radius:50%;display:inline-block;animation:pulse 2s infinite ease-in-out}
            .status-title{color:#0f172a;font-weight:600;font-size:13px}
            .meta-info{font-size:11px;color:#64748b;margin-bottom:8px;line-height:1.4}
            .date-display{background:#f8fafc;border:1px dashed #cbd5e1;border-radius:6px;padding:8px 12px;text-align:center}
            .date-label{font-size:11px;color:#64748b;display:block;margin-bottom:2px}
            .date-value{font-size:18px;font-weight:700;color:#1e293b}
        </style>`;

    function renderUI(date, filterName, sheetName) {
        const c = document.getElementById("statusMessage");
        if (!c) return;
        c.innerHTML = `${style}
            <div class="status-card">
                <div class="status-header"><span class="status-dot"></span><span class="status-title">סנכרון פילטר אוטומטי</span></div>
                <div class="meta-info">גיליון: <strong>${sheetName}</strong><br>פילטר: <strong>${filterName}</strong></div>
                <div class="date-display"><span class="date-label">טווח עליון מכויל ל-</span><span class="date-value">${date}</span></div>
            </div>`;
    }

    function renderError(msg) {
        const c = document.getElementById("statusMessage");
        if (!c) return;
        c.innerHTML = `<div style="font-family:Arial,sans-serif;direction:rtl;text-align:right;color:#dc2626;padding:12px;border:1px solid #fca5a5;background:#fef2f2;border-radius:6px;font-size:13px"><strong>❌ שגיאה בסנכרון הדינמי:</strong><br>${msg}</div>`;
    }
})();
