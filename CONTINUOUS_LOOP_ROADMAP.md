# Continuous Loop Implementation Roadmap

## ✅ Phase 1: Infrastructure (COMPLETE)

### Created Services

#### `/src/services/prManager.ts` (185 lines)
- ✅ `createPR()` - Creates GitHub PR using `gh` CLI
- ✅ `waitForChecks()` - Polls PR status every 10 seconds
- ✅ `getPRStatus()` - Gets check states (pending/success/failed)
- ✅ `mergePR()` - Merges with configurable strategy
- ✅ `closePR()` - Closes PR if needed

**Key Features:**
- GitHub CLI integration via `execSync()`
- Check polling with 30-minute timeout
- Clear progress logging with emoji indicators
- Error handling and status reporting

#### `/src/services/continuousLoop.ts` (282 lines)
- ✅ `run()` - Main loop executor
- ✅ `executeIteration()` - Single iteration logic
- ✅ `createBranch()` - Creates dated branch with random hash
- ✅ `buildEnhancedPrompt()` - Injects context into prompt
- ✅ `loadPreviousIterationNotes()` - Reads SHARED_TASK_NOTES.md
- ✅ `saveIterationNotes()` - Saves per-iteration summary
- ✅ `shouldContinue()` - Checks termination conditions
- ✅ `printSummary()` - Final statistics

**Key Features:**
- Configurable limits: max runs, duration, cost
- Completion signal detection
- Git branch management
- Cost and time tracking
- Iteration logging

### Updated Files

- ✅ `/src/extension.ts` - Added `startContinuousLoop` command
- ✅ `/package.json` - Added command to contributes

### Test Status
- ✅ All 6 existing tests passing
- ✅ Clean TypeScript compilation
- ✅ Extension packages successfully (37 KB)

---

## 🔄 Phase 2: Full Loop Integration (IN PROGRESS)

### What Needs Implementation

#### 1. Enhanced Prompt Building
Currently: Basic context injection
**TODO:** 
- [ ] Inject activeContext.md contents
- [ ] Include recent chat history (from ChatContextWatcher)
- [ ] Add deployment context info
- [ ] Format as structured Claude Code prompt

#### 2. AI Integration
Currently: Uses AIService.summarize() which expects ContextSnapshot
**TODO:**
- [ ] Modify ContinuousLoop to properly call AIService with SnapShot
- [ ] Extract task-specific prompts (commit messages, summaries)
- [ ] Parse Claude output for cost information
- [ ] Detect completion signals in Claude response

#### 3. Git Operations
Currently: Uses `execSync()` for git commands
**TODO:**
- [ ] Ensure branch is created on correct base (main)
- [ ] Handle git errors gracefully
- [ ] Verify staged changes before commit
- [ ] Handle merge conflicts

#### 4. PR Lifecycle
Currently: PRManager exists but not fully integrated
**TODO:**
- [ ] Full error handling for PR creation
- [ ] Detect PR checks that fail and abort
- [ ] Handle review requirements
- [ ] Cleanup on merge (delete local branch)

#### 5. Context Persistence
Currently: Writes to `.vscode-loop-notes.md` in workspace
**TODO:**
- [ ] Move to proper storage directory (~/.vscode-persistent-context)
- [ ] Create SHARED_TASK_NOTES.md in storage location
- [ ] Append iteration results properly
- [ ] Load context for next iteration prompt injection

#### 6. UI/UX
Currently: Basic input dialogs
**TODO:**
- [ ] Show real-time progress during loop execution
- [ ] Output panel with iteration logs
- [ ] Stop button to pause/abort loop
- [ ] Summary view after completion
- [ ] Error notifications with retry options

---

## 🎯 Phase 3: Testing & Validation

### Local Testing (Ollama)
```bash
# 1. Install/run Ollama locally
ollama serve

# 2. Pull a model
ollama pull neural-chat

# 3. Set extension config
# persistentContext.aiProvider = "ollama"

# 4. Open a real Git repo
# Run "Start Continuous Loop"
# Observe iteration execution
```

### GitHub Integration Testing
```bash
# Prerequisites
gh auth login
git remote add origin <repo>

# Test cases
- [ ] Create PR successfully
- [ ] Wait for GitHub checks
- [ ] Merge PR with squash strategy
- [ ] Verify merged commits on main
- [ ] Handle check failures
- [ ] Handle merge conflicts
```

### Edge Cases
- [ ] No changes detected in iteration (skip PR)
- [ ] PR checks fail (close PR, continue loop)
- [ ] AI returns no summary
- [ ] Cost limit exceeded mid-iteration
- [ ] Duration limit exceeded
- [ ] Maximum iterations reached

---

## 📋 Detailed TODO List

### High Priority
1. [ ] Fix ContinuousLoop to use AIService correctly (pass ContextSnapshot)
2. [ ] Implement context injection from activeContext.md
3. [ ] Create proper SHARED_TASK_NOTES.md in storage directory
4. [ ] Integrate with ChatContextWatcher for chat history
5. [ ] Full error handling and recovery in main loop

### Medium Priority
6. [ ] Add output panel for real-time loop logging
7. [ ] Implement stop/abort button
8. [ ] Add iteration summary view
9. [ ] Test with Ollama locally
10. [ ] GitHub CLI error handling

### Lower Priority
11. [ ] Cost tracking integration
12. [ ] Duration monitoring
13. [ ] Completion signal detection
14. [ ] Parallel worktree support
15. [ ] Self-update checking

---

## 🏗️ Architecture Review

### Data Flow

```
User Triggers "Start Continuous Loop"
  ↓
ContextManager receives request
  ↓
Creates ContinuousLoop instance
  ↓
Loop.run() starts
  ├→ Iteration 1
  │  ├→ createBranch() → git checkout -b continuous-loop/...
  │  ├→ snapshotCollector.collect() → workspace state
  │  ├→ buildEnhancedPrompt() → inject context
  │  ├→ aiService.summarize() → Claude Code execution
  │  ├→ getChangedFiles() → git status --short
  │  ├→ git add -A && git commit
  │  ├→ git push -u origin branch
  │  ├→ prManager.createPR()
  │  ├→ prManager.waitForChecks()
  │  ├→ prManager.mergePR()
  │  ├→ saveIterationNotes()
  │  └→ Check shouldContinue()
  │
  └→ Iteration 2 (if shouldContinue == true)
     ├→ Load previous iteration notes
     ├→ Repeat above
     ...
```

### Service Responsibilities

| Service | Current | Next |
|---------|---------|------|
| **ContextManager** | Session tracking, auto-save | Orchestrate loop |
| **ContinuousLoop** | Loop logic, iteration tracking | Fully integrate with services |
| **PRManager** | GitHub CLI interface | Error handling, status checking |
| **AIService** | Provider abstraction | Cost tracking, output parsing |
| **ContextSnapshotCollector** | Workspace state | Feed to each iteration |
| **ChatContextWatcher** | Capture chat | Inject into loop prompts |
| **FileService** | Read/write files | Store SHARED_TASK_NOTES.md |

---

## 🚀 Quick Start for Next Developer

### To understand current code:
1. Read `src/services/prManager.ts` - GitHub interaction
2. Read `src/services/continuousLoop.ts` - Main loop logic
3. Read `src/services/contextManager.ts` - Overall orchestration
4. Check how AIService.summarize() works with ContextSnapshot

### To implement phase 2:
1. Fix AIService integration in continuousLoop.ts
2. Create tests for a single iteration locally
3. Test with Ollama before GitHub
4. Add error handling for each step
5. Implement output panel UI

### To test:
```bash
npm run compile
npm test
# Manual testing in VS Code:
# - Ctrl+Shift+P → "Start Continuous Loop"
# - Watch for execution
```

---

## 📝 Notes

- **Current Status:** Infrastructure built, basic UI placeholder
- **Next Critical Step:** Fix AIService integration and add proper error handling
- **Testing Strategy:** Start with local Ollama, then GitHub integration
- **Risk Areas:** GitHub API reliability, PR check waiting, merge conflicts
- **Performance:** Loop should complete 1-2 iterations per minute depending on AI/checks

