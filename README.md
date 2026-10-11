# LTD Sandy Shores — Tablette de recrutement interne (V3)

Site indépendant de l'application téléphone du LTD Sandy Shores.

## Fonctionnement
- À l'ouverture, sélection d'un profil (Luciana Angel Mars, Blake Mars ou recruteur ajouté depuis les Paramètres).
- Fiches séparées : Nouvel entretien vendeur et Nouvel entretien pompiste.
- Questions sur le parcours, la vie du candidat, le fonctionnement d'un LTD, les factures, l'expérience, les disponibilités et les tâches du poste. Questions à réponses multiples et avis du recruteur.
- Candidatures reçues repliables/dépliables, consultation détaillée, commentaires et historique.
- Décisions réservées à la direction : Reçue / Acceptée / Refusée.
- Liste des acceptés et progression de formation : En attente / Planifiée / Terminée.
- Les seuls dossiers refusés peuvent être déplacés dans Supprimés. Restauration possible pendant 48 heures ; purge automatique à l'échéance.
- La rubrique Mes entretiens conserve les fiches du recruteur connecté.

## Déploiement
Node.js >=22.13 ; `npm start` ou `node server.js`.
Base SQLite stockée dans `DB_FILE` si défini, sinon `./data/recrutement.sqlite`.

**Important** : Render Free n'offre pas de stockage local persistant. Les données peuvent disparaître lors d'un redéploiement / redémarrage. Pour garantir la conservation des candidatures et le délai de suppression de 48 h, configurer une base durable ou un disque persistant compatible avec l'hébergement.

La sélection de profil ne comporte aucun mot de passe, conformément au fonctionnement demandé. Ce n'est pas une authentification sécurisée : toute personne ayant le lien peut se déclarer direction. Ne pas utiliser avec des données réelles sensibles sans mettre en place une protection d'accès.

## Compatibilité
La migration du serveur ajoute `deleted_at` et `training_status` à la base existante, sans effacer les fiches. Les anciens statuts « à revoir », « en attente », « à étudier » deviennent « reçue ».
