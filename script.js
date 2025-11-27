// State
let appData = {
    title: 'OO組「XXXX」スクリプトシート',
    clipSetting: '100-001',
    currentDayId: 'day1',
    days: {
        'day1': { date: getTodayDate(), rows: [] }
    }
};

const STORAGE_KEY = 'scriptsheet_v2_data';

// Status Options
const STATUS_OPTS = [
    { value: '', label: '', class: 'status-blank' },
    { value: 'OK', label: 'OK', class: 'status-ok' },
    { value: 'Keep', label: 'Keep', class: 'status-keep' },
    { value: 'NG', label: 'NG', class: 'status-ng' },
    { value: '空', label: '空', class: 'status-kara' }
];

// Initialization
window.onload = () => {
    loadData();
    // Ensure current day exists
    if (!appData.days[appData.currentDayId]) {
        appData.currentDayId = Object.keys(appData.days)[0];
    }
    renderDaySelector();
    updateHeaderInputs();
    // フィルタチェックボックスを明示的にオフに設定
    const filterCheckbox = document.getElementById('filter-ok');
    if (filterCheckbox) {
        filterCheckbox.checked = false;
    }
    render();
};

// Save/Load
function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
}

function loadData() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
        let parsed = JSON.parse(data);

        // Migration: Move global date to current day if needed
        if (parsed.date !== undefined) {
            if (parsed.days[parsed.currentDayId]) {
                parsed.days[parsed.currentDayId].date = parsed.date;
            }
            delete parsed.date;
        }

        // Migration: Ensure all days have date property
        Object.keys(parsed.days).forEach(dayId => {
            if (parsed.days[dayId].date === undefined) {
                parsed.days[dayId].date = ''; // or derive from name if it was "Day 1"?
            }
            // Remove 'name' property as we will derive it from date or index
            if (parsed.days[dayId].name) {
                delete parsed.days[dayId].name;
            }
        });

        appData = parsed;
    }
}

function clearData() {
    if (confirm('全てのデータを削除しますか？')) {
        appData = {
            title: 'OO組「XXXX」スクリプトシート',
            clipSetting: '100-001',
            currentDayId: 'day1',
            days: { 'day1': { date: getTodayDate(), rows: [] } }
        };
        saveData();
        updateHeaderInputs();
        renderDaySelector();
        render();
    }
}

// Header Logic
function updateHeader() {
    appData.title = document.getElementById('header-title').value;
    const dateVal = document.getElementById('header-date').value;

    // Update current day's date
    if (appData.days[appData.currentDayId]) {
        appData.days[appData.currentDayId].date = dateVal;
    }

    saveData();
    renderDaySelector(); // Update selector labels
    updatePrintHeader();
}

function updateClipSetting() {
    // clip-start element removed from UI
    saveData();
}

function updateHeaderInputs() {
    document.getElementById('header-title').value = appData.title;

    const currentDay = appData.days[appData.currentDayId];
    if (currentDay) {
        document.getElementById('header-date').value = currentDay.date || '';
    }

    updatePrintHeader();
}

function updatePrintHeader() {
    const currentDay = appData.days[appData.currentDayId];
    const dateStr = currentDay ? currentDay.date : '';
    const printText = `${appData.title}    ${dateStr}`;
    document.body.setAttribute('data-print-header', printText);
}

// Day Management
function renderDaySelector() {
    const select = document.getElementById('day-select');
    select.innerHTML = '';
    const dayIds = Object.keys(appData.days);

    dayIds.forEach((dayId, index) => {
        const day = appData.days[dayId];
        const option = document.createElement('option');
        option.value = dayId;
        // Label: Date if exists, else "Day X"
        option.textContent = day.date ? day.date : `Day ${index + 1}`;
        select.appendChild(option);
    });
    select.value = appData.currentDayId;
}

function switchDay(dayId) {
    appData.currentDayId = dayId;
    saveData();
    updateHeaderInputs(); // This will update the date input
    render();
}

function addDay() {
    const newId = 'day' + Date.now();
    appData.days[newId] = {
        date: getTodayDate(),
        rows: []
    };
    appData.currentDayId = newId;
    saveData();
    renderDaySelector();
    updateHeaderInputs();
    render();
}

function deleteDay() {
    if (Object.keys(appData.days).length <= 1) {
        alert('これ以上削除できません。');
        return;
    }
    if (confirm('現在のシートを削除しますか？')) {
        delete appData.days[appData.currentDayId];
        appData.currentDayId = Object.keys(appData.days)[0];
        saveData();
        renderDaySelector();
        updateHeaderInputs();
        render();
    }
}

// Rendering
function render() {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';
    const filterCheckbox = document.getElementById('filter-ok');
    const filterEnabled = filterCheckbox ? filterCheckbox.checked : false;
    const currentRows = appData.days[appData.currentDayId].rows;

    currentRows.forEach((row, index) => {
        // フィルタが有効な場合、ロケーション行以外でOK/Keep以外は非表示
        if (filterEnabled && row.type !== 'location' && row.status !== 'OK' && row.status !== 'Keep') {
            return;
        }

        const tr = document.createElement('tr');

        if (row.type === 'location') {
            tr.className = 'location-row';
            tr.innerHTML = `
                <td class="col-action-cell">
                    <button class="danger small" onclick="deleteRow(${index})">×</button>
                </td>
                <td colspan="8">
                    <input type="text" class="location-input" value="${row.content}" placeholder="場所を入力" oninput="updateRow(${index}, 'content', this.value)">
                </td>
            `;
        } else {
            const statusObj = STATUS_OPTS.find(s => s.value === row.status) || STATUS_OPTS[0];
            tr.innerHTML = `
                <td class="col-action-cell">
                    <button class="danger small" onclick="deleteRow(${index})">×</button>
                </td>
                <td class="col-s">
                    <input type="tel" value="${row.s}" oninput="updateRow(${index}, 's', this.value)">
                </td>
                <td class="col-c">
                    <input type="number" value="${row.c}" oninput="updateRow(${index}, 'c', this.value)">
                </td>
                <td class="col-t">
                    <input type="number" value="${row.t}" oninput="updateRow(${index}, 't', this.value)">
                </td>
                <td class="col-clip">
                    <input type="text" value="${row.clip}" oninput="updateRow(${index}, 'clip', this.value)">
                </td>
                <td class="col-judge judge-cell ${statusObj.class}" onclick="cycleStatus(${index})">
                    ${statusObj.label}
                </td>
                <td class="col-scene">
                    <input type="text" value="${row.scene}" oninput="updateRow(${index}, 'scene', this.value)">
                </td>
                <td class="col-ng">
                    <input type="text" value="${row.ng}" oninput="updateRow(${index}, 'ng', this.value)">
                </td>
                <td class="col-remarks">
                    <input type="text" value="${row.remarks}" oninput="updateRow(${index}, 'remarks', this.value)">
                </td>
            `;
        }
        tbody.appendChild(tr);
    });
}

// Row Updates
function updateRow(index, field, value) {
    const rows = appData.days[appData.currentDayId].rows;
    rows[index][field] = value;
    saveData();
}

function deleteRow(index) {
    if (confirm('削除しますか？')) {
        const rows = appData.days[appData.currentDayId].rows;
        rows.splice(index, 1);
        saveData();
        render();
    }
}

function cycleStatus(index) {
    const rows = appData.days[appData.currentDayId].rows;
    const current = rows[index].status;
    let nextIdx = STATUS_OPTS.findIndex(s => s.value === current) + 1;
    if (nextIdx >= STATUS_OPTS.length) nextIdx = 0;

    rows[index].status = STATUS_OPTS[nextIdx].value;
    saveData();
    render();
}

// Add Row Logic
function addRow() {
    const rows = appData.days[appData.currentDayId].rows;
    const newRow = {
        type: 'data',
        s: '',
        c: '',
        t: '1',
        clip: '',
        status: '空',
        scene: '',
        ng: '',
        remarks: ''
    };

    // Smart Fill
    // Find last DATA row (skip location rows)
    let lastDataRow = null;
    for (let i = rows.length - 1; i >= 0; i--) {
        if (rows[i].type !== 'location') {
            lastDataRow = rows[i];
            break;
        }
    }

    if (lastDataRow) {
        // Copy S
        newRow.s = lastDataRow.s;

        // C Logic: If last status was OK, increment C. Else keep C.
        // Ensure C is treated as number
        const lastC = parseInt(lastDataRow.c);
        if (!isNaN(lastC)) {
            if (lastDataRow.status === 'OK') {
                newRow.c = (lastC + 1).toString();
            } else {
                newRow.c = lastC.toString();
            }
        } else {
            // If C was empty, maybe start at 1? Or keep empty.
            // If user hasn't input C yet, keep empty.
            newRow.c = '';
        }

        // T Logic: If C incremented, T should reset to 1?
        // Usually:
        // Same Cut -> Take increments.
        // New Cut -> Take resets to 1.
        if (!isNaN(lastC) && newRow.c !== lastDataRow.c) {
            newRow.t = '1';
        } else {
            // Same cut, increment take
            const lastT = parseInt(lastDataRow.t);
            if (!isNaN(lastT)) {
                newRow.t = (lastT + 1).toString();
            }
        }

        // Clip Logic
        newRow.clip = incrementClipName(lastDataRow.clip);
    } else {
        // First row ever
        newRow.clip = appData.clipSetting;
        newRow.c = '1'; // Default start C
    }

    rows.push(newRow);
    saveData();
    render();
    window.scrollTo(0, document.body.scrollHeight);
}

function addLocationRow() {
    const rows = appData.days[appData.currentDayId].rows;
    rows.push({
        type: 'location',
        content: ''
    });
    saveData();
    render();
    window.scrollTo(0, document.body.scrollHeight);
}

function incrementClipName(clipName) {
    const match = clipName.match(/(\d+)$/);
    if (match) {
        const numberStr = match[1];
        const numberLen = numberStr.length;
        const numberVal = parseInt(numberStr, 10);
        const nextVal = numberVal + 1;
        const nextStr = nextVal.toString().padStart(numberLen, '0');
        return clipName.substring(0, clipName.length - numberLen) + nextStr;
    }
    return clipName;
}

// Filter
function toggleFilter() {
    render();
}

function reloadTable() {
    render();
}



// Print
function printSheet() {
    updatePrintHeader();
    window.print();
}

// JSON
function exportJSON() {
    const dataStr = JSON.stringify(appData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scriptsheet_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importJSON(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.days) {
                if (confirm('現在のデータを上書きして読み込みますか？')) {
                    appData = data;
                    saveData();
                    updateHeaderInputs();
                    renderDaySelector();
                    render();
                }
            } else {
                alert('無効なJSONファイルです。');
            }
        } catch (err) {
            alert('読み込みに失敗しました。');
        }
    };
    reader.readAsText(file, 'UTF-8');
    input.value = '';
}

function getTodayDate() {
    const d = new Date();
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}
