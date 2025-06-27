// --- UI Rendering Module --- //

export function clearDashboard() {
    document.getElementById('dashboard-header').innerHTML = '';
    document.getElementById('dashboard-grid').innerHTML = '';
}

export function renderDashboard(data, state, onFilterChange) {
    renderHeader(data, state, onFilterChange);
    renderGrid(data, state);
}

function renderHeader(data, state, onFilterChange) {
    const headerContainer = document.getElementById('dashboard-header');
    const uniqueYears = [...new Set(data.yearlyStats.map(y => y.year))].sort((a,b) => b-a);
    
    headerContainer.innerHTML = `
        <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
                <h2 class="text-3xl font-extrabold text-white">${data.memberInfo.displayName}</h2>
                <img src="https://images-static.iracing.com/${data.memberInfo.helmet.helmetImage}" class="h-8 inline-block" alt="Helmet" />
            </div>
            <div class="flex flex-wrap gap-2">
                <select id="year-filter" class="form-select rounded-lg">${uniqueYears.map(y => `<option value="${y}" ${y === state.currentYear ? 'selected' : ''}>${y}</option>`).join('')}</select>
                <select id="season-filter" class="form-select rounded-lg">${[1,2,3,4].map(s => `<option value="${s}" ${s === state.currentSeason ? 'selected' : ''}>Season ${s}</option>`).join('')}</select>
                <select id="category-filter" class="form-select rounded-lg">${data.allCategories.map(c => `<option value="${c.label.toLowerCase().replace(' ', '_')}" ${c.label.toLowerCase().replace(' ', '_') === state.currentCategory ? 'selected' : ''}>${c.label}</option>`).join('')}</select>
            </div>
        </div>
    `;

    document.getElementById('year-filter').addEventListener('change', (e) => onFilterChange({ year: parseInt(e.target.value)}));
    document.getElementById('season-filter').addEventListener('change', (e) => onFilterChange({ season: parseInt(e.target.value)}));
    document.getElementById('category-filter').addEventListener('change', (e) => onFilterChange({ category: e.target.value}));
}

function renderGrid(data, state) {
    const gridContainer = document.getElementById('dashboard-grid');
    const recap = data.recap;
    const stats = recap.stats;
    const races = recap.races || [];

    // --- Main Grid Structure --- //
    gridContainer.innerHTML = `
        <!-- iRating & SR Charts -->
        <div class="card col-span-12 lg:col-span-6"><h3 class="font-bold mb-4">iRating</h3><div class="h-64"><canvas id="irating-chart"></canvas></div></div>
        <div class="card col-span-12 lg:col-span-6"><h3 class="font-bold mb-4">Safety Rating</h3><div class="h-64"><canvas id="sr-chart"></canvas></div></div>
        
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
            <p class="text-sm text-gray-400 mb-2">${races.length} races on ${[...new Set(races.map(r => new Date(r.startTime).toDateString()))].length} days</p>
            <div id="activity-grid-container"></div>
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
             ${createStatCard('Avg SOF', recap.avgSOF, 'sof')}
             ${createStatCard('Win %', stats.winPercentage, '%')}
             ${createStatCard('Podium %', stats.podiumPercentage, '%')}
             ${createStatCard('Incidents/Race', stats.incidentsPerRace, 'inc')}
        </div>
        
        <!-- Recent Races List -->
        <div class="card col-span-12">
            <h3 class="font-bold mb-4">Races This Season</h3>
            <div id="race-list" class="space-y-2 max-h-96 overflow-y-auto">
                ${races.length > 0 ? races.map(renderRaceItem).join('') : '<p class="text-gray-400">No races found for this season.</p>'}
            </div>
        </div>
    `;

    // --- Render Dynamic Components --- //
    renderRatingChart('irating-chart', data.iRatingData, 'iRating', '#e60000');
    renderRatingChart('sr-chart', data.safetyRatingData, 'Safety Rating', '#1e90ff', true);
    renderActivityGrid(document.getElementById('activity-grid-container'), races);
    renderFinishPositions(document.getElementById('finish-pos-container'), races);
}

// --- Component Rendering Functions --- //

function createStatCard(label, value, unit = '') {
    const displayValue = value !== undefined ? value.toFixed(unit === '%' ? 1 : (unit==='inc'?2:0)) : 'N/A';
    return `<div class="stat-card-sm"><p class="text-xs text-gray-400 font-medium">${label}</p><p class="text-xl font-bold text-white">${displayValue}${unit==='%'?'%':''}</p></div>`;
}

function renderRatingChart(canvasId, chartData, label, color, isSR = false) {
    const points = chartData.points.map(p => ({ x: new Date(p.time), y: isSR ? p.value / 100 : p.value }));
    new Chart(document.getElementById(canvasId).getContext('2d'), {
        type: 'line',
        data: { datasets: [{ label, data: points, borderColor: color, tension: 0.2, pointRadius: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, scales: { x: { type: 'time', time: { unit: 'month' }, ticks: {color: '#888'} }, y: { ticks: {color: '#888'} } }, plugins: { legend: { display: false } } }
    });
}

function renderActivityGrid(container, races) {
    const activity = new Map();
    races.forEach(race => {
        const date = new Date(race.startTime).toDateString();
        activity.set(date, (activity.get(date) || 0) + 1);
    });

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - (26 * 7)); // ~6 months
    
    let html = '<div class="activity-grid">';
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const count = activity.get(d.toDateString()) || 0;
        let opacity = 0;
        if (count > 0) opacity = 0.3 + (count * 0.2);
        if (opacity > 1) opacity = 1;
        html += `<div class="activity-cell" style="background-color: rgba(230, 0, 0, ${opacity});" title="${count} races on ${d.toLocaleDateString()}"></div>`;
    }
    html += '</div>';
    container.innerHTML = html;
}

function renderFinishPositions(container, races) {
    const positions = Array(25).fill(0);
    races.forEach(race => {
        const pos = race.finishPosition + 1;
        if(pos < 25) positions[pos-1]++;
        else positions[24]++;
    });

    const maxRaces = Math.max(...positions);
    container.innerHTML = `
        <div class="finish-bar-container">
            ${positions.map((count, i) => {
                const height = maxRaces > 0 ? (count / maxRaces) * 100 : 0;
                return `<div class="finish-bar" style="height: ${height}%" title="${count}x P${i+1}${i===24?'+':''}"></div>`
            }).join('')}
        </div>
        <div class="flex justify-between text-xs text-gray-500 mt-1"><span>1st</span><span>5th</span><span>10th</span><span>15th</span><span>20th</span><span>25th+</span></div>
    `;
}

function renderRaceItem(race) {
    return `
        <div class="race-item p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700 flex justify-between items-center" data-subsession-id="${race.subsessionId}">
            <div>
                <p class="font-bold">${race.seriesName}</p>
                <p class="text-sm text-gray-400">${race.track.trackName}</p>
            </div>
            <div class="text-right">
                <p class="font-mono">P${race.finishPosition + 1}</p>
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
            <td class="p-2">${(res.newSubLevel / 100).toFixed(2)} <span class="${res.newSubLevel - res.oldSubLevel >= 0 ? 'text-positive' : 'text-negative'}">${res.newSubLevel - res.oldSubLevel > 0 ? '+' : ''}${((res.newSubLevel - res.oldSubLevel)/100).toFixed(2)}</span></td>
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
