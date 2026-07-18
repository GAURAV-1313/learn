# Automatic learning recommendation policy

Use this policy only after an implementation is complete. It controls a
non-blocking recommendation, never automatic teaching.

1. Confirm inspectable evidence: the completed task plus relevant conversation
   facts or changed-file evidence. If unavailable, skip automatic prompting.
2. Identify signals from the implementation, not line count.
3. Recommend only with one strong signal or two distinct moderate signals.
4. State the evidence-backed reason and affected file or conversation fact.
5. Remember the evaluated concept cluster for this agent session. Do not show a
   second card for the same cluster. Do not persist learner history.

## Strong signals

- New external dependency, integration, protocol, schema, or public interface.
- New architecture boundary or cross-component execution path.
- Security, authentication, authorization, concurrency, reliability,
  data-consistency, or failure-handling behavior.
- An explicit non-obvious tradeoff or consequential design decision.

## Moderate signals

- New reusable pattern, framework capability, algorithm, lifecycle, or state
  model.
- Connected components with a dependency relationship.
- New configuration, observability, validation, testing strategy, or deployment
  behavior that changes system operation.

## Exclusions and outcomes

Skip automatic prompting for formatting, copy, comments, mechanical renames,
generated-file-only changes, isolated dependency bumps, and straightforward
localized fixes. Skip test-only work unless it introduces a transferable test
strategy, harness, boundary, or behavior.

- `recommend`: show Start Learning / Skip and wait for consent.
- `optional`: do not interrupt; leave `$codecall` and `/codecall` available.
- `skip`: do nothing automatically.

Manual invocation always remains available. Never request an API key or invoke
an external learning model.
