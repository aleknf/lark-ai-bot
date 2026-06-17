# 🤖 Lark AI Bot Server

A full-featured **Node.js/TypeScript** bot server that connects **OpenRouter AI** with **Lark/Feishu** for intelligent messaging, data operations, and report generation.

## Architecture

```
Lark User Message → Webhook → Your Server → AI Pipeline → OpenRouter → Reply
                                    ↕
                              lark-cli subprocess
                           (Base / Sheets / Docs / IM)
```

## Features

| Feature | Description |
|---------|-------------|
| 💬 **IM Chat** | Reply to messages, thread support, mention detection |
| 🔍 **Base Search** | `/search <query>` — search records in Lark Base |
| 📊 **Sheet Query** | `/sheet <query>` — read data from Lark Sheets |
| 📄 **Doc Reports** | `/report [topic]` — generate AI reports saved to Lark Docs |
| 🧠 **AI Chat** | `/ai <prompt>` or just mention the bot — OpenRouter-powered |

## Prerequisites

1. **Node.js** ≥ 18
2. **lark-cli** — install from https://github.com/larksuite/cli
3. **Lark Developer Account** — create a bot app at [Lark Developer Console](https://open.feishu.cn/app)
4. **OpenRouter API Key** — get from https://openrouter.ai/keys

## Quick Start

### 1. Install lark-cli

```bash
# Follow instructions at https://github.com/larksuite/cli
lark-cli config init --new
```

### 2. Create a Lark Bot App

1. Go to [Lark Developer Console](https://open.feishu.cn/app)
2. Create a new **Custom App** (not Miaoda)
3. Under **Features** → **Event Subscriptions**, enable events:
   - `im.message.receive_v1` — to receive messages
4. Set the webhook URL to your server (use ngrok for dev):
   ```
   https://your-ngrok-url.ngrok-free.app/webhook
   ```
5. Note your **App ID**, **App Secret**, and **Verification Token**

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=openai/gpt-4o

LARK_APP_ID=cli_...
LARK_APP_SECRET=...
LARK_VERIFICATION_TOKEN=...

# Optional: default resources
LARK_DEFAULT_BASE_TOKEN=BA...
LARK_DEFAULT_SHEET_TOKEN=st...
```

### 4. Run

```bash
npm install
npm run dev
```

### 5. Expose Local Server (Development)

```bash
# Use ngrok or cloudflare tunnel
ngrok http 3000
# → https://xxxxx.ngrok-free.app → set as webhook URL in Lark Console
```

## Bot Commands

| Command | Action |
|---------|--------|
| `@Bot /help` | Show available commands |
| `@Bot /search sales Q2` | Search Base records |
| `@Bot /sheet A1:D20` | Read Sheet range |
| `@Bot /report weekly summary` | Generate AI report → Lark Doc |
| `@Bot /ai explain quantum computing` | Ask the AI anything |
| `@Bot any question` | Natural language AI query |

## Project Structure

```
src/
├── index.ts                  # Express server entry
├── config.ts                 # Zod-validated configuration
├── types/index.ts            # TypeScript interfaces
├── utils/index.ts            # Logger, signature verification, helpers
├── routes/
│   └── webhook.ts            # POST /webhook — Lark event receiver
├── services/
│   ├── lark-cli.ts           # lark-cli subprocess wrapper
│   ├── openrouter.ts         # OpenRouter API client
│   ├── im.ts                 # IM operations (send, reply, history)
│   ├── base.ts               # Base operations (CRUD, search, data-query)
│   ├── sheets.ts             # Sheet operations (range read/write)
│   └── docs.ts               # Docs operations (create, append)
└── handlers/
    ├── commands.ts           # Bot command parser (/help, /search, etc.)
    ├── pipeline.ts           # AI pipeline orchestrator
    └── message.ts            # IM message event handler
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 3000) |
| `NODE_ENV` | No | `development` / `production` |
| `OPENROUTER_API_KEY` | **Yes** | OpenRouter API key |
| `OPENROUTER_MODEL` | No | Model name (default: `openai/gpt-4o`) |
| `LARK_APP_ID` | **Yes** | Lark bot app ID |
| `LARK_APP_SECRET` | **Yes** | Lark bot app secret |
| `LARK_VERIFICATION_TOKEN` | No | Webhook verification token |
| `LARK_DEFAULT_BASE_TOKEN` | No | Default Base for /search |
| `LARK_DEFAULT_SHEET_TOKEN` | No | Default Sheet for /sheet |
| `AI_MAX_CONTEXT_MESSAGES` | No | Max history messages (default: 20) |
| `AI_SYSTEM_PROMPT` | No | System prompt for AI |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/webhook` | Lark event subscription receiver |
| `GET` | `/health` | Health check + server info |

## How It Works

1. **User sends message** to the bot in Lark (DM or group chat with @mention)
2. **Lark sends webhook** to `POST /webhook` with the message event
3. **Server verifies** the signature and extracts message content
4. **Command parser** determines if it's `/search`, `/report`, `/sheet`, `/ai`, or `/help`
5. **AI Pipeline** gathers chat history, optionally queries Base/Sheets for context
6. **OpenRouter** processes the prompt and returns an AI response
7. **Server sends reply** via lark-cli IM back to the user
