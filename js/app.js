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
    getSeasons: async function(custId) {
        const response = await fetch(`/api/get-seasons?custId=${custId}`);
        if (!response.ok) {
            console.error("Failed to fetch seasons");
            alert('Error fetching season list. Check the console for details.');
            return [];
        }
        return await response.json();
    },
    getSeasonStats: async function(custId, year, season) {
        const response = await fetch('/api/get-stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ custId, year, season })
        });
        if (!response.ok) {
            console.error("Failed to fetch stats");
            alert('Error fetching season stats. Check the console for details.');
            return null;
        }
        return await response.json();
    }
};

// --- Application Logic --- //
document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References --- //
    const searchSection = document.getElementById('search-section');
    const searchBtn = document.getElementById('search-btn');
    const driverSearchInput = document.getElementById('driver-search');
    const dashboardDiv = document.getElementById('dashboard');
    const searchLoader = document.getElementById('search-loader');
    const dashboardLoader = document.getElementById('dashboard-loader');
    const statsContentDiv = document.getElementById('stats-content');
    const driverModal = document.getElementById('driver-modal');
    const driverListDiv = document.getElementById('driver-list');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const yearSelect = document.getElementById('year-select');
    const seasonSelect = document.getElementById('season-select');
    const categorySelect = document.getElementById('category-select');
    const trackSelect = document.getElementById('track-select');
    const carSelect = document.getElementById('car-select');
    
    // --- Application State --- //
    let currentDriver = null;
    let allSeasonsData = [];
    let seasonRecapData = null;
    let lapTimeChart = null;
    
    // --- Initial Setup --- //
    searchSection.classList.remove('hidden');
    document.getElementById('header-subtitle').textContent = "Enter a driver's name to view their racing statistics.";

    // --- Core Functions --- //
    const handleSearch = async () => {
        const query = driverSearchInput.value.trim();
        if (!query) return;
        searchLoader.classList.remove('hidden');
        driverListDiv.innerHTML = '';
        try {
            const drivers = await api.searchDrivers(query);
            searchLoader.classList.add('hidden');
            if (drivers.length > 0) {
                drivers.forEach(driver => {
                    const driverEl = document.createElement('div');
                    driverEl.className = 'p-3 hover:bg-gray-700 rounded-lg cursor-pointer';
                    driverEl.textContent = driver.displayName;
                    driverEl.dataset.custId = driver.custId;
                    driverEl.addEventListener('click', () => selectDriver(driver));
                    driverListDiv.appendChild(driverEl);
                });
                driverModal.classList.add('flex');
                driverModal.classList.remove('hidden');
            } else {
                driverListDiv.innerHTML = '<p class="text-gray-400">No drivers found.</p>';
                driverModal.classList.add('flex');
                driverModal.classList.remove('hidden');
            }
        } catch (error) {
            console.error("Error searching for drivers:", error);
            searchLoader.classList.add('hidden');
            driverListDiv.innerHTML = `<p class="text-red-400">An error occurred: ${error.message}</p>`;
        }
    };

    async function selectDriver(driver) {
        currentDriver = driver;
        driverModal.classList.add('hidden');
        driverModal.classList.remove('flex');
        document.getElementById('driver-name').textContent = driver.displayName;
        document.getElementById('driver-cust-id').textContent = `Customer ID: ${driver.custId}`;
        dashboardDiv.classList.remove('hidden');
        dashboardLoader.classList.remove('hidden');
        statsContentDiv.classList.add('hidden');
        
        const seasons = await api.getSeasons(driver.custId);
        allSeasonsData = seasons;
        populateSeasonFilters(seasons);
        await loadSeasonData();
    }

    function populateSeasonFilters(seasons) {
        const uniqueYears = [...new Set(seasons.map(s => s.year))].sort((a,b) => b-a);
        yearSelect.innerHTML = uniqueYears.map(y => `<option value="${y}">${y}</option>`).join('');
        const seasonsForYear = seasons.filter(s => s.year == yearSelect.value).sort((a,b) => b.season - a.season);
        seasonSelect.innerHTML = seasonsForYear.map(s => `<option value="${s.season}">Season ${s.season}</option>`).join('');
    }

    async function loadSeasonData() {
        if (!currentDriver) return;
        dashboardLoader.classList.remove('hidden');
        statsContentDiv.classList.add('hidden');
        const year = yearSelect.value;
        const season = seasonSelect.value;
        
        seasonRecapData = await api.getSeasonStats(currentDriver.custId, year, season);
        dashboardLoader.classList.add('hidden');
        statsContentDiv.classList.remove('hidden');

        if (seasonRecapData && seasonRecapData.stats) {
            displayOverallStats(seasonRecapData.stats);
            populateCategoryFilter(seasonRecapData.races);
            updateLapTimeFilters();
        } else {
            document.getElementById('summary-stats').innerHTML = `<p class="col-span-full text-center text-gray-400">No stats found for this season.</p>`;
            document.getElementById('category-select').innerHTML = '';
            document.getElementById('track-select').innerHTML = '';
            document.getElementById('car-select').innerHTML = '';
            if(lapTimeChart) { lapTimeChart.destroy(); lapTimeChart = null; }
        }
    }

    function displayOverallStats(stats) {
        document.getElementById('summary-stats').innerHTML = `
            ${createStatCard('Starts', stats.starts)} ${createStatCard('Wins', stats.wins)}
            ${createStatCard('Top 5s', stats.top5)} ${createStatCard('Poles', stats.poles)}
            ${createStatCard('Avg Finish', stats.avgFinish)} ${createStatCard('Incidents', stats.incidents)}
        `;
    }

    function populateCategoryFilter(races) {
        if (!races || races.length === 0) {
            categorySelect.innerHTML = '<option>No categories</option>';
            return;
        }
        const uniqueCategories = [...new Set(races.map(r => r.category))];
        categorySelect.innerHTML = uniqueCategories.map(cat => `<option value="${cat}">${formatCategoryName(cat)}</option>`).join('');
    }

    function updateLapTimeFilters() {
        const selectedCategory = categorySelect.value;
        if (!seasonRecapData || !seasonRecapData.races) return;

        const racesInCategory = seasonRecapData.races.filter(r => r.category === selectedCategory);
        
        if (!racesInCategory || racesInCategory.length === 0) {
             trackSelect.innerHTML = '<option>No tracks raced</option>';
             carSelect.innerHTML = '';
             if(lapTimeChart) { lapTimeChart.destroy(); lapTimeChart = null; }
            return;
        };

        const uniqueTracks = [...new Set(racesInCategory.map(r => r.track.trackName))];
        trackSelect.innerHTML = uniqueTracks.map(t => `<option value="${t}">${t}</option>`).join('');
        updateCarFilter();
    }
    
    function updateCarFilter() {
        const selectedCategory = categorySelect.value;
        const selectedTrack = trackSelect.value;
        if (!seasonRecapData || !seasonRecapData.races) return;

        const racesOnTrack = seasonRecapData.races.filter(r => r.category === selectedCategory && r.track.trackName === selectedTrack);
        const uniqueCars = [...new Set(racesOnTrack.map(r => r.car.carName))];
        carSelect.innerHTML = uniqueCars.map(c => `<option value="${c}">${c}</option>`).join('');
        updateLapTimeChart();
    }

    function updateLapTimeChart() {
        const selectedCategory = categorySelect.value;
        const selectedTrack = trackSelect.value;
        const selectedCar = carSelect.value;
        if (!seasonRecapData || !seasonRecapData.races) return;

        const raceData = seasonRecapData.races
            .filter(r => r.category === selectedCategory && r.track.trackName === selectedTrack && r.car.carName === selectedCar)
            .sort((a,b) => new Date(a.startTime) - new Date(b.startTime));
        
        const labels = raceData.map(r => new Date(r.startTime).toLocaleDateString());
        const data = raceData.map(r => lapTimeToSeconds(r.bestLapTime));
        
        if (lapTimeChart) { lapTimeChart.destroy(); }
        const ctx = document.getElementById('lap-time-chart').getContext('2d');
        lapTimeChart = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets: [{ label: `Best Lap Time (${selectedCar} @ ${selectedTrack})`, data, borderColor: '#e60000', backgroundColor: 'rgba(230, 0, 0, 0.1)', fill: true, tension: 0.1 }] },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { ticks: { color: '#9ca3af', callback: (value) => secondsToLapTime(value) }, grid: { color: 'rgba(255, 255, 255, 0.1)' } }, x: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } } }, plugins: { legend: { labels: { color: '#f0f0f0' } }, tooltip: { callbacks: { label: (context) => secondsToLapTime(context.raw) } } } }
        });
    }

    // --- Utility Functions --- //
    function createStatCard(label, value) { return `<div class="stat-card text-center"><p class="text-gray-400 text-sm font-medium">${label}</p><p class="text-3xl font-bold text-white">${value !== undefined ? value : 'N/A'}</p></div>`; }
    function formatCategoryName(name) { return name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()); }
    function lapTimeToSeconds(lapTime) {
        if (typeof lapTime !== 'string' || !lapTime.includes(':')) return 0;
        const parts = lapTime.split(/[:.]/);
        if(parts.length < 3) return 0;
        return (+parts[0]) * 60 + (+parts[1]) + (+parts[2]) / 1000;
    }
    function secondsToLapTime(seconds) {
        if (typeof seconds !== 'number' || isNaN(seconds)) return 'N/A';
        const min = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60);
        const ms = Math.round((seconds - Math.floor(seconds)) * 1000);
        return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
    }

    // --- EVENT LISTENERS --- //
    searchBtn.addEventListener('click', handleSearch);
    driverSearchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSearch(); });
    closeModalBtn.addEventListener('click', () => { driverModal.classList.add('hidden'); driverModal.classList.remove('flex'); });
    yearSelect.addEventListener('change', () => {
        const seasonsForYear = allSeasonsData.filter(s => s.year == yearSelect.value).sort((a,b) => b.season - a.season);
        seasonSelect.innerHTML = seasonsForYear.map(s => `<option value="${s.season}">Season ${s.season}</option>`).join('');
        loadSeasonData();
    });
    seasonSelect.addEventListener('change', loadSeasonData);
    categorySelect.addEventListener('change', updateLapTimeFilters);
    trackSelect.addEventListener('change', updateCarFilter);
    carSelect.addEventListener('change', updateLapTimeChart);
});
