# Agent handoff

Two agents share work through the files in this folder, so the owner doesn't have to copy
messages between terminals:

- the **implementer** (Muse Code) writes the code
- the **reviewer** (Claude Code) reviews it and asks for changes

## Files

There is one file per task: `<task>.md`. The line right under the title is the status line:

```
Status: <STATE>
```

| State | Whose turn | Meaning |
|---|---|---|
| `IMPLEMENT` | implementer | Do the work in the reviewer's latest section. |
| `REVIEW_REQUESTED` | reviewer | Review the implementer's latest section and commits. |
| `CHANGES_REQUESTED` | implementer | Fix the findings in the reviewer's latest section. |
| `APPROVED` | nobody | Done. |
| `BLOCKED` | owner | The latest section says what decision or input is needed. |

`<task><N>-prompt.md` files are the reviewer's launch prompts. Leave them alone.

## Rules

1. Act only when the status line says it's your turn.
2. Add a new section at the bottom, `## Round N — implementer` or `## Round N — reviewer`.
   Never edit earlier sections.
3. Change the status line **last**, after your section is complete and your commits are
   made.
4. An implementer section contains:
   - the commit range (`<first>^..<last>`)
   - what was done for each item or finding
   - any decisions made and changes from the plan, with the reason
   - the results of the checks named in the task file: pass/fail, with any failure output.
     A check that couldn't run is UNKNOWN, never PASS.
5. A reviewer section contains a verdict and numbered findings. Each finding gives a
   `file:line`, says what to change, and is marked **required** or **optional**.
6. One commit per item or finding, following the project's commit conventions.
7. Don't commit the files in this folder. Never put secrets, tokens or customer data here.
8. If you need the owner (a decision, a credential, an approval), set `BLOCKED` and say what
   you need in your section.

## Headless implementer

The reviewer launches the implementer (`muse exec`) once per round. The implementer doesn't
watch the file:

1. Do the round.
2. Append your section.
3. Set the status line last.
4. Exit.

The reviewer starts the next run when it's the implementer's turn again.
