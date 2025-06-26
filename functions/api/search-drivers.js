import iRacing from 'iracing-api';

export async function onRequestPost(context) {
  const { IRACING_EMAIL, IRACING_PASSWORD } = context.env;
  if (!IRACING_EMAIL || !IRACING_PASSWORD) {
    return new Response('IRACING_EMAIL and/or IRACING_PASSWORD secrets not configured', { status: 500 });
  }

  try {
    const body = await context.request.json();
    const searchTerm = body.searchTerm;

    // Initialize the API wrapper with axiosOptions to prevent cache errors
    const iRacingAPI = new iRacing({
      axiosOptions: {
        headers: {
          'Cache-Control': null,
          'Pragma': null,
        }
      }
    });

    await iRacingAPI.login(IRACING_EMAIL, IRACING_PASSWORD);
    const data = await iRacingAPI.searchDrivers({ searchTerm });
    
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Function error:", error);
    return new Response('Error in search-drivers function: ' + error.message, { status: 500 });
  }
}