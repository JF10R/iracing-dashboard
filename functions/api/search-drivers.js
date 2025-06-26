export async function onRequestPost(context) {
  // Use the cookie for authentication
  const { IRACING_COOKIE } = context.env;
  
  if (!IRACING_COOKIE) {
    return new Response('IRACING_COOKIE secret not configured', { status: 500 });
  }

  try {
    const body = await context.request.json();
    const searchTerm = body.searchTerm;

    // The API call no longer needs email/password in the body.
    // Instead, we pass the cookie in the headers.
    const response = await fetch("https://members-api.iracing.com/driver/get", {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': `irsso_membersv2=${IRACING_COOKIE};` 
      },
      body: JSON.stringify({ search: searchTerm }) // Only send the search term
    });

    if (!response.ok) {
        const errorText = await response.text();
        return new Response(`Error from iRacing API: ${errorText}`, { status: response.status });
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response('Error in search-drivers function: ' + error.message, { status: 500 });
  }
}