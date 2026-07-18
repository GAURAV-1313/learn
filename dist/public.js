import { MemoryEventStore } from "./runtime/event-store.js";
import { LearnRuntime, contextFromImplementation } from "./runtime/orchestrator.js";
import { DefaultContextCollector, DependencyLearningPlanner, DeterministicEvaluationEngine, GroundedTeachingEngine, HeuristicConceptExtractor, HeuristicOpportunityDetector, NoopDocumentationResolver, ReasoningQuizEngine } from "./workers/default-workers.js";
/** Creates the provider-neutral MVP capability. Providers render its emitted events however they choose. */
/**
 * Local demonstration runtime. The production experience is the agent-backed
 * Codex skill, which uses the active coding agent's reasoning directly.
 */
export function learn(implementation) {
    return new LearnRuntime({
        contextCollector: new DefaultContextCollector(contextFromImplementation(implementation)),
        opportunityDetector: new HeuristicOpportunityDetector(),
        conceptExtractor: new HeuristicConceptExtractor(),
        learningPlanner: new DependencyLearningPlanner(),
        documentationResolver: new NoopDocumentationResolver(),
        teachingEngine: new GroundedTeachingEngine(),
        quizEngine: new ReasoningQuizEngine(),
        evaluationEngine: new DeterministicEvaluationEngine()
    }, new MemoryEventStore());
}
export * from "./schemas/types.js";
export * from "./runtime/orchestrator.js";
export * from "./runtime/event-store.js";
