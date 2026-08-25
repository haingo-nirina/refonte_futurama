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
```

Frontend (`cd frontend`) : `yarn dev`, `yarn build`, `yarn lint`.

**Collision de port :** le backend (`PORT ?? 3000`) et `next dev` écoutent tous deux sur 3000. Lancer le backend avec un `PORT` explicite quand les deux tournent ensemble.

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

Modules existants : `cart`, `orders`, `reviews`, `resellers`, `posts`. `PrismaService` est fourni par `src/prisma/`, déclaré `@Global()` : il s'injecte directement dans n'importe quel service sans réimporter `PrismaModule`.

**Le catalogue n'est pas encore implémenté.** `Category`, `Product`, `Vendor`, `Promotion` existent dans le schéma mais n'ont ni module ni route : il n'y a aujourd'hui aucun moyen de créer un produit via l'API.

### Règles non négociables

- Le controller ne contient **jamais** de logique métier ni d'appel Prisma direct — il délègue tout au service.
- Toute entrée utilisateur passe par un DTO validé (`class-validator`), y compris les query params.
- Pas de chaîne de statut en dur : utiliser `src/common/constants.ts`, qui reprend les valeurs commentées dans `schema.prisma` (statuts de commande, moyens de paiement, statuts de modération, types de relation produit). Y ajouter toute nouvelle valeur plutôt que de l'inliner.
- Tout nouveau module doit être ajouté aux `imports` de `src/app.module.ts`.

Le `ValidationPipe` global est configuré dans `src/main.ts` avec `whitelist`, `forbidNonWhitelisted` et `transform`. Sans lui les décorateurs des DTO sont inertes — ne pas le retirer. C'est `transform: true` qui fait fonctionner les `@Type(() => Number)` sur les query params numériques.

## Prisma 7 : deux pièges

`schema.prisma` est la source de vérité des valeurs de statut, documentées en commentaires au-dessus des modèles concernés. Les champs sont en camelCase côté TypeScript et mappés en snake_case en base via `@map`.

**1. Un driver adapter est obligatoire.** Prisma 7 refuse de se connecter sans. `PrismaService` instancie `PrismaClient` avec `PrismaPg` (`@prisma/adapter-pg`) — ne pas revenir à un `super()` nu.

**2. `sslmode` dans l'URL écrase silencieusement l'objet `ssl` passé au driver.** node-postgres reparse la connection string par-dessus la config fournie. Comme il traite aujourd'hui `sslmode=require` comme `verify-full`, la CA auto-signée d'Aiven est rejetée (`self-signed certificate in certificate chain`). `PrismaService` retire donc `sslmode` de l'URL et le traduit en objet `ssl` explicite.

En l'état la chaîne de certificats n'est pas vérifiée — conforme à la sémantique libpq de `require`, mais à durcir en production : renseigner `DATABASE_CA_CERT` avec le CA Aiven et passer l'URL en `verify-full`. Le code emprunte déjà cette branche dès que la variable est présente.

Les colonnes monétaires sont des `Decimal` : faire les calculs avec `Prisma.Decimal` (`.mul()`, `.add()`), jamais avec les opérateurs arithmétiques JS.

### Conventions métier encodées dans le schéma

- Un visiteur non connecté est identifié par un `session_id` (panier, likes d'articles), passé en query string ou dans le body.
- `order_items` fige `productName` et `unitPrice` au moment de la commande : une commande ne doit pas bouger si le produit change ensuite.
- Les avis sont créés en `pending` et ne sont visibles publiquement qu'une fois `approved`. La modération ne mène qu'à un état terminal (`approved` / `rejected`), jamais retour à `pending`.
- Les likes d'articles sont idempotents via la contrainte unique `[postId, sessionId]` ; `likesCount` n'est incrémenté que lorsque la ligne est réellement créée.

## Frontend

Encore au stade scaffold `create-next-app` : seul `app/page.tsx` existe, aucune intégration avec l'API backend.

`frontend/AGENTS.md` (et `frontend/CLAUDE.md`, qui n'en est qu'un pointeur `@AGENTS.md`) est **généré automatiquement par `next dev`** — voir `node_modules/next/dist/server/lib/generate-agent-files.js`. Le supprimer ne fait que recréer une modif non commitée. Son avertissement vaut : Next 16 introduit des ruptures d'API, consulter `node_modules/next/dist/docs/` avant d'écrire du code Next plutôt que de se fier à ses souvenirs.
