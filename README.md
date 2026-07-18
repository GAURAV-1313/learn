# learn

`learn` is an agent-backed Codex skill that turns a completed implementation
into a short, evidence-grounded, adaptive learning session. It uses the active
coding agent that already understands the task and repository—there is no API
key, additional model call, or external context upload.

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

Install once from GitHub to add the `learn` skill to your local Codex skills
directory:

```bash
npm install -g https://github.com/GAURAV-1313/learn/archive/refs/heads/main.tar.gz
```

Restart Codex or open a new task so it reloads the installed skill. This package
does not require an API key, and its install step does not upload your code.

When the package is published to npm, the equivalent registry command will be:

```bash
npm install -g @gaurav-1313/learn
```

## Use it in Codex

After Codex completes an implementation, invoke:

```text
$learn
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

### Automatic recommendation

The skill can be selected implicitly by Codex, but skills are not background
event listeners. `$learn` is the dependable trigger in any repository.

To request an automatic, non-blocking recommendation before completion messages
in a specific project, add this rule to that project's `AGENTS.md`:

```md
After a meaningful implementation, evaluate whether it introduced concepts,
patterns, dependencies, architecture decisions, or non-obvious tradeoffs. If
so, present Start Learning / Skip before the normal final response. On Start,
follow the learn skill; otherwise finish normally.
```

## Local demonstration runtime

```bash
learn --from-git --task "Add OAuth protected routes"
```

The terminal command is a local, deterministic demonstration runtime. Use
`$learn` in Codex for the primary agent-backed product experience. Use
`learn --help` for command options.

## Use it programmatically

```ts
import { learn } from "@gaurav-1313/learn";

const implementation = {
  task: "Protect account routes using JWT authentication middleware.",
  changedFiles: [{
    path: "src/routes.ts",
    summary: "Adds authentication middleware before account handlers."
  }]
};

const runtime = learn(implementation);
const session = await runtime.start(implementation);

runtime.decide(session, true);                 // developer chose Start Learning
await runtime.setConfidence(session, "heard_of_it");

// Render session.currentQuestion. On a user answer:
await runtime.answer(session, "causal");
```

Providers render `runtime.history(session.id)` as their native UI: `/learn`, a
tool call, or a non-blocking post-task recommendation. Core workers never
depend on a provider SDK.

## What ships in v0.1.2

- append-only, typed session events and an explicit state machine;
- progressive minimal context represented as evidence references;
- explainable opportunity scoring based on concepts and architecture signals,
  not LOC;
- separated concept categories, dependency-aware planning, and a bounded plan;
- an adaptive teach → one MCQ → evaluate → reinforce/advance loop;
- final transfer guidance: points to remember plus cross-project edge cases;
- pluggable worker and documentation-provider contracts;
- in-memory and caller-owned JSONL event stores;
- deterministic default workers suitable for local demonstration and tests.

The included deterministic workers support local tests and the terminal demo.
The installed Codex skill is the production path: its reasoning, concept
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
