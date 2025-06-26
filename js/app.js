import { api } from './api.js';
import { renderDashboard, renderRaceResultModal, clearDashboard } from './ui.js';

// --- Application State --- //
let state = {
    currentDriver: null,
    currentYear: new Date().getFullYear(),
    currentSeason: Math.floor(new Date().getMonth() / 3) + 1,
    currentCategory: null,
    isLoading: false,
};

// --- DOM Element References --- //
const searchView = document.getElementById('search-view');
const dashboardView = document.getElementById('dashboard-view');
const searchModalContainer = document.getElementById('search-modal');
const resultModalContainer = document.getElementById('result-modal');
const loader = document.getElementById('loader');

// --- Core Application Logic --- //

function setLoading(isLoading) {
    state.isLoading = isLoading;
    loader.classList.toggle('hidden', !isLoading);
}

async function loadDriverData(custId, year, season, category) {
    setLoading(true);
    searchView.classList.add('hidden');
    dashboardView.classList.remove('hidden');
    clearDashboard();

    const driverData = await api.getDriverData(custId, year, season);
    
    if (driverData) {
        state.currentDriver = { custId: custId, displayName: driverData.memberInfo.displayName };
        state.currentYear = year;
        state.currentSeason = season;
        // If category is not provided, use the most-raced one from the data
        state.currentCategory = category || driverData.mostRacedCategoryName;
        
        renderDashboard(driverData, state, updateStateAndReload);

        // Update URL
        window.location.hash = `#/driver/${custId}?year=${year}&season=${season}&category=${state.currentCategory}`;
    } else {
        alert('Could not load driver data.');
        window.location.hash = '#/';
        searchView.classList.remove('hidden');
        dashboardView.classList.add('hidden');
    }
    setLoading(false);
}

function updateStateAndReload(newState) {
    const newYear = newState.year !== undefined ? newState.year : state.currentYear;
    const newSeason = newState.season !== undefined ? newState.season : state.currentSeason;
    const newCategory = newState.category !== undefined ? newState.category : state.currentCategory;
    loadDriverData(state.currentDriver.custId, newYear, newSeason, newCategory);
}

async function showRaceResult(subsessionId) {
    setLoading(true);
    const resultData = await api.getSubsessionResult(subsessionId);
    if(resultData) {
        renderRaceResultModal(resultData, state.currentDriver.custId, () => {
             resultModalContainer.classList.add('hidden');
             resultModalContainer.innerHTML = '';
        });
    } else {
        alert('Could not load race results.');
    }
    setLoading(false);
}

// --- Router --- //
function handleRouteChange() {
    const hash = window.location.hash || '#/';
    const [path, queryString] = hash.substring(2).split('?');
    const params = new URLSearchParams(queryString);
    
    const parts = path.split('/');
    
    if (parts[0] === 'driver' && parts[1]) {
        const custId = parseInt(parts[1], 10);
        const year = parseInt(params.get('year') || state.currentYear, 10);
        const season = parseInt(params.get('season') || state.currentSeason, 10);
        const category = params.get('category'); // Can be null
        loadDriverData(custId, year, season, category);
    } else {
        searchView.classList.remove('hidden');
        dashboardView.classList.add('hidden');
    }
}


// --- Event Listeners & Initialization --- //
document.addEventListener('DOMContentLoaded', () => {
    // Search Button
    document.getElementById('search-btn').addEventListener('click', async () => {
        const searchTerm = document.getElementById('driver-search').value;
        if (!searchTerm) return;
        setLoading(true);
        const drivers = await api.searchDrivers(searchTerm);
        setLoading(false);
        
        if (drivers && drivers.length > 0) {
            searchModalContainer.classList.remove('hidden');
            searchModalContainer.classList.add('flex');
            searchModalContainer.innerHTML = `
                <div class="bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
                    <div class="p-4 border-b border-gray-700"><h3 class="text-xl font-semibold">Select a Driver</h3></div>
                    <div class="p-4 max-h-80 overflow-y-auto">
                        ${drivers.map(d => `<div class="p-3 hover:bg-gray-700 rounded-lg cursor-pointer search-result-item" data-cust-id="${d.custId}">${d.displayName}</div>`).join('')}
                    </div>
                    <div class="p-4 bg-gray-900/50 rounded-b-lg text-right">
                        <button id="close-search-modal" class="bg-gray-600 hover:bg-gray-500 text-white font-semibold px-4 py-2 rounded-lg">Cancel</button>
                    </div>
                </div>`;
                
            document.getElementById('close-search-modal').addEventListener('click', () => searchModalContainer.classList.add('hidden'));
            document.querySelectorAll('.search-result-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    searchModalContainer.classList.add('hidden');
                    const custId = e.target.dataset.custId;
                    // On first load, don't specify year/season to let the API decide
                    window.location.hash = `#/driver/${custId}`;
                });
            });
        } else {
            alert('No drivers found.');
        }
    });
    
    // Listen for URL hash changes
    window.addEventListener('hashchange', handleRouteChange);

    // Dynamic listener for race clicks
    document.body.addEventListener('click', (e) => {
        if(e.target.closest('.race-item')) {
            const subsessionId = e.target.closest('.race-item').dataset.subsessionId;
            if(subsessionId) {
                showRaceResult(subsessionId);
            }
        }
    });

    // Initial load
    handleRouteChange();
});

// To make the app more modular, we create separate files for api and ui logic.
// You would need to create js/api.js and js/ui.js
// For this example, I will keep them here.

// Contents for js/api.js
export const api = {
    searchDrivers: async (searchTerm) => { /* ... see above ... */ },
    getDriverData: async (custId, year, season) => { /* ... */
         const response = await fetch('/api/get-driver-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ custId, year, season })
        });
        return response.ok ? response.json() : null;
    },
    getSubsessionResult: async (subsessionId) => {
        const response = await fetch('/api/get-subsession-result', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subsessionId })
        });
        return response.ok ? response.json() : null;
    },
    // getSeasons and getCategories are no longer needed as getDriverData handles it
};

// Contents for js/ui.js
export function clearDashboard() {
    document.getElementById('dashboard-header').innerHTML = '';
    document.getElementById('dashboard-grid').innerHTML = '';
}

export function renderDashboard(data, state, onFilterChange) {
    // ... This would be a very large function.
    // Due to space constraints, this is a simplified version.
    // It would render all the components you see in the image.
    const headerContainer = document.getElementById('dashboard-header');
    const gridContainer = document.getElementById('dashboard-grid');

    const allYears = [new Date().getFullYear() + 1, new Date().getFullYear(), new Date().getFullYear() - 1]; // Simplified
    const allSeasons = [1,2,3,4];
    const allCategories = ['road', 'oval', 'dirt_road', 'dirt_oval']; // Simplified

    headerContainer.innerHTML = `
        <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
                <h2 class="text-3xl font-extrabold text-white">${data.memberInfo.displayName}</h2>
                <p class="text-gray-400">iRacing Profile</p>
            </div>
            <div class="flex flex-wrap gap-2">
                <select id="year-filter" class="form-select rounded-lg">${allYears.map(y => `<option value="${y}" ${y === state.currentYear ? 'selected' : ''}>${y}</option>`).join('')}</select>
                <select id="season-filter" class="form-select rounded-lg">${allSeasons.map(s => `<option value="${s}" ${s === state.currentSeason ? 'selected' : ''}>Season ${s}</option>`).join('')}</select>
                <select id="category-filter" class="form-select rounded-lg">${allCategories.map(c => `<option value="${c}" ${c === state.currentCategory ? 'selected' : ''}>${c.replace('_', ' ')}</option>`).join('')}</select>
            </div>
        </div>
    `;

    // Add event listeners for filters
    document.getElementById('year-filter').addEventListener('change', (e) => onFilterChange({ year: parseInt(e.target.value)}));
    document.getElementById('season-filter').addEventListener('change', (e) => onFilterChange({ season: parseInt(e.target.value)}));
    document.getElementById('category-filter').addEventListener('change', (e) => onFilterChange({ category: e.target.value}));

    // Example of rendering one component: iRating Chart
    gridContainer.innerHTML = `
        <div class="card col-span-12 lg:col-span-6">
            <h3 class="font-bold mb-4">iRating</h3>
            <div class="h-64"><canvas id="irating-chart"></canvas></div>
        </div>
        <div class="card col-span-12 lg:col-span-6">
            <h3 class="font-bold mb-4">Safety Rating</h3>
            <div class="h-64"><canvas id="sr-chart"></canvas></div>
        </div>
        <div class="card col-span-12">
            <h3 class="font-bold mb-4">Recent Races</h3>
            <div id="race-list" class="space-y-2">
                ${(data.recap.races || []).map(race => `
                    <div class="race-item p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700" data-subsession-id="${race.subsessionId}">
                        ${race.seriesName} at ${race.track.trackName}
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    // Render charts
    new Chart(document.getElementById('irating-chart').getContext('2d'), {
        type: 'line',
        data: {
            datasets: [{
                label: 'iRating',
                data: data.iRatingData.points.map(p => ({x: new Date(p.time), y: p.value})),
                borderColor: '#e60000',
                tension: 0.1
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { x: { type: 'time', time: { unit: 'month' } } } }
    });
     new Chart(document.getElementById('sr-chart').getContext('2d'), {
        type: 'line',
        data: {
            datasets: [{
                label: 'Safety Rating',
                data: data.safetyRatingData.points.map(p => ({x: new Date(p.time), y: p.value / 100})), // SR is stored * 100
                borderColor: '#1e90ff',
                tension: 0.1
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { x: { type: 'time', time: { unit: 'month' } } } }
    });

}

export function renderRaceResultModal(data, currentCustId, onClose) {
    const container = document.getElementById('result-modal');
    container.classList.remove('hidden');
    container.classList.add('flex');
    container.innerHTML = `
        <div class="card w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div class="border-b border-gray-700 pb-2 mb-4">
                <h2 class="text-xl font-bold">${data.seriesName}</h2>
                <p class="text-sm text-gray-400">${data.track.trackName} - ${new Date(data.startTime).toLocaleString()}</p>
            </div>
            <div class="overflow-y-auto">
                <table class="w-full text-left result-table">
                    <thead>
                        <tr class="border-b border-gray-600">
                            <th class="p-2">Pos</th>
                            <th class="p-2">Name</th>
                            <th class="p-2">iRating</th>
                            <th class="p-2">SR</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.results.map(res => `
                            <tr class="${res.custId === currentCustId ? 'highlight' : ''}">
                                <td class="p-2">${res.finishPosition + 1}</td>
                                <td class="p-2">${res.displayName}</td>
                                <td class="p-2">${res.newiRating}</td>
                                <td class="p-2">${(res.newSubLevel / 100).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <div class="pt-4 text-right">
                <button id="close-result-modal" class="btn-primary px-4 py-2 rounded-lg">Close</button>
            </div>
        </div>
    `;
    document.getElementById('close-result-modal').addEventListener('click', onClose);
}
