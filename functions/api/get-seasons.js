import iRacing from 'iracing-api';

export async function onRequest(context) {
  const { searchParams } = new URL(context.request.url);
  const custId = searchParams.get('custId');

  if (!custId) {
    return new Response('Missing custId parameter', { status: 400 });
  }

  try {
    const iRacingAPI = new iRacing();
    // This specific endpoint in the library doesn't require prior authentication,
    // so we don't need to call the login() method here.
    const data = await iRacingAPI.getSeasons({ customerId: parseInt(custId) });
    
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Function error:", error);
    return new Response('Error fetching from iRacing API: ' + error.message, { status: 500 });
  }
}