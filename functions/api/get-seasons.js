export async function onRequest(context) {
  const { searchParams } = new URL(context.request.url);
  const custId = searchParams.get('custId');

  if (!custId) {
    return new Response('Missing custId parameter', { status: 400 });
  }

  try {
    const url = `https://members-api.iracing.com/season/list?cust_id=${custId}`;
    const response = await fetch(url);
    const data = await response.json();
    
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response('Error fetching from iRacing API: ' + error.message, { status: 500 });
  }
}