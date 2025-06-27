export const api = {
    searchDrivers: async (searchTerm) => {
        const response = await fetch('/api/search-drivers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ searchTerm })
        });
        return response.ok ? response.json() : [];
    },
    getDriverData: async (custId, year, season) => {
         const response = await fetch('/api/get-stats', {
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
    }
};
