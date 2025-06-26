import iRacing from 'iracing-api';

// This "monkey-patch" intercepts fetch requests to make them compatible with Cloudflare Workers.
const originalFetch = globalThis.fetch;
globalThis.fetch = (url, options) => {
  if (options && options.cache === 'no-cache') {
    delete options.cache;
  }
  return originalFetch(url, options);
};

/**
 * Creates and authenticates an instance of the iRacing API client.
 * This centralizes the login logic and the fetch patch.
 * @param {string} email - The user's iRacing email from secrets.
 * @param {string} password - The user's iRacing password from secrets.
 * @returns {Promise<iRacing>} An authenticated iRacing API instance.
 * @throws {Error} If credentials are not provided.
 */
export async function createAuthenticatedIRacingAPI(email, password) {
  if (!email || !password) {
    throw new Error('Authentication secrets not configured');
  }
  const iRacingAPI = new iRacing();
  await iRacingAPI.login(email, password);
  return iRacingAPI;
}
