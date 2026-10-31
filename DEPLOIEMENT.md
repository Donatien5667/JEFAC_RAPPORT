# JEFAC Rapports 1.0

## Logo du mouvement

Le logo original est embarqué dans `src/assets/jefac-logo.ts` et utilisé par
`src/components/Logo.tsx`. Il fait partie du fichier HTML compilé, même lorsque
l'hébergement ne conserve pas le dossier des images publiques. Les icônes PNG
du manifeste et le favicon contiennent également leurs propres données.
Ne pas remplacer ces sources par des chemins vers des images absentes.

## Deux modes distincts

- `npm run dev` lance l'interface React. Sans API connectée, elle fonctionne localement avec IndexedDB. Les données restent dans le navigateur et ne sont pas partagées entre téléphones. L'interface le signale.
- Le serveur `server/index.ts` sert l'interface compilée et une API avec une base SQLite persistante. C'est ce mode qu'il faut héberger pour les vraies paroisses et les communiqués partagés.

Les deux modes démarrent sans comptes, jeunes, rapports ou communiqués fictifs. Les données d'une ancienne version locale sont conservées. Ne pas effacer le navigateur avant de les sauvegarder. Les données locales ne sont pas automatiquement transférées au serveur.

## Lancer le serveur

Prérequis : Node.js 22 LTS recommandé, un disque persistant et HTTPS pour la mise en ligne. Les dépendances sont définies dans `package.json`.

1. Exécuter `npm ci` puis `npm run build`.
2. Générer une clé privée d'installation : `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`.
3. Définir `SETUP_KEY` avec cette valeur, `PORT` avec le port de l'hébergeur, et `DATABASE_PATH` avec un chemin sur le disque persistant.
4. Lancer `node --import tsx server/index.ts` depuis la racine du projet.
5. En production, définir `NODE_ENV=production`, placer un proxy HTTPS devant le serveur et définir `APP_ORIGIN` sur l'origine publique exacte, sans barre finale.

Sans `SETUP_KEY`, le serveur génère une clé aléatoire affichée une fois dans sa console au démarrage. Elle sert uniquement à protéger la première installation. Aucun identifiant administrateur prédéfini n'est livré.

Pour un essai local, les valeurs par défaut donnent `http://localhost:3001/admin` et `http://localhost:3001/connexion`. Ces adresses localhost ne sont pas accessibles depuis les téléphones d'autres personnes.

## Première utilisation

1. Ouvrir `/admin` et choisir « Première utilisation ? Configurer l'administration ».
2. Renseigner le vrai nom du responsable, le téléphone, le doyenné, la première paroisse et un mot de passe de huit caractères minimum. Sur le serveur partagé, saisir aussi la clé d'installation privée.
3. La première paroisse dispose d'un accès gratuit, modifiable par le responsable.
4. Ajouter les autres paroisses puis créer leurs comptes dans « Comptes utilisateurs ».
5. Copier le message d'accès affiché après chaque création et l'envoyer confidentiellement à la personne concernée.

L'inscription publique est désactivée. Une fois l'installation effectuée, seul le responsable peut créer les comptes paroissiaux et les membres du doyenné.

## Liens à communiquer

- Administration : origine publique suivie de `/admin`.
- Paroisses : origine publique suivie de `/connexion`.
- Numéro prérempli : `/connexion?tel=NUMERO`.

Les adresses complètes correspondant à l'hébergement ouvert sont copiables dans **Administration > Configuration > Liens de connexion**. Aucun mot de passe n'est inclus dans les URL. Le serveur sert directement ces deux routes ; aucune règle de réécriture supplémentaire n'est nécessaire si les requêtes lui sont transmises.

Aucun domaine ni hébergement public n'est provisionné par ce projet. Une adresse publique définitive ne pourra être communiquée qu'après ce déploiement.

### Lien public temporaire de prévisualisation

Pour vérifier l'application sur un autre téléphone sans compte d'hébergement, un tunnel Cloudflare Quick Tunnel peut publier temporairement le port du serveur :

```bash
cloudflared tunnel --url http://localhost:3001
```

Le lien `https://….trycloudflare.com` fourni par la commande est public. Il change lors d'un nouveau tunnel et cesse de fonctionner quand le processus ou l'ordinateur qui l'héberge s'arrête. Il n'offre ni disponibilité garantie ni stockage géré : l'application et SQLite restent sur la machine qui exécute Node. Ce lien convient pour faire un essai et ne doit pas être présenté comme l'URL permanente de lancement.

Avant d'envoyer le lien aux paroisses, l'administrateur doit ouvrir `/admin`, compléter une seule fois le formulaire **Première utilisation**, puis créer les comptes utilisateurs. Le lien utilisateur ne permet pas à quelqu'un de créer son propre compte.

### Déploiement persistant Render

`render.yaml` prépare un service Docker en région Frankfurt avec SQLite sur un disque persistant de 1 Go. Render facture séparément le service Web payant et le disque ; les services Free ne conservent pas SQLite après redémarrage. Vérifier le tarif affiché dans Render avant de confirmer. Render fournit l'URL HTTPS `*.onrender.com` ; un domaine personnalisé n'est pas requis pour commencer.

1. Créer un dépôt Git privé sur GitHub et y envoyer les fichiers du projet. Ne jamais envoyer `.env`, `data/`, un fichier SQLite ou des mots de passe.
2. Dans Render, choisir **New > Blueprint**, relier ce dépôt et examiner la configuration présentée par `render.yaml`.
3. Render demandera la variable secrète `SETUP_KEY`. Générer une clé unique localement avec `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"` et la saisir uniquement dans Render. Ne pas la publier dans le dépôt ni la transmettre aux utilisateurs.
4. Choisir **Create Blueprint** et attendre la fin du déploiement. Les données du serveur seront stockées sur le disque `/data`.
5. Ouvrir l'URL HTTPS Render suivie de `/admin`, créer le compte du responsable avec son vrai téléphone et un mot de passe choisi, puis créer les comptes paroissiaux.
6. Dans **Administration > Configuration > Liens de connexion**, copier `/connexion` et le communiquer avec les identifiants individuels de chaque utilisateur.

Le dépôt de travail n'est pas connecté à GitHub ou à Render. La connexion du dépôt et la création d'une URL HTTPS permanente nécessitent le compte de l'administrateur.

## Communiqués

Le responsable peut enregistrer un brouillon privé, publier, modifier et archiver. Tous les comptes actifs, y compris ceux créés après la publication, peuvent consulter les publications. Les utilisateurs reçoivent aussi une notification interne. Le compteur de lectures est visible par l'administration.

Les sessions ouvertes se rafraîchissent au retour sur la fenêtre et toutes les douze secondes tant que la page est visible. Il ne s'agit pas de SMS ni de notifications push du téléphone.

## Sécurité

- Mots de passe hachés avec scrypt et sel aléatoire. Aucun mot de passe en clair ni hash n'est renvoyé dans les listes de comptes de l'API.
- Le mot de passe initial est montré uniquement à sa génération. Conformément au fonctionnement demandé, il reste utilisable après un changement de mot de passe personnel. Il constitue donc un second secret permanent à conserver confidentiellement. Sa régénération par l'administrateur invalide l'ancien mot de passe initial, le mot de passe personnel et les sessions ouvertes de ce compte.
- Sessions dans des cookies HttpOnly/SameSite, avec Secure en production. Les sessions expirent après trente jours. Les tentatives de connexion sont limitées.
- Vérification des rôles et de la paroisse sur le serveur, filtrage des données renvoyées, brouillons des communiqués accessibles uniquement au responsable.
- Les sauvegardes contiennent des données personnelles et des hachages d'authentification : les conserver chiffrées, hors du répertoire public, avec des accès restreints.

Ne pas exposer le mode local comme une solution multiutilisateur sécurisée. Pour de vraies informations sur les jeunes, utiliser le serveur HTTPS et obtenir les autorisations nécessaires pour le traitement des données.

## Sauvegardes et maintenance

Dans Configuration, le responsable peut télécharger une sauvegarde JSON en mode local, ou une sauvegarde SQLite cohérente en mode partagé.

Pour restaurer SQLite : arrêter le serveur, sauvegarder l'ancienne base et ses éventuels fichiers `-wal`/`-shm`, remplacer la base par la sauvegarde, retirer les anciens fichiers WAL/SHM associés, puis relancer le serveur. Ne pas copier un simple fichier `.sqlite` pendant qu'il est modifié : utiliser l'export de l'application ou l'API `backup` de SQLite. Prévoir des sauvegardes régulières côté hébergeur et tester une restauration.

Conserver le disque entre les déploiements. Une plateforme qui efface son disque au redémarrage ne convient pas sans volume persistant. Ne pas lancer plusieurs instances indépendantes avec des fichiers SQLite différents.

## PWA et réseau

Le manifeste et le service worker permettent l'installation en HTTPS et gardent uniquement l'interface et le logo en cache. Les réponses de l'API, les comptes et les sauvegardes ne sont jamais mis en cache par le service worker. L'accès partagé et la transmission des données nécessitent une connexion au serveur. Ce projet ne promet pas d'envoi automatique en arrière-plan lorsque le réseau est indisponible.

## Vérifications

- `npx tsc --noEmit`
- `npx tsc --noEmit -p server/tsconfig.json`
- `npm run build`
- `npx playwright install --with-deps chromium` puis `npx playwright test`

Les tests créent leur propre base temporaire isolée, sans modifier les données de production. Ils vérifient les accès administrateur/utilisateur, les communiqués, le profil, le mot de passe initial, la persistance locale et les écrans mobiles.
