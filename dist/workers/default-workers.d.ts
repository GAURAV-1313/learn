import type { Concept, DocumentationResult, Evaluation, ImplementationContext, LearningOpportunity, LearningPlan, Lesson, Question } from "../schemas/types.js";
import type { ConceptExtractor, ContextCollector, DocumentationResolver, EvaluationEngine, LearningPlanner, OpportunityDetector, QuizEngine, TeachingEngine } from "./contracts.js";
export declare class DefaultContextCollector implements ContextCollector {
    private readonly context;
    constructor(context: ImplementationContext);
    collect(): Promise<ImplementationContext>;
}
export declare class HeuristicOpportunityDetector implements OpportunityDetector {
    detect(context: ImplementationContext): Promise<LearningOpportunity>;
}
export declare class HeuristicConceptExtractor implements ConceptExtractor {
    extract(context: ImplementationContext): Promise<Concept[]>;
}
export declare class DependencyLearningPlanner implements LearningPlanner {
    plan(items: Concept[]): Promise<LearningPlan>;
}
export declare class NoopDocumentationResolver implements DocumentationResolver {
    resolve(concept: Concept): Promise<DocumentationResult>;
}
export declare class GroundedTeachingEngine implements TeachingEngine {
    teach(unitId: string, items: Concept[], context: ImplementationContext, docs: DocumentationResult[]): Promise<Lesson>;
}
export declare class ReasoningQuizEngine implements QuizEngine {
    question(unitId: string, lesson: Lesson, attempt: number): Promise<Question>;
}
export declare class DeterministicEvaluationEngine implements EvaluationEngine {
    evaluate(question: Question, choiceId: string): Promise<Evaluation>;
}
