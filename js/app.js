// --- API Service --- //
const api = {
    searchDrivers: async function(query) {
        const response = await fetch('/api/search-drivers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ searchTerm: query })
        });
        if (!response.ok) {
            console.error("Failed to fetch from backend");
            alert('Error searching for drivers. Check the console for details.');
            return [];
        }
        return await response.json();
    },
    // This is the new, consolidated function to get all driver data
    getDriverData: async function(custId, year, season) {
         const response = await fetch('/api/get-stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ custId, year, season })
        });
        if (!response.ok) {
            console.error("Failed to fetch driver data");
            alert('Error fetching driver data. Check the console for details.');
            return null;
        }
        return await response.json();
    },
    getSubsessionResult: async function(subsessionId) {
        const response = await fetch('/api/get-subsession-result', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subsessionId })
        });
        return response.ok ? response.json() : null;
    },
    getSeasons: async function(custId) {
        const response = await fetch(`/api/get-seasons?custId=${custId}`);
        if (!response.ok) {
            console.error("Failed to fetch seasons");
            alert('Error fetching season list. Check the console for details.');
            return [];
        }
        return await response.json();
    },
};

// --- Application Logic --- //
document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References --- //
    const searchView = document.getElementById('search-view');
    const dashboardView = document.getElementById('dashboard-view');
    const searchModalContainer = document.getElementById('search-modal');
    const resultModalContainer = document.getElementById('result-modal');
    const loader = document.getElementById('loader');

    // --- Application State --- //
    let state = {
        currentDriver: null,
        currentYear: new Date().getFullYear(),
        currentSeason: Math.floor(new Date().getMonth() / 3) + 1,
        currentCategory: 'sports_car', // Default category
        isLoading: false,
        allSeasonsData: [], // To store year/season data
    };

    // --- Core Functions --- //
    function setLoading(isLoading) {
        state.isLoading = isLoading;
        loader.classList.toggle('hidden', !isLoading);
    }

    async function loadDriverData(custId, year, season, category) {
        setLoading(true);
        if(searchView) searchView.classList.add('hidden');
        if(dashboardView) dashboardView.classList.remove('hidden');
        clearDashboard();
        
        // Fetch seasons list if we don't have it
        if(state.allSeasonsData.length === 0) {
            state.allSeasonsData = await api.getSeasons(custId);
        }

        const driverData = await api.getDriverData(custId, year, season);
        
        if (driverData) {
            state.currentDriver = { custId: custId, displayName: driverData.memberInfo.displayName };
            state.currentYear = year;
            state.currentSeason = season;
            state.currentCategory = category || driverData.mostRacedCategoryName;
            
            renderDashboard(driverData, state, updateStateAndReload);

            window.history.pushState({}, '', `#/driver/${custId}?year=${year}&season=${season}&category=${state.currentCategory}`);
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
        if (!searchView || !dashboardView) {
            console.error("Fatal Error: Main view elements ('search-view' or 'dashboard-view') not found in the DOM. Please ensure your index.html file is up to date.");
            document.body.innerHTML = '<p class="p-8 text-center text-red-500 font-bold">Fatal Error: Your index.html file is out of date. Cannot render the application.</p>';
            return;
        }

        const hash = window.location.hash || '#/';
        
        if (hash === '#/') {
            searchView.classList.remove('hidden');
            dashboardView.classList.add('hidden');
            const subtitle = document.getElementById('header-subtitle');
            if(subtitle) subtitle.textContent = "Enter a driver's name to view their racing statistics.";
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

    // --- UI Rendering --- //
    function clearDashboard() {
        document.getElementById('dashboard-header').innerHTML = '';
        document.getElementById('dashboard-grid').innerHTML = '';
    }

    function renderDashboard(data, state, onFilterChange) {
        const headerContainer = document.getElementById('dashboard-header');
        const gridContainer = document.getElementById('dashboard-grid');

        // Corrected: Use the allSeasonsData from the state
        const yearsData = state.allSeasonsData || [{ year: state.currentYear }];
        const uniqueYears = [...new Set(yearsData.map(y => y.year))].sort((a,b) => b-a);

        headerContainer.innerHTML = `
            <div class="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 class="text-3xl font-extrabold text-white">${data.memberInfo.displayName}</h2>
                    <p class="text-gray-400">iRacing Profile</p>
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

        const stats = data.recap.stats;
        gridContainer.innerHTML = `
            <div class="card col-span-12 lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                ${createStatCard('Starts', stats.starts)}
                ${createStatCard('Wins', stats.wins)}
                ${createStatCard('Top 5s', stats.top5)}
                ${createStatCard('Poles', stats.poles)}
                ${createStatCard('Avg Start', stats.avgStartPosition)}
                ${createStatCard('Avg Finish', stats.avgFinishPosition)}
                ${createStatCard('Laps Led', stats.lapsLed)}
                ${createStatCard('Incidents', stats.incidents)}
            </div>
        `;
    }
    
    function createStatCard(label, value) { return `<div class="stat-card-sm"><p class="text-xs text-gray-400 font-medium">${label}</p><p class="text-xl font-bold text-white">${value !== undefined ? value : 'N/A'}</p></div>`; }

    function renderRaceResultModal(data, currentCustId, onClose) {
        // ... (implementation remains the same)
    }

    // --- Event Listeners & Initialization --- //
    const searchBtn = document.getElementById('search-btn');
    if(searchBtn) {
        searchBtn.addEventListener('click', async () => {
            const driverSearchInput = document.getElementById('driver-search');
            const searchTerm = driverSearchInput.value;
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
    }
    
    window.addEventListener('hashchange', handleRouteChange);
    
    // Initial load
    handleRouteChange();
});
