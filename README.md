# 🤖 Lark AI Bot Server

A full-featured **Node.js/TypeScript** bot server that connects **OpenRouter AI** with **Lark/Feishu** for intelligent messaging, data operations, and comprehensive access to **all Lark CLI features**.

## Architecture

```
Lark User Message → Webhook → Your Server → AI Router → OpenRouter → Reply
                                    ↕                        ↓
                              lark-cli subprocess    Intelligent Command Selection
                           (All Lark CLI Domains)
```

## Features

### 🎯 AI-Powered Natural Language Interface

The bot uses AI to intelligently route your natural language requests to the appropriate Lark CLI commands. Just ask naturally!

**Examples:**
- "What's on my calendar today?"
- "Show me my tasks"
- "Find user John Smith"
- "List my pending approvals"
- "Check my attendance this month"
- "Show recent meeting minutes"
- "What are my OKRs?"

### 📋 Structured Commands

| Feature | Description |
|---------|-------------|
| 💬 **IM Chat** | Reply to messages, thread support, mention detection |
| 🔍 **Base Search** | `/search <query>` — search records in Lark Base |
| 📊 **Sheet Query** | `/sheet <query>` — read data from Lark Sheets |
| 📄 **Doc Reports** | `/report [topic]` — generate AI reports saved to Lark Docs |
| 🧠 **AI Chat** | `/ai <prompt>` or just mention the bot — OpenRouter-powered |
| 📅 **Weekly Report** | `/weekly` — comprehensive activity report (calendar + tasks) |

### 🚀 Full Lark CLI Integration

The bot has access to **all Lark CLI features**, including:

| Domain | Capabilities |
|--------|-------------|
| 📅 **Calendar** | View agenda, create/update events, check availability, manage attendees |
| ✅ **Tasks** | List tasks, create tasks, update status, manage subtasks |
| 👥 **Contact** | Search users, get user details, department info |
| 📁 **Drive** | Search files, upload/download, manage permissions, comments |
| 📧 **Mail** | List emails, send/reply, manage drafts, folders, labels |
| ✔️ **Approval** | List approvals, approve/reject, view approval history |
| 📊 **Base** | CRUD operations, search, data queries, views, forms |
| 📈 **Sheets** | Read/write cells, range operations, formulas |
| 📝 **Docs** | Create/update documents, content management |
| 🎯 **OKR** | View objectives, key results, alignments, progress |
| ⏰ **Attendance** | Query attendance records, check-in history |
| 📝 **Minutes** | Fetch meeting minutes, content retrieval |
| 🎥 **VC** | List meetings, download recordings, meeting info |
| 📊 **Whiteboard** | Create/edit boards, view content |
| 📚 **Wiki** | Search wiki, create spaces, manage nodes |
| 📄 **Markdown** | Create/read/update markdown files |
| 🔔 **Events** | Real-time event streaming and consumption |

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

### Structured Commands

| Command | Action |
|---------|--------|
| `@Bot /help` | Show all available features |
| `@Bot /search sales Q2` | Search Base records |
| `@Bot /sheet A1:D20` | Read Sheet range |
| `@Bot /report weekly summary` | Generate AI report → Lark Doc |
| `@Bot /weekly` | Generate weekly activity report |
| `@Bot /ai explain quantum computing` | Ask the AI anything |

### Natural Language Queries

Just mention the bot and ask naturally! The AI will understand and execute the appropriate Lark CLI commands.

**Calendar & Schedule:**
- "What's on my agenda today?"
- "Show my meetings this week"
- "Do I have any meetings tomorrow?"
- "When is my next meeting?"

**Tasks & To-Dos:**
- "List my tasks"
- "Show me what's due soon"
- "What tasks do I have?"
- "Create a new task"

**Contacts & People:**
- "Find user John Smith"
- "Search for Alice in engineering"
- "Who is [person name]?"

**Approvals:**
- "Show my pending approvals"
- "List approval requests"
- "What approvals are waiting for me?"

**Files & Drive:**
- "Search for Q4 report"
- "Find files about project X"

**OKRs & Goals:**
- "Show my OKRs"
- "What are my current objectives?"

**Attendance:**
- "Check my attendance this month"
- "Show attendance records"

**Meeting Minutes:**
- "Get recent meeting minutes"
- "Show notes from last meeting"

**And many more!** The AI intelligently maps your request to the right Lark features.

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
│   ├── lark-cli.ts           # lark-cli subprocess wrapper (all domains)
│   ├── ai-lark-router.ts     # AI-powered command router
│   ├── openrouter.ts         # OpenRouter API client
│   ├── im.ts                 # IM operations (send, reply, history)
│   ├── base.ts               # Base operations (CRUD, search, data-query)
│   ├── sheets.ts             # Sheet operations (range read/write)
│   ├── docs.ts               # Docs operations (create, append)
│   └── report.ts             # Report generation (weekly summaries)
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

### Natural Language Processing Flow

1. **User sends message** to the bot in Lark (DM or group chat with @mention)
2. **Lark sends webhook** to `POST /webhook` with the message event
3. **Server verifies** the signature and extracts message content
4. **Command parser** checks for structured commands (`/search`, `/report`, etc.)
5. **AI Router** analyzes the request and determines:
   - Is this a common optimized query? (calendar, tasks, contacts) → Fast path
   - Is this a Lark-related request? → Route to appropriate lark-cli domain
   - Is this a general question? → Use OpenRouter for general AI response
6. **Lark CLI execution** — Commands are executed via subprocess
7. **Response formatting** — AI formats the raw data into user-friendly output
8. **Server sends reply** via lark-cli IM back to the user

### Example: "What's on my calendar today?"

```
User Message → AI Router analyzes intent
            ↓
AI identifies: Calendar query, today's date
            ↓
Executes: lark-cli calendar +agenda --start "2024-06-19T00:00:00+08:00" --end "2024-06-19T23:59:59+08:00"
            ↓
Formats results with emojis and timestamps
            ↓
Returns: "📅 Today's Calendar: • 10:00 — Team Standup • 14:00 — Client Demo"
```

### Intelligent Command Selection

The AI router understands context and can:
- Parse date references ("today", "this week", "tomorrow")
- Identify entity types (users, files, tasks)
- Chain multiple operations
- Handle Indonesian and English queries
- Provide fallback to general AI for non-Lark questions
