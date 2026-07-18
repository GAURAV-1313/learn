import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { learn } from "../src/public.js";
import { JsonlEventStore } from "../src/runtime/event-store.js";

const implementation = {
  task: "Add OAuth protected routes using authentication middleware and JWT tokens.",
  changedFiles: [{ path: "src/routes.ts", summary: "Protect account routes with authentication middleware.", excerpt: "router.get('/account', authenticate, accountHandler)" }]
};

describe("learn runtime", () => {
  it("recommends learning, then presents one grounded question at a time", async () => {
    const runtime = learn(implementation);
    const session = await runtime.start(implementation);
    expect(session.state).toBe("waiting_for_decision");
    expect(session.opportunity?.recommendation).toBe("recommend");

    runtime.decide(session, true);
    await runtime.setConfidence(session, "heard_of_it");
    expect(session.state).toBe("quiz");
    expect(session.currentQuestion?.choices).toHaveLength(3);
    expect(runtime.history(session.id).filter((event) => event.type === "QUESTION_PRESENTED")).toHaveLength(1);
  });

  it("reinforces after an incorrect answer instead of advancing", async () => {
    const runtime = learn(implementation);
    const session = await runtime.start(implementation);
    runtime.decide(session, true);
    await runtime.setConfidence(session, "never_learned");
    await runtime.answer(session, "cosmetic");

    expect(session.state).toBe("quiz");
    expect(session.incorrectAnswers).toBe(1);
    const types = runtime.history(session.id).map((event) => event.type);
    expect(types).toContain("REINFORCEMENT_READY");
    expect(types.filter((type) => type === "QUESTION_PRESENTED")).toHaveLength(2);
  });

  it("asks a mapping check and technical check before advancing a concept", async () => {
    const runtime = learn(implementation);
    const session = await runtime.start(implementation);
    runtime.decide(session, true);
    await runtime.setConfidence(session, "comfortable");
    const firstQuestion = session.currentQuestion!;

    await runtime.answer(session, firstQuestion.correctChoiceId);

    expect(session.state).toBe("quiz");
    expect(session.currentUnitIndex).toBe(0);
    expect(session.currentQuestion?.id).toBe("unit-authentication-check-2");
    expect(session.currentQuestion?.prompt).toContain("before dependent behavior runs");
  });

  it("finishes with a bounded summary after the final correct check-in", async () => {
    const runtime = learn(implementation);
    const session = await runtime.start(implementation);
    runtime.decide(session, true);
    await runtime.setConfidence(session, "comfortable");
    while (session.state === "quiz") await runtime.answer(session, session.currentQuestion!.correctChoiceId);

    expect(session.state).toBe("completed");
    expect(session.summary?.estimatedSessionMastery).toBe("demonstrated");
  });

  it("cancels without teaching when declined", async () => {
    const runtime = learn(implementation);
    const session = await runtime.start(implementation);
    runtime.decide(session, false);
    expect(session.state).toBe("cancelled");
    expect(runtime.history(session.id).map((event) => event.type)).not.toContain("LESSON_READY");
  });

  it("keeps event logs in a caller-selected JSONL file", () => {
    const filePath = join(mkdtempSync(join(tmpdir(), "learn-events-")), "events.jsonl");
    const store = new JsonlEventStore(filePath);
    store.append({ id: "event-1", sessionId: "session-1", sequence: 1, type: "SESSION_STARTED", occurredAt: "2026-01-01T00:00:00.000Z", payload: {} });

    expect(store.read("session-1")).toHaveLength(1);
    expect(readFileSync(filePath, "utf8")).toContain("SESSION_STARTED");
  });
});
