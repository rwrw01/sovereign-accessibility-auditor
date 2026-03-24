const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:13001";

/**
 * Cookie-based API client.
 * Access/refresh tokens are stored in HttpOnly cookies set by the API.
 * The client sends credentials (cookies) with every request.
 */
export async function apiClient(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(options.headers);

  let res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  // If 401, try cookie-based refresh
  if (res.status === 401) {
    const refreshed = await refreshTokens();
    if (refreshed) {
      res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers,
        credentials: "include",
      });
    }
  }

  // Still 401 after refresh — redirect to login
  if (res.status === 401 && typeof window !== "undefined") {
    window.location.href = "/auth/login";
  }

  return res;
}

export function isAuthenticated(): boolean {
  // With HttpOnly cookies we cannot inspect tokens client-side.
  // Check via a lightweight /auth/me call cached per session.
  return _authChecked;
}

let _authChecked = false;

export async function checkAuth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/me`, {
      credentials: "include",
    });
    _authChecked = res.ok;
    return res.ok;
  } catch {
    _authChecked = false;
    return false;
  }
}

async function refreshTokens(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function login(
  email: string,
  password: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });

    if (!res.ok) {
      const body = (await res.json()) as { error?: string };
      return { success: false, error: body.error ?? "Inloggen mislukt" };
    }

    _authChecked = true;
    return { success: true };
  } catch {
    return { success: false, error: "Kan geen verbinding maken met de server" };
  }
}

export async function logout(): Promise<void> {
  try {
    await fetch(`${API_URL}/api/v1/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // Best effort
  }
  _authChecked = false;
}

export async function getOidcStatus(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/oidc/status`);
    const data = (await res.json()) as { enabled: boolean };
    return data.enabled;
  } catch {
    return false;
  }
}

export function getOidcAuthorizeUrl(): string {
  return `${API_URL}/api/v1/auth/oidc/authorize`;
}
