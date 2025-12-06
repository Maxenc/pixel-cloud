# Pixel War Next

Clone inspiré de Reddit r/place : une toile 256×256 partagée en temps réel, pilotée par un backend full serverless, un frontend React et un bot Discord.

## Architecture

```
Frontend (Vite/React) -> CloudFront -> S3 privé
        |
        v
HTTP API (API Gateway)
  ├─ /draw (Lambda proxy -> SQS draw queue)
  ├─ /snapshots (liste JSON)
  ├─ /admin/* (pause/resume/snapshot)
  ├─ /auth (OAuth2 Discord -> sessions DynamoDB)
  └─ /discord/interactions (Slash commands)

Workers
  ├─ draw/worker (SQS -> DynamoDB Pixels + SNS events)
  └─ snapshot/worker (SQS -> PNG S3 + SNS + Discord webhook)

Stores
  ├─ DynamoDB: pixels, sessions, game session, rate limit, admins
  ├─ S3: snapshot images (privé)
  └─ Secrets Manager: credentials Discord

Realtime
  └─ API Gateway WebSocket (connect / disconnect / broadcast)
```

## Principales briques

- **Backend** : Node.js 20, Serverless Framework v4, AWS (API Gateway HTTP & WebSocket, Lambda, DynamoDB, SQS/SNS, S3, EventBridge).
- **Frontend** : Vite + React 18, déployé via `serverless-finch` (CloudFront + S3 privé + fallback SPA).
- **Discord** : Slash commands `/pixel`, `/snapshot`, `/pause`, `/resume`, `/state` gérés par une Lambda `discordInteractions`. Webhook notifie les snapshots prêts.
- **Rate limiting** : DynamoDB `RateLimitTable` (clé `[userId, minuteBucket]`, TTL 120 s) appliqué au proxy `draw` + worker (sécurité anti-spam).
- **Documentation** : `DEPLOYMENT_NOTES.md`, `SECURITY_REPORT.txt`, `PROJECT_JOURNAL.txt`.

## Lancer / Déployer

### Backend

```bash
cd serverless-pixel-war-backend
npm install
npx serverless deploy --stage <stage> --aws-profile <profile>
```

Pré-requis :

- Secrets Manager `serverless-pixel-war-backend-<stage>-discord-app` contenant :
  ```json
  { "discord_token": "...", "public_key": "...", "app_id": "..." }
  ```
- DynamoDB/SQS/SNS/S3 gérés automatiquement par la stack.

### Frontend

```bash
cd web_app
npm install
npm run build
npm run deploy:frontend -- --stage <stage>
# (removal) npm run remove:frontend -- --stage <stage>
```

Le déploiement crée/actualise :

- Bucket S3 privé `${service}-${stage}-${accountId}`
- Distribution CloudFront : HTTPS obligatoire, fallback SPA (403/404→200), PriceClass_100.
  Pense à invalider CloudFront (`aws cloudfront create-invalidation …`) après chaque release majeure.

### Discord Commands

```
cd discord-example-app
npm install
DISCORD_TOKEN=... APP_ID=... PUBLIC_KEY=... node commands.js
```

Ce script (hérité du projet d’origine) publie les commandes globales.

## Fonctionnement

- Les utilisateurs se connectent via OAuth2 Discord (`/auth`). Le frontend stocke le token de session.
- Chaque clic sur la toile déclenche `/draw`. La Lambda vérifie statut de partie + quota minute, puis pousse le pixel dans SQS.
- Le worker `draw` écrit dans DynamoDB, publie un événement SNS (consommé par le broadcaster WebSocket + Discord).
- Les snapshots sont demandés via `/admin/snapshots` (bot ou UI). Le worker scanne les pixels, génère un PNG, l’écrit sur S3, publie l’événement `snapshot.ready`.
- Le frontend est pré-rendu (Vite) et consomme l’API + WebSocket pour afficher la toile en temps réel.

## Connaissances clés

- Serverless Framework multi-services, IAM granulaire.
- DynamoDB (TTL, condition expressions, GSI).
- SQS/SNS orchestration, EventBridge, WebSocket API Gateway.
- Secrets Manager, Discord interactions (Ed25519), OAuth2.
- CloudFront/S3 privé via `serverless-finch`.
- UX : WebSocket React, toasts auto-expirants, rate limit UX.

## Références utiles

- `DEPLOYMENT_NOTES.md` : commandes build/deploy + runbook.
- `SECURITY_REPORT.txt` : audit sécurité + recommandations (AuthN, WAF, alarms).
- `PROJECT_JOURNAL.txt` : histoire détaillée du projet (décisions et incidents).
