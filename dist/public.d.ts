import type { ImplementationLocator } from "./schemas/types.js";
import { LearnRuntime } from "./runtime/orchestrator.js";
/** Creates the provider-neutral MVP capability. Providers render its emitted events however they choose. */
/**
 * Local demonstration runtime. The production experience is the agent-backed
 * Codex skill, which uses the active coding agent's reasoning directly.
 */
export declare function learn(implementation: ImplementationLocator): LearnRuntime;
export * from "./schemas/types.js";
export * from "./runtime/orchestrator.js";
export * from "./runtime/event-store.js";
