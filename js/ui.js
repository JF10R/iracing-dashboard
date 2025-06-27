// --- UI Rendering Module --- //

export function clearDashboard() {
    const header = document.getElementById('dashboard-header');
    const grid = document.getElementById('dashboard-grid');
    if (header) header.innerHTML = '';
    if (grid) grid.innerHTML = '';
}

export function renderDashboard(data, state, onFilterChange) {
    renderHeader(data, state, onFilterChange);
    renderGrid(data, state);
}

function renderHeader(data, state, onFilterChange) {
    const headerContainer = document.getElementById('dashboard-header');
    // Use the comprehensive yearly stats for the year dropdown
    const uniqueYears = [...new Set(data.yearlyStats.map(y => y.year))].sort((a, b) => b - a);
    
    headerContainer.innerHTML = `
        <div class="flex flex-wrap items-center justify-between gap-4">
            <div class="flex items-center gap-4">
                <img src="https://images-static.iracing.com/${data.memberInfo.helmet.helmetImage}" class="h-12 w-12 hidden sm:block rounded-full" alt="Helmet" onerror="this.style.display='none'"/>
                <div>
                    <h2 class="text-3xl font-extrabold text-white">${data.memberInfo.displayName}</h2>
                    <p class="text-gray-400">iRacing Profile</p>
                </div>
            </div>
            <div class="flex flex-wrap gap-2">
                <select id="year-filter" class="form-select rounded-lg">${uniqueYears.map(y => `<option value="${y}" ${y === state.currentYear ? 'selected' : ''}>${y}</option>`).join('')}</select>
                <select id="season-filter" class="form-select rounded-lg">${[1, 2, 3, 4].map(s => `<option value="${s}" ${s === state.currentSeason ? 'selected' : ''}>Season ${s}</option>`).join('')}</select>
                <select id="category-filter" class="form-select rounded-lg">${data.allCategories.map(c => `<option value="${c.label.toLowerCase().replace(/ /g, '_')}" ${c.label.toLowerCase().replace(/ /g, '_') === state.currentCategory ? 'selected' : ''}>${c.label}</option>`).join('')}</select>
            </div>
        </div>
    `;

    document.getElementById('year-filter').addEventListener('change', (e) => onFilterChange({ year: parseInt(e.target.value) }));
    document.getElementById('season-filter').addEventListener('change', (e) => onFilterChange({ season: parseInt(e.target.value) }));
    document.getElementById('category-filter').addEventListener('change', (e) => onFilterChange({ category: e.target.value }));
}

function renderGrid(data, state) {
    const gridContainer = document.getElementById('dashboard-grid');
    const recap = data.recap;
    const stats = recap.stats;
    const races = recap.races || [];
    
    gridContainer.innerHTML = `
        <!-- iRating & SR Charts -->
        <div class="card col-span-12 lg:col-span-6"><h3 class="font-bold mb-4 flex justify-between">iRating <span class="text-lg font-extrabold text-red-500">${data.iRatingData.displayValue || 'N/A'}</span></h3><div class="h-64"><canvas id="irating-chart"></canvas></div></div>
        <div class="card col-span-12 lg:col-span-6"><h3 class="font-bold mb-4 flex justify-between">Safety Rating <span class="text-lg font-extrabold text-blue-500">${data.safetyRatingData.displayValue || 'N/A'}</span></h3><div class="h-64"><canvas id="sr-chart"></canvas></div></div>
        
        <!-- Main Stats -->
        <div class="card col-span-12 lg:col-span-3 grid grid-cols-2 gap-4 content-start">
            ${createStatCard('Races', stats.starts)}
            ${createStatCard('Wins', stats.wins)}
            ${createStatCard('Top 5', stats.top5)}
            ${createStatCard('Laps', stats.laps)}
        </div>
        
        <!-- Racing Activity -->
        <div class="card col-span-12 lg:col-span-9">
            <h3 class="font-bold mb-4">Racing Activity</h3>
            <p class="text-sm text-gray-400 mb-2">${races.length} races on ${[...new Set(races.map(r => new Date(r.startTime).toDateString()))].length} days this season</p>
            <div id="activity-grid-container" class="overflow-x-auto pb-2"></div>
        </div>

        <!-- Finish Positions -->
        <div class="card col-span-12 lg:col-span-5">
            <h3 class="font-bold mb-4">Finish Positions</h3>
            <div id="finish-pos-container" class="mt-4"></div>
        </div>

        <!-- Performance Stats -->
        <div class="card col-span-12 lg:col-span-7 grid grid-cols-2 md:grid-cols-3 gap-4">
             ${createStatCard('Avg Start', stats.avgStartPosition, 'pos')}
             ${createStatCard('Avg Finish', stats.avgFinishPosition, 'pos')}
             ${createStatCard('Avg SOF', recap.avgSOF)}
             ${createStatCard('Win %', stats.winPercentage, '%')}
             ${createStatCard('Podium %', stats.podiumPercentage, '%')}
             ${createStatCard('Incidents/Race', stats.incidentsPerRace, 'inc')}
        </div>
        
        <!-- Lap Time Progression -->
        <div class="card col-span-12">
            <h3 class="font-bold mb-4">Best Lap Time Progression</h3>
            <div class="flex flex-wrap gap-4 mb-4">
                <select id="lap-track-select" class="form-select rounded-lg flex-grow"></select>
                <select id="lap-car-select" class="form-select rounded-lg flex-grow"></select>
            </div>
            <div class="h-80"><canvas id="lap-time-chart"></canvas></div>
        </div>
        
        <!-- Recent Races List -->
        <div class="card col-span-12">
            <h3 class="font-bold mb-4">Races This Season</h3>
            <div id="race-list" class="space-y-2 max-h-96 overflow-y-auto">
                ${races.length > 0 ? races.map(renderRaceItem).join('') : '<p class="text-gray-400 text-center py-4">No races found for this season.</p>'}
            </div>
        </div>
    `;

    renderRatingChart('irating-chart', data.iRatingData, 'iRating', '#e60000');
    renderRatingChart('sr-chart', data.safetyRatingData, 'Safety Rating', '#3b82f6', true);
    renderActivityGrid(document.getElementById('activity-grid-container'), races);
    renderFinishPositions(document.getElementById('finish-pos-container'), races);
    renderLapTimeProgression(document.getElementById('lap-track-select'), document.getElementById('lap-car-select'), races);
}

// --- Component Rendering Functions --- //

function createStatCard(label, value, unit = '') {
    const displayValue = value !== undefined ? value.toFixed(unit === '%' ? 1 : (unit === 'inc' ? 2 : 0)) : 'N/A';
    return `<div class="stat-card-sm"><p class="text-xs text-gray-400 font-medium">${label}</p><p class="text-xl font-bold text-white">${displayValue}${unit === '%' ? '%' : ''}</p></div>`;
}

function renderRatingChart(canvasId, chartData, label, color, isSR = false) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !chartData || !chartData.points || chartData.points.length === 0) return;
    const points = chartData.points.map(p => ({ x: new Date(p.time), y: isSR ? p.value / 100 : p.value }));
    new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: { datasets: [{ label, data: points, borderColor: color, tension: 0.2, pointRadius: 0, borderWidth: 2 }] },
        options: { responsive: true, maintainAspectRatio: false, scales: { x: { type: 'time', time: { unit: 'month' }, ticks: { color: '#888' }, grid: { color: 'rgba(255,255,255,0.1)' } }, y: { ticks: { color: '#888' }, grid: { color: 'rgba(255,255,255,0.1)' } } }, plugins: { legend: { display: false } } }
    });
}

function renderActivityGrid(container, races) {
    if(!races || races.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500">No race activity this season.</p>';
        return;
    }
    const activity = new Map();
    races.forEach(race => {
        const date = new Date(race.startTime).toDateString();
        activity.set(date, (activity.get(date) || 0) + 1);
    });

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - (26 * 7));
    
    let html = '<div class="activity-grid">';
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const count = activity.get(d.toDateString()) || 0;
        let opacity = 0.1;
        if (count > 0) opacity = 0.3 + (count * 0.2);
        if (opacity > 1) opacity = 1;
        html += `<div class="activity-cell" style="background-color: rgba(230, 0, 0, ${opacity});" title="${count} race(s) on ${d.toLocaleDateString()}"></div>`;
    }
    html += '</div>';
    container.innerHTML = html;
}

function renderFinishPositions(container, races) {
    if(!races || races.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500">No race data for finish positions.</p>';
        return;
    }
    const positions = Array(25).fill(0);
    races.forEach(race => {
        const pos = race.finishPositionInClass + 1;
        if (pos < 25) positions[pos - 1]++;
        else positions[24]++;
    });

    const maxRaces = Math.max(...positions);
    container.innerHTML = `
        <div class="finish-bar-container">
            ${positions.map((count, i) => {
                const height = maxRaces > 0 ? (count / maxRaces) * 100 : 0;
                return `<div class="finish-bar" style="height: ${height}%" title="${count}x P${i + 1}${i === 24 ? '+' : ''}"></div>`
            }).join('')}
        </div>
        <div class="flex justify-between text-xs text-gray-500 mt-1"><span>1st</span><span>5th</span><span>10th</span><span>15th</span><span>20th</span><span>25th+</span></div>
    `;
}

function renderLapTimeProgression(trackSelect, carSelect, races) {
    let lapTimeChart = null;

    function updateChart() {
        if (lapTimeChart) lapTimeChart.destroy();
        
        const selectedTrack = trackSelect.value;
        const selectedCar = carSelect.value;
        if (!selectedTrack || !selectedCar) return;

        const raceData = races
            .filter(r => r.track.trackName === selectedTrack && r.car.carName === selectedCar && r.bestLapTime !== -1)
            .sort((a,b) => new Date(a.startTime) - new Date(b.startTime));
        
        const chartData = {
            labels: raceData.map(r => new Date(r.startTime).toLocaleDateString()),
            datasets: [{
                label: `Best Lap Time`,
                data: raceData.map(r => lapTimeToSeconds(r.bestLapTime)),
                borderColor: '#e60000',
                tension: 0.1,
                borderWidth: 2,
            }]
        };

        const ctx = document.getElementById('lap-time-chart').getContext('2d');
        lapTimeChart = new Chart(ctx, {
            type: 'line',
            data: chartData,
            options: { responsive: true, maintainAspectRatio: false, scales: { x: { ticks: {color: '#888'}, grid: {color: 'rgba(255,255,255,0.1)'} }, y: { ticks: {color: '#888', callback: (value) => secondsToLapTime(value)}, grid: {color: 'rgba(255,255,255,0.1)'} } }, plugins: { legend: { display: false } } }
        });
    }

    function updateCarOptions() {
        const selectedTrack = trackSelect.value;
        const relevantCars = [...new Set(races.filter(r => r.track.trackName === selectedTrack).map(r => r.car.carName))];
        carSelect.innerHTML = relevantCars.map(c => `<option value="${c}">${c}</option>`).join('');
        updateChart();
    }

    if (!races || races.length === 0) {
        trackSelect.innerHTML = '<option>No races to analyze</option>';
        carSelect.innerHTML = '';
        return;
    }
    
    const uniqueTracks = [...new Set(races.map(r => r.track.trackName))];
    trackSelect.innerHTML = uniqueTracks.map(t => `<option value="${t}">${t}</option>`).join('');
    
    trackSelect.addEventListener('change', updateCarOptions);
    carSelect.addEventListener('change', updateChart);
    
    updateCarOptions();
}

function renderRaceItem(race) {
    return `
        <div class="race-item p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700 flex justify-between items-center" data-subsession-id="${race.subsessionId}">
            <div>
                <p class="font-bold">${race.seriesName}</p>
                <p class="text-sm text-gray-400">${race.track.trackName}</p>
            </div>
            <div class="text-right">
                <p class="font-mono">P${race.finishPositionInClass + 1}</p>
                <p class="text-sm text-gray-500">${new Date(race.startTime).toLocaleDateString()}</p>
            </div>
        </div>
    `;
}

export function renderRaceResultModal(data, currentCustId, onClose) {
    const container = document.getElementById('result-modal');
    container.classList.remove('hidden');
    container.classList.add('flex');

    const resultTable = data.results.map(res => `
        <tr class="${res.custId === currentCustId ? 'highlight' : ''}">
            <td class="p-2">${res.finishPositionInClass + 1}</td>
            <td class="p-2">${res.displayName}</td>
            <td class="p-2">${res.oldiRating} <span class="${res.newiRating - res.oldiRating >= 0 ? 'text-positive' : 'text-negative'}">${res.newiRating - res.oldiRating > 0 ? '+' : ''}${res.newiRating - res.oldiRating}</span></td>
            <td class="p-2">${(res.newSubLevel / 100).toFixed(2)} <span class="${res.newSubLevel - res.oldSubLevel >= 0 ? 'text-positive' : 'text-negative'}">${res.newSubLevel - res.oldSubLevel > 0 ? '+' : ''}${((res.newSubLevel - res.oldSubLevel) / 100).toFixed(2)}</span></td>
        </tr>
    `).join('');

    container.innerHTML = `
        <div class="card w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div class="border-b border-gray-700 pb-2 mb-4">
                <h2 class="text-xl font-bold">${data.seriesName}</h2>
                <p class="text-sm text-gray-400">${data.track.trackName} - ${new Date(data.startTime).toLocaleString()}</p>
            </div>
            <div class="overflow-y-auto">
                <table class="w-full text-left result-table">
                    <thead><tr class="border-b border-gray-600"><th class="p-2">Pos</th><th class="p-2">Name</th><th class="p-2">iRating</th><th class="p-2">SR</th></tr></thead>
                    <tbody>${resultTable}</tbody>
                </table>
            </div>
            <div class="pt-4 text-right">
                <button id="close-result-modal" class="btn-primary px-4 py-2 rounded-lg">Close</button>
            </div>
        </div>
    `;
    document.getElementById('close-result-modal').addEventListener('click', onClose);
}

// --- Utility Functions --- //
function lapTimeToSeconds(lapTime) {
    if (typeof lapTime !== 'string' || !lapTime.includes(':')) return 0;
    const parts = lapTime.split(/[:.]/);
    if (parts.length < 3) return 0;
    return (+parts[0]) * 60 + (+parts[1]) + (+parts[2]) / 1000;
}
function secondsToLapTime(seconds) {
    if (typeof seconds !== 'number' || isNaN(seconds)) return 'N/A';
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    const ms = Math.round((seconds - Math.floor(seconds)) * 1000);
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}
