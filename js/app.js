// Correctly import from the new modular files
import { api } from './api.js';
import { renderDashboard, renderRaceResultModal, clearDashboard } from './ui.js';

// --- Application State --- //
let state = {
    currentDriver: null,
    currentYear: new Date().getFullYear(),
    currentSeason: Math.floor(new Date().getMonth() / 3) + 1,
    currentCategory: 'sports_car',
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
        state.currentCategory = category || driverData.mostRacedCategoryName;
        
        // This is where app.js calls the renderDashboard function from ui.js
        renderDashboard(driverData, state, updateStateAndReload);

        const newUrl = `#/driver/${custId}?year=${year}&season=${season}&category=${state.currentCategory}`;
        if (window.location.hash.substring(1) !== newUrl.substring(1)) {
           window.history.pushState({path:newUrl},'',newUrl);
        }

    } else {
        alert('Could not load driver data.');
        window.location.hash = '#/';
    }
    setLoading(false);
}

function updateStateAndReload(newState) {
    const newYear = newState.year !== undefined ? newState.year : state.currentYear;
    const newSeason = newState.season !== undefined ? newState.season : state.currentSeason;
    const newCategory = newState.category !== undefined ? newState.category : state.currentCategory;
    
    window.location.hash = `#/driver/${state.currentDriver.custId}?year=${newYear}&season=${newSeason}&category=${newCategory}`;
}

async function showRaceResult(subsessionId) {
    setLoading(true);
    const resultData = await api.getSubsessionResult(subsessionId);
    if(resultData) {
        // This is where app.js calls the renderRaceResultModal function from ui.js
        renderRaceResultModal(resultData, state.currentDriver.custId, () => {
             resultModalContainer.classList.add('hidden');
             resultModalContainer.innerHTML = '';
        });
    } else {
        alert('Could not load race results.');
    }
    setLoading(false);
}

// --- Simple Hash-based Router --- //
function handleRouteChange() {
    const hash = window.location.hash || '#/';
    
    if (hash === '#/') {
        searchView.classList.remove('hidden');
        dashboardView.classList.add('hidden');
        document.getElementById('header-subtitle').textContent = "Enter a driver's name to view their racing statistics.";
        return;
    }

    const [path, queryString] = hash.substring(2).split('?');
    const params = new URLSearchParams(queryString);
    const parts = path.split('/');
    
    if (parts[0] === 'driver' && parts[1]) {
        const custId = parseInt(parts[1], 10);
        const year = parseInt(params.get('year') || state.currentYear, 10);
        const season = parseInt(params.get('season') || state.currentSeason, 10);
        const category = params.get('category');
        loadDriverData(custId, year, season, category);
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
                    const custId = e.currentTarget.dataset.custId;
                    window.location.hash = `#/driver/${custId}`;
                });
            });
        } else {
            alert('No drivers found.');
        }
    });
    
    // Dynamic listener for clickable race items
    document.body.addEventListener('click', (e) => {
        const raceItem = e.target.closest('.race-item');
        if(raceItem) {
            const subsessionId = raceItem.dataset.subsessionId;
            if(subsessionId) showRaceResult(subsessionId);
        }
    });

    window.addEventListener('hashchange', handleRouteChange);
    
    // Initial load based on URL
    handleRouteChange();
});
