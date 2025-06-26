// --- API Service --- //
// This section calls your backend API routes, which are created as Cloudflare Functions.
const api = {
    // Calls your /api/search-drivers function
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
        const result = await response.json();
        // The actual API returns drivers in a nested object
        return result || [];
    },

    // Calls your /api/get-seasons function
    getSeasons: async function(custId) {
        const response = await fetch(`/api/get-seasons?custId=${custId}`);
        if (!response.ok) {
            console.error("Failed to fetch seasons");
            alert('Error fetching season list. Check the console for details.');
            return [];
        }
        return await response.json();
    },
    
    // Calls your /api/get-stats function
    getSeasonStats: async function(custId, year, season) {
     // This needs to be a POST request to match the backend function
     const response = await fetch('/api/get-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ custId, year, season })
     });
     if (!response.ok) {
        console.error("Failed to fetch stats");
        alert('Error fetching season stats. Check the console for details.');
        return {};
     }
     return await response.json();
}
};

// --- Application Logic --- //
document.addEventListener('DOMContentLoaded', () => {
    // Get references to all DOM elements
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
    
    // Application state variables
    let currentDriver = null;
    let seasonData = null;
    let lapTimeChart = null;
    
    // Initialize the main view
    searchSection.classList.remove('hidden');
    document.getElementById('header-subtitle').textContent = "Enter a driver's name to view their racing statistics.";

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
                    driverEl.textContent = driver.display_name;
                    driverEl.dataset.custId = driver.cust_id;
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
        document.getElementById('driver-name').textContent = driver.display_name;
        document.getElementById('driver-cust-id').textContent = `Customer ID: ${driver.cust_id}`;
        dashboardDiv.classList.remove('hidden');
        dashboardLoader.classList.remove('hidden');
        statsContentDiv.classList.add('hidden');
        const seasons = await api.getSeasons(driver.cust_id);
        populateSeasonFilters(seasons);
        loadSeasonData();
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
        seasonData = await api.getSeasonStats(currentDriver.cust_id, year, season);
        dashboardLoader.classList.add('hidden');
        statsContentDiv.classList.remove('hidden');

        if (seasonData) {
            const categories = Object.keys(seasonData); // No .stats
            if (categories.length > 0) {
                const mostPopularCategory = categories.reduce((a, b) => seasonData[a].summary.starts > seasonData[b].summary.starts ? a : b); // No .stats
                categorySelect.innerHTML = categories.map(cat => `<option value="${cat}" ${cat === mostPopularCategory ? 'selected' : ''}>${formatCategoryName(cat)}</option>`).join('');
                displayCategoryStats();
            }
        }
    }

    function displayCategoryStats() {
        const selectedCategory = categorySelect.value;
        if (!seasonData || !seasonData[selectedCategory]) return; // Corrected check
        const stats = seasonData[selectedCategory].summary; // No .stats
        document.getElementById('summary-stats').innerHTML = `
            ${createStatCard('Starts', stats.starts)} ${createStatCard('Wins', stats.wins)}
            ${createStatCard('Top 5s', stats.top5)} ${createStatCard('Poles', stats.poles)}
            ${createStatCard('Avg Finish', stats.avg_finish_pos)} ${createStatCard('Incidents', stats.incidents)}
        `;
        populateLapTimeFilters();
    }

    function createStatCard(label, value) {
        return `<div class="stat-card text-center"><p class="text-gray-400 text-sm font-medium">${label}</p><p class="text-3xl font-bold text-white">${value !== undefined ? value : 'N/A'}</p></div>`;
    }

    function populateLapTimeFilters() {
        const races = seasonData[categorySelect.value].races;
        if (!races) return;
        const uniqueTracks = [...new Set(races.map(r => r.track))];
        trackSelect.innerHTML = uniqueTracks.map(t => `<option value="${t}">${t}</option>`).join('');
    }

    function updateCarFilterAndChart() {
        if (!seasonData[categorySelect.value].races) return;
        const selectedTrack = trackSelect.value;
        const racesOnTrack = seasonData[categorySelect.value].races.filter(r => r.track === selectedTrack);
        const uniqueCars = [...new Set(racesOnTrack.map(r => r.car))];
        carSelect.innerHTML = uniqueCars.map(c => `<option value="${c}">${c}</option>`).join('');
        updateLapTimeChart();
    }

    function updateLapTimeChart() {
        if (!seasonData[categorySelect.value].races) return;
        const selectedTrack = trackSelect.value;
        const selectedCar = carSelect.value;
        const raceData = seasonData[categorySelect.value].races
            .filter(r => r.track === selectedTrack && r.car === selectedCar)
            .sort((a,b) => new Date(a.date) - new Date(b.date));
        const labels = raceData.map(r => new Date(r.date).toLocaleDateString());
        const data = raceData.map(r => lapTimeToSeconds(r.best_lap));
        if (lapTimeChart) lapTimeChart.destroy();
        const ctx = document.getElementById('lap-time-chart').getContext('2d');
        lapTimeChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{ label: `Best Lap Time (${selectedCar} @ ${selectedTrack})`, data: data, borderColor: '#e60000', backgroundColor: 'rgba(230, 0, 0, 0.1)', fill: true, tension: 0.1 }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { ticks: { color: '#9ca3af', callback: (value) => secondsToLapTime(value) }, grid: { color: 'rgba(255, 255, 255, 0.1)' } }, x: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } } }, plugins: { legend: { labels: { color: '#f0f0f0' } }, tooltip: { callbacks: { label: (context) => secondsToLapTime(context.raw) } } } }
        });
    }

    // --- UTILITY FUNCTIONS --- //
    function formatCategoryName(name) { return name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()); }
    function lapTimeToSeconds(lapTime) { const parts = lapTime.split(/[:.]/); return (+parts[0]) * 60 + (+parts[1]) + (+parts[2]) / 1000; }
    function secondsToLapTime(seconds) { const min = Math.floor(seconds / 60); const sec = Math.floor(seconds % 60); const ms = Math.round((seconds - Math.floor(seconds)) * 1000); return `${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}.${String(ms).padStart(3,'0')}`; }

    // --- EVENT LISTENERS --- //
    searchBtn.addEventListener('click', handleSearch);
    driverSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    closeModalBtn.addEventListener('click', () => {
        driverModal.classList.add('hidden');
        driverModal.classList.remove('flex');
    });
    yearSelect.onchange = () => {
        const seasons = seasonData.allSeasons || [];
        const seasonsForYear = seasons.filter(s => s.year == yearSelect.value).sort((a,b) => b.season - a.season);
        seasonSelect.innerHTML = seasonsForYear.map(s => `<option value="${s.season}">Season ${s.season}</option>`).join('');
        loadSeasonData();
    };
    seasonSelect.onchange = loadSeasonData;
    categorySelect.onchange = displayCategoryStats;
    trackSelect.onchange = updateCarFilterAndChart;
    carSelect.onchange = updateLapTimeChart;
});
