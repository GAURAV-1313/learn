import type { Concept, ConfidenceLevel, DocumentationResult, Evaluation, ImplementationContext, LearningOpportunity, LearningPlan, Lesson, Question } from "../schemas/types.js";
export interface ContextCollector {
    collect(): Promise<ImplementationContext>;
}
export interface OpportunityDetector {
    detect(context: ImplementationContext): Promise<LearningOpportunity>;
}
export interface ConceptExtractor {
    extract(context: ImplementationContext): Promise<Concept[]>;
}
export interface LearningPlanner {
    plan(concepts: Concept[], confidence?: ConfidenceLevel): Promise<LearningPlan>;
}
export interface DocumentationResolver {
    resolve(concept: Concept): Promise<DocumentationResult>;
}
export interface TeachingEngine {
    teach(unitId: string, concepts: Concept[], context: ImplementationContext, docs: DocumentationResult[]): Promise<Lesson>;
}
export interface QuizEngine {
    question(unitId: string, lesson: Lesson, attempt: number): Promise<Question>;
}
export interface EvaluationEngine {
    evaluate(question: Question, choiceId: string): Promise<Evaluation>;
}
