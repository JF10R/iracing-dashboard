import iRacing from 'iracing-api';

// This "monkey-patch" intercepts fetch requests to make them compatible with Cloudflare Workers.
const originalFetch = globalThis.fetch;
globalThis.fetch = (url, options) => {
  if (options && options.cache === 'no-cache') {
    delete options.cache;
  }
  return originalFetch(url, options);
};

export async function onRequestPost(context) {
  const { IRACING_EMAIL, IRACING_PASSWORD } = context.env;
  if (!IRACING_EMAIL || !IRACING_PASSWORD) {
    return new Response('IRACING_EMAIL and/or IRACING_PASSWORD secrets not configured', { status: 500 });
  }

  try {
    const body = await context.request.json();
    const searchTerm = body.searchTerm;

    const iRacingAPI = new iRacing();
    await iRacingAPI.login(IRACING_EMAIL, IRACING_PASSWORD);

    // Corrected: Use the documented `lookup.getDrivers` method
    const data = await iRacingAPI.lookup.getDrivers({ searchTerm });
    
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Function error:", { message: error.message, stack: error.stack });
    return new Response('Error in search-drivers function: ' + error.message, { status: 500 });
  }
}