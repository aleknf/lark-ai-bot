# Quick Reference — Lark AI Bot

## Natural Language Examples

### 📅 Calendar

```
✅ What's on my agenda today?
✅ Show my schedule this week
✅ Do I have meetings tomorrow?
✅ When is my next meeting?
✅ Apa jadwal saya hari ini? (Indonesian)
```

### ✅ Tasks

```
✅ List my tasks
✅ Show what's due soon
✅ What tasks do I have?
✅ Tunjukkan tugas saya (Indonesian)
```

### 👥 Contacts

```
✅ Find user John Smith
✅ Search for Alice
✅ Who is Bob Johnson?
✅ Cari pengguna John (Indonesian)
```

### ✔️ Approvals

```
✅ Show pending approvals
✅ List approval requests
✅ What approvals am I waiting on?
```

### 🎯 OKRs

```
✅ Show my OKRs
✅ What are my objectives?
✅ Display team OKRs
```

### 📁 Drive & Files

```
✅ Search for Q4 report
✅ Find files about project X
✅ Show recent uploads
```

### ⏰ Attendance

```
✅ Check my attendance this month
✅ Show attendance records
```

### 📝 Meeting Minutes

```
✅ Get recent meeting minutes
✅ Show notes from yesterday's meeting
```

### 🎥 Video Conference

```
✅ List recent meetings
✅ Show VC recordings
```

### 📊 Whiteboard

```
✅ Create a new board
✅ Show whiteboard content
```

### 📚 Wiki

```
✅ Search wiki for project docs
✅ Find wiki page about onboarding
```

### 🔔 Multi-Domain

```
✅ Show my tasks and meetings for today
✅ List pending approvals and my OKRs
✅ What's on my calendar tomorrow and what tasks are due?
```

## Structured Commands

```
/help          — Show all features and help
/search <q>    — Search Lark Base records
/sheet <range> — Query Lark Sheets (e.g., A1:D10)
/report [topic]— Generate AI report and save to Docs
/weekly        — Generate weekly activity report
/ai <prompt>   — Ask general AI questions
```

## Command Patterns

### Date References

| Say This | Bot Understands |
|----------|-----------------|
| today | Current day 00:00 - 23:59 |
| tomorrow | Next day 00:00 - 23:59 |
| this week | Monday 00:00 - Sunday 23:59 |
| next week | Following Monday - Sunday |
| hari ini | Today (Indonesian) |
| besok | Tomorrow (Indonesian) |
| minggu ini | This week (Indonesian) |

### Action Verbs

| Verb | Meaning | Example |
|------|---------|---------|
| show, display | View data | "Show my calendar" |
| list, get | Retrieve items | "List my tasks" |
| find, search | Look up | "Find user Alice" |
| create, make | Add new | "Create a task" |
| update, change | Modify | "Update event" |

### Entity Types

| Type | Keywords | Example |
|------|----------|---------|
| Calendar | agenda, schedule, meetings, calendar | "Show my agenda" |
| Tasks | tasks, to-do, todos | "List my tasks" |
| Users | user, person, contact | "Find user John" |
| Files | file, document, upload | "Search files" |
| Approvals | approval, request | "Pending approvals" |
| OKRs | okr, objective, goal | "Show my OKRs" |

## Response Formats

### Calendar
```
📅 Today's Calendar:
  • 10:00 — Team Standup
  • 14:00 — Client Demo
  • 16:00 — 1-on-1 with Manager
```

### Tasks
```
✅ Your Tasks:
  ⏳ Complete Q2 report — Due: Jun 25
  ✅ Submit timesheet — Completed
  ⚠️ Review code PR #123 — OVERDUE
```

### Contacts
```
🔍 Found 2 users matching "John":
  • John Smith (john@company.com) — Engineering
  • Johnny Doe (johnny@company.com) — Sales
```

### Approvals
```
✔️ Pending Approvals (3):
  • Budget Request Q2 — Waiting 3 days
  • Vacation Request — Waiting 1 day
  • Purchase Order #1234 — Waiting 5 hours
```

## Tips & Tricks

### 1. Be Natural
Just ask like you would ask a colleague:
```
❌ calendar +agenda --start 2024-06-19
✅ What's on my calendar today?
```

### 2. Combine Requests
Ask for multiple things at once:
```
✅ Show my tasks and meetings for tomorrow
✅ List pending approvals and my OKRs
```

### 3. Use Mentions
Always mention the bot:
```
@Bot What's on my agenda?
```

### 4. Try Both Languages
Works in English and Indonesian:
```
✅ Show my tasks (English)
✅ Tunjukkan tugas saya (Indonesian)
```

### 5. Use Structured Commands for Speed
When you know the exact command:
```
/help    — Instant response
/search  — Direct Base search
```

### 6. Check Permissions
If you get permission errors:
```
Run: lark-cli auth login --scope <domain>
```

## Common Scenarios

### Morning Check-In
```
@Bot What's on my agenda today?
@Bot Show my tasks
```

### Planning Tomorrow
```
@Bot Show my calendar and tasks for tomorrow
```

### Finding People
```
@Bot Find user Alice Smith
@Bot Who is in the engineering team?
```

### Checking Status
```
@Bot What approvals are pending?
@Bot Show my OKRs progress
```

### Weekly Review
```
@Bot /weekly
# Generates comprehensive weekly report
```

## Troubleshooting

### Bot Not Responding
1. Check if bot is mentioned: `@Bot`
2. Verify bot is in the chat/group
3. Check webhook is configured

### Permission Errors
```
@Bot Show my calendar
Response: 🔐 Permission Required...

Solution:
lark-cli auth login --scope calendar:calendar
```

### Slow Responses
- Simple queries (calendar, tasks): ~500ms
- AI-routed queries: ~2s
- Complex multi-domain: ~3s

### No Results
```
@Bot List my tasks
Response: ✅ Your Tasks: All clear!

= You have no pending tasks
```

## Keyboard Shortcuts

In Lark desktop/mobile app:
- `@` + Start typing bot name → Mention bot
- `Cmd/Ctrl + Enter` → Send message

## Best Practices

### ✅ DO
- Mention the bot: `@Bot`
- Be specific: "Show calendar for tomorrow"
- Use natural language
- Combine related requests

### ❌ DON'T
- Don't use lark-cli syntax in chat
- Don't expect instant responses (<1s)
- Don't send multiple rapid messages
- Don't forget to mention the bot

## Privacy & Security

- Bot only accesses data you've authorized
- Uses your Lark account permissions
- No data stored on bot server
- All operations are logged for audit

## Getting Help

```
@Bot /help
# Shows full feature list and examples
```

Or ask naturally:
```
@Bot What can you do?
@Bot How do I use you?
```

## Feature Availability

Check which features you have access to:
```
lark-cli doctor
# Shows configured domains and auth status
```

---

**Pro Tip**: Bookmark this page for quick reference! 🔖
