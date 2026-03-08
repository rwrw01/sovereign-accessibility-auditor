"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { login, isAuthenticated, getOidcStatus, getOidcAuthorizeUrl } from "../../../lib/api-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [oidcEnabled, setOidcEnabled] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace("/");
    }
    getOidcStatus().then(setOidcEnabled);
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      router.replace("/");
    } else {
      setError(result.error ?? "Inloggen mislukt");
    }

    setLoading(false);
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Sovereign Accessibility Auditor</h1>
        <p className="login-subtitle">Log in om door te gaan</p>

        {error && (
          <div className="login-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">E-mailadres</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Wachtwoord</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Bezig met inloggen..." : "Inloggen"}
          </button>
        </form>

        {oidcEnabled && (
          <div className="login-divider">
            <span>of</span>
          </div>
        )}

        {oidcEnabled && (
          <a href={getOidcAuthorizeUrl()} className="btn-oidc">
            Inloggen met organisatie-account
          </a>
        )}
      </div>
    </div>
  );
}
