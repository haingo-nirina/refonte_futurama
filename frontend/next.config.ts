import type { NextConfig } from "next";

/**
 * Le backend NestJS n'a pas de prefixe global ni de CORS : on le monte derriere
 * `/api` via un rewrite. Les appels navigateur restent donc same-origin (pas de
 * preflight CORS a gerer cote Nest), et le front garde une URL d'API unique.
 * Cote serveur, `lib/api.ts` tape directement sur BACKEND_URL sans passer par la.
 */
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3001";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND_URL}/:path*` }];
  },
};

export default nextConfig;
