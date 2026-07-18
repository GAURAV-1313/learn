# codecall

`codecall` is an agent-backed skill for Codex and Claude Code that turns a
completed implementation into a short, evidence-grounded, adaptive learning
session. It uses the active coding agent that already understands the task and
repository—there is no additional model call or external context upload.

The MVP deliberately teaches and checks understanding one step at a time:

```text
collect minimal context → recommend → confidence → lesson → one check-in
                                              ↑                 ↓
                                              └── reinforce / advance
```

It does not throw a fixed quiz at the user. A normal session covers 2–4 related
concepts, using two checks per concept: a real-world-to-technical mapping and a
technical application or tradeoff question. A wrong answer produces targeted
reinforcement and a fresh equivalent check-in; correct answers unlock the next
prerequisite-ready learning step.

## Install

Install once from GitHub to add the same `codecall` skill to both your local Codex
and Claude Code skills directories:

```bash
npm install -g https://github.com/GAURAV-1313/codecall/archive/refs/heads/main.tar.gz
```

Restart the relevant coding agent or open a new task so it reloads the installed
skill. This package does not require an additional API key, and its install step
does not upload your code.

When the package is published to npm, the equivalent registry command will be:

```bash
npm install -g codecall
```

## Use it in Codex

After Codex completes an implementation, invoke:

```text
$codecall
```

The skill uses the existing conversation and the coding agent's recent edits.
It can optionally inspect a Git diff when that is useful, but Git is never a
requirement.
It first presents a Start/Skip recommendation. After Start, it teaches one
implementation-specific concept and asks one reasoning question at a time.
Your answer determines whether it reinforces, deepens, or advances. It finishes
with concepts covered, weak areas, and an estimated session mastery. The final
summary also gives implementation-grounded points to remember and only the
relevant edge cases to check before applying the pattern in another project.

The installable skill source is in [`skill/`](skill/SKILL.md).

## Use it in Claude Code

After Claude Code completes an implementation, invoke:

```text
/codecall
```

Claude Code discovers personal skills from `~/.claude/skills/<skill-name>/SKILL.md`.
The installer creates `~/.claude/skills/codecall/SKILL.md`, using the same
Agent-Skills-standard instruction file as Codex. It uses Claude Code's current
conversation and edits—there is no extra learning-model API to configure.

For a repository-level automatic, non-blocking recommendation, add the same
rule below to `CLAUDE.md` rather than `AGENTS.md`.

### Automatic recommendation

Codex and Claude Code can select the skill implicitly, but skills are not
background event listeners. `$codecall` (Codex) and `/codecall` (Claude Code) are the
dependable triggers in any repository.

The policy is intentionally selective: it recommends only when an implementation
has one strong signal (for example a security boundary, integration, public
contract, or architecture decision) or two moderate signals (such as a reusable
pattern plus operational behavior). It skips cosmetic, documentation-only,
mechanical, generated-only, dependency-only, and ordinary test-only work. The
full policy is [installed with the skill](skill/references/trigger-policy.md).

To enable it in a project, copy the [Codex template](skill/references/AGENTS.codecall.md)
into `AGENTS.md` or the [Claude Code template](skill/references/CLAUDE.codecall.md)
into `CLAUDE.md`:

```md
Before the normal final response for a completed implementation, read the
codecall skill's references/trigger-policy.md and evaluate the change. Show Start
Learning / Skip only for a `recommend` outcome; never teach without Start.
```

The policy retains only an in-memory concept fingerprint for the current agent
session, preventing duplicate cards without tracking learning across sessions
or projects.

## Local demonstration runtime

```bash
codecall --from-git --task "Add OAuth protected routes"
```

The terminal command is a local, deterministic demonstration runtime. Use
`$codecall` in Codex for the primary agent-backed product experience. Use
`codecall --help` for command options.

## Use it programmatically

```ts
import { codecall } from "codecall";

const implementation = {
  task: "Protect account routes using JWT authentication middleware.",
  changedFiles: [{
    path: "src/routes.ts",
    summary: "Adds authentication middleware before account handlers."
  }]
};

const runtime = codecall(implementation);
const session = await runtime.start(implementation);

runtime.decide(session, true);                 // developer chose Start Learning
await runtime.setConfidence(session, "heard_of_it");

// Render session.currentQuestion. On a user answer:
await runtime.answer(session, "causal");
```

Providers render `runtime.history(session.id)` as their native UI: `/codecall`, a
tool call, or a non-blocking post-task recommendation. Core workers never
depend on a provider SDK.

## What ships in v1.0.0

- append-only, typed session events and an explicit state machine;
- progressive minimal context represented as evidence references;
- explainable opportunity scoring based on concepts and architecture signals,
  not LOC;
- separated concept categories, dependency-aware planning, and a bounded plan;
- an adaptive teach → one MCQ → evaluate → reinforce/advance loop;
- final transfer guidance: points to remember plus cross-project edge cases;
- one shared skill installed for Codex and Claude Code;
- an explainable strong/moderate auto-recommendation policy with session-local
  duplicate suppression;
- pluggable worker and documentation-provider contracts;
- in-memory and caller-owned JSONL event stores;
- deterministic default workers suitable for local demonstration and tests.

The included deterministic workers support local tests and the terminal demo.
The installed agent skill is the production path: its reasoning, concept
selection, teaching, question generation, and evaluation are performed by the
active coding agent in the existing conversation.

## Development

```bash
npm install
npm run build
npm test
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full design, privacy posture,
event model, state machine, and planned provider integrations.
