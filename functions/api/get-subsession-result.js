import { createAuthenticatedIRacingAPI } from '../helpers/iracing-helper.js';

export async function onRequestPost(context) {
  try {
    const { IRACING_EMAIL, IRACING_PASSWORD } = context.env;
    const iRacingAPI = await createAuthenticatedIRacingAPI(IRACING_EMAIL, IRACING_PASSWORD);

    const body = await context.request.json();
    const { subsessionId } = body;

    if (!subsessionId) {
      return new Response('Missing subsessionId parameter', { status: 400 });
    }

    const data = await iRacingAPI.results.get({ subsessionId, includeLicenses: true });
    
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Function error:", { message: error.message, stack: error.stack });
    // Check if the error is from our helper to return a specific status
    if (error.message === 'Authentication secrets not configured') {
        return new Response(error.message, { status: 500 });
    }
    return new Response('Error in get-subsession-result function: ' + error.message, { status: 500 });
  }
}
