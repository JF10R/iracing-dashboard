import { iRacing } from 'iracing-api';

export async function onRequestPost(context) {
  // Get credentials from Cloudflare secrets
  const { IRACING_EMAIL, IRACING_PASSWORD } = context.env;
  if (!IRACING_EMAIL || !IRACING_PASSWORD) {
    return new Response('IRACING_EMAIL and/or IRACING_PASSWORD secrets not configured', { status: 500 });
  }

  try {
    const body = await context.request.json();
    const searchTerm = body.searchTerm;

    // Initialize the API wrapper
    const iRacingAPI = new iRacing();

    // Use the library's built-in login method
    await iRacingAPI.login(IRACING_EMAIL, IRACING_PASSWORD);

    // Use the library's built-in function
    const data = await iRacingAPI.searchDrivers({ searchTerm });
    
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Function error:", error);
    return new Response('Error in search-drivers function: ' + error.message, { status: 500 });
  }
}
