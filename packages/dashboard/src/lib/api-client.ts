const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

function getTokens(): AuthTokens | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("saa_tokens");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthTokens;
  } catch {
    return null;
  }
}

function setTokens(tokens: AuthTokens): void {
  localStorage.setItem("saa_tokens", JSON.stringify(tokens));
}

export function clearTokens(): void {
  localStorage.removeItem("saa_tokens");
}

export function isAuthenticated(): boolean {
  return getTokens() !== null;
}

async function refreshTokens(): Promise<boolean> {
  const tokens = getTokens();
  if (!tokens) return false;

  try {
    const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    });

    if (!res.ok) {
      clearTokens();
      return false;
    }

    const newTokens = (await res.json()) as AuthTokens;
    setTokens(newTokens);
    return true;
  } catch {
    clearTokens();
    return false;
  }
}

export async function apiClient(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const tokens = getTokens();
  const headers = new Headers(options.headers);

  if (tokens) {
    headers.set("Authorization", `Bearer ${tokens.accessToken}`);
  }

  let res = await fetch(`${API_URL}${path}`, { ...options, headers });

  // If 401, try refresh
  if (res.status === 401 && tokens) {
    const refreshed = await refreshTokens();
    if (refreshed) {
      const newTokens = getTokens();
      if (newTokens) {
        headers.set("Authorization", `Bearer ${newTokens.accessToken}`);
      }
      res = await fetch(`${API_URL}${path}`, { ...options, headers });
    }
  }

  // Still 401 after refresh — redirect to login
  if (res.status === 401 && typeof window !== "undefined") {
    clearTokens();
    window.location.href = "/auth/login";
  }

  return res;
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
    });

    if (!res.ok) {
      const body = (await res.json()) as { error?: string };
      return { success: false, error: body.error ?? "Inloggen mislukt" };
    }

    const data = (await res.json()) as { tokens: AuthTokens };
    setTokens(data.tokens);
    return { success: true };
  } catch {
    return { success: false, error: "Kan geen verbinding maken met de server" };
  }
}

export async function logout(): Promise<void> {
  const tokens = getTokens();
  if (tokens) {
    try {
      await fetch(`${API_URL}/api/v1/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokens.accessToken}`,
        },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });
    } catch {
      // Best effort
    }
  }
  clearTokens();
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

export function handleOidcCallback(params: URLSearchParams): boolean {
  const accessToken = params.get("accessToken");
  const refreshToken = params.get("refreshToken");
  const expiresIn = params.get("expiresIn");

  if (!accessToken || !refreshToken || !expiresIn) return false;

  setTokens({
    accessToken,
    refreshToken,
    expiresIn: Number(expiresIn),
  });
  return true;
}
