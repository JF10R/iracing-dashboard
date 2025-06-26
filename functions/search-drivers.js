export async function onRequest(context) {
  const { IRACING_EMAIL, IRACING_PASSWORD } = context.env;
  
  // Only allow POST requests for this endpoint
  if (context.request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const body = await context.request.json();
    const searchTerm = body.searchTerm;

    const apiRequestBody = {
      email: IRACING_EMAIL,
      password: IRACING_PASSWORD,
      search: searchTerm
    };

    const response = await fetch("https://members-api.iracing.com/driver/get", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apiRequestBody)
    });

    const data = await response.json();
    
    // Return the data to your front-end
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response('Error fetching from iRacing API: ' + error.message, { status: 500 });
  }
}