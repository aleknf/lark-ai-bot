# AI Router Guide — How the Bot Uses All Lark CLI Features

## Overview

The Lark AI Bot uses an intelligent routing system to understand natural language requests and map them to the appropriate Lark CLI commands. This enables users to interact with all Lark features conversationally.

## Architecture

```
User Message
    ↓
[Command Parser] → Structured commands (/help, /search, etc.)
    ↓
[Common Query Handler] → Fast path for frequent queries
    ↓
[AI Router] → Analyzes intent, selects lark-cli commands
    ↓
[Lark CLI Executor] → Runs subprocess with arguments
    ↓
[Response Formatter] → AI formats raw data for user
    ↓
Reply to User
```

## Three-Tier Routing Strategy

### Tier 1: Structured Commands (Fastest)

Explicit commands are parsed directly without AI inference:

```
/help       → getHelpResponse()
/search     → handleSearch()
/sheet      → handleSheetQuery()
/report     → handleReport()
/weekly     → handleWeeklyReport()
/ai         → handleAI()
```

### Tier 2: Common Query Handler (Fast)

Optimized handlers for frequent queries using pattern matching:

```typescript
// Calendar queries
"What's on my agenda today?" → handleCalendarQuery()
"Show my schedule this week" → handleCalendarQuery()

// Task queries  
"List my tasks" → handleTaskQuery()
"Show what's due" → handleTaskQuery()

// Contact search
"Find user John" → handleContactSearch("John")
```

**Benefits:**
- Sub-second response time
- No LLM call needed
- Predictable behavior

### Tier 3: AI-Powered Router (Flexible)

For complex or ambiguous requests, the AI router:

1. **Analyzes the intent** using OpenRouter LLM
2. **Selects appropriate lark-cli commands** with parameters
3. **Executes commands** sequentially
4. **Formats results** using AI for readability

**Example Flow:**

```
User: "Show me pending approvals and my OKRs for this quarter"

AI Router Output:
{
  "commands": [
    {
      "domain": "approval",
      "args": ["+list", "--status", "pending"],
      "as": "user"
    },
    {
      "domain": "okr",
      "args": ["+list"],
      "as": "user"
    }
  ],
  "explanation": "Fetching pending approvals and OKR list"
}

Execute both commands → Format results → Return to user
```

## Supported Lark Domains

All lark-cli domains are available:

| Domain | Shortcuts | Common Use Cases |
|--------|-----------|------------------|
| `calendar` | `+agenda`, `+create`, `+update`, `+freebusy` | Schedule queries, event management |
| `task` | `+get-my-tasks`, `+create`, `+update` | To-do lists, task tracking |
| `contact` | `+search-user`, `+get-user` | Finding people, org structure |
| `drive` | `+search`, `+upload`, `+download` | File management |
| `mail` | `+list`, `+send`, `+draft` | Email operations |
| `approval` | `+list`, `+approve`, `+reject` | Approval workflows |
| `base` | `+record-list`, `+record-search`, `+data-query` | Database operations |
| `sheets` | `+range-read`, `+range-write` | Spreadsheet data |
| `docs` | `+create`, `+update` | Document creation |
| `okr` | `+list`, `+get` | Goal tracking |
| `attendance` | `+query` | Attendance records |
| `minutes` | `+list`, `+get` | Meeting notes |
| `vc` | `+meeting-list`, `+recording-download` | Video conference |
| `whiteboard` | `+create`, `+get` | Collaborative boards |
| `wiki` | `+search`, `+create-space` | Knowledge base |
| `markdown` | `+create`, `+fetch`, `+overwrite` | Markdown files |
| `event` | `consume` | Real-time events |

## AI Router Prompt Engineering

The router uses a specialized system prompt that:

1. **Lists all available domains and common shortcuts**
2. **Provides context** (current date, user timezone)
3. **Requests structured JSON output**
4. **Handles edge cases** (non-Lark queries return empty commands)

### Key Prompt Elements

```typescript
const systemPrompt = `You are a Lark CLI command router.

Available domains: ${LARK_DOMAINS.join(", ")}

Common commands by domain:
- calendar: +agenda, +create, +update, +freebusy
- task: +get-my-tasks, +create, +update
...

Respond with ONLY JSON:
{
  "commands": [
    { "domain": "calendar", "args": [...], "as": "user" }
  ],
  "explanation": "Brief description"
}

Context:
- Today is ${new Date().toISOString().split("T")[0]}
- Use ISO 8601 datetime format with timezone
`;
```

## Date/Time Handling

The router intelligently parses relative time references:

```typescript
"today" → 2024-06-19T00:00:00+08:00 to 2024-06-19T23:59:59+08:00
"tomorrow" → 2024-06-20T00:00:00+08:00 to 2024-06-20T23:59:59+08:00
"this week" → Monday 00:00 to Sunday 23:59
```

Timezone is detected from system and properly formatted for lark-cli.

## Response Formatting

After executing lark-cli commands, raw JSON is formatted by AI:

```
Input (raw lark-cli output):
{
  "data": {
    "items": [
      { "summary": "Team Standup", "start_time": {...} }
    ]
  }
}

Output (user-friendly):
📅 Today's Calendar:
  • 10:00 — Team Standup
  • 14:00 — Client Demo
```

Formatting AI is instructed to:
- Use emojis appropriately
- Format dates/times in readable format
- Use bullet points and structure
- Be concise yet informative

## Multi-Language Support

The router handles both English and Indonesian:

```
"What's on my agenda?" → calendar +agenda
"Apa jadwal saya hari ini?" → calendar +agenda

"List my tasks" → task +get-my-tasks
"Tunjukkan tugas saya" → task +get-my-tasks
```

Pattern matching in `handleCommonQuery()` supports both languages.

## Error Handling

### Permission Errors

When lark-cli returns permission errors, the system:
1. Catches `PermissionDeniedError`
2. Initiates OAuth flow if possible
3. Provides user-friendly error message with instructions

### Command Failures

If a lark-cli command fails:
1. Error is logged with context
2. User receives explanation of what went wrong
3. Suggestion for how to fix (if applicable)

### Fallback Strategy

```
Try common query handler
  ↓ (if no match)
Try AI router
  ↓ (if not Lark-related)
Fall back to general AI chat
```

## Adding New Domains

To add support for a new Lark CLI domain:

1. **Add to domain list** in `lark-cli.ts`:
   ```typescript
   export const LARK_DOMAINS = [..., "new-domain"] as const;
   ```

2. **Update AI router prompt** with common shortcuts:
   ```typescript
   - new-domain: +list (list items), +get (get details)
   ```

3. **(Optional) Add optimized handler** for common queries:
   ```typescript
   async function handleNewDomainQuery(query: string): Promise<string> {
     const result = await execLarkCommand("new-domain", ["+list"]);
     return formatResults(result);
   }
   ```

4. **Update help message** in `pipeline.ts`

## Performance Considerations

| Routing Tier | Latency | Use Case |
|-------------|---------|----------|
| Structured Command | ~0ms | Known patterns |
| Common Query | ~100-500ms | Frequent queries |
| AI Router | ~1-3s | Complex/ambiguous |

**Optimization Tips:**
- Add frequently-asked queries to common handler
- Cache lark-cli results for repeated queries (future enhancement)
- Use `--as bot` for read operations (faster, no user auth needed)

## Testing

### Manual Testing

```bash
# Test calendar query
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{"event": {"message": {"text": "Show my agenda today"}}}'

# Test task query
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{"event": {"message": {"text": "List my tasks"}}}'
```

### Test Cases

1. **Date parsing**: "What's happening tomorrow?"
2. **Multi-domain**: "Show my tasks and calendar for today"
3. **Contact search**: "Find user Alice"
4. **Non-Lark query**: "What's the weather?" (should use general AI)
5. **Indonesian**: "Tampilkan jadwal saya minggu ini"

## Future Enhancements

- [ ] Caching layer for frequently-accessed data
- [ ] Batch command optimization
- [ ] User preference learning (e.g., preferred date format)
- [ ] Proactive notifications (reminders, upcoming events)
- [ ] Cross-domain data correlation (tasks + calendar smart suggestions)
- [ ] Voice command support
- [ ] Rich card/interactive message responses

## Debugging

Enable debug logging:

```env
LOG_LEVEL=debug
```

Check logs for:
- AI router decisions: `AI Lark router: determined commands`
- lark-cli execution: `Executing lark-cli: domain=X args=[...]`
- Response formatting: `Formatting lark-cli results for user`

## Best Practices

1. **Always use ISO 8601 datetime** format for calendar/time operations
2. **Specify `--as user` or `--as bot`** explicitly (don't rely on defaults)
3. **Handle permission errors gracefully** with OAuth flow
4. **Format responses for readability** (emojis, structure, concise)
5. **Log all lark-cli executions** for debugging and auditing
6. **Test edge cases** (empty results, errors, timeouts)

## Related Documentation

- [Lark CLI Documentation](https://github.com/larksuite/cli)
- [Lark Open Platform API](https://open.feishu.cn/document/)
- [OpenRouter API](https://openrouter.ai/docs)
