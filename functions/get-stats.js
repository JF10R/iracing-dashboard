export async function onRequest(context) {
  const { IRACING_EMAIL, IRACING_PASSWORD } = context.env;
  const { searchParams } = new URL(context.request.url);
  
  const custId = searchParams.get('custId');
  const year = searchParams.get('year');
  const season = searchParams.get('season');

  if (!custId || !year || !season) {
    return new Response('Missing required parameters', { status: 400 });
  }

  try {
    const apiRequestBody = {
      email: IRACING_EMAIL,
      password: IRACING_PASSWORD,
      cust_id: parseInt(custId),
      year: parseInt(year),
      season: parseInt(season),
      category_id: [1, 2, 3, 4, 5] // 1=oval, 2=road, 3=dirt oval, 4=dirt road, 5=sports car
    };

    const response = await fetch("https://members-api.iracing.com/stats/season_stats", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apiRequestBody)
    });

    const data = await response.json();
    
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response('Error fetching from iRacing API: ' + error.message, { status: 500 });
  }