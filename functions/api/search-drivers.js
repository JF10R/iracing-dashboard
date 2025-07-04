import { createAuthenticatedIRacingAPI } from '../helpers/iracing-helper.js';

export async function onRequestPost(context) {
  try {
    const { IRACING_EMAIL, IRACING_PASSWORD } = context.env;
    const iRacingAPI = await createAuthenticatedIRacingAPI(IRACING_EMAIL, IRACING_PASSWORD);
    
    const body = await context.request.json();
    const searchTerm = body.searchTerm;

    const data = await iRacingAPI.lookup.getDrivers({ searchTerm });
    
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Function error:", { message: error.message, stack: error.stack });
    if (error.message === 'Authentication secrets not configured') {
        return new Response(error.message, { status: 500 });
    }
    return new Response('Error in search-drivers function: ' + error.message, { status: 500 });
  }
}
