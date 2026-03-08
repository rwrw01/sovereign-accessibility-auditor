"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { handleOidcCallback } from "../../../lib/api-client";

export default function OidcCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const success = handleOidcCallback(searchParams);
    if (success) {
      router.replace("/");
    } else {
      router.replace("/auth/login");
    }
  }, [router, searchParams]);

  return (
    <div className="login-container">
      <p>Bezig met inloggen...</p>
    </div>
  );
}
