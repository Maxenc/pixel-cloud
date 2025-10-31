# 🧩 Serverless Epitech Login – Projet AWS (Free Tier)

## 🚀 Objectif
Ce projet a pour but de **déployer une API Serverless sécurisée (IAM-only)** sur AWS, sans aucun service payant.  
L’infrastructure repose exclusivement sur **AWS Lambda**, **API Gateway (REST)** et **CloudWatch Logs**, avec une configuration entièrement **déployée via le Serverless Framework**.

---

## ⚙️ Architecture Technique

```
[User IAM Auth] 
      ↓
  [API Gateway REST]
      ↓
  [Lambda Node.js 22.x]
      ↓
  [CloudWatch Logs JSON]
```

**Caractéristiques :**
- 🔒 Accès restreint IAM uniquement (aucun accès public)
- ☁️ Full Serverless AWS
- 🪵 Logs JSON centralisés (CloudWatch)
- 💸 100 % Free Tier
- 🧱 Environnements isolés : `dev` / `prod`
- 🧰 Automatisé via Serverless Framework (v4+)

---

## 📦 Prérequis

- ✅ [Node.js 22.x](https://nodejs.org/)
- ✅ [Serverless Framework v4+](https://www.serverless.com/framework/docs/getting-started/)
- ✅ [AWS CLI configuré](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html)
- ✅ Compte AWS avec un utilisateur IAM et clés d’accès (`Access Key ID`, `Secret Access Key`)

---

## 🔑 Étapes de mise en place

### 1️⃣ Installer le Serverless Framework
```bash
npm install -g serverless
```

### 2️⃣ Configurer les credentials AWS
```bash
aws configure --profile dev
aws configure --profile prod
```

### 3️⃣ Initialiser le projet
```bash
mkdir serverless-epitech-login && cd serverless-epitech-login
serverless create --template aws-nodejs
```

### 4️⃣ Créer le handler Lambda (`handler.js`)
```js
'use strict';

module.exports.login = async (event) => {
  console.log(`[${process.env.STAGE}] ${process.env.PROJECT_NAME} login`);
  console.log('Event:', JSON.stringify(event));

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: `Hello from ${process.env.API_NAME} (${process.env.STAGE})!`,
    }),
  };
};
```

### 5️⃣ Créer la configuration Serverless (`serverless.yml`)
```yaml
service: serverless-epitech-login

frameworkVersion: '4'

provider:
  name: aws
  runtime: nodejs22.x
  region: eu-west-3
  stage: ${opt:stage, 'dev'}
  timeout: 29
  environment:
    API_NAME: serverless-epitech-api
    LAMBDA_TIMEOUT: 29
    LOG_LEVEL: INFO
    PROJECT_NAME: serverless-epitech-login
    REGION: ${self:provider.region}
    STAGE: ${self:provider.stage}
  logs:
    restApi:
      accessLogging: true
      format: '{"requestId":"$context.requestId","ip":"$context.identity.sourceIp","userAgent":"$context.identity.userAgent","requestTime":"$context.requestTime","httpMethod":"$context.httpMethod","resourcePath":"$context.resourcePath","status":"$context.status","protocol":"$context.protocol","responseLength":"$context.responseLength"}'
  iam:
    role:
      statements:
        - Effect: Allow
          Action:
            - logs:CreateLogGroup
            - logs:CreateLogStream
            - logs:PutLogEvents
          Resource: arn:aws:logs:*:*:*
        - Effect: Allow
          Action:
            - lambda:InvokeFunction
          Resource: "*"

functions:
  login:
    handler: handler.login
    name: ${self:service}-${self:provider.stage}-func
    timeout: 29
    events:
      - http:
          path: /login
          method: post
          authorizer: aws_iam
```

### 6️⃣ Déployer (dev)
```bash
serverless deploy --aws-profile dev --stage dev
```

### 7️⃣ Tester
```bash
curl https://<api>.execute-api.eu-west-3.amazonaws.com/dev/login
aws lambda invoke --function-name serverless-epitech-login-dev-func out.json --profile dev
cat out.json
```

### 8️⃣ Logs CloudWatch
```bash
aws logs tail /aws/api-gateway/serverless-epitech-login-dev --follow --profile dev
```

### 9️⃣ Déployer (prod)
```bash
serverless deploy --aws-profile prod --stage prod
```

### 🔟 Supprimer une stack
```bash
serverless remove --aws-profile dev
serverless remove --aws-profile prod
```

---

## 🧠 Points clés pour la soutenance

| Sujet | Réponse |
|-------|----------|
| **Sécurité** | IAM-only, aucun accès public |
| **Logs** | CloudWatch JSON |
| **Monitoring** | Logs + CloudFormation |
| **Région** | eu-west-3 (Paris) |
| **Runtime** | Node.js 22.x |
| **Architecture** | Full Serverless (Lambda + API Gateway) |
| **Free Tier** | ✅ 100 % gratuit |
| **Environnements** | dev / prod isolés |
| **Outil de déploiement** | Serverless Framework v4 |

---

## 🏁 Auteur

**Projet Epitech – Serverless C2**  
Réalisé par : *[Ton Nom]*  
Encadrant : Jérémie Jaouen  
Année : 2025
