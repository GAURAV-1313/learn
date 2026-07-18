export type SessionState = "idle" | "collecting_context" | "analyzing" | "planning" | "waiting_for_decision" | "waiting_for_confidence" | "teaching" | "quiz" | "summary" | "completed" | "cancelled" | "recovering" | "failed";
export type ConfidenceLevel = "expert" | "comfortable" | "heard_of_it" | "never_learned";
export type ConceptCategory = "technology" | "concept" | "pattern" | "anti_pattern" | "architecture_decision" | "misconception";
export interface EvidenceRef {
    source: "task" | "conversation" | "diff" | "file";
    label: string;
    path?: string;
    lineStart?: number;
    lineEnd?: number;
    excerpt?: string;
}
export interface ChangedFile {
    path: string;
    summary: string;
    excerpt?: string;
}
export interface ImplementationLocator {
    task: string;
    changedFiles: ChangedFile[];
    conversationSummary?: string;
    revision?: string;
}
export interface ImplementationContext {
    implementation: ImplementationLocator;
    evidence: EvidenceRef[];
    expansionRequests: Array<{
        purpose: string;
        allowed: boolean;
    }>;
}
export interface LearningOpportunity {
    score: number;
    confidence: number;
    estimatedMinutes: number;
    recommendation: "recommend" | "optional" | "skip";
    signals: Record<string, number>;
    reasoning: string[];
}
export interface Concept {
    id: string;
    label: string;
    category: ConceptCategory;
    description: string;
    evidence: EvidenceRef[];
    prerequisites: string[];
    difficulty: 1 | 2 | 3 | 4 | 5;
}
export interface LearningUnit {
    id: string;
    conceptIds: string[];
    title: string;
    objective: string;
    prerequisites: string[];
    estimatedMinutes: number;
}
export interface LearningPlan {
    units: LearningUnit[];
    estimatedMinutes: number;
    omittedConcepts: string[];
}
export interface DocumentationSource {
    title: string;
    url: string;
    authority: "official" | "standard" | "project";
}
export interface DocumentationResult {
    conceptId: string;
    status: "resolved" | "unavailable" | "not_needed";
    sources: DocumentationSource[];
}
export interface Lesson {
    unitId: string;
    title: string;
    what: string;
    whyHere: string;
    failureMode: string;
    mentalModel: string;
    evidence: EvidenceRef[];
    documentation: DocumentationSource[];
}
export interface Choice {
    id: string;
    text: string;
}
export interface Question {
    id: string;
    unitId: string;
    prompt: string;
    choices: Choice[];
    correctChoiceId: string;
    rationales: Record<string, string>;
}
export interface Evaluation {
    questionId: string;
    correct: boolean;
    action: "advance" | "reinforce" | "finish";
    feedback: string;
}
export interface Summary {
    conceptsLearned: string[];
    weakAreas: string[];
    estimatedSessionMastery: "emerging" | "developing" | "demonstrated";
    keyTakeaways: string[];
    limitations: string[];
}
export type LearnEventType = "SESSION_STARTED" | "CONTEXT_READY" | "OPPORTUNITY_DETECTED" | "CONCEPTS_EXTRACTED" | "PLAN_CREATED" | "LEARNING_RECOMMENDATION_PRESENTED" | "DECISION_RECORDED" | "CONFIDENCE_RECORDED" | "LESSON_READY" | "QUESTION_PRESENTED" | "QUESTION_ANSWERED" | "ANSWER_EVALUATED" | "REINFORCEMENT_READY" | "SUMMARY_READY" | "SESSION_FINISHED" | "SESSION_CANCELLED" | "OPERATION_FAILED";
export interface LearnEvent<T = unknown> {
    id: string;
    sessionId: string;
    sequence: number;
    type: LearnEventType;
    occurredAt: string;
    payload: T;
}
export interface Session {
    id: string;
    state: SessionState;
    implementation: ImplementationLocator;
    context?: ImplementationContext;
    opportunity?: LearningOpportunity;
    concepts: Concept[];
    plan?: LearningPlan;
    confidence?: ConfidenceLevel;
    currentUnitIndex: number;
    completedChecksForCurrentUnit: number;
    correctAnswers: number;
    incorrectAnswers: number;
    currentQuestion?: Question;
    summary?: Summary;
}
