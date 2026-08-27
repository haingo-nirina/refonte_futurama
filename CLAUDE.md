# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Structure

Monorepo à deux paquets indépendants, chacun avec son propre `package.json` et son `yarn.lock`. Il n'y a **pas** de workspace yarn à la racine : toute commande doit être lancée depuis `backend/` ou `frontend/`, jamais depuis la racine.

- `backend/` — API NestJS 11 + Prisma 7 sur PostgreSQL (Aiven)
- `frontend/` — Next.js 16 (App Router) + React 19 + Tailwind 4

## Commandes

Backend (`cd backend`) :

```bash
yarn start:dev                  # dev avec watch
yarn build                      # nest build -> dist/src/main.js
yarn lint                       # eslint --fix
yarn test                       # jest
yarn test -- app.controller     # un seul fichier de test (match sur le nom)
yarn test:e2e                   # jest --config ./test/jest-e2e.json
yarn prisma generate            # OBLIGATOIRE après toute modif du schema
yarn prisma migrate dev --name <nom>
yarn seed                       # prisma db seed -> prisma/seed.ts
```

Frontend (`cd frontend`) : `yarn dev`, `yarn build`, `yarn lint`.

**Répartition des ports :** `next dev` garde 3000, le backend est fixé à 3001 par `PORT` dans `backend/.env`. Sans cette variable les deux retombent sur 3000 (`PORT ?? 3000`) et se marchent dessus.

Le binaire buildé est `dist/src/main.js`, pas `dist/main.js` — le script `start:prod` hérité du scaffold pointe sur le mauvais chemin.

## Architecture backend : monolithe modulaire

Un module par domaine métier, tous plats sous `src/`, tous suivant **exactement** la même forme :

```
src/<domaine>/
  <domaine>.controller.ts   # routes HTTP uniquement
  <domaine>.service.ts      # logique métier + appels this.prisma.<table>.xxx()
  <domaine>.module.ts
  dto/<action>-<x>.dto.ts   # validation class-validator
```

Modules existants : `auth`, `categories`, `products`, `cart`, `orders`, `reviews`, `resellers`, `posts`, `stats`. `PrismaService` est fourni par `src/prisma/`, déclaré `@Global()` : il s'injecte directement dans n'importe quel service sans réimporter `PrismaModule`.

`Vendor` et `Promotion` n'ont pas de module dédié : ils se peuplent uniquement par le seed, et se lisent via les produits (`vendorId` filtre `GET /products`). Conséquence pour le backoffice : le formulaire produit **n'expose pas le vendeur** — il n'y a rien pour en lister. Ne pas envoyer `vendorId` laisse la valeur en place, donc rien n'est perdu.

`stats` n'a qu'une route, `GET /stats/dashboard` : tous les agrégats du tableau de bord en un seul appel. Les découper coûterait autant d'allers-retours vers Aiven — voir les ordres de grandeur plus bas.

### Sous-ressources produit

`ProductImage`, `ProductSpec` et `ProductRelation` se remplacent **en bloc**, pas ligne par ligne : `PUT /products/:id/images|specs|relations` supprime la collection et la recrée. C'est ce que soumet un formulaire d'édition, et ça évite neuf routes là où trois suffisent. Rien ne référence ces lignes, les recréer est sans conséquence.

`replaceRelations` maintient le **miroir de `similar`** : la relation est dirigée en base et `findRelated` filtre sur `productId`, donc sans ligne inverse « A ressemble à B » n'apparaîtrait pas sur la fiche de B. C'est la convention du seed. `frequently_bought_together` reste dirigée.

### Authentification

`src/auth/` suit la forme des autres modules, avec en plus la stratégie Passport et les gardes réutilisables :

- `POST /auth/register` et `POST /auth/login` renvoient `{ accessToken, user }`. Le hash ne sort jamais du service.
- `JwtStrategy` valide `Authorization: Bearer <token>` et dépose `{ userId, role }` sur `request.user`. Le token porte `sub` (userId) et `role` — **aucun aller-retour en base** : un compte supprimé ou dégradé reste valide jusqu'à expiration (7 j par défaut, `JWT_EXPIRES_IN`).
- `JwtAuthGuard` exige un token (401 sinon). `RolesGuard` + `@Roles(USER_ROLE.ADMIN)` filtrent sur le rôle (403) — `RolesGuard` n'authentifie pas, il doit **toujours** suivre `JwtAuthGuard` dans le même `@UseGuards()`.
- **`@AdminOnly()`** (`src/auth/decorators/admin-only.decorator.ts`) encapsule ce couple dans le bon ordre. C'est la forme à utiliser sur toute route admin : la combinaison manuelle laisse la possibilité d'oublier `JwtAuthGuard` et de rendre la route publique.
- `OptionalJwtAuthGuard` laisse passer l'anonyme tout en renseignant `request.user` si un token valide est présent. C'est ce qui permet au panier de rester ouvert aux visiteurs, et au catalogue de masquer les produits dépubliés à tout le monde sauf à l'admin.
- `@CurrentUser()` injecte l'utilisateur ; il renvoie `undefined` derrière `OptionalJwtAuthGuard`.
- `GET /auth/me` **relit le compte en base** : le JWT porte un `role` figé à l'émission, donc c'est le seul moyen de savoir si un compte est *encore* admin. C'est ce que fait le layout du backoffice.
- `JWT_SECRET` est obligatoire (l'app refuse de démarrer sans). Voir `.env.example`.

Routes protégées par un simple JWT : `POST /orders`, `GET /orders`, `GET /orders/:id`, `GET /auth/me`, `POST /reviews`, `POST /posts/:id/comments`, `POST|DELETE /posts/:id/like`.

Routes admin (`@AdminOnly()`) : **toute écriture du catalogue et du contenu** — `POST|PATCH|DELETE /products`, `PUT /products/:id/images|specs|relations`, `POST|PATCH|DELETE /categories`, `POST|PATCH|DELETE /posts`, `DELETE /posts/:id/comments/:commentId`, `POST|PATCH|DELETE /resellers` — plus `GET /orders/admin`, `PATCH /orders/:id/status`, `GET /reviews/admin`, `GET /reviews/pending`, `PATCH /reviews/:id/moderate`, `GET /stats/dashboard`.

Le catalogue et le blog restent publics **en lecture**, le panier reste ouvert sans compte.

**Aucune route de `orders` n'est publique** : une commande porte le nom, le téléphone et l'adresse de livraison de son auteur. `GET /orders` renvoie l'historique du **compte appelant, admin compris** — « Mes commandes » reste personnel ; la liste complète du site passe par `GET /orders/admin`, paginée et filtrable (statut, recherche nom/téléphone/email, plage de dates). `GET /orders/:id` refuse en 403 une commande qui n'appartient pas à l'appelant, sauf pour un admin. Le filtre vit dans le service (règle métier), pas dans le controller. `updateStatus` passe par `getOrThrow()`, la lecture interne sans contrôle de propriétaire.

**L'identité ne vient jamais du body.** `userId` est lu sur le token : les DTO de commande, d'avis et de commentaire ne contiennent que le contenu, jamais l'auteur.

### Règles non négociables

- Le controller ne contient **jamais** de logique métier ni d'appel Prisma direct — il délègue tout au service.
- Toute entrée utilisateur passe par un DTO validé (`class-validator`), y compris les query params.
- Pas de chaîne de statut en dur : utiliser `src/common/constants.ts`, qui reprend les valeurs commentées dans `schema.prisma` (statuts de commande, moyens de paiement, statuts de modération, types de relation produit). Y ajouter toute nouvelle valeur plutôt que de l'inliner.
- Tout nouveau module doit être ajouté aux `imports` de `src/app.module.ts`.
- Une route d'écriture sans `@AdminOnly()` est publique. Le vérifier explicitement à chaque ajout.

Le `ValidationPipe` global est configuré dans `src/main.ts` avec `whitelist`, `forbidNonWhitelisted` et `transform`. Sans lui les décorateurs des DTO sont inertes — ne pas le retirer. C'est `transform: true` qui fait fonctionner les `@Type(() => Number)` sur les query params numériques.

## Prisma 7 : deux pièges

`schema.prisma` est la source de vérité des valeurs de statut, documentées en commentaires au-dessus des modèles concernés. Les champs sont en camelCase côté TypeScript et mappés en snake_case en base via `@map`.

**1. Un driver adapter est obligatoire.** Prisma 7 refuse de se connecter sans. `PrismaService` instancie `PrismaClient` avec `PrismaPg` (`@prisma/adapter-pg`) — ne pas revenir à un `super()` nu.

**2. `sslmode` dans l'URL écrase silencieusement l'objet `ssl` passé au driver.** node-postgres reparse la connection string par-dessus la config fournie. Comme il traite aujourd'hui `sslmode=require` comme `verify-full`, la CA auto-signée d'Aiven est rejetée (`self-signed certificate in certificate chain`). `PrismaService` retire donc `sslmode` de l'URL et le traduit en objet `ssl` explicite.

En l'état la chaîne de certificats n'est pas vérifiée — conforme à la sémantique libpq de `require`, mais à durcir en production : renseigner `DATABASE_CA_CERT` avec le CA Aiven et passer l'URL en `verify-full`. Le code emprunte déjà cette branche dès que la variable est présente.

**3. Le `maxWait` par défaut de `$transaction` (2 s) est trop court pour Aiven.** pg-pool ferme les connexions inactives au bout de 10 s ; rouvrir vers une base distante (TCP + handshake TLS) dépasse 2 s, et la première requête après une pause échouait en `Transaction API error: Unable to start a transaction in the given time`. `PrismaService` passe donc `transactionOptions: { maxWait: 15_000, timeout: 30_000 }` au client — ne pas le retirer sans rapprocher la base.

Ordre de grandeur à garder en tête : ~2 s pour un `GET /products` (deux requêtes dans un `$transaction`), ~5 s quand la connexion doit être rouverte. C'est la latence réseau vers Aiven, pas le code.

Les colonnes monétaires sont des `Decimal` : faire les calculs avec `Prisma.Decimal` (`.mul()`, `.add()`), jamais avec les opérateurs arithmétiques JS.

### Session utilisateur

**Le token est dans un cookie, pas en localStorage.** `lib/auth-token.ts` le pose sous `futurama.token` (`path=/`, `samesite=lax`, `max-age` aligné sur `JWT_EXPIRES_IN`). La raison est le rendu serveur : `/commande/[id]` est un Server Component et doit envoyer le token à `GET /orders/:id` pendant le rendu, ce que localStorage ne permet pas. Le cookie n'est pas `httpOnly` — même exposition qu'un localStorage face au XSS, mais lisible côté serveur, ce qui est tout l'intérêt.

Trois modules, à ne pas confondre :

- `lib/auth-token.ts` — lecture/écriture du cookie. **Pas** de directive `use client` : il est importé par `lib/api.ts`, qui tourne des deux côtés.
- `lib/auth.ts` — `"use client"` : `startSession()` / `endSession()`, le profil affiché en localStorage (`futurama.user`), l'événement `AUTH_CHANGED_EVENT` et le hook `useAuth()`. Comme `CartBadge`, `useAuth()` renvoie `undefined` tant que l'hydratation n'a pas eu lieu — ne jamais rendre un état de connexion deviné, le HTML serveur ne le connaît pas.
- `lib/auth-server.ts` — `getServerToken()`, à n'importer **que** depuis un Server Component (`next/headers` n'existe pas dans le bundle navigateur).

`request()` dans `lib/api.ts` pose `Authorization: Bearer` tout seul dans le navigateur. Côté serveur le cookie n'est pas lisible depuis ce module : passer explicitement `await getServerToken()` en second argument (`getOrder(id, token)`, `getMyOrders(token)`).

Le rattachement du panier anonyme est gratuit : après `startSession()`, un `notifyCartUpdated()` refait lire `GET /cart` avec le token, et le backend rattache le panier au compte. C'est ce que fait `components/auth-form.tsx`.

`?next=` passe toujours par `safeNextPath()` (routes internes uniquement) — sinon c'est une redirection ouverte.

### Conventions métier encodées dans le schéma

- Un visiteur non connecté est identifié par un `session_id` (panier uniquement), passé en query string. Les likes et commentaires d'articles sont désormais rattachés à un compte.
- Le panier peut démarrer anonyme (`Cart.userId` nullable) : la première requête authentifiée sur ce `session_id` le rattache au compte. Un panier déjà rattaché à un autre compte n'est jamais revendiqué, et `POST /orders` le refuse en 403.
- `Order.userId` est obligatoire, mais `shippingName` / `shippingPhone` / `shippingAddress` restent dupliqués sur la commande : l'adresse de livraison d'une commande peut différer du profil et ne doit pas bouger si le profil change ensuite. Même logique que `order_items`.
- `Review` porte `@@unique([productId, userId])` : un avis par produit et par compte, quel que soit le statut de modération du précédent. Le service traduit le `P2002` en 409.
- `order_items` fige `productName` et `unitPrice` au moment de la commande : une commande ne doit pas bouger si le produit change ensuite.
- Le nom affiché d'un avis ou d'un commentaire vient du compte (`authorName` n'existe plus) : tout affichage doit joindre `user`. Les services le font déjà via leurs constantes `AUTHOR_INCLUDE` / `COMMENT_AUTHOR_INCLUDE`.
- Les avis sont créés en `pending` et ne sont visibles publiquement qu'une fois `approved`. La modération ne mène qu'à un état terminal (`approved` / `rejected`), jamais retour à `pending`.
- **`isActive` et `publishedAt` sont des filtres de publication, pas des colonnes d'affichage.** `GET /products` et `GET /products/:id` masquent les produits désactivés (404 sur la fiche), `GET /posts` masque les brouillons et les publications programmées. Un admin identifié par `OptionalJwtAuthGuard` voit tout, et peut filtrer explicitement avec `isActive=true|false`. Un produit désactivé disparaît aussi des `similar` / `frequently_bought_together`.
- `Order.status` n'a **pas de machine à états** : le backend accepte n'importe quelle transition. Ne pas simuler de garde-fou côté front, ce serait une règle métier posée au mauvais endroit.
- Les likes d'articles sont idempotents via la contrainte unique `[postId, userId]` ; `likesCount` n'est incrémenté que lorsque la ligne est réellement créée.

## Seed

`prisma/seed.ts`, branché via `migrations.seed` dans `prisma.config.ts` (Prisma 7 : plus de clé `prisma.seed` dans `package.json`). Il tourne sous `ts-node` forcé en CommonJS, et réutilise `PrismaService` directement — pas de second `PrismaClient` à maintenir avec la config TLS.

Contenu : 10 comptes (dont `admin@futurama.test`, seul rôle `admin`), 8 catégories (arborescentes), 5 vendeurs, 15 produits avec images, specs, relations `similar` / `frequently_bought_together`, 3 promotions dont une expirée, 8 avis couvrant les trois statuts de modération, 5 revendeurs, 4 articles dont un brouillon, et une commande de démonstration.

Tous les comptes du seed partagent le mot de passe `futurama2026` (`DEMO_PASSWORD` dans `seed.ts`) — valeur de développement, sans plus. Les avis, commentaires et likes référencent un compte par son email.

Deux comportements à connaître avant de le modifier :

- Il est **rejouable** : il purge le périmètre catalogue + contenu puis le recrée. L'ordre des `deleteMany` suit les contraintes — les produits partent avant les catégories (`onDelete: Restrict`).
- Il ne purge **jamais** les commandes ni les comptes (les comptes sont créés en `upsert` sur l'email : `orders.user_id` est en `onDelete: Restrict`), et ne crée la commande de démonstration que si `order.count()` vaut 0. Un re-seed laisse donc les commandes existantes avec un `productId` à `NULL` sur leurs lignes : c'est exactement la convention `order_items` ci-dessus, le nom et le prix restent figés.

Les relations `similar` sont écrites dans les deux sens (`findRelated` filtre sur `productId`, la relation est dirigée) ; `frequently_bought_together` reste dirigée.

## Frontend

Deux applications dans le même paquet Next, séparées par des groupes de routes :

- `app/(boutique)/` — MVP e-commerce : accueil (rayons), catalogue paginé par rayon, fiche produit, panier, connexion / inscription et confirmation de commande. Le reste de la maquette (chatbot, live shopping, blog, avis, revendeurs) n'est pas implémenté.
- `app/admin/` — le backoffice : tableau de bord, commandes, produits, catégories, modération des avis.

**Le layout racine (`app/layout.tsx`) est volontairement nu** — polices et feuille de styles, rien d'autre. L'en-tête et le pied de page appartiennent à la boutique et vivent dans `app/(boutique)/layout.tsx`. Un layout enfant ne pouvant pas retirer le chrome de son parent, c'est le seul moyen de donner au backoffice une enveloppe distincte. Le groupe `(boutique)` ne change aucune URL.

### Backoffice

`app/admin/layout.tsx` est un Server Component qui **relit le compte via `GET /auth/me`** avant d'ouvrir le shell : le rôle du JWT est figé à l'émission, et le `localStorage` du navigateur ne prouve rien. Sans token → `/connexion?next=/admin` ; compte non-admin → `notFound()` (404 plutôt que 403 : inutile d'annoncer l'existence d'un backoffice). Ce garde n'est **qu'un confort d'affichage** — chaque route admin du backend revalide de son côté, un contournement de cette page ne donne accès à rien.

- `lib/admin-api.ts` regroupe les appels réservés au backoffice. Il partage le `request()` de `lib/api.ts` (une seule implémentation de `fetch`) mais vit à part : ces routes répondent toutes 403 à un compte client, et rien ici ne doit finir appelé depuis une page de la boutique.
- Les **filtres de liste sont des formulaires GET natifs** : ils vivent dans l'URL, donc partageables et rechargeables, et n'exigent aucun JS. `components/admin/admin-pagination.tsx` reporte tous les filtres courants dans ses liens — contrairement à `components/pagination.tsx` qui ne connaît que `q`.
- Les mutations sont des Client Components qui appellent `router.refresh()` après succès : les pages sont des Server Components, c'est au serveur de relire.
- Galerie, caractéristiques et produits liés s'éditent en liste locale complète et ne partent qu'à la validation — le backend remplace la collection entière (voir *Sous-ressources produit*).
- Les classes `admin-input` / `admin-label` / `admin-button` / `admin-card` sont définies dans `app/globals.css`. La boutique garde ses styles inline : ses formulaires sont trop peu nombreux pour justifier une classe.

`maquette/refonte-site-Futurama-v1.3.html` est la référence visuelle. C'est un bundle Claude Design : le HTML lisible est dans son `<script type="__bundler/template">`, en JSON. La palette et les fontes (Archivo pour les titres, DM Sans pour le texte) en sont extraites et vivent dans les tokens `@theme` de `app/globals.css`.

### Accès à l'API

Le backend n'a **ni préfixe global ni CORS**. Il est monté derrière `/api` par un rewrite dans `next.config.ts`, ce qui garde les appels navigateur same-origin — donc pas de CORS à activer côté Nest. `lib/api.ts` en tient compte : côté serveur il tape directement `BACKEND_URL`, côté navigateur il passe par `/api`. Tout `fetch` passe par ce module, jamais par un composant.

Deux limites de l'API que le catalogue contourne côté front, à remplacer par un vrai filtre backend le jour où le catalogue grossit :

- `GET /products?categoryId=` ne filtre que sur une catégorie exacte : ouvrir un rayon parent oblige à charger le catalogue et filtrer sur l'ensemble parent + enfants ;
- il n'y a pas de recherche par nom **côté boutique** : la recherche du header renvoie sur `/catalogue/tous?q=`, filtré de la même façon. `limit` est plafonné à 100 côté DTO.

`GET /products?q=` existe pourtant désormais (nom + référence, insensible à la casse) : il a été ajouté pour la liste du backoffice. Le catalogue de la boutique ne s'en sert pas encore — c'est le remplacement naturel du filtrage côté client décrit ci-dessus.

### Conventions

- Server Components par défaut. Les Client Components se limitent à l'interactivité réelle : recherche, badge panier, galerie, quantité/ajout, page panier, formulaire de commande.
- Le visiteur est identifié par un `session_id` généré et stocké en localStorage (`lib/session.ts`). Après toute mutation du panier, appeler `notifyCartUpdated()` : le badge du header écoute cet événement.
- Le panier reste ouvert aux visiteurs, mais **commander exige un compte** : `CheckoutForm` affiche un appel à la connexion tant que `useAuth()` ne renvoie pas d'utilisateur. Les champs du formulaire sont `shippingName` / `shippingPhone` / `shippingAddress`, préremplis depuis le profil et modifiables — le backend les fige sur la commande. `userId` n'est jamais envoyé, il vient du JWT.
- Un `401` sur une route protégée renvoie vers `/connexion?next=…` plutôt que d'afficher l'erreur brute ; un `403` sur une commande est traité comme un `404` (ne pas révéler qu'elle existe).
- Les montants arrivent en **chaîne** (`Decimal` Prisma sérialisé). Les parser via `lib/format.ts`, jamais avec un `Number()` inline.
- Les visuels du seed (`/images/products/*.jpg`) n'existent pas dans `public/`. `components/product-image.tsx` retombe sur un aplat ; il traite aussi le cas d'une image déjà en 404 au rendu serveur, où `onError` ne se déclenche jamais.

`frontend/AGENTS.md` (et `frontend/CLAUDE.md`, qui n'en est qu'un pointeur `@AGENTS.md`) est **généré automatiquement par `next dev`** — voir `node_modules/next/dist/server/lib/generate-agent-files.js`. Le supprimer ne fait que recréer une modif non commitée. Son avertissement vaut : Next 16 introduit des ruptures d'API, consulter `node_modules/next/dist/docs/` avant d'écrire du code Next plutôt que de se fier à ses souvenirs.
