# Pixel Cloud - Serverless Backend

The serverless backend for **Pixel Cloud**, a real-time collaborative canvas inspired by r/place. Built with **Serverless Framework v4** on **AWS**.

## 🏗 Architecture

The backend utilizes a fully serverless, event-driven architecture designed for scalability and cost-efficiency.

- **Compute**: AWS Lambda (Node.js 20, ARM64)
- **API**: API Gateway (HTTP API & WebSocket API)
- **Database**: DynamoDB (On-Demand)
  - `Pixels`: Stores the state of the board.
  - `Sessions`: User authentication sessions.
  - `Connections`: WebSocket connection tracking.
  - `RateLimit`: Enforces draw limits per user.
- **Messaging & Queues**:
  - **SQS**: Buffers write requests (`/draw`) to prevent database throttling.
  - **SNS**: Broadcasts events (`pixel.drawn`, `snapshot.ready`) to WebSocket broadcasters and external consumers (Discord).
- **Storage**: S3 (Private bucket for board snapshots).
- **Scheduling**: EventBridge (Daily snapshots).

## 🛡 Security & Optimization

- **Architecture**: Powered by AWS Graviton2 (ARM64) for better performance/cost ratio.
- **Cost Monitoring**: AWS Budget alerts configured to notify when monthly costs exceed limits.
- **Storage Lifecycle**: Automatic deletion of S3 snapshots older than 30 days.
- **Network**: Strict CORS policy allowing only the frontend origin.
- **Auth**: Discord OAuth2 integration.

## 🚀 Deployment

### Prerequisites

- **Node.js 20+**
- **Serverless Framework v4**: `npm install -g serverless`
- **AWS Credentials**: Configured via AWS CLI or environment variables.
- **Secrets Manager**: Create a secret named `serverless-pixel-war-backend-dev-discord-app` (or match your stage) with:
  ```json
  {
    "discord_token": "YOUR_BOT_TOKEN",
    "public_key": "YOUR_PUBLIC_KEY",
    "app_id": "YOUR_APP_ID",
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET"
  }
  ```

### Deploy

```bash
# Install dependencies
npm install

# Deploy to AWS
npx serverless deploy --stage dev
```

### Key Endpoints

- `POST /draw`: Place a pixel (Rate limited).
- `GET /state`: Get current board state.
- `GET /auth`: OAuth2 flow.
- `WSS /`: Real-time WebSocket connection.

## 🛠 Project Structure

- `src/handlers`: Lambda function handlers.
  - `draw/`: Logic for placing pixels (Proxy & Worker).
  - `realtime/`: WebSocket connection and broadcasting.
  - `snapshot/`: Generates PNG snapshots of the board.
  - `discord/`: Discord interactions and webhooks.
- `src/utils`: Shared utilities (AWS clients, image processing).
