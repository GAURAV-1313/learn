import type {
  ConfidenceLevel, ImplementationContext, ImplementationLocator, LearnEvent, LearnEventType,
  Session, Summary
} from "../schemas/types.js";
import { assertImplementation, assertQuestion } from "../schemas/validate.js";
import { newId } from "../shared/id.js";
import type { EventStore } from "./event-store.js";
import { assertTransition, reduceState } from "./reducer.js";
import type {
  ConceptExtractor, ContextCollector, DocumentationResolver, EvaluationEngine, LearningPlanner,
  OpportunityDetector, QuizEngine, TeachingEngine
} from "../workers/contracts.js";

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

export class LearnRuntime {
  constructor(private readonly workers: RuntimeWorkers, private readonly events: EventStore) {}

  async start(implementation: ImplementationLocator): Promise<Session> {
    assertImplementation(implementation);
    const session: Session = { id: newId(), state: "idle", implementation, concepts: [], currentUnitIndex: 0, completedChecksForCurrentUnit: 0, correctAnswers: 0, incorrectAnswers: 0 };
    this.emit(session, "SESSION_STARTED", { invocation: "manual" });
    const context = await this.workers.contextCollector.collect();
    session.context = context;
    this.emit(session, "CONTEXT_READY", { evidenceCount: context.evidence.length });
    const opportunity = await this.workers.opportunityDetector.detect(context);
    session.opportunity = opportunity;
    this.emit(session, "OPPORTUNITY_DETECTED", opportunity);
    const concepts = await this.workers.conceptExtractor.extract(context);
    session.concepts = concepts;
    this.emit(session, "CONCEPTS_EXTRACTED", { concepts });
    session.state = "planning";
    session.plan = await this.workers.learningPlanner.plan(concepts);
    this.emit(session, "PLAN_CREATED", session.plan);
    this.emit(session, "LEARNING_RECOMMENDATION_PRESENTED", opportunity);
    return session;
  }

  decide(session: Session, accepted: boolean): Session {
    this.emit(session, "DECISION_RECORDED", { accepted });
    if (!accepted) this.emit(session, "SESSION_CANCELLED", { reason: "user_declined" });
    return session;
  }

  async setConfidence(session: Session, confidence: ConfidenceLevel): Promise<Session> {
    if (session.state !== "waiting_for_confidence") throw new Error("Confidence can only be recorded after acceptance.");
    session.confidence = confidence;
    this.emit(session, "CONFIDENCE_RECORDED", { confidence });
    await this.presentCurrentLearningStep(session, 1);
    return session;
  }

  async answer(session: Session, choiceId: string): Promise<Session> {
    if (session.state !== "quiz" || !session.currentQuestion) throw new Error("There is no active question.");
    const question = session.currentQuestion;
    this.emit(session, "QUESTION_ANSWERED", { questionId: question.id, choiceId });
    const evaluation = await this.workers.evaluationEngine.evaluate(question, choiceId);
    this.emit(session, "ANSWER_EVALUATED", evaluation);
    if (!evaluation.correct) {
      session.incorrectAnswers += 1;
      this.emit(session, "REINFORCEMENT_READY", { feedback: evaluation.feedback, unitId: question.unitId });
      await this.presentCurrentLearningStep(session, session.completedChecksForCurrentUnit + 1);
      return session;
    }
    session.correctAnswers += 1;
    session.completedChecksForCurrentUnit += 1;
    if (session.completedChecksForCurrentUnit < 2) {
      session.state = "teaching";
      await this.presentCurrentLearningStep(session, session.completedChecksForCurrentUnit + 1);
      return session;
    }
    session.currentUnitIndex += 1;
    session.completedChecksForCurrentUnit = 0;
    if (!session.plan || session.currentUnitIndex >= session.plan.units.length) {
      const summary = this.summarize(session);
      session.summary = summary;
      this.emit(session, "SUMMARY_READY", summary);
      this.emit(session, "SESSION_FINISHED", summary);
      return session;
    }
    session.state = "teaching";
    await this.presentCurrentLearningStep(session, 1);
    return session;
  }

  cancel(session: Session, reason = "user_cancelled"): Session {
    this.emit(session, "SESSION_CANCELLED", { reason });
    return session;
  }

  history(sessionId: string): LearnEvent[] { return this.events.read(sessionId); }

  private async presentCurrentLearningStep(session: Session, attempt: number): Promise<void> {
    const unit = session.plan?.units[session.currentUnitIndex];
    if (!unit || !session.context) throw new Error("Session has no learning unit to present.");
    session.state = "teaching";
    const unitConcepts = unit.conceptIds.map((id) => session.concepts.find((concept) => concept.id === id)).filter((concept): concept is NonNullable<typeof concept> => Boolean(concept));
    const docs = await Promise.all(unitConcepts.map((concept) => this.workers.documentationResolver.resolve(concept)));
    const lesson = await this.workers.teachingEngine.teach(unit.id, unitConcepts, session.context, docs);
    this.emit(session, "LESSON_READY", lesson);
    const question = await this.workers.quizEngine.question(unit.id, lesson, attempt);
    assertQuestion(question);
    session.currentQuestion = question;
    this.emit(session, "QUESTION_PRESENTED", question);
  }

  private summarize(session: Session): Summary {
    const concepts = session.plan?.units.map((unit) => unit.title) ?? [];
    return {
      conceptsLearned: concepts,
      weakAreas: session.incorrectAnswers ? ["One or more concepts needed reinforcement."] : [],
      estimatedSessionMastery: session.incorrectAnswers === 0 ? "demonstrated" : "developing",
      keyTakeaways: concepts.map((name) => `Connect ${name.toLowerCase()} to the implementation constraint it satisfies.`),
      limitations: ["This is an estimate of understanding demonstrated in this session, not long-term mastery."]
    };
  }

  private emit(session: Session, type: LearnEventType, payload: unknown): void {
    assertTransition(session, type);
    const event: LearnEvent = { id: newId(), sessionId: session.id, sequence: this.events.read(session.id).length + 1, type, occurredAt: new Date().toISOString(), payload };
    this.events.append(event);
    session.state = reduceState(session.state, type, payload);
  }
}

export function contextFromImplementation(implementation: ImplementationLocator): ImplementationContext {
  return {
    implementation,
    evidence: implementation.changedFiles.map((file) => ({ source: "file", label: file.summary, path: file.path, excerpt: file.excerpt })),
    expansionRequests: []
  };
}
