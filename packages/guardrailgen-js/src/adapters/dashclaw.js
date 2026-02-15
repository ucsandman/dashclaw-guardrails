/**
 * DashClaw API adapter - fetch policies from a live DashClaw instance
 */

/**
 * Fetch policies from DashClaw API
 * @param {string} baseUrl - DashClaw instance URL (e.g., https://dash.example.com)
 * @param {string} apiKey - DashClaw API key
 * @returns {Promise<Array>} Array of policy objects
 */
export async function fetchPolicies(baseUrl, apiKey) {
  const url = new URL('/api/policies', baseUrl);
  
  const response = await fetch(url.toString(), {
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`DashClaw API error (${response.status}): ${text}`);
  }

  const data = await response.json();
  
  if (!data.policies || !Array.isArray(data.policies)) {
    throw new Error('Invalid response from DashClaw API: missing policies array');
  }

  return data.policies;
}

/**
 * Check DashClaw API connectivity and auth
 * @param {string} baseUrl
 * @param {string} apiKey
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
export async function checkConnection(baseUrl, apiKey) {
  try {
    await fetchPolicies(baseUrl, apiKey);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
