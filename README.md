# Billetterie Cheval Blanc

Application web (téléphone) pour vendre des billets QR : Réveillon de Noël et Réveillon du Nouvel An.
Tous les vendeurs voient tous les billets. Un billet ne peut être scanné qu'une seule fois.

## 1. Lancer en local (sur ton ordinateur)

1. Installer Node.js (version 18 ou plus) : https://nodejs.org
2. Dans le dossier du projet :
   - `npm install`
   - copier `.env.example` en `.env.local` (et changer `ACCESS_CODE`)
   - `npm run dev`
3. Ouvrir http://localhost:3000

Les billets sont gardés dans un fichier `local.db`.

## 2. Mettre en ligne gratuitement (Vercel + Turso)

Vercel ne garde pas de fichiers, il faut donc une base en ligne gratuite : Turso (c'est du SQLite).

1. Créer un compte sur https://turso.tech puis une base de données.
2. Récupérer deux valeurs : l'URL (`libsql://...`) et un token d'accès.
3. Mettre le projet sur GitHub, puis l'importer dans Vercel (https://vercel.com).
4. Dans Vercel > Settings > Environment Variables, ajouter :
   - `ACCESS_CODE` : le code que tes vendeurs devront taper
   - `ADMIN_CODE` : ton code à toi seul (pour supprimer des billets)
   - `TURSO_DATABASE_URL` : l'URL Turso
   - `TURSO_AUTH_TOKEN` : le token Turso
5. Déployer. Envoie le lien Vercel + le code d'accès aux vendeurs.

## Règles de fonctionnement
- Le scan est atomique : même si deux téléphones scannent en même temps, un seul est accepté.
- La liste se rafraîchit toute seule toutes les 5 secondes.
- Pour changer les formats ou les avantages : fichier `lib/config.js`.
