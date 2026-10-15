# agent-skills

Skills for coding agents. Each folder holds one skill: a `SKILL.md` with the instructions and
any scripts it uses. They work with Claude Code, and with other agents that read the same
`SKILL.md` format.

## Skills

| Skill | What it does |
|---|---|
| [`muse-round`](muse-round/SKILL.md) | Muse Code implements, the agent reviews. The agent writes a small task file, runs Muse headless, reviews its commits (including screenshots of UI changes), and approves or sends findings back. |

## Install

Clone once, then link each skill into your agent's skills folder.

### macOS / Linux

```bash
git clone https://github.com/saostad/agent-skills ~/agent-skills

# Claude Code
mkdir -p ~/.claude/skills
ln -s ~/agent-skills/muse-round ~/.claude/skills/muse-round

# Codex
mkdir -p ~/.codex/skills
ln -s ~/agent-skills/muse-round ~/.codex/skills/muse-round
```

### Windows (PowerShell)

A directory junction plays the role of `ln -s` and needs no admin rights or Developer Mode.

```powershell
git clone https://github.com/saostad/agent-skills "$HOME\agent-skills"

# Claude Code
New-Item -ItemType Directory -Force "$HOME\.claude\skills" | Out-Null
New-Item -ItemType Junction -Path "$HOME\.claude\skills\muse-round" -Target "$HOME\agent-skills\muse-round"

# Codex
New-Item -ItemType Directory -Force "$HOME\.codex\skills" | Out-Null
New-Item -ItemType Junction -Path "$HOME\.codex\skills\muse-round" -Target "$HOME\agent-skills\muse-round"
```

Don't use `ln -s` in Git Bash: without Developer Mode it silently copies the folder, so
`git pull` won't update the installed skill.

Update with `git -C ~/agent-skills pull`. Start a new agent session to pick up new skills.

For an agent without skill support, ask it to read
`https://github.com/saostad/agent-skills/blob/main/muse-round/SKILL.md` and follow it.

## Requirements for `muse-round`

- Muse Code CLI on `PATH`, signed in (`muse exec` must work)
- git: the skill only runs inside a git repo
- On Windows: Git for Windows, which provides the Git Bash that runs `run-muse.sh`
- For UI screenshots (`shot.mjs`): Node 22+ and a Chromium-based browser. On Windows and
  macOS it finds Chrome or Edge in their usual install folders; on Linux it needs
  `chromium` on `PATH`. Set `CHROMIUM=/path/to/chrome` to use a different one.

## Use

In Claude Code, run `/muse-round <what you want built or fixed>`. Otherwise, ask the agent to
use the muse-round skill.

The first time it runs in a repo, it copies `protocol.md` to `.agents/handoff/README.md` and
adds `.agents/handoff/` to `.git/info/exclude`, so the handoff files stay out of git. A repo
can override the skill with its own `.claude/skills/muse-round/SKILL.md`.
