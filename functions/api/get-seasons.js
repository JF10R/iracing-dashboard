import { createAuthenticatedIRacingAPI } from '../helpers/iracing-helper.js';

export async function onRequest(context) {
  const { searchParams } = new URL(context.request.url);
  const custId = searchParams.get('custId');

  if (!custId) {
    return new Response('Missing custId parameter', { status: 400 });
  }
  
  try {
    const { IRACING_EMAIL, IRACING_PASSWORD } = context.env;
    const iRacingAPI = await createAuthenticatedIRacingAPI(IRACING_EMAIL, IRACING_PASSWORD);
    
    const data = await iRacingAPI.stats.getMemberYearlyStats({ customerId: parseInt(custId) });
    
    const years = data.stats.map(stat => stat.year);
    
    // Optimized: Use flatMap to create the seasons array in a single, more efficient operation.
    const seasons = years.flatMap(year => [
        { year: year, season: 1 },
        { year: year, season: 2 },
        { year: year, season: 3 },
        { year: year, season: 4 },
    ]);
    
    return new Response(JSON.stringify(seasons), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Function error:", { message: error.message, stack: error.stack });
     if (error.message === 'Authentication secrets not configured') {
        return new Response(error.message, { status: 500 });
    }
    return new Response('Error in get-seasons function: ' + error.message, { status: 500 });
  }
}
