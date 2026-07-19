const NZPOST_OAUTH_URL = "https://oauth.nzpost.co.nz/as/token.oauth2";
const REQUEST_TIMEOUT_MS = 8000;
const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000;

export class NZPostApiError extends Error {
  status?: number;
  responseBody?: unknown;

  constructor(message: string, status?: number, responseBody?: unknown) {
    super(message);
    this.name = "NZPostApiError";
    this.status = status;
    this.responseBody = responseBody;
  }
}

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

async function fetchAccessToken(): Promise<string> {
  const clientId = process.env.NZPOST_CLIENT_ID as string;
  const clientSecret = process.env.NZPOST_CLIENT_SECRET as string;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(NZPOST_OAUTH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new NZPostApiError(
        `NZ Post token request failed with status ${response.status}`,
        response.status,
      );
    }

    const data = (await response.json()) as {
      access_token: string;
      expires_in: number;
    };

    return data.access_token;
  } finally {
    clearTimeout(timeout);
  }
}

async function getAccessToken(forceRefresh = false): Promise<string> {
  if (
    !forceRefresh &&
    cachedToken &&
    cachedToken.expiresAt - TOKEN_REFRESH_MARGIN_MS > Date.now()
  ) {
    return cachedToken.accessToken;
  }

  const accessToken = await fetchAccessToken();
  // expires_in is ~86399s; we don't trust it precisely, just cache with a safety margin.
  cachedToken = { accessToken, expiresAt: Date.now() + 23 * 60 * 60 * 1000 };
  return accessToken;
}

// Shared by every NZ Post API client (ParcelAddress, ParcelLabel, ...) — they
// all sit under the same OAuth app/credentials, so one token cache serves all.
export async function nzPostFetch<T>(
  url: string,
  init: RequestInit = {},
): Promise<T> {
  let token = await getAccessToken();

  const doFetch = async (accessToken: string) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      return await fetch(url, {
        ...init,
        headers: {
          ...init.headers,
          Authorization: `Bearer ${accessToken}`,
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  };

  let response = await doFetch(token);

  if (response.status === 401) {
    token = await getAccessToken(true);
    response = await doFetch(token);
  }

  if (!response.ok) {
    // NZ Post's error responses carry the actual validation reason
    // (code/details/message) in the body — surface it, don't discard it.
    const errorBody = await response.text();
    let parsedBody: unknown = errorBody;
    try {
      parsedBody = JSON.parse(errorBody);
    } catch {
      // not JSON, leave as raw text
    }

    console.error(
      "NZ Post API error response",
      JSON.stringify(
        { url, status: response.status, body: parsedBody },
        null,
        2,
      ),
    );

    throw new NZPostApiError(
      `NZ Post API request failed with status ${response.status}`,
      response.status,
      parsedBody,
    );
  }

  return (await response.json()) as T;
}
