# Pixel Cloud

**Pixel Cloud** is a serverless, real-time collaborative canvas application (inspired by Reddit's r/place). Users can place colored pixels on a shared 256x256 board, with changes broadcasting instantly to all connected clients.

## 🌟 Features

- **Real-time Collaboration**: WebSocket-based updates ensure users see changes as they happen.
- **Serverless Architecture**: Built entirely on AWS Serverless (Lambda, DynamoDB, API Gateway) for infinite scaling and zero maintenance.
- **Discord Authentication**: Secure login via Discord OAuth2.
- **Interactive UI**: Fast, responsive React frontend.
- **Admin Tools**: Snapshot generation, board moderation tools.
- **Production Ready**:
  - **Cost Optimized**: ARM64 compute, S3 lifecycle policies, and budget alerts.
  - **Secure**: Strict Content Security Policy (CSP), CORS, and rate limiting.

## 📂 Project Structure

This monorepo contains two main packages:

- **[`serverless-pixel-war-backend/`](./serverless-pixel-war-backend)**: The Node.js backend infrastructure defined with Serverless Framework. Handles APIs, WebSockets, database, and background workers.
- **[`web_app/`](./web_app)**: The React frontend (Vite) deployed to AWS CloudFront + S3 via `serverless-finch`.

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- AWS Account and CLI configured
- Discord Developer Application (for Auth)

### 1. Deploy the Backend

Navigate to the backend directory and deploy the stack:

```bash
cd serverless-pixel-war-backend
npm install
npx serverless deploy --stage dev
```

_Note the `HttpApiUrl` and `WebSocketUrl` from the output._

### 2. Configure & Deploy the Frontend

Navigate to the web app directory:

```bash
cd web_app
npm install
```

Update `src/config.js` or environment variables with your deployed Backend URLs.

Build and deploy to S3/CloudFront:

```bash
npm run build
npx serverless client deploy --stage dev
```

## 🛠 Tech Stack

- **Frontend**: React, Vite, Canvas API.
- **Backend**: Node.js, Serverless Framework.
- **AWS Services**:
  - **Compute**: Lambda (ARM64)
  - **API**: API Gateway (HTTP & WebSocket)
  - **Database**: DynamoDB
  - **Storage**: S3
  - **Queues/Events**: SQS, SNS, EventBridge
  - **CDN**: CloudFront

## 📄 License

This project is open source.
