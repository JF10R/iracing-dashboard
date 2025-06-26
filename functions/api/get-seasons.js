import iRacing from 'iracing-api';

// This "monkey-patch" intercepts fetch requests to make them compatible with Cloudflare Workers.
const originalFetch = globalThis.fetch;
globalThis.fetch = (url, options) => {
  if (options && options.cache === 'no-cache') {
    delete options.cache;
  }
  return originalFetch(url, options);
};

export async function onRequest(context) {
  const { searchParams } = new URL(context.request.url);
  const custId = searchParams.get('custId');

  if (!custId) {
    return new Response('Missing custId parameter', { status: 400 });
  }

  try {
    const iRacingAPI = new iRacing();
    const data = await iRacingAPI.getSeasons({ customerId: parseInt(custId) });
    
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Function error:", { message: error.message, stack: error.stack });
    return new Response('Error fetching from iRacing API: ' + error.message, { status: 500 });
  }
}
