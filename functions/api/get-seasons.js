import iRacing from 'iracing-api';

// This "monkey-patch" intercepts fetch requests to make them compatible with Cloudflare Workers.
const originalFetch = globalThis.fetch;
globalThis.fetch = (url, options) => {
  if (options && options.cache === 'no-cache') {
    delete options.cache;
  }
  return originalFetch(url, options);
};

export async function onRequest(context) {
  const { IRACING_EMAIL, IRACING_PASSWORD } = context.env;
  const { searchParams } = new URL(context.request.url);
  const custId = searchParams.get('custId');

  if (!custId) {
    return new Response('Missing custId parameter', { status: 400 });
  }
  if (!IRACING_EMAIL || !IRACING_PASSWORD) {
    return new Response('Authentication secrets not configured', { status: 500 });
  }

  try {
    const iRacingAPI = new iRacing();
    // This library endpoint requires authentication to access stats.
    await iRacingAPI.login(IRACING_EMAIL, IRACING_PASSWORD);
    
    // Use the member's yearly stats to get the years they have competed.
    const data = await iRacingAPI.stats.getMemberYearlyStats({ customerId: parseInt(custId) });
    
    // The data is an object with years as keys. We need to format it
    // into the array structure the front-end expects: [{ year: Y, season: S }, ...]
    const stats = data.stats;
    const years = Object.keys(stats).map(year => parseInt(year, 10));
    const seasons = [];

    // For each year the driver was active, create entries for all 4 seasons
    // so the user can select any of them.
    years.forEach(year => {
        seasons.push({ year: year, season: 1 });
        seasons.push({ year: year, season: 2 });
        seasons.push({ year: year, season: 3 });
        seasons.push({ year: year, season: 4 });
    });
    
    return new Response(JSON.stringify(seasons), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Function error:", { message: error.message, stack: error.stack });
    return new Response('Error in get-seasons function: ' + error.message, { status: 500 });
  }
}