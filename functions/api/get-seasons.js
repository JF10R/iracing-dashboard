import iRacing from 'iracing-api';

export async function onRequest(context) {
  const { searchParams } = new URL(context.request.url);
  const custId = searchParams.get('custId');

  if (!custId) {
    return new Response('Missing custId parameter', { status: 400 });
  }

  try {
    const iRacingAPI = new iRacing({
      axiosOptions: {
        headers: {
          'Cache-Control': null,
          'Pragma': null,
        }
      }
    });
    
    const data = await iRacingAPI.getSeasons({ customerId: parseInt(custId) });
    
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Function error:", error);
    return new Response('Error fetching from iRacing API: ' + error.message, { status: 500 });
  }
}