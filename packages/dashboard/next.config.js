"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const nextConfig = {
    reactStrictMode: true,
    poweredByHeader: false,
    headers: async () => [
        {
            source: "/(.*)",
            headers: [
                { key: "X-Content-Type-Options", value: "nosniff" },
                { key: "X-Frame-Options", value: "DENY" },
                { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
                { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
            ],
        },
    ],
};
exports.default = nextConfig;
//# sourceMappingURL=next.config.js.map