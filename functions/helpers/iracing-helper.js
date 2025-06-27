import iRacing from 'iracing-api';

// This is a safer "monkey-patch" that intercepts fetch requests.
// It creates a new options object, excluding the 'cache' property, which prevents
// both the 'Unsupported cache mode' error and the strange side-effects.
const originalFetch = globalThis.fetch;
globalThis.fetch = (url, options) => {
  if (options && options.cache) {
    const { cache, ...restOfOptions } = options;
    return originalFetch(url, restOfOptions);
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
