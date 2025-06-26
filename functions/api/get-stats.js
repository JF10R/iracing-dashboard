export async function onRequestPost(context) {
  const { IRACING_COOKIE } = context.env;

  if (!IRACING_COOKIE) {
    return new Response('IRACING_COOKIE secret not configured', { status: 500 });
  }
  
  try {
    const body = await context.request.json();
    const { custId, year, season } = body;

    if (!custId || !year || !season) {
      return new Response('Missing required parameters in POST body', { status: 400 });
    }

    // Pass the cookie in the headers
    const response = await fetch("https://members-api.iracing.com/stats/season_stats", {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': `irsso_membersv2=${IRACING_COOKIE};`
      },
      body: JSON.stringify({
        cust_id: parseInt(custId),
        year: parseInt(year),
        season: parseInt(season),
        category_id: [1, 2, 3, 4, 5]
      })
    });

    if (!response.ok) {
        const errorText = await response.text();
        return new Response(`Error from iRacing API: ${errorText}`, { status: response.status });
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response('Error in get-stats function: ' + error.message, { status: 500 });
  }
}