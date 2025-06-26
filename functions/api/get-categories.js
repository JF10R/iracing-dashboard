import iRacing from 'iracing-api';
// Import the helper primarily for its side effect of patching globalThis.fetch
import '../helpers/iracing-helper.js';

export async function onRequest(context) {
  try {
    // Create a new, non-authenticated instance for this constants call
    const iRacingAPI = new iRacing();
    const data = await iRacingAPI.constants.getCategories();
    
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Function error:", { message: error.message, stack: error.stack });
    return new Response('Error in get-categories function: ' + error.message, { status: 500 });
  }
}
