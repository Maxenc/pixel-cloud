# Pixel Cloud

**Pixel Cloud** est une application canvas collaborative en temps réel (inspirée de r/place), entièrement Serverless et construite sur AWS.

Ce projet permet aux utilisateurs authentifiés via Discord de placer des pixels sur une grille partagée de 256x256, avec des mises à jour diffusées instantanément à tous les clients connectés via WebSockets.

---

## 🏗 Architecture Technique

Le projet repose sur une architecture **Event-Driven Serverless** optimisée pour la performance et le coût.

### 🧱 Composants Core (AWS)

- **Compute** : AWS Lambda (Node.js 20, ARM64/Graviton2 pour l'optimisation des coûts).
- **API** :
  - **HTTP API (v2)** : Pour les commandes REST (`/draw`, `/auth`, `/state`).
  - **WebSocket API** : Pour le temps réel (connexions persistantes).
- **Base de Données** : DynamoDB (On-Demand).
  - `Pixels` : État actuel de la grille (PK: CanvasId, SK: PixelId).
  - `Sessions` : Sessions utilisateurs (TTL activé).
  - `Connections` : Suivi des clients WebSocket actifs.
  - `RateLimit` : Gestion du cooldown des utilisateurs.
- **Messaging & Async** :
  - **SQS** : Buffer d'écriture pour l'endpoint `/draw` afin d'absorber les pics de charge (lissage du trafic vers DynamoDB).
  - **SNS** : Bus d'événements interne pour diffuser les mises à jour (`pixel.drawn`, `session.paused`) aux workers WebSocket et autres consommateurs.
- **Stockage** : S3 (Stockage des snapshots PNG générés).
- **Hosting Frontend** : S3 + CloudFront (CDN) + OAI (Origin Access Identity).

### 🔄 Flux de Données

1. **Dessin (Write Path)** :
   `Client` → `API Gateway` → `Lambda (Proxy)` → `SQS` → `Lambda (Worker)` → `DynamoDB` → `SNS` → `Lambda (Broadcast)` → `WebSocket` → `Tous les Clients`.
2. **Lecture (Read Path)** :
   `Client` → `API Gateway` → `Lambda` → `DynamoDB (Scan/Query)`.

### 📑 Diagramme Architecture des différents services et workflows (AWS)

   <img width="1704" height="1737" alt="image" src="https://github.com/user-attachments/assets/7217ca15-4b14-4fdf-a385-cdf55569b834" />


---

## 📂 Structure du Monorepo

```bash
/
├── serverless-pixel-war-backend/  # Infrastructure Backend (Serverless Framework)
│   ├── src/
│   │   ├── handlers/             # Lambdas (Draw, Auth, Realtime, Admin)
│   │   ├── utils/                # Helpers AWS & Business Logic
│   │   └── ...
│   ├── serverless.yml            # Définition IaC (AWS CloudFormation)
│   └── package.json
│
├── web_app/                       # Frontend SPA (React + Vite)
│   ├── src/
│   │   ├── components/           # Composants UI (Canvas, AdminPanel...)
│   │   ├── services/             # API Clients
│   │   └── config.js             # Configuration des endpoints
│   ├── serverless.yml            # Définition déploiement Frontend (S3+CloudFront)
│   └── ...
└── discord-example-app/           # (Optionnel) Bot Discord compagnon
```

---

## 🚀 Guide de Déploiement

### Prérequis

- **Node.js 20+**
- **AWS CLI** configuré avec des droits administrateur.
- **Serverless Framework v4** : `npm install -g serverless`
- **Application Discord** : Créez une application sur le [Discord Developer Portal](https://discord.com/developers/applications) pour obtenir `CLIENT_ID` et `CLIENT_SECRET`.

### 1. Backend

1. **Secrets AWS** : Créez un secret dans AWS Secrets Manager (région `eu-west-3` par défaut) nommé `pixel-cloud-discord-app` contenant :

   ```json
   {
     "client_id": "VOTRE_CLIENT_ID",
     "client_secret": "VOTRE_CLIENT_SECRET"
   }
   ```

   _(Note : Le nom du secret doit correspondre au pattern défini dans `serverless.yml` : `${service}-${stage}-discord-app`)_

2. **Déploiement** :
   ```bash
   cd serverless-pixel-war-backend
   npm install
   npx serverless deploy --stage cloud
   ```
   ➜ Notez l'URL de l'API HTTP et l'URL WebSocket affichées en sortie.

### 2. Frontend

1. **Configuration** :
   Editez `web_app/src/config.js` avec les URLs obtenues lors du déploiement backend.

2. **Déploiement** :
   Le frontend utilise le plugin `serverless-finch` pour le déploiement S3/CloudFront.
   ```bash
   cd web_app
   npm install
   npm run build
   npx serverless client deploy --stage cloud
   ```

---

## 🛡 Sécurité & Optimisations

- **Rate Limiting** : Implémenté via DynamoDB (Token Bucket) pour empêcher le spam.
- **Autorisations** : Rôles IAM moindres privilèges générés automatiquement par Serverless.
- **Coûts** :
  - Utilisation de **ARM64** pour les Lambdas (-20% coût, +perf).
  - **TTL** DynamoDB pour nettoyer automatiquement les sessions expirées.
  - **S3 Lifecycle** pour supprimer les vieux snapshots après 30 jours.
  - **AWS Budgets** configuré pour alerter en cas de dépassement de seuil.

## 📄 Licence

Ce projet est open source.
