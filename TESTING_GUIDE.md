# Phase 2 Testing Guide

## Setup Prerequisites

### 1. GitHub Authentication
```bash
# Ensure GitHub CLI is installed and authenticated
gh auth status
# Should show: Logged in to github.com
```

### 2. AI Service Available
Choose one of:
- **Ollama** (local):
  ```bash
  # Install Ollama and ensure service is running
  ollama serve
  # Then in VS Code settings, configure:
  persistentContext.aiProvider: "ollama"
  persistentContext.ollamaEndpoint: "http://localhost:11434"
  persistentContext.ollamaModel: "mistral"  # or your preferred model
  ```
  
- **GitHub Models** (via VS Code):
  ```bash
  # Configure in VS Code settings:
  persistentContext.aiProvider: "github-models"
  persistentContext.githubModelsToken: "your_github_token"
  ```

### 3. Test Repository
Create a simple test repo:
```bash
mkdir ~/test-repo && cd ~/test-repo
git init
git add . && git commit -m "Initial commit" || true
# Push to GitHub if testing with real GitHub integration
```

## Test Scenarios

### Test 1: Single Iteration with Output Channel

**Objective:** Verify output channel shows real-time progress

**Steps:**
1. Open VS Code with workspace set to test repository
2. Run command: `Ctrl+Shift+P` → `Persistent Context: Start Continuous Loop`
3. Enter prompt: `"Add a README.md file with project description"`
4. Enter max iterations: `1`
5. Watch output panel for progress

**Expected Output:**
```
✓ Created branch: feature/20250114-abc123
✓ Captured workspace snapshot
✓ Built enhanced prompt
✓ Got response from AI service
✓ Created commit: Add README.md with project description
✓ Pushed branch to origin
✓ Created PR #1
✓ Waiting for checks...
✓ All checks passed
✓ Merged PR #1

Summary:
- Iterations: 1
- Total cost: $0.05
- Elapsed time: 2m 15s
```

**Verify:**
- [ ] Output panel opened automatically
- [ ] Real-time progress messages appeared
- [ ] Loop completed without errors
- [ ] Branch was created in git
- [ ] Commit was made

---

### Test 2: Context Persistence Across Iterations

**Objective:** Verify previous iteration notes are injected into next iteration

**Steps:**
1. Create test file `src/example.ts`:
   ```typescript
   export function example() {
     return "hello";
   }
   ```
2. Run continuous loop with prompt: `"Add type annotations to all functions"`
3. Enter max iterations: `2`
4. Observe output and completion

**Expected Behavior:**
- Iteration 1: Adds type annotations
- Iteration 2: Recognizes work from iteration 1, makes additional improvements
- SHARED_TASK_NOTES.md created with both iteration summaries

**Verify:**
- [ ] Loop ran 2 iterations
- [ ] SHARED_TASK_NOTES.md exists in ~/.vscode-persistent-context/<workspace>/
- [ ] Notes contain summaries from both iterations
- [ ] Second iteration references first iteration's work

---

### Test 3: GitHub PR Lifecycle

**Objective:** Verify PR creation, check polling, and merge

**Steps:**
1. Run with real GitHub repository (must be pushed to GitHub)
2. Ensure GitHub CLI is authenticated
3. Start loop with `max_iterations=1`
4. Watch output for PR lifecycle

**Expected Progress:**
```
✓ Creating PR on GitHub...
✓ Created PR #<number>
✓ Waiting for checks (polling every 10 seconds)...
  Checks pending: 2, success: 0, failed: 0
  Checks pending: 1, success: 1, failed: 0
  Checks pending: 0, success: 2, failed: 0
✓ All checks passed!
✓ Merging PR...
✓ Merged PR #<number>
```

**Verify:**
- [ ] PR created on GitHub
- [ ] Branch pushed to remote
- [ ] Checks were polled
- [ ] PR merged successfully
- [ ] Branch cleaned up after merge

---

### Test 4: AI Service Integration

**Objective:** Verify AI prompt injection and response parsing

**Steps:**
1. Create a code file with intentional issues:
   ```typescript
   // Missing error handling
   function processData(data) {
     return data.map(x => x * 2);
   }
   ```
2. Run loop with prompt: `"Add error handling and type safety"`
3. Check AI response parsing

**Expected Behavior:**
- AI receives:
  - Previous iteration notes (first iteration: empty)
  - Current workspace state
  - Recent git commits
  - Deployment context
  - Task prompt with clear instructions
- AI generates response with:
  - Code changes
  - Commit message
  - Completion signal (true/false)

**Verify:**
- [ ] AI-generated commit message matches actual changes
- [ ] Response format parsed correctly
- [ ] No "500 error" or parsing failures in output
- [ ] Loop continues or stops based on completion signal

---

### Test 5: Error Recovery

**Objective:** Verify loop handles errors gracefully

**Test Case A: Missing GitHub Token**
1. Set invalid GitHub token
2. Start loop
3. Should fail at PR creation with clear error message

**Expected Output:**
```
Error creating PR: gh: not authenticated
Closing iteration without merge...
```

**Verify:**
- [ ] Error message is clear
- [ ] Loop doesn't crash
- [ ] No partial state left behind

**Test Case B: AI Service Unavailable**
1. Stop Ollama (if using local)
2. Start loop
3. Should fail at AI service call

**Expected Output:**
```
Error calling AI service: Connection refused
Cannot continue without AI service
```

**Verify:**
- [ ] Graceful failure message
- [ ] Loop stops cleanly
- [ ] No hanging processes

---

### Test 6: Context Injection Verification

**Objective:** Verify all context types are properly injected

**Steps:**
1. Before starting loop:
   - Add chat note: `persistent-context.addNote`
   - Create a git commit in the test repo
   - Modify some files (without committing)

2. Start loop with prompt: `"Verify context is available"`

3. Check the generated AI prompt in console

**Expected Prompt Structure:**
```
[Previous Iteration Notes]
(empty on first iteration)

[Workspace State]
- Project: test-repo
- Language: TypeScript
- Branch: main
- Modified files: 2

[Recent Git Activity]
- <hash>: Initial commit
- <hash>: Previous feature branch

[Recent Chat Context]
- <previous notes added via UI>

[Deployment Context]
- Environment: Development
- Location: local

[Task Instructions]
<your prompt here>
```

**Verify:**
- [ ] All context types present
- [ ] Proper formatting for AI parsing
- [ ] Recent chat context included
- [ ] Workspace state accurate

---

## Logging Verification

### Console Output
```bash
# In terminal where VS Code is running:
# Should see progress messages like:
# [persistent-context] Starting continuous loop
# [continuous-loop] Iteration 1: Creating branch...
# [continuous-loop] PR created: #123
```

### Output Channel
- Open VS Code Output panel (`Ctrl+Shift+U`)
- Select "Continuous Loop" from dropdown
- Should show real-time progress messages

### SHARED_TASK_NOTES.md
```bash
cat ~/.vscode-persistent-context/$(ls ~/.vscode-persistent-context | head -1)/SHARED_TASK_NOTES.md
```

Should contain:
```
# Task Progress: Add README.md with project description

## Iteration 1 (2025-01-14 10:30 UTC)

### Task
Add README.md with project description

### AI Response
Generated: README.md with project overview

### Changes Made
- Created README.md
- Added project description

### Completion Status
Complete: false (continue iterating)

---
```

---

## Performance Benchmarks

### Expected Timings (with Ollama local)
- Single iteration: 1-3 minutes
  - Snapshot: 5-10 seconds
  - AI processing: 30-90 seconds
  - Git/PR operations: 20-40 seconds

### Expected Timings (with GitHub Models)
- Single iteration: 2-5 minutes
  - API calls slower than local Ollama
  - PR checks: 30-120 seconds

---

## Troubleshooting

### "gh: not authenticated"
```bash
gh auth login
gh auth status  # verify
```

### "Connection refused" to Ollama
```bash
# Check if Ollama is running
ollama serve &
# Or restart: killall ollama && ollama serve
```

### Loop hangs on PR checks
- Increase timeout in continuousLoop.ts: `maxWaitSeconds: 30 * 60`
- Or manually merge PR in GitHub and continue

### SHARED_TASK_NOTES.md not created
- Check storage directory: `~/.vscode-persistent-context/`
- Ensure write permissions: `chmod 755 ~/.vscode-persistent-context/`

### AI response not parsed
- Check console for parse errors
- Verify AI is returning text (not error)
- Check response format matches expected structure

---

## Success Criteria Checklist

✅ **Phase 2 Testing Complete When:**

- [ ] Single iteration completes without errors
- [ ] Output channel shows real-time progress
- [ ] SHARED_TASK_NOTES.md created with iteration notes
- [ ] Multi-iteration loop shows context injection
- [ ] GitHub PR lifecycle works (create → check → merge)
- [ ] Error scenarios handled gracefully
- [ ] All context types present in AI prompts
- [ ] Loop respects max iterations limit
- [ ] Cost tracking displayed at end
- [ ] No TypeScript errors on next compile
- [ ] All 6 tests still passing

---

## Next: Phase 3 (After Phase 2 Testing)

Once Phase 2 testing is complete and verified:

1. **Parallel Worktree Execution** - Run multiple iterations simultaneously
2. **Completion Detection** - Auto-stop loop when AI signals task complete
3. **Loop Abort UI** - Add stop button during execution
4. **Cost Tracking** - Real cost estimates per provider
5. **Advanced Context** - Code snippets, error logs, test coverage

See: [CONTINUOUS_LOOP_ROADMAP.md](./CONTINUOUS_LOOP_ROADMAP.md) for full Phase 3 details
