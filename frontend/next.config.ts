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
    return [
      { source: "/api/:path*", destination: `${BACKEND_URL}/:path*` },
      // Les visuels televerses depuis le backoffice sont servis par Nest sous
      // `/uploads`. On remonte le meme chemin ici pour que l'URL stockee dans
      // `ProductImage.imageUrl` soit utilisable telle quelle dans une balise
      // <img>, sans prefixe a recoller cote client.
      { source: "/uploads/:path*", destination: `${BACKEND_URL}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
