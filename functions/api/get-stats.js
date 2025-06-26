import iRacing from 'iracing-api';

export async function onRequestPost(context) {
  const { IRACING_EMAIL, IRACING_PASSWORD } = context.env;
  if (!IRACING_EMAIL || !IRACING_PASSWORD) {
    return new Response('IRACING_EMAIL and/or IRACING_PASSWORD secrets not configured', { status: 500 });
  }
  
  try {
    const body = await context.request.json();
    const { custId, year, season } = body;

    if (!custId || !year || !season) {
      return new Response('Missing required parameters in POST body', { status: 400 });
    }

    const iRacingAPI = new iRacing({
      axiosOptions: {
        headers: {
          'Cache-Control': null,
          'Pragma': null,
        }
      }
    });

    await iRacingAPI.login(IRACING_EMAIL, IRACING_PASSWORD);
    const data = await iRacingAPI.getSeasonStats({ 
      customerId: parseInt(custId), 
      year: parseInt(year),
      season: parseInt(season)
    });
    
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Function error:", error);
    return new Response('Error in get-stats function: ' + error.message, { status: 500 });
  }
}
