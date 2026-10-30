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

Modules existants : `auth`, `categories`, `products`, `marques`, `cart`, `orders`, `reviews`, `resellers`, `posts`, `stats`, `delivery-zones`, `stores`, `lives`, `facebook-live`.

`lives` porte le **live shopping**. La vidéo reste sur Facebook, le site n'héberge rien : la vendeuse lance le direct sur la Page depuis son téléphone, copie le code « Intégrer à un site » de la publication et le colle dans le backoffice (« Lancer le live ») ; le site l'affiche dans le lecteur intégré de Facebook avec les produits du live. **Le pilotage est manuel** : aucune API Meta n'est appelée. `facebook-live` (détection automatique) est conservé mais inerte tant que `FB_PAGE_ID` / `FB_PAGE_TOKEN` sont absents — l'accès développeur Meta n'a pas pu être obtenu.

- `GET /live/current` (public, `OnAirController` dans `lives/`, `Cache-Control: public, max-age=15`) renvoie `{ live: { id, title, url, startedAt } | null }` — le live `EN_DIRECT` **en base**, quel que soit le moyen par lequel il y est passé. C'est ce que relisent tous les visiteurs toutes les 30 s : `LivesService.findOnAir()` le garde 15 s en mémoire, et **toute écriture du service vide ce cache** (`invalidateOnAir()`, appelé après l'écriture, pas avant).
- `POST /lives/:id/start` (admin, `{ facebookUrl }`) : `PROGRAMME → EN_DIRECT` avec le lien, ou simple remplacement du lien sur un live déjà en direct (lien erroné au premier essai, `startedAt` conservé). Un live `TERMINE` ne se relance pas (400). Dans la même transaction, tout autre live en direct passe `TERMINE` : un seul direct à la fois. Mise à jour conditionnée à l'ancien statut (409 sinon). `StartLiveDto` accepte le **code « Intégrer à un site »** de la publication (il en extrait `href`, le lien exact que lit le lecteur) ou un lien de vidéo, en `https` sur `facebook.com` uniquement : le lien finit dans un `<iframe>`. Sont refusés, avec la marche à suivre : le lien du Live Producer (privé) et les liens de partage `share/…` / `fb.watch` (le navigateur suit leur redirection, le lecteur intégré non — « Vidéo non disponible »).

- `facebook-live` (facultatif) : un cron `@nestjs/schedule` (30 s, plus un appel au démarrage) interroge `GET /{FB_PAGE_ID}/live_videos?broadcast_status=["LIVE"]` et garde le dernier direct vu en mémoire, uniquement pour ne synchroniser la base qu'aux changements. Une erreur réseau ou API garde la dernière valeur ; le code 190 logue « token à régénérer » ; une même erreur n'est loguée qu'une fois. Sans `FB_PAGE_ID` / `FB_PAGE_TOKEN`, rien n'est détecté (un log au démarrage) : c'est la configuration actuelle. **Active, elle l'emporte sur le manuel** : au démarrage elle termine un live lancé à la main si rien ne diffuse sur la Page, et un lien collé à la main (lien de partage) ne correspond pas au `permalink_url` détecté — elle créerait un second live. **Le token est dans l'URL de la requête Graph : ni l'URL ni le token ne sont jamais logués**, les messages d'erreur sont expurgés. Pas de `ConfigModule` : ces variables se lisent dans `process.env`, comme `JWT_SECRET`. `@nestjs/schedule` est en 6.x : la 12 est ESM uniquement, ce que ni le build CommonJS ni Jest n'acceptent.
- Si la détection est active, chaque changement de direct est reporté en base (`LivesService.syncWithFacebook`, appelé seulement au début, à la fin ou au changement de vidéo), que lisent `GET /live/current` et `/live`. Une synchronisation ratée est retentée au tick suivant. Au début d'un direct, le live `PROGRAMME` le plus proche (de 24 h de retard à 12 h d'avance) passe `EN_DIRECT` avec le lien détecté et garde ses produits ; à défaut, un live est créé (titre de la vidéo) pour que le replay et la mesure des ventes existent. À la fin, il passe `TERMINE` et le lien sert de replay. Un lien déjà connu n'est jamais relancé — un live terminé à la main le reste. Un seul live en direct à la fois.
- `POST /lives/:id/end` (admin) repasse le live en replay (le lien reste).
- **Les replays sont l'archive vidéo**, sans stockage supplémentaire : un live `TERMINE` qui a un `facebookUrl` et `replayVisible` (vrai par défaut, remis à vrai à chaque fin de live) est un replay, la vidéo restant sur Facebook (rien à télécharger, son API nous est fermée). `GET /lives/replays` (public, `{ data, meta }`, `endedAt` décroissant, `_count.products` = produits actifs, sans les produits eux-mêmes) alimente la section « Nos vidéos » ; `GET /lives/replays/:id` renvoie un replay avec ses produits, sous la forme de `GET /lives/current` (404 si ce n'est pas un replay visible). Le dernier replay de `GET /lives/current` respecte aussi `replayVisible`. **Retirer des replays** = `replayVisible: false` via `PATCH /lives/:id` : le live, ses produits et ses ventes restent.
- `PATCH /lives/:id` accepte `facebookUrl` **sur un live terminé seulement** (400 sinon : avant la fin, le lien passe par `start`, qui fait passer en direct). Lancement et correction partagent la même validation, `@IsFacebookVideoLink()` (`lives/dto/facebook-video-link.decorator.ts`) — ne pas la recopier. Les produits se remplacent en bloc via `productIds` dans `POST|PATCH /lives`. `GET /lives/current` (public) renvoie le live en direct, sinon le prochain programmé (oublié au-delà de 24 h), sinon le dernier terminé — ou `null`.
- `POST /orders` accepte un `liveId` facultatif, retenu seulement si le live a démarré et **ignoré sinon** — une attribution ne doit jamais faire échouer un achat. `Order.liveId` est en `onDelete: Restrict` : un live qui a vendu ne se supprime pas (409), sa mesure des ventes (`GET /lives/admin`, annulées exclues) disparaîtrait.
- Les **questions privées ont été retirées** (les clients commentent sur Facebook, la vendeuse ne peut pas surveiller deux fils en filmant). La table `live_messages` reste en base, inutilisée, faute de migration de suppression.

`delivery-zones` et `stores` sont en lecture publique (`GET /delivery-zones`, `GET /stores`, actifs uniquement) : la page panier les charge au rendu serveur. Le backoffice les gère sur `/admin/livraison` : `GET /delivery-zones/admin` et `GET /stores/admin` renvoient aussi les désactivés, avec `_count.orders`. Supprimer une zone ne perd rien (`onDelete: SetNull`, la commande a copié nom et délai) ; supprimer une boutique qui a servi est refusé en 409 (`onDelete: Restrict`) — on la désactive. `Store.pickupDelayDays` alimente le badge du panier : 0 = « En stock », sinon « Prêt sous N jours » (`pickupAvailability` dans `lib/checkout.ts`). **`POST /orders` ne lit aucun montant dans la requête** : prix relus sur le produit (promotion active comprise), frais via `shippingFeeFor` (`delivery-zones/shipping-fee.ts`), stock réservé par un décrément conditionnel dans la transaction (409 si insuffisant), numéro via `nextOrderNumber`. Le numéro MVola est normalisé puis validé (034/038, `common/mvola-phone.ts`), avec la même règle côté front dans `lib/checkout.ts`. `PrismaService` est fourni par `src/prisma/`, déclaré `@Global()` : il s'injecte directement dans n'importe quel service sans réimporter `PrismaModule`.

`marques` porte les **marques** de produit (Moulinex, Tefal…). La table s'appelle `marques` et le modèle `Marque` : l'ancien `Vendor` a été renommé, il désignait déjà une marque (migration `20260828155500_rename_vendors_to_marques`, un renommage — les lignes existantes et les produits rattachés ont été conservés).

**Le *vendeur*, lui, n'est pas une donnée.** La boutique vend en direct : là où la maquette affiche un vendeur, il s'écrit en dur côté front. Ne pas recréer de table pour ça.

Lecture publique comme les catégories (`GET /marques`) : la facette « Marques » du catalogue et le sélecteur du formulaire produit s'en servent ; les écritures sont `@AdminOnly()`. La liste joint `_count.products`, ce qu'affiche le backoffice et ce qu'annonce sa confirmation de suppression. `Marque.slug` est unique : le `P2002` devient une 409. Supprimer une marque ne supprime **aucun** produit — `Product.marqueId` est en `onDelete: SetNull`, les produits sont détachés.

`Promotion` n'a toujours pas de module dédié : elle se peuple uniquement par le seed.

`posts` porte le **mur de la boutique** (« Nos publications »), pas un blog à plusieurs signatures : `Post` n'a pas d'auteur, la page publie sous son propre nom. `GET /posts` renvoie `{ data, meta }` comme les autres listes paginées et **joint les commentaires** — le mur les affiche sous chaque publication, sans second appel, comme les avis sur la fiche produit. Il joint aussi `liked`, le « j'aime » du **seul lecteur** : la liste complète des likes dirait à n'importe quel visiteur qui a aimé quoi. Un anonyme reçoit donc toujours `liked: false`.

Un commentaire peut porter une **réponse de la boutique** (`PostComment.parentId`, auto-relation) : `POST /posts/:id/comments/:commentId/replies` est `@AdminOnly()`, le mur étant la page de la boutique — elle seule y répond. **Un seul niveau** : répondre à une réponse est refusé en 400, sans quoi le fil deviendrait un arbre que rien n'affiche. C'est aussi ce qui permet au front de signer toute réponse « Futurama.mg » sans jamais exposer le rôle de son auteur. `GET /posts` ne joint donc que les **racines** (`parentId: null`), leurs réponses dans `replies` ; et `_count.comments` compte les fils, pas les lignes, pour que « 3 commentaires » corresponde aux trois fils affichés dessous.

Le tri dépend du lecteur : le mur public classe sur `publishedAt` — la date qu'il affiche — et le backoffice sur `createdAt`, ses brouillons n'ayant pas encore de date de publication. Côté écriture, `publishedAt: null` repasse une publication en brouillon et `photoUrl: null` détache la photo ; `undefined` laisse la valeur en place.

`uploads` a deux routes, `POST /uploads/images` et `POST /uploads/videos` (admin) : elles écrivent le fichier et renvoient son URL, **sans le rattacher à quoi que ce soit**. C'est ce qui permet de téléverser une photo pendant la création d'un produit, avant qu'il ait un identifiant, puis d'attacher l'URL via `PUT /products/:id/images` une fois le produit créé. Détails plus bas.

`stats` n'a qu'une route, `GET /stats/dashboard` : tous les agrégats du tableau de bord en un seul appel. Les découper coûterait autant d'allers-retours vers Aiven — voir les ordres de grandeur plus bas.

### Sous-ressources produit

`ProductImage`, `ProductSpec` et `ProductRelation` se remplacent **en bloc**, pas ligne par ligne : `PUT /products/:id/images|specs|relations` supprime la collection et la recrée. C'est ce que soumet un formulaire d'édition, et ça évite neuf routes là où trois suffisent. Rien ne référence ces lignes, les recréer est sans conséquence.

`replaceRelations` maintient le **miroir de `similar`** : la relation est dirigée en base et `findRelated` filtre sur `productId`, donc sans ligne inverse « A ressemble à B » n'apparaîtrait pas sur la fiche de B. C'est la convention du seed. `frequently_bought_together` reste dirigée.

### Visuels téléversés

Les photos vivent dans `backend/uploads/` (gitignoré : ce sont des données, pas du code), **hors de `dist/`** pour qu'un rebuild ne les emporte pas. `main.ts` les sert en statique sous `/uploads` via `useStaticAssets`, et `next.config.ts` remonte le même chemin par un second rewrite — l'URL stockée dans `ProductImage.imageUrl` est donc utilisable telle quelle dans un `<img>`, sans préfixe à recoller côté client. Changer `UPLOADS_PREFIX` exigerait une migration des données.

`POST /uploads/images?kind=products|categories|marques|posts` range le fichier dans le sous-dossier correspondant. **`kind` est contraint par une liste blanche** (`UPLOAD_KINDS`) : sans elle, une valeur fabriquée à la main écrirait hors de `UPLOADS_ROOT`.

`POST /uploads/videos` écrit dans `uploads/videos` et n'accepte **pas** de `kind` : une vidéo n'a qu'un seul point d'attache, `Product.videoUrl`. Formats MP4 / WebM / MOV, 50 Mo (`MAX_VIDEO_BYTES`) — c'est aussi ce que multer garde en mémoire le temps du téléversement.

Un visuel peut donc être un chemin absolu servi par nous, ou une URL externe. `@IsUrl()` refuse le premier cas — c'est pourquoi `imageUrl` / `photoUrl` / `logoUrl` / `videoUrl` utilisent **`@IsMediaRef()`** (`src/common/is-media-ref.decorator.ts`), qui accepte les deux. `videoUrl` accepte en plus `null`, qui détache la vidéo : `undefined` laisserait l'ancienne en place.

Le stockage est en mémoire, pas sur disque : le fichier n'est écrit qu'une fois son type MIME validé, ce qui évite d'avoir à nettoyer un rebut. **Le nom d'origine n'est jamais réutilisé** — il vient du client, et un `../` dedans écrirait n'importe où ; le nom est un UUID et l'extension est déduite du type MIME. Formats acceptés et taille maximale sont dans `uploads.constants.ts`, à garder alignés avec `ACCEPTED_IMAGE_TYPES` / `MAX_IMAGE_BYTES` / `ACCEPTED_VIDEO_TYPES` / `MAX_VIDEO_BYTES` côté front.

Rien ne supprime le fichier quand l'image ou la vidéo est retirée d'un produit : `uploads/` accumule les orphelins. Acceptable à ce volume, à reprendre le jour où ça compte.

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

Routes protégées par un simple JWT : `POST /orders`, `GET /orders`, `GET /orders/:id`, `GET /auth/me`, `POST /reviews`, `PATCH|DELETE /reviews/:id`, `GET /reviews/mine`, `POST /posts/:id/comments`, `PATCH|DELETE /posts/:id/comments/:commentId`, `POST|DELETE /posts/:id/like`.

Routes admin (`@AdminOnly()`) : **toute écriture du catalogue et du contenu** — `POST|PATCH|DELETE /products`, `POST /products/bulk-delete`, `PUT /products/:id/images|specs|relations`, `POST|PATCH|DELETE /categories`, `POST /categories/bulk-delete`, `POST|PATCH|DELETE /marques`, `POST|PATCH|DELETE /posts`, `POST /posts/:id/comments/:commentId/replies`, `POST|PATCH|DELETE /resellers`, `GET /delivery-zones/admin`, `POST|PATCH|DELETE /delivery-zones`, `GET /stores/admin`, `POST|PATCH|DELETE /stores` — plus `GET /orders/admin`, `PATCH /orders/:id/status`, `GET /reviews/admin`, `GET /reviews/pending`, `PATCH /reviews/:id/moderate`, `GET /stats/dashboard`, `GET /lives/admin[/:id]`, `POST|PATCH|DELETE /lives`, `POST /lives/:id/start|end`.

Le catalogue (produits, catégories, marques) et le blog restent publics **en lecture**, le panier reste ouvert sans compte.

**Aucune route de `orders` n'est publique** : une commande porte le nom, le téléphone et l'adresse de livraison de son auteur. `GET /orders` renvoie l'historique du **compte appelant, admin compris** — « Mes commandes » reste personnel ; la liste complète du site passe par `GET /orders/admin`, paginée et filtrable (statut, recherche nom/téléphone/email, plage de dates). `GET /orders/:id` refuse en 403 une commande qui n'appartient pas à l'appelant, sauf pour un admin. Le filtre vit dans le service (règle métier), pas dans le controller. Lu par un admin, `GET /orders/:id` joint en plus `statusHistory` (auteur et note de chaque changement) ; un client n'en voit rien.

**L'identité ne vient jamais du body.** `userId` est lu sur le token : les DTO de commande, d'avis et de commentaire ne contiennent que le contenu, jamais l'auteur.

### Règles non négociables

- Le controller ne contient **jamais** de logique métier ni d'appel Prisma direct — il délègue tout au service.
- Toute entrée utilisateur passe par un DTO validé (`class-validator`), y compris les query params. Sur un texte obligatoire, `@Transform(trim)` (`src/common/trim.ts`) précède `@IsNotEmpty()` : le validateur ne trimme pas, une suite d'espaces passerait pour un texte renseigné.
- Pas de chaîne de statut en dur : utiliser `src/common/constants.ts`, qui reprend les valeurs commentées dans `schema.prisma` (statuts de modération, types de relation produit) et ré-exporte les **enums Prisma** de la commande (`ORDER_STATUS`, `PAYMENT_STATUS`, `PAYMENT_METHOD`, `FULFILLMENT_METHOD`, `PAYMENT_TRANSACTION_STATUS`). Y ajouter toute nouvelle valeur plutôt que de l'inliner.
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

Le rattachement du panier anonyme est gratuit : après `startSession()`, un `notifyCartUpdated()` refait lire `GET /cart` avec le token, et le backend fusionne le panier visiteur dans celui du compte. C'est ce que fait `components/auth-form.tsx`.

`?next=` passe toujours par `safeNextPath()` (routes internes uniquement) — sinon c'est une redirection ouverte.

### Conventions métier encodées dans le schéma

- Un visiteur non connecté est identifié par un `session_id` (panier uniquement), passé en query string. Les likes et commentaires d'articles sont désormais rattachés à un compte.
- Le panier peut démarrer anonyme (`Cart.userId` nullable). **Connecté, on lit le panier du compte, pas celui du `session_id`** (`CartService.getCart`) : le panier visiteur de la session y est fusionné (quantités additionnées, plafonnées au stock — `mergedQuantity`) puis supprimé ; un panier de session rattaché à un autre compte est ignoré sans erreur (navigateur partagé). Un anonyme ne reçoit jamais le panier d'un compte. `POST /orders` passe par la même résolution.
- `Order.userId` est obligatoire, mais `contactName` / `contactPhone` / `shippingAddress` restent dupliqués sur la commande : le contact et l'adresse d'une commande peuvent différer du profil et ne doivent pas bouger si le profil change ensuite. Même logique que `order_items`, et que `deliveryZoneName` / `deliveryDelayDays`, copiés depuis la zone. (`contact_*` s'appelaient `shipping_name` / `shipping_phone` : renommées par la migration `20261013090000_checkout_mvola`, qui a aussi converti les anciens statuts texte vers les enums.)
- Mode de réception (`fulfillmentMethod`) : en `LIVRAISON`, `shippingAddress` + `deliveryZone*` sont renseignés ; en `RETRAIT_BOUTIQUE`, c'est `storeId`. `DeliveryZone` porte le prix, le délai en jours ouvrés et un seuil de gratuité optionnel ; `Store` les boutiques de retrait (le seed n'en crée qu'une, Tsaralalana ; le panier propose toutes les actives).
- `Order.number` (`FUT-AAAA-000123`) est attribué via `OrderCounter`, un compteur par année incrémenté dans la transaction de création.
- `Review` porte `@@unique([productId, userId])` : un avis par produit et par compte, quel que soit le statut de modération du précédent. Le service traduit le `P2002` en 409 — mais la boutique n'y arrive plus, elle propose de modifier l'avis existant au lieu d'en reproposer un. **`PATCH|DELETE /reviews/:id` sont réservées à l'auteur** : le service compare `userId` au JWT et répond 403 sinon, sans exception pour l'admin (le backoffice modère, il ne réécrit pas). `PATCH` n'accepte ni `productId` ni auteur ; `comment: null` ne garde que la note.
- `order_items` fige `productName` et `unitPrice` au moment de la commande : une commande ne doit pas bouger si le produit change ensuite.
- Le nom affiché d'un avis ou d'un commentaire vient du compte (`authorName` n'existe plus) : tout affichage doit joindre `user`. Les services le font déjà via leurs constantes `AUTHOR_INCLUDE` / `COMMENT_AUTHOR_INCLUDE`.
- **Un avis n'est publié qu'après validation.** `create()` l'écrit en `pending`, et les lectures publiques filtrent sur `approved`. `/admin/avis` ouvre sur l'onglet « En attente » ; « Valider et publier » / « Rejeter » appellent `PATCH /reviews/:id/moderate`, et le tableau de bord compte les avis à valider. **Une modification par l'auteur repasse l'avis en `pending`** : sans ça, un avis validé pourrait être réécrit à volonté après coup. Comme la fiche ne liste que les approuvés, `GET /reviews/mine?product_id=` (JWT) rend à l'auteur son propre avis quel que soit son statut — `ReviewForm` s'en sert pour afficher « en attente de validation » plutôt que de reproposer le formulaire. `GET /reviews/pending` existe encore, aucun écran ne l'appelle.
- **`isActive` et `publishedAt` sont des filtres de publication, pas des colonnes d'affichage.** `GET /products` et `GET /products/:id` masquent les produits désactivés (404 sur la fiche), `GET /posts` masque les brouillons et les publications programmées. Un admin identifié par `OptionalJwtAuthGuard` voit tout, et peut filtrer explicitement avec `isActive=true|false`. Un produit désactivé disparaît aussi des `similar` / `frequently_bought_together`.
- **`Order.status` suit une machine à états** (`orders/order-status-rules.ts`) : `EN_ATTENTE_PAIEMENT → PAYEE → EN_PREPARATION → EXPEDIEE → LIVREE`, ou `… → PRETE_A_RETIRER → RETIREE` en retrait ; `ANNULEE` possible tant que la marchandise n'est pas sortie (pas après `EXPEDIEE`). Les étapes de l'autre mode de réception sont refusées. `PATCH /orders/:id/status` répond 400 sur un passage interdit, et 409 si le statut a changé entre la lecture et l'écriture (mise à jour conditionnée à l'ancien statut — c'est ce qui empêche une double remise en stock). Le front (`lib/order-status.ts`) n'en garde qu'une copie pour filtrer le sélecteur : le backend fait foi.
- Dans la même transaction, **`PAYEE` marque le paiement** (`paymentStatus: PAYE`, `paidAt`, puis `expectedDeliveryAt` en jours ouvrés — `common/business-days.ts`, même calendrier que le panier) : c'est la validation manuelle en attendant la confirmation MVola, qui devra passer par le même chemin. **`ANNULEE` remet le stock** des lignes dont le produit existe encore ; une commande déjà payée reste `PAYE` (remboursement manuel). Chaque passage écrit une ligne `order_status_history` (admin auteur + note facultative du DTO).
- Les likes d'articles sont idempotents via la contrainte unique `[postId, userId]` ; `likesCount` n'est incrémenté que lorsque la ligne est réellement créée.
- Supprimer un commentaire emporte ses réponses (`parentId` en `onDelete: Cascade`) : une réponse orpheline n'aurait plus rien à quoi répondre.
- **`PATCH /posts/:id/comments/:commentId` est réservée à l'auteur du commentaire** (403 sinon), sans exception pour l'admin : modérer, c'est retirer, pas réécrire sous la signature de quelqu'un. `DELETE` a en revanche **deux appelants** — l'auteur depuis le mur, l'admin depuis le backoffice — d'où un simple `JwtAuthGuard` sur la route et le tri dans le service. Les deux vérifient que le commentaire appartient bien à la publication de l'URL, faute de quoi `/posts/A/comments/<id de B>` toucherait B.

## Seed

`prisma/seed.ts`, branché via `migrations.seed` dans `prisma.config.ts` (Prisma 7 : plus de clé `prisma.seed` dans `package.json`). Il tourne sous `ts-node` forcé en CommonJS, et réutilise `PrismaService` directement — pas de second `PrismaClient` à maintenir avec la config TLS.

Contenu : 10 comptes (dont `admin@futurama.test`, seul rôle `admin`), 8 catégories (arborescentes), 5 marques, 15 produits avec images, specs, relations `similar` / `frequently_bought_together`, 3 promotions dont une expirée, 8 avis couvrant les trois statuts de modération, 5 revendeurs, 4 articles dont un brouillon — l'un de leurs commentaires portant une réponse de la boutique —, 3 zones de livraison (tarifs provisoires), la boutique de Tsaralalana, et une commande de démonstration.

Tous les comptes du seed partagent le mot de passe `futurama2026` (`DEMO_PASSWORD` dans `seed.ts`) — valeur de développement, sans plus. Les avis, commentaires et likes référencent un compte par son email.

Deux comportements à connaître avant de le modifier :

- Il est **rejouable** : il purge le périmètre catalogue + contenu puis le recrée. L'ordre des `deleteMany` suit les contraintes — les produits partent avant les catégories (`onDelete: Restrict`).
- Il ne purge **jamais** les commandes ni les comptes (les comptes sont créés en `upsert` sur l'email : `orders.user_id` est en `onDelete: Restrict`), et ne crée la commande de démonstration que si `order.count()` vaut 0. Un re-seed laisse donc les commandes existantes avec un `productId` à `NULL` sur leurs lignes : c'est exactement la convention `order_items` ci-dessus, le nom et le prix restent figés.

Les relations `similar` sont écrites dans les deux sens (`findRelated` filtre sur `productId`, la relation est dirigée) ; `frequently_bought_together` reste dirigée.

## Frontend

Deux applications dans le même paquet Next, séparées par des groupes de routes :

- `app/(boutique)/` — MVP e-commerce : accueil (rayons), catalogue paginé par rayon (facettes, tri), fiche produit (avec la section « Avis clients » : moyenne, répartition, dépôt d'un avis), panier, connexion / inscription et confirmation de commande. Le **live shopping** vit sur `/live` (lien « Live » de la barre de navigation, plus un bandeau rouge du header pendant le direct, `live-banner.tsx`) : annonce, direct ou replay selon le statut (`components/live/live-room.tsx`, lecteur `plugins/video.php`). Aucun lien de la page ne la quitte — la fiche produit s'ouvre dans un nouvel onglet — et la commande se passe dans un panneau (`live-cart-drawer.tsx`) qui réutilise `CheckoutForm` avec `liveId`, `onOrdered` (confirmation sur place au lieu de `/commande/:id`) et `returnTo`. Ce panneau est une `div` fixe et non un `<dialog>` : le formulaire ouvre déjà sa popup native de confirmation. Bandeau et page s'appuient sur `useCurrentLive()` (`lib/use-current-live.ts` : `GET /live/current` toutes les 30 s, API injoignable = pas de live, même objet tant que l'id et le lien ne changent pas) ; `LiveRefresher` fait `router.refresh()` dès que le direct en cours diffère de celui affiché, ce qui ne démonte pas l'`<iframe>`. La section **« Nos vidéos »** de l'accueil (`components/videos/latest-videos.tsx`, d'après la maquette : 6 cartes sombres, bande horizontale sur téléphone, sans vignette — Facebook ne la donne pas sans API) liste les replays ; la liste complète vit sur `/videos` (lien « Vidéos » de la barre) et chaque replay sur `/videos/[id]`, qui réutilise `LiveRoom` : vidéo + produits achetables, les commandes y restent attribuées au live. `LiveRefresher` est posé par `/live` seule, pas par `LiveRoom` : un replay n'a pas à suivre le direct. Le mur « Nos publications » vit sur `/publications` (paginé, la plus récente en haut) et l'accueil en annonce les deux dernières via `LatestPublications`. Sous chaque publication, les réponses de la boutique s'affichent indentées sous leur commentaire, signées « Futurama.mg » (toute réponse vient d'une route admin : le front n'a pas à connaître le rôle de son auteur). L'auteur d'un commentaire peut le **modifier ou le retirer** (`components/publications/post-comment-item.tsx`, sur le modèle de `review-item.tsx`) ; les boutons ne sont masqués aux autres que par confort, le backend tranche. Le reste de la maquette (chatbot, revendeurs) n'est pas implémenté.
- `app/admin/` — le backoffice : tableau de bord, commandes, livraison & retrait (zones et boutiques), produits, catégories, marques, promotions, publications, validation des avis, live shopping.

**Le layout racine (`app/layout.tsx`) est volontairement nu** — polices et feuille de styles, rien d'autre. L'en-tête et le pied de page appartiennent à la boutique et vivent dans `app/(boutique)/layout.tsx`. Un layout enfant ne pouvant pas retirer le chrome de son parent, c'est le seul moyen de donner au backoffice une enveloppe distincte. Le groupe `(boutique)` ne change aucune URL.

### Backoffice

**Les deux espaces ne se croisent plus.** Aucune page de la boutique ne mène au backoffice — le raccourci « Backoffice » du menu compte a été retiré —, et le backoffice a sa propre connexion, `/admin/connexion`, distincte du `/connexion` de la boutique. Contrepartie assumée : cette page annonce l'existence d'un backoffice à qui atteint `/admin`. Ce n'est pas la défense (le JWT et le rôle le sont), mais c'est un recul par rapport au `notFound()` ci-dessous.

`app/admin/(shell)/layout.tsx` est un Server Component qui **relit le compte via `GET /auth/me`** avant d'ouvrir le shell : le rôle du JWT est figé à l'émission, et le `localStorage` du navigateur ne prouve rien. Sans token → `/admin/connexion` ; compte non-admin → `notFound()` (404 plutôt que 403 : inutile d'annoncer l'existence d'un backoffice). Ce garde n'est **qu'un confort d'affichage** — chaque route admin du backend revalide de son côté, un contournement de cette page ne donne accès à rien.

Le groupe `(shell)` n'existe que pour ça : il porte le garde et toutes les pages du backoffice, pendant que `app/admin/connexion/` reste à côté, **hors de sa portée**. Un layout posé directement sous `app/admin/` couvrirait aussi la page de connexion, qui redirigerait alors vers elle-même en boucle. Le groupe ne change aucune URL.

`components/admin/admin-login-form.tsx` ne réutilise pas `components/auth-form.tsx` : pas de mode inscription (un compte admin ne se crée pas depuis un formulaire public), et la destination est contrainte à `/admin` — cette page ne sert pas de tremplin vers une route arbitraire. Des identifiants valides mais non-admin sont refusés **sans ouvrir de session** : la démarrer enverrait droit sur le 404 du garde.

- `lib/admin-api.ts` regroupe les appels réservés au backoffice. Il partage le `request()` de `lib/api.ts` (une seule implémentation de `fetch`) mais vit à part : ces routes répondent toutes 403 à un compte client, et rien ici ne doit finir appelé depuis une page de la boutique. `deletePostComment()` fait donc exception et vit dans `lib/api.ts` : la boutique s'en sert aussi, l'auteur pouvant retirer son propre commentaire.
- La modération des commentaires — et la **réponse de la boutique** — passe par `components/admin/post-comments-modal.tsx`, ouvert depuis le compteur « N commentaires » de chaque publication : le fil est **déjà joint** à `GET /posts`, aucun second appel n'est fait. La confirmation y est en ligne, pas en `ConfirmDialog` — deux `<dialog>` ouverts en même temps se disputent le piégeage du focus. La modale se retrouve par identifiant dans la liste (`posts.find(...)`) pour repartir de la donnée fraîche après `router.refresh()`.
- Les **filtres de liste sont des formulaires GET natifs** : ils vivent dans l'URL, donc partageables et rechargeables, et n'exigent aucun JS. `components/admin/admin-pagination.tsx` reporte tous les filtres courants dans ses liens ; `components/pagination.tsx` fait de même côté boutique, en recevant les filtres déjà sérialisés (`params`).
- Les mutations sont des Client Components qui appellent `router.refresh()` après succès : les pages sont des Server Components, c'est au serveur de relire.
- `components/admin/modal.tsx` est bâti sur `<dialog>` natif — piégeage du focus, fermeture par Échap et inertie de la page sont fournis par le navigateur. `confirm-dialog.tsx` s'en sert pour toutes les suppressions ; **plus aucun `window.confirm()`** : la boîte native ne sait afficher ni état d'attente ni erreur serveur. Les formulaires de catégorie et de marque s'ouvrent en modale, celui des produits garde sa page (13 champs plus galerie, specs et relations).
- Galerie, caractéristiques et produits liés s'éditent en liste locale complète et ne partent qu'à la validation — le backend remplace la collection entière (voir *Sous-ressources produit*).
- **Live shopping** (`/admin/lives`) : cartes plutôt que tableau, la vendeuse consulte depuis son téléphone. On y programme le live (titre, date, produits), puis le jour venu « Lancer le live » ouvre une modale où coller le lien Facebook ; en direct, « Changer le lien » et « Terminer » (`live-controls.tsx`). Terminé, la fiche ajoute un bloc **Replay** (`live-replay-panel.tsx` : lien corrigeable, interrupteur « Visible dans les replays ») et la carte de la liste un bouton « Retirer des replays » / « Remettre » — les deux via `replay-visibility.tsx`, qui demande confirmation pour retirer. Les produits restent modifiables après la fin, par le formulaire habituel. Les dates se saisissent et s'affichent **en heure de Madagascar** quel que soit le fuseau du serveur (`lib/live.ts`, UTC+3 fixe).
- Les classes `admin-input` / `admin-label` / `admin-button` / `admin-card` sont définies dans `app/globals.css`. La boutique garde ses styles inline : ses formulaires sont trop peu nombreux pour justifier une classe.

`maquette/refonte-site-Futurama-v1.3.html` est la référence visuelle. C'est un bundle Claude Design : le HTML lisible est dans son `<script type="__bundler/template">`, en JSON. La palette et les fontes (Archivo pour les titres, DM Sans pour le texte) en sont extraites et vivent dans les tokens `@theme` de `app/globals.css`.

### Accès à l'API

Le backend n'a **ni préfixe global ni CORS**. Il est monté derrière `/api` par un rewrite dans `next.config.ts`, ce qui garde les appels navigateur same-origin — donc pas de CORS à activer côté Nest. `lib/api.ts` en tient compte : côté serveur il tape directement `BACKEND_URL`, côté navigateur il passe par `/api`. Tout `fetch` passe par ce module, jamais par un composant.

Limites de l'API que le catalogue contourne côté front, à remplacer par un vrai filtre backend le jour où le catalogue grossit :

- `GET /products?categoryId=` ne filtre que sur une catégorie exacte : ouvrir un rayon parent oblige à charger le catalogue et filtrer sur l'ensemble parent + enfants ;
- il n'y a pas de recherche par nom **côté boutique** : la recherche du header renvoie sur `/catalogue/tous?q=`, filtré de la même façon. `limit` est plafonné à 100 côté DTO ;
- l'API ne sait **ni compter par facette ni trier** : les compteurs de la colonne de filtres portent sur le rayon entier, pas sur la page affichée.

C'est ce qui fait que `/catalogue/[categorySlug]` charge le rayon **complet** (`loadRayon`, plafonné à `MAX_WIDE_PAGES * API_MAX_LIMIT`) puis filtre, trie et pagine en mémoire. Un rayon feuille passe quand même par `categoryId` : inutile d'aspirer tout le catalogue pour lui.

`GET /products?q=` existe pourtant désormais (nom + référence, insensible à la casse) : il a été ajouté pour la liste du backoffice. Le catalogue de la boutique ne s'en sert pas encore — c'est le remplacement naturel du filtrage côté client décrit ci-dessus.

### Conventions

- Server Components par défaut. Les Client Components se limitent à l'interactivité réelle : recherche, badge panier, galerie, quantité/ajout, page panier, formulaire de commande, colonne de filtres du catalogue.
- **La colonne de filtres du catalogue est un formulaire GET** (`components/catalogue/`) : les critères vivent dans l'URL, le rendu reste serveur. `filter-form.tsx` ne fait que naviguer (`router.push` dans un `useTransition`, d'où le voile d'attente : un rendu coûte quelques secondes) et retombe sur la soumission native sans JS. `page` n'est jamais repris — changer un filtre ramène en page 1. Chaque groupe correspond à une donnée que l'API renvoie vraiment (marque, stock, `isPremium`, prix) : la maquette montre aussi des notes, un vendeur et des options de livraison, que rien n'alimente. Les compteurs d'une facette sont calculés **sans** cette facette (`applyFilters(..., except)`), sinon cocher une marque ramènerait les autres à zéro.
- `Product.marque` n'est joint que par `GET /products` (la liste) : une lecture unitaire ou un produit lié revient sans, d'où son type optionnel.
- Le visiteur est identifié par un `session_id` généré et stocké en localStorage (`lib/session.ts`). Après toute mutation du panier, appeler `notifyCartUpdated()` : le badge du header écoute cet événement.
- Le panier reste ouvert aux visiteurs, mais **commander exige un compte** : `CheckoutForm` affiche un appel à la connexion tant que `useAuth()` ne renvoie pas d'utilisateur. Le récapitulatif (`app/(boutique)/panier/checkout-form.tsx`) propose livraison (zone + adresse) ou retrait (boutique + carte Google Maps en `<iframe>`, sans clé), puis ouvre une popup de confirmation avant `POST /orders`. Les champs `contactName` / `contactPhone` / `shippingAddress` / `mvolaPhone` sont préremplis depuis le profil et modifiables — le backend les fige sur la commande. `userId` n'est jamais envoyé, il vient du JWT.
- Un `401` sur une route protégée renvoie vers `/connexion?next=…` plutôt que d'afficher l'erreur brute ; un `403` sur une commande est traité comme un `404` (ne pas révéler qu'elle existe).
- Les montants arrivent en **chaîne** (`Decimal` Prisma sérialisé). Les parser via `lib/format.ts`, jamais avec un `Number()` inline.
- Les visuels du seed (`/images/products/*.jpg`) n'existent pas dans `public/`. `components/product-image.tsx` retombe sur un aplat ; il traite aussi le cas d'une image déjà en 404 au rendu serveur, où `onError` ne se déclenche jamais. Les photos téléversées depuis le backoffice, elles, sont servies sous `/uploads/products/…` (voir *Visuels téléversés*).
- `request()` ne pose pas de `Content-Type` quand le corps est un `FormData` : la frontière multipart est générée à l'envoi, et l'imposer la ferait disparaître. C'est ce qui fait marcher `uploadImage()`.

`frontend/AGENTS.md` (et `frontend/CLAUDE.md`, qui n'en est qu'un pointeur `@AGENTS.md`) est **généré automatiquement par `next dev`** — voir `node_modules/next/dist/server/lib/generate-agent-files.js`. Le supprimer ne fait que recréer une modif non commitée. Son avertissement vaut : Next 16 introduit des ruptures d'API, consulter `node_modules/next/dist/docs/` avant d'écrire du code Next plutôt que de se fier à ses souvenirs.
