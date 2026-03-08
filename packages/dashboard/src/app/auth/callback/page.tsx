"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function OidcCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Tokens are set as HttpOnly cookies by the API.
    // We only check the query param to know if OIDC succeeded.
    const oidcResult = searchParams.get("oidc");
    if (oidcResult === "success") {
      router.replace("/");
    } else {
      router.replace("/auth/login");
    }
  }, [router, searchParams]);

  return (
    <main className="login-container">
      <p role="status">Bezig met inloggen...</p>
    </main>
  );
}
