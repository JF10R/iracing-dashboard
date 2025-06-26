// This should also be an onRequestPost handler to match the front-end call
export async function onRequestPost(context) {
  const { IRACING_EMAIL, IRACING_PASSWORD } = context.env;
  
  try {
    // Read parameters from the POST body, not the URL
    const body = await context.request.json();
    const { custId, year, season } = body;

    if (!custId || !year || !season) {
      return new Response('Missing required parameters in POST body', { status: 400 });
    }

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

    if (!response.ok) {
        const errorText = await response.text();
        console.error("iRacing API error:", errorText);
        return new Response(`Error from iRacing API: ${response.statusText}`, { status: response.status });
    }

    const data = await response.json();
    
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Function error:", error);
    return new Response('Error in get-stats function: ' + error.message, { status: 500 });
  }
}