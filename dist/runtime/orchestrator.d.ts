import type { ConfidenceLevel, ImplementationContext, ImplementationLocator, LearnEvent, Session } from "../schemas/types.js";
import type { EventStore } from "./event-store.js";
import type { ConceptExtractor, ContextCollector, DocumentationResolver, EvaluationEngine, LearningPlanner, OpportunityDetector, QuizEngine, TeachingEngine } from "../workers/contracts.js";
export interface RuntimeWorkers {
    contextCollector: ContextCollector;
    opportunityDetector: OpportunityDetector;
    conceptExtractor: ConceptExtractor;
    learningPlanner: LearningPlanner;
    documentationResolver: DocumentationResolver;
    teachingEngine: TeachingEngine;
    quizEngine: QuizEngine;
    evaluationEngine: EvaluationEngine;
}
export declare class LearnRuntime {
    private readonly workers;
    private readonly events;
    constructor(workers: RuntimeWorkers, events: EventStore);
    start(implementation: ImplementationLocator): Promise<Session>;
    decide(session: Session, accepted: boolean): Session;
    setConfidence(session: Session, confidence: ConfidenceLevel): Promise<Session>;
    answer(session: Session, choiceId: string): Promise<Session>;
    cancel(session: Session, reason?: string): Session;
    history(sessionId: string): LearnEvent[];
    private presentCurrentLearningStep;
    private summarize;
    private emit;
}
export declare function contextFromImplementation(implementation: ImplementationLocator): ImplementationContext;
