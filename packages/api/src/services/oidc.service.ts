import * as client from "openid-client";
import { randomBytes } from "node:crypto";

let oidcConfig: client.Configuration | null = null;
const stateStore = new Map<string, { nonce: string; codeVerifier: string }>();

function getOidcEnv(): {
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
} | null {
  const issuer = process.env["OIDC_ISSUER"];
  const clientId = process.env["OIDC_CLIENT_ID"];
  const clientSecret = process.env["OIDC_CLIENT_SECRET"];
  const redirectUri =
    process.env["OIDC_REDIRECT_URI"] ??
    "http://localhost:3001/api/v1/auth/oidc/callback";

  if (!issuer || !clientId || !clientSecret) return null;

  return { issuer, clientId, clientSecret, redirectUri };
}

export function isOidcEnabled(): boolean {
  return getOidcEnv() !== null;
}

async function getOidcConfig(): Promise<client.Configuration> {
  if (oidcConfig) return oidcConfig;

  const env = getOidcEnv();
  if (!env) throw new Error("OIDC is niet geconfigureerd");

  oidcConfig = await client.discovery(
    new URL(env.issuer),
    env.clientId,
    env.clientSecret,
  );

  return oidcConfig;
}

export async function getAuthorizationUrl(): Promise<string> {
  const env = getOidcEnv();
  if (!env) throw new Error("OIDC is niet geconfigureerd");

  const config = await getOidcConfig();
  const state = randomBytes(16).toString("hex");
  const nonce = randomBytes(16).toString("hex");
  const codeVerifier = client.randomPKCECodeVerifier();
  const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);

  stateStore.set(state, { nonce, codeVerifier });

  // Clean up old states after 10 minutes
  setTimeout(() => stateStore.delete(state), 10 * 60 * 1000);

  const params = new URLSearchParams({
    redirect_uri: env.redirectUri,
    scope: "openid email profile",
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    response_type: "code",
  });

  const authEndpoint =
    config.serverMetadata().authorization_endpoint;
  if (!authEndpoint) throw new Error("Geen authorization_endpoint gevonden");

  return `${authEndpoint}?${params.toString()}`;
}

export async function handleCallback(
  callbackUrl: string,
): Promise<{
  subject: string;
  issuer: string;
  email: string;
  naam: string | null;
}> {
  const env = getOidcEnv();
  if (!env) throw new Error("OIDC is niet geconfigureerd");

  const config = await getOidcConfig();
  const url = new URL(callbackUrl);
  const state = url.searchParams.get("state");

  if (!state || !stateStore.has(state)) {
    throw new Error("Ongeldige state parameter");
  }

  const { nonce, codeVerifier } = stateStore.get(state)!;
  stateStore.delete(state);

  const tokens = await client.authorizationCodeGrant(config, url, {
    pkceCodeVerifier: codeVerifier,
    expectedNonce: nonce,
    expectedState: state,
  });

  const claims = tokens.claims();
  if (!claims) throw new Error("Geen claims in token response");

  const subject = claims.sub;
  const email = claims.email as string | undefined;
  const naam =
    (claims.name as string | undefined) ??
    (claims.preferred_username as string | undefined) ??
    null;

  if (!email) {
    throw new Error("Geen e-mailadres in OIDC claims");
  }

  return {
    subject,
    issuer: env.issuer,
    email,
    naam,
  };
}
