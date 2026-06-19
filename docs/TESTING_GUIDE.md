# Testing Guide — Lark AI Bot

## Quick Start Testing

### 1. Build and Run

```bash
# Install dependencies
npm install

# Build
npm run build

# Start development server
npm run dev
```

Server will start on `http://localhost:3000`

### 2. Test with Lark

In your Lark app, mention the bot with test queries:

```
@Bot What's on my calendar today?
@Bot List my tasks
@Bot Find user John
@Bot Show pending approvals
```

## Manual Testing with cURL

### Basic Health Check

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-06-19T...",
  "version": "1.0.0"
}
```

### Simulate Webhook Event

```bash
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -H "X-Lark-Request-Timestamp: $(date +%s)" \
  -H "X-Lark-Request-Nonce: test123" \
  -H "X-Lark-Signature: dummy" \
  -d '{
    "schema": "2.0",
    "header": {
      "event_type": "im.message.receive_v1"
    },
    "event": {
      "message": {
        "message_id": "test_msg_123",
        "chat_id": "test_chat_123",
        "chat_type": "p2p",
        "message_type": "text",
        "content": "{\"text\":\"What is on my calendar today?\"}"
      },
      "sender": {
        "sender_id": {
          "open_id": "ou_test_user"
        }
      }
    }
  }'
```

## Test Cases by Feature

### 1. Calendar Queries

**Today's Agenda:**
```
@Bot What's on my agenda today?
@Bot Show my schedule today
@Bot Apa jadwal saya hari ini?
```

**This Week:**
```
@Bot Show my meetings this week
@Bot What's on my calendar this week?
```

**Tomorrow:**
```
@Bot Do I have meetings tomorrow?
@Bot What's happening tomorrow?
```

**Expected Response Format:**
```
📅 Today's Calendar:
  • 10:00 — Team Standup
  • 14:00 — Client Demo
  • 16:00 — 1-on-1 with Manager
```

### 2. Task Queries

**List Tasks:**
```
@Bot List my tasks
@Bot Show my to-do list
@Bot What tasks do I have?
@Bot Tunjukkan tugas saya
```

**Expected Response Format:**
```
✅ Your Tasks:
  ⏳ Complete Q2 report — Due: Jun 25
  ✅ Submit timesheet — Completed
  ⚠️ Review code PR #123 — OVERDUE
```

### 3. Contact Search

**Find User:**
```
@Bot Find user John Smith
@Bot Search for Alice
@Bot Who is Bob Johnson?
```

**Expected Response Format:**
```
🔍 Found 2 users matching "John Smith":
  • John Smith (john.smith@company.com) — Engineering
  • Johnny Smith (johnny@company.com) — Sales
```

### 4. Approval Queries

**Pending Approvals:**
```
@Bot Show pending approvals
@Bot What approvals am I waiting on?
@Bot List approval requests
```

**Expected Response Format:**
```
✔️ Pending Approvals (3):
  • Budget Request Q2 — Waiting 3 days
  • Vacation Request — Waiting 1 day
  • Purchase Order #1234 — Waiting 5 hours
```

### 5. OKR Queries

**My OKRs:**
```
@Bot Show my OKRs
@Bot What are my objectives?
@Bot Display team OKRs
```

**Expected Response Format:**
```
🎯 Your OKRs:
  Objective: Improve product quality
    • KR1: Reduce bugs by 30% — 60% complete
    • KR2: Increase test coverage to 80% — 45% complete
```

### 6. Drive/File Queries

**Search Files:**
```
@Bot Search for Q4 report
@Bot Find files about project X
@Bot Show recent uploads
```

### 7. Attendance Queries

**Check Attendance:**
```
@Bot Check my attendance this month
@Bot Show attendance records
```

### 8. Meeting Minutes

**Get Minutes:**
```
@Bot Get recent meeting minutes
@Bot Show notes from yesterday's meeting
```

### 9. Multi-Domain Queries

**Combined:**
```
@Bot Show my tasks and meetings for today
@Bot List pending approvals and my OKRs
@Bot What's on my calendar tomorrow and what tasks are due?
```

**Expected Response Format:**
```
📅 Tomorrow's Calendar:
  • 09:00 — Team Standup
  • 14:00 — Design Review

✅ Tasks Due Tomorrow:
  ⏳ Complete wireframes
  ⏳ Review documentation
```

### 10. Structured Commands

**Help:**
```
@Bot /help
```

**Search Base:**
```
@Bot /search customer Q2
```

**Sheet Query:**
```
@Bot /sheet A1:D10
```

**Generate Report:**
```
@Bot /report Weekly Sales Summary
```

**Weekly Report:**
```
@Bot /weekly
```

**AI Query:**
```
@Bot /ai Explain quantum computing
```

### 11. Edge Cases

**Non-Lark Query (should fallback to general AI):**
```
@Bot What's the weather today?
@Bot Explain quantum physics
@Bot Tell me a joke
```

**Invalid Date:**
```
@Bot Show my calendar for yesterday
@Bot What was on my schedule last year?
```

**Empty Results:**
```
@Bot Show my tasks
# (when user has no tasks)
Expected: "✅ Your Tasks: All clear! No pending tasks."
```

**Permission Denied:**
```
@Bot Show my OKRs
# (if user hasn't authorized OKR scope)
Expected: "🔐 Permission Required — The bot needs access to..."
```

## Automated Testing Script

Create `test-bot.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:3000"

echo "🧪 Testing Lark AI Bot"
echo "====================="

# Test 1: Health check
echo "✓ Test 1: Health check"
curl -s $BASE_URL/health | jq .

# Test 2: Calendar query
echo "✓ Test 2: Calendar query"
curl -s -X POST $BASE_URL/webhook \
  -H "Content-Type: application/json" \
  -d '{"event":{"message":{"text":"Show my calendar today","chat_id":"test"}}}' \
  | jq .

# Test 3: Task query
echo "✓ Test 3: Task query"
curl -s -X POST $BASE_URL/webhook \
  -H "Content-Type: application/json" \
  -d '{"event":{"message":{"text":"List my tasks","chat_id":"test"}}}' \
  | jq .

# Test 4: Contact search
echo "✓ Test 4: Contact search"
curl -s -X POST $BASE_URL/webhook \
  -H "Content-Type: application/json" \
  -d '{"event":{"message":{"text":"Find user John","chat_id":"test"}}}' \
  | jq .

echo "====================="
echo "✅ All tests completed"
```

Run with:
```bash
chmod +x test-bot.sh
./test-bot.sh
```

## Performance Testing

### Measure Response Times

```bash
# Calendar query
time curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{"event":{"message":{"text":"Show calendar","chat_id":"test"}}}'

# Task query
time curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{"event":{"message":{"text":"List tasks","chat_id":"test"}}}'
```

### Load Testing with Apache Bench

```bash
# Install Apache Bench
brew install httpd  # macOS

# Run load test (100 requests, 10 concurrent)
ab -n 100 -c 10 -p test-payload.json -T application/json \
  http://localhost:3000/webhook
```

Create `test-payload.json`:
```json
{
  "event": {
    "message": {
      "text": "Show my calendar",
      "chat_id": "test"
    }
  }
}
```

## Debugging

### Enable Debug Logging

In `.env`:
```env
LOG_LEVEL=debug
NODE_ENV=development
```

### Check Logs

```bash
# Follow logs in real-time
npm run dev | grep "lark-cli"
npm run dev | grep "AI Router"
npm run dev | grep "error"
```

### Test lark-cli Directly

```bash
# Test calendar
lark-cli calendar +agenda --start "2024-06-19T00:00:00+08:00" --end "2024-06-19T23:59:59+08:00" --as user

# Test tasks
lark-cli task +get-my-tasks --as user

# Test contact search
lark-cli contact +search-user --query "John" --as user
```

## Common Issues

### Issue: "lark-cli not found"

**Solution:**
```bash
npm install -g @larksuite/cli
# or
which lark-cli  # Check if in PATH
```

### Issue: "Permission denied"

**Solution:**
```bash
lark-cli auth login --scope "calendar:calendar,task:task,contact:contact"
```

### Issue: "OpenRouter API error"

**Check:**
```bash
# Verify API key is set
echo $OPENROUTER_API_KEY

# Test OpenRouter directly
curl https://openrouter.ai/api/v1/auth/key \
  -H "Authorization: Bearer $OPENROUTER_API_KEY"
```

### Issue: Slow responses

**Optimize:**
- Reduce `AI_MAX_CONTEXT_MESSAGES` in `.env`
- Use `--as bot` for read operations
- Add more common query handlers

### Issue: Webhook signature verification fails

**Solution:**
Set `LARK_VERIFICATION_TOKEN` in `.env` or disable verification in development

## Test Coverage Checklist

- [ ] Calendar queries (today, tomorrow, this week)
- [ ] Task queries (list, status)
- [ ] Contact search
- [ ] Approval queries
- [ ] OKR queries
- [ ] Drive/file operations
- [ ] Attendance records
- [ ] Meeting minutes
- [ ] Multi-domain queries
- [ ] Structured commands (/help, /search, etc.)
- [ ] Indonesian language queries
- [ ] Edge cases (empty results, errors)
- [ ] Permission errors
- [ ] Non-Lark queries (fallback)

## Integration Testing

### Test with Real Lark Account

1. **Create test workspace** in Lark
2. **Add test data**:
   - Create 2-3 calendar events
   - Add 2-3 tasks
   - Create test Base with sample data
3. **Test bot in workspace**
4. **Verify responses** match expected format

### Test OAuth Flow

1. Request feature requiring new permission
2. Verify OAuth URL is generated
3. Complete authorization in browser
4. Retry original request
5. Verify success

## Continuous Integration

### GitHub Actions Example

Create `.github/workflows/test.yml`:

```yaml
name: Test Bot

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: npm install
    
    - name: Build
      run: npm run build
    
    - name: Run tests
      run: npm test
      env:
        OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
        LARK_APP_ID: ${{ secrets.LARK_APP_ID }}
        LARK_APP_SECRET: ${{ secrets.LARK_APP_SECRET }}
```

## Reporting Issues

When reporting bugs, include:

1. **Query sent to bot**: Exact text
2. **Expected response**: What you expected
3. **Actual response**: What you got
4. **Logs**: Relevant error messages
5. **Environment**: Node version, lark-cli version
6. **Timestamp**: When the issue occurred

---

**Happy Testing! 🎉**
