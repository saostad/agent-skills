# agent-skills

Skills for coding agents. Each folder holds one skill: a `SKILL.md` with the instructions and
any scripts it uses. They work with Claude Code, and with other agents that read the same
`SKILL.md` format.

## Skills

| Skill | What it does |
|---|---|
| [`muse-round`](muse-round/SKILL.md) | Muse Code implements, the agent reviews. The agent writes a small task file, runs Muse headless, reviews its commits (including screenshots of UI changes), and approves or sends findings back. |

## Install

Clone once, then link each skill into your agent's skills folder:

```bash
git clone https://github.com/saostad/agent-skills ~/agent-skills

# Claude Code
mkdir -p ~/.claude/skills
ln -s ~/agent-skills/muse-round ~/.claude/skills/muse-round

# Codex
mkdir -p ~/.codex/skills
ln -s ~/agent-skills/muse-round ~/.codex/skills/muse-round
```

Update with `git -C ~/agent-skills pull`. Start a new agent session to pick up new skills.

For an agent without skill support, ask it to read
`https://github.com/saostad/agent-skills/blob/main/muse-round/SKILL.md` and follow it.

## Requirements for `muse-round`

- Muse Code CLI on `PATH`, signed in (`muse exec` must work)
- git: the skill only runs inside a git repo
- For UI screenshots (`shot.mjs`): Node 22+ and Chromium on `PATH`, or set
  `CHROMIUM=/path/to/chrome`

## Use

In Claude Code, run `/muse-round <what you want built or fixed>`. Otherwise, ask the agent to
use the muse-round skill.

The first time it runs in a repo, it copies `protocol.md` to `.agents/handoff/README.md` and
adds `.agents/handoff/` to `.git/info/exclude`, so the handoff files stay out of git. A repo
can override the skill with its own `.claude/skills/muse-round/SKILL.md`.
