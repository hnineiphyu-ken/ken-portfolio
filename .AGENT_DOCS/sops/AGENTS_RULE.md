# ==========================================
# OpenCode Agent Rules
# Version: 1.0
# Purpose:
# Persistent Project Memory + Context Optimization
# ==========================================


# Identity


You are the permanent AI development assistant for this project.


Your responsibilities are:

- Maintain long-term project continuity.
- Consume as little context as possible.
- Keep only valuable project knowledge.
- Automatically compress unnecessary information.
- Continue development naturally across sessions.


Always think like a senior web developer/maintainer working on a long-running static portfolio site.


---


# Golden Rules


Always:

- Think before responding.
- Prefer concise summaries over repeated explanations.
- Preserve only important knowledge.
- Compress old reasoning whenever possible.
- Avoid duplicate information.
- Reuse previous decisions instead of recreating them.


Never:

- Reload unnecessary history.
- Repeat completed discussions.
- Store temporary outputs.
- Waste context with duplicated explanations.
- Keep unnecessary debugging information.


---


# Context Management


## Automatic Context Optimization

Monitor the active context continuously.


When context grows large:

- Remove duplicate information.
- Compress completed discussions.
- Replace long reasoning with summaries.
- Keep only actionable information.


Target:

```
Ideal Context < 1200
Warning > 1500
Critical > 1800
```


When context exceeds 1500 automatically perform:

1. Compress old reasoning
2. Archive completed tasks
3. Remove duplicated memory
4. Keep only current work


---


# Memory Classification


Everything should be classified before saving.


## Permanent Memory


Keep permanently:

- Project architecture
- Folder structure
- Deployment flow (Vercel + .htaccess routing)
- CSS/theme conventions
- Coding standards
- Naming conventions
- Environment requirements
- Shared utilities
- Reusable components


---


## Temporary Memory


Keep until completed:

- Current task
- Current implementation
- Current plan
- Current thinking
- Active bugs
- Current TODO


---


## Discard Immediately


Never save:

- Greetings
- Casual conversations
- Generated outputs
- Installation logs
- Temporary debugging logs
- Repeated explanations
- Finished conversations
- Re-creatable information


---


# Session Commands


## LOAD


User command:

```
load
```


Action:

Load project memory only.


Include:

- Architecture (`.AGENT_DOCS/projectArchitecture/PROJECT_ARCHITECTURE.md`)
- Deployment / routing (vercel.json + .htaccess)
- Theme & CSS conventions
- Active TODO
- Current Project Status


Return only a concise summary.


---


## KEEP


User command:

```
keep
```


Generate a compressed session memo.


Structure:

# Session Memo


## Completed


Completed work.


## Current Thinking


Important reasoning only.


## Current Plan


Next implementation steps.


## Important Decisions


Architecture and implementation decisions.


## Active TODO


Remaining work.


## Known Issues


Current bugs.


## Notes


Anything important for future sessions.


Compress aggressively.


Do NOT include unnecessary conversations.


---


## READ


User command:

```
read
```


Load the latest KEEP memo.


Restore:

- Thinking
- Plan
- TODO
- Decisions
- Current work


Treat this as active memory.


---


## CLEAR


User command:

```
clear
```


Remove all temporary memory.


Keep only:

- Architecture
- Business Rules
- Coding Standards
- Permanent Project Knowledge


---


## ARCHIVE


User command:

```
archive
```


Move completed work into an archive summary.


Remove archived work from active context.


Keep only unfinished work active.


---


## STATUS


User command:

```
status
```


Return:

Context Usage


Example:

```
Context Usage
-------------
Current: 980
Safe Level


Permanent Memory:
✔ Loaded


Temporary Memory:
✔ Active


Current Task:
Portfolio content update


TODO:
5 items


Archive:
12 completed tasks
```


---


## REFRESH


User command:

```
refresh
```


Rebuild working memory.


Steps:

- Reload permanent memory.
- Reload latest KEEP memo.
- Remove unnecessary temporary context.
- Continue from latest state.


---


## SAVE MEMO


User command:

```
save memo
```


Action:

Save session knowledge to today's memo file (`.AGENT_DOCS/memory/YYYY-MM-DD.md`).


Write to:

```
.AGENT_DOCS/memory/YYYY-MM-DD.md
```


Include:

1. New or updated pages / features — file, what changed, why.
2. Other changes — based on `git diff` of recent commits (HTML, CSS, JS, config, doc changes).
3. Timestamp every entry (format `2026-09-05 14:30:00`).
4. If the file does not exist, create it with header `# Session Memory — YYYY-MM-DD`.
5. If the file exists, append new entries under the appropriate sections.


---


## SAVE CHANGES


User command:

```
save changes
```


Action:

Save all code changes to today's changes log (`.AGENT_DOCS/changes/YYYY-MM-DD.md`).


Write to:

```
.AGENT_DOCS/changes/YYYY-MM-DD.md
```


Include:

1. Pages — new or modified HTML files with file path and line reference.
2. CSS — new or modified stylesheets (ken.css, meyawo.css) and why.
3. JS — new or modified scripts (meyawo.js or inline page scripts).
4. Assets — new or replaced images / PDFs / vendors.
5. Routing — changes to `vercel.json` or `.htaccess`.
6. Other — config, metadata, doc changes.


Format each entry with:

- File path and line reference.
- What changed (before/after if applicable).
- Why (if known from context).


Use `git diff` to identify all changes since the last save.


---


## GIT UPDATES


User command:

```
git updates
```


Action:

Fetch and pull latest from remote, then push local commits.


Steps:

1. Save current work (commit or stash) to avoid losing changes.
2. Run `git fetch --all`.
3. `git pull` the current branch (prefer `--ff-only` when history is clean).
4. `git push` local commits (or `git push -u origin <branch>` on first push).
5. Report branch, ahead/behind counts, and any conflicts.


Never force-pull, force-push, or reset without explicit permission.


---


## GIT PULL


User command:

```
git pull
```


Action:

Fetch and pull latest from remote only (no push).


Steps:

1. Save current work (commit or stash) to avoid losing changes.
2. Run `git fetch --all`.
3. `git pull` the current branch (prefer `--ff-only` when history is clean).
4. Report branch, ahead/behind counts, and any conflicts.


Never force-pull or reset without explicit permission.


---


## GIT PUSH


User command:

```
git push
```


Action:

Push local commits to the remote tracking branch.


Steps:

1. Confirm the current branch tracks a remote (`git status` / `git rev-parse --abbrev-ref @{upstream}`).
2. Run `git push` (or `git push -u origin <branch>` on first push).
3. Report the result.


Only run when the user explicitly says "git push" or includes push in the request.


---


## CREATE BRANCH


User command:

```
create branch
```


Action:

Create a new descriptive branch from the current branch and carry the working changes over to it.


Formats (this repo has no strict HRDD convention; keep branches small and descriptive):

```
feat-<Name>
fix-<Name>
update-<Name>
exp-<Name>
```


Steps:

1. Check the current branch and working tree first.
2. Determine the branch name and parent branch (feature/fix from `main`).
3. Run `git checkout -b <branch>` — uncommitted changes move to the new branch automatically.
4. Verify the carried-over files are present on the new branch (`git status`).
5. Report the created branch, its parent, and the changes carried over.


---


## SHORTCUTS


User command:

```
shortcuts
```


Return only this table.


| Command | Description |
|----------|-------------|
| load | Load permanent project memory |
| keep | Save current session memo |
| save memo | Save session memo to memory/YYYY-MM-DD.md |
| read | Restore previous session memo |
| clear | Clear temporary memory |
| archive | Archive completed work |
| refresh | Rebuild working context |
| status | Show context & memory status |
| save changes | Save changes log to changes/YYYY-MM-DD.md |
| git updates | Fetch and pull latest from remote & push commits |
| git pull | Fetch and pull latest from remote |
| git push | Push commits to remote |
| create branch | Create descriptive branch from current branch with changes |
| shortcuts | Show available commands |


---


# Memory Priority


Highest

1. Deployment Flow & Routing (vercel.json / .htaccess)
2. Architecture

3. Theme Conventions (SCSS → committed CSS, load order)

4. Folder Structure

5. Coding Standards

6. Active TODO

7. Current Plan

8. Current Thinking

9. Temporary Notes


Lowest


Debug Logs

Conversation History

Generated Output

Greeting Messages

Temporary Text


When memory is full,
delete from the bottom upward.


---


# Task Management


Track tasks automatically.


Each task should have:


Status

- Todo
- In Progress
- Review
- Completed


Only active tasks remain in working memory.


Completed tasks should move to Archive.


---


# Development Workflow


Every instruction follows this sequence before implementation starts:


```
User instruction

↓

READ — targeted reads of relevant files and docs

↓

EXPLORE — search the codebase for affected code

↓

THINK & PLAN — determine steps, reuse, order of work

↓

LIST THE PLAN — present steps as a checkbox list

↓

USER CONFIRMATION — select all or pick single steps

↓

IMPLEMENT — only the confirmed steps

↓

REVIEW — verify, lint, test

↓

keep
```


## Plan Confirmation


- After reading, exploring, and planning, show the plan as a numbered checkbox list.
- Each step is a checkbox item with a short action statement.
- Await user confirmation before any implementation.
- The user decides: **select all** (proceed with every step) or **single-select** (approve specific steps only).
- Mark the selected items as checked todo items, then execute exactly what was approved.
- Do NOT start work on steps that were not selected.
- Re-plan if the user changes scope after confirmation.


---


# Thinking Rules


Think internally before coding.


Always determine:

- What is already implemented?
- What can be reused?
- What should be remembered?
- What should be discarded?
- Is this worth permanent memory?


Never think twice about identical problems.


Reuse previous decisions.


---


# Coding Rules


Before generating code:

- Search existing implementation.
- Avoid duplicate logic.
- Reuse utilities.
- Follow project conventions.
- Keep files consistent.
- Remember: this repo has no build tool — edit the HTML/CSS/JS directly, and if SCSS changes are made, compile manually and commit the resulting CSS.


---


# Reading Rules


- Targeted reads only. Use `offset`/`limit`. Never read a whole file when only a region is needed.
- Never re-read unchanged files. Once content is in context, use `edit` directly.
- Grep before read. Use `grep`/`glob` to locate symbols first; read only the matching region.
- Do not echo. Never reproduce file contents or tool output back in replies.
- Batch reads. Multiple independent reads go in a single parallel tool call.


---


# Search & Exploration Rules


- Prefer `grep`/`glob`. Avoid `Get-ChildItem`/`Select-String`/`Get-Content` shells for searches.
- Delegate wide exploration to subagents. For "find all X" tasks, use the `explore` agent; only its summary returns to the main session.
- Stop searching once found. A single precise hit is enough.


---


# Verification Rules


- This repo has no automated tests/lint/build. Verify by confirming wiring:
  - HTML references point at real files (CSS/JS/vendors/images).
  - New clean URLs are registered in BOTH `vercel.json` and `.htaccess`.
  - Visual changes: open `index.html`/the edited page locally before declaring done.
- One verification pass. Do not repeat full checks when a targeted check confirms the change.


---


# Workflow Rules


- Run tasks to completion in one turn. Do not pause mid-task for already-approved work.
- Do not ask redundant confirmation. Only ask when scope is genuinely ambiguous or destructive.
- Do not paraphrase. Keep replies short; use code references (`file:line`), no preamble.
- Prefer `edit` over rewrite. Make surgical edits; only rewrite when full replacement is required.


---


# Session Hygiene


- Use memory files. Keep cross-session state in `.AGENT_DOCS/memory/*.md` so a fresh session resumes cheaply.
- Recommend `/compact` or fresh session when history grows long; memory files carry the context.
- No emojis, no filler. Output text only where it serves the task.


---


# Memory File Guidelines


- `.AGENT_DOCS/memory/YYYY-MM-DD.md` holds detailed session state: what changed, decisions, and the current plan/TODO.
- Keep memory files high-signal — no duplicated explanations, no conversation transcripts.
- Follow the same-date rule: update today's file if it exists, create a new dated file otherwise.


---


# Git Operations


Follow these rules for all git activity.


## Always

- Save or commit before pulling remote updates.
- Verify before committing:
  - Run `git status` and `git diff`.
  - Stage only intended files.
  - Never stage credentials, `.env`, `node_modules`, `dist/`, or generated scratch files.
- Use commit messages matching the repo's existing style (short, plain descriptions, e.g. "Update index.html").
- Prefer small, meaningful commits over one large dump.


## Never

- Never auto-commit, auto-push, or auto-pull without the user explicitly asking.
- Never force-push, rebase published history, or reset without explicit permission.
- Never amend a published commit.
- Never commit secrets or API keys.


---


# Context Compression Strategy


Instead of:

500 lines of discussion


Store:

```
Decision:
Single canonical CSS override file (ken.css).

Reason:
Existing structure already splits custom vs theme CSS.

Result:
Followed.

Next:
—
```


Always prefer summaries over transcripts.


---


# Startup Behavior


When a new project session begins:


Wait for

```
load
```


Then:

- Load permanent memory.
- Load project rules (`AGENTS.md`, `.AGENT_DOCS/SYSTEM_GUIDELINE.md`).
- Prepare development environment mentally.
- Do not reload unnecessary history.


---


# End Session Behavior


When

```
keep
```


is received:

Automatically:

- Summarize work.
- Save plan.
- Save reasoning.
- Save active TODO.
- Compress everything.


Prepare for the next session.


---


# Folder Path Resolution


This repo is standalone (single static site). No separate backend/frontend paths exist.

Use the repository root (`C:\laragon\www\ken-portfolio` locally, repo root on Vercel) for all file operations unless the user gives an explicit path.


---


# Applicability


These rules apply to all agent coding sessions on this repository and complement the existing guidelines (`AGENTS.md`, `.AGENT_DOCS/SYSTEM_GUIDELINE.md`, `.AGENT_DOCS/projectArchitecture/PROJECT_ARCHITECTURE.md`). Where these rules conflict with a user's explicit instruction, the user's instruction wins.


---


# Objective


The mission is:

- Maximum development continuity.
- Minimum context usage.
- Fast session recovery.
- Persistent project knowledge.
- Efficient long-term collaboration.


Act like a senior developer with long-term memory rather than a chat assistant.