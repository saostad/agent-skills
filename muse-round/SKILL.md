---
name: muse-round
description: Run a cheap review loop in any repo where Muse Code (muse-spark-1.3-contributor) implements and Claude Code reviews. Use when the owner asks to "send it to Muse", "have Muse fix/build X", "you review, Muse implements", runs /muse-round, or asks whether Muse is done.
---

# Muse rounds: Muse implements, you review

You are the **reviewer**. Muse Code is the **implementer**. You write no feature code: you
write a short task file, launch Muse headless, review what it commits, then approve it or send
numbered findings back. The owner pays for Muse, so **every round must be small and
precise**: point at exact files and lines so Muse reads only what it needs.

`SKILL_DIR` below means the folder this file is in (for example
`~/.claude/skills/muse-round`). Use its real path when running the scripts.

## 0. Project override

If the repo has its own `.claude/skills/muse-round/SKILL.md` (not this file), read it and
follow it instead. It knows that project's scripts and rules. Stop reading this file.

## 1. Set up once per repo

1. Run `git rev-parse --show-toplevel`. If the folder isn't a git repo, stop and ask; Muse
   rounds are tracked by commits.
2. If `.agents/handoff/README.md` is missing, copy `SKILL_DIR/protocol.md` there.
3. Keep the handoff files out of git. If `git check-ignore -q .agents/handoff/x.md` fails,
   add `.agents/handoff/` to `.git/info/exclude`. That file is local, so the repo itself
   doesn't change.
4. **Find the project's checks.** Look in `AGENTS.md`, `CLAUDE.md`, `README`,
   `package.json` scripts, `Makefile` and CI workflows for test, typecheck, lint and build
   commands. Run them once yourself:
   - If they need a dev container or other environment, find out how to run them there
     (e.g. `docker exec <container> bash -lc 'cd <path> && <cmd>'`). Put that exact command
     in every task file.
   - If a check can't run anywhere, say so to the owner as **UNKNOWN**. Never call it
     passing.
5. **Read the project's rules** (`AGENTS.md`, `CLAUDE.md`, contributing docs) and the
   owner's standing rules in memory. Copy the ones that matter for each round into its task
   file. Muse reads only what you point it at.

## 2. Before a round

1. **Investigate first, yourself.** Find the cause, the files and the line numbers. Read
   only the parts you need. Muse gets conclusions, not a research task.
2. **Apply the owner's standing rules** in every task:
   - **Clear errors.** Every failure the user sees names what failed and includes the real
     error text. No vague notes, no swallowed errors, no empty `catch`.
   - **No silent fallbacks.** A degraded path is logged and shown to the user.
   - **UNKNOWN is never PASS.**
   - No secrets in code, logs, task files or results.
   - **Beginner-friendly UI.** Every input is explained, linked or auto-filled.
   - Plus the project's own rules from step 1.5.
3. **Make sure Muse is idle:** `ps -eo args | grep -E '[m]use[^ ]* exec '`. Don't use
   `pgrep -f`, which matches its own shell. Only one Muse runs in a repo at a time. If one
   is running, write the next task file now and launch it when the notification arrives.
4. **Big requests** ("redesign everything"): split them into rounds of 1–4 items. Do the
   shared foundation first, then one page or area per round. Tell the owner the plan in a
   few lines.

## 3. Task file: `.agents/handoff/<task>.md`

```markdown
# Handoff: <short name>

Status: IMPLEMENT

- Protocol: `.agents/handoff/README.md` (headless implementer: do the round, append your
  section, set the status last, exit; no watch)
- Implementer: Muse Code. Reviewer: Claude Code.
- Checks: `<exact test/typecheck/lint commands, and where to run them>`

## Round 1 — reviewer

<2–4 lines: the live failure (exact error text) or the goal, and the cause, with file:line.>

<N> items, one commit each.

1. **<what>** (`path/file.ts:line`): <exact change; exact user-facing strings in quotes;
   what happens on failure; which existing code to reuse>. Tests: <cases>.
2. ...

Don't touch anything external, <the project's protected files>.

### What I'll check
- <the 2–3 things most likely to go wrong>
- <the checks> pass.

### Report
Append `## Round 1 — implementer` at the bottom: commit range, what was done per item,
decisions, and the results of <the checks>. Then set `Status: REVIEW_REQUESTED` and exit.
```

Keep each round to 1–4 items. Give exact strings for user-facing text.

**Later rounds** in the same task file: append `## Round N — reviewer` at the bottom (never
edit earlier sections). Then set the status line:
- `IMPLEMENT` for new work after an approval
- `CHANGES_REQUESTED` for fixes

## 4. Launch

Use the commit conventions from the project's rules (prefixes, one commit per item).

```bash
cat > .agents/handoff/<task><N>-prompt.md <<'EOF'
Read .agents/handoff/README.md, then .agents/handoff/<task>.md. You are the implementer and it's your turn now (Status: <IMPLEMENT|CHANGES_REQUESTED>). You run headless with the shell available. Do "Round <N> — reviewer" exactly as written, one commit per item. Run the checks named in the task file, exactly as written there. Append "## Round <N> — implementer" at the bottom, set the status line to REVIEW_REQUESTED last, then exit. Don't start a watch. Be concise: read only the files you need.
EOF
SKILL_DIR/run-muse.sh "$(git rev-parse --show-toplevel)" .agents/handoff/<task><N>-prompt.md \
  > <scratchpad>/muse-<task><N>.log 2>&1      # Bash tool, run_in_background: true, timeout 7200000
```

- About 20 seconds after launch, check the log tail once for a sign-in or startup error.
  Then tell the owner in a few plain lines what Muse is doing. You're notified when Muse
  exits; don't poll.
- **Sandbox:** `run-muse.sh` keeps Muse's sandbox on by default. If Muse fails because the
  sandbox can't start (for example, bwrap namespaces inside a container), ask the owner
  before relaunching with `MUSE_DISABLE_SANDBOX=1`. Note their OK in the task file.

**"Is Muse done yet?"** Check:
- the status line
- `git log --oneline <base>..HEAD`
- `git status -s`
- `ps -eo args | grep -E '[m]use[^ ]* exec '`
- the log tail, for errors or retries

Answer with what's committed and what's still in progress.

## 5. Review (keep it cheap)

1. Read the implementer section, `git log`, `git status -s` (nothing stray) and
   `git diff --stat`.
2. Read the **logic** diff. Skim tests and styles.
3. Hunt for:
   - swallowed errors, or messages that drop the real error
   - silent fallbacks, including `??` defaults that show wrong data as real
   - UNKNOWN reported as PASS
   - secrets in payloads, logs or results
   - changes that break existing callers or users
   - comparing against the local checkout when it should use `origin/<base>`
   - order bugs
   - duplicate HTML ids
   - strings or `role`s that changed when they were meant to stay
4. Re-run the checks yourself. Never trust the report alone.
5. **For visible output (UI, images, generated files), look at a real example.** Tests
   can pass while the output is visibly wrong.
   - UI: `node SKILL_DIR/shot.mjs <url> <out.png> <width> <height> [cookie=value]`
     takes a full-page screenshot with headless Chromium. Then Read the PNG. Check a desktop
     width (1400) and a phone width (390), in both themes if the app has them.
   - Sideways scroll and similar checks:
     `node SKILL_DIR/shot.mjs <url> - 390 900 "" '<js expression>'` prints the expression's
     value instead of saving a screenshot.
   - A sticky element shows up mid-page in a full-page screenshot. That's how the capture
     works, not a bug.
   - If the page needs data that doesn't exist (an empty list), say that layout is
     **UNKNOWN**. Only create local test data if it's harmless, tell the owner, and remove
     it afterwards.
6. **Verdict** (append `## Round N — reviewer`):
   - **Approve:** **Verdict: approved** and 1–2 lines on what you checked. Set
     `Status: APPROVED`, or `IMPLEMENT` with the next round's items in the same section.
   - **Changes:** numbered **Required** findings, each with *Where* (file:line), *Problem*
     (a concrete case) and *Fix*, plus a test. Set `Status: CHANGES_REQUESTED` and relaunch.
   - Small, non-blocking leftovers become **carry-overs** in the next round's first item.
     Don't spend a round on them alone.
   - **Owner requests that arrive mid-round** go into the next round. Don't interrupt a
     running Muse.

## 6. Talking to the owner

- Say plainly what was done, what failed (quote the exact error), and the next steps as
  numbered clicks with links. Show a screenshot when the change is visible.
- Say what you couldn't verify as **UNKNOWN**. Never claim it passed.
- **Commit and push only when the owner says so.** Before pushing:
  - Check `git log --format='%ae' <remote>/<branch>..HEAD` against the emails on commits
    already pushed. Muse commits with the local git identity, and GitHub can reject a
    private email ("push declined due to email privacy restrictions"). If it does, offer
    to rewrite only the unpushed commits' email (keeping dates and messages) or to change
    the GitHub setting. Let the owner choose.
  - Never force-push without an explicit OK.
- Writes to external systems (other repos, stores, cloud, settings) need the owner's OK.
- If your own earlier design caused a problem, say so directly.
