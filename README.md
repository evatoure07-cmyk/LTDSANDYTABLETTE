# LTD Sandy Shores — Recrutement tablette

Application **complète (frontend + backend)** sur le thème latte / beige / doré, adaptée aux tablettes de GTA RP, PC et mobiles.

## Fonctions
- Accueil, offres ouvertes, formulaire complet de candidature RP.
- Enregistrement côté serveur dans SQLite : les données sont communes à tous les navigateurs.
- Référence privée aléatoire de 18 caractères pour suivre la candidature (sans compte).
- Direction : connexion sécurisée, liste et recherche de candidatures, filtres, lecture des profils, notes privées, statut (reçue / étude / entretien / acceptée / refusée), historique, suppression.
- Direction : création, modification, ouverture et fermeture de postes, changement du mot de passe.
- Protection élémentaire : mots de passe scrypt + sel, cookies de session HttpOnly, contrôle d'origine, limites de requêtes, validation côté serveur et échappement HTML.

## Lancer sur Windows / PC
1. Installer **Node.js 22.13+**.
2. Ouvrir un terminal dans ce dossier.
3. Dans PowerShell :
   ```powershell
   $env:ADMIN_USER="direction"
   $env:ADMIN_PASSWORD="UnMotDePasseTresLongEtUnique2026!"
   npm start
   ```
4. Ouvrir http://localhost:3000.

Aucun `npm install` n'est nécessaire : aucune dépendance tierce.

## Héberger sur Render (Docker Web Service)
1. Mettre le contenu dans un dépôt GitHub privé.
2. Render → **New → Web Service** → sélectionner le repo → runtime **Docker**.
3. Ajouter `ADMIN_USER` et `ADMIN_PASSWORD` (12 caractères minimum), et `DB_FILE=/var/data/recrutement.sqlite`.
4. Pour ne **pas perdre les candidatures** lors des redéploiements / redémarrages, ajouter un **Persistent Disk** monté sur `/var/data` (offre Render compatible/disque payant). Sans disque persistant, les données seront perdues. Une offre « Static Site » Render **ne peut pas** faire tourner ce backend.
5. Activer HTTPS (Render s'en charge). Mettre `NODE_ENV=production`.

Le premier démarrage crée le compte direction avec les valeurs d'environnement et 3 postes. Une modification ultérieure d'`ADMIN_PASSWORD` ne change pas le mot de passe existant : le modifier depuis l'onglet Sécurité.

## Sauvegardes
Le fichier SQLite principal est `DB_FILE` (par défaut `data/recrutement.sqlite`). Faire des sauvegardes régulières de la base de données, idéalement à l'aide du mécanisme de sauvegarde SQLite (et non d'une simple copie à chaud du seul fichier `.sqlite` en mode WAL).

## À personnaliser
- Les 3 postes sont modifiables dans l'espace direction.
- Les textes de l'accueil sont dans `public/app.js` (fonction `home`).
- Les couleurs et le cadre tablette sont dans `public/style.css`.

## Limites / extensions
Cette version est une application de recrutement indépendante. Elle n'est **pas encore synchronisée** au bot Maritza, au Discord ni au système de comptes de l'application téléphone (ces intégrations nécessitent les informations du projet et une configuration adaptée). Une référence de suivi donne accès au statut et à l'historique de statut, pas aux réponses personnelles ou aux notes de direction.
