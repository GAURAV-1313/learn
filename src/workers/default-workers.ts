import type {
  Concept, DocumentationResult, Evaluation, ImplementationContext, LearningOpportunity,
  LearningPlan, Lesson, Question
} from "../schemas/types.js";
import type {
  ConceptExtractor, ContextCollector, DocumentationResolver, EvaluationEngine, LearningPlanner,
  OpportunityDetector, QuizEngine, TeachingEngine
} from "./contracts.js";

const concepts: Array<{ match: RegExp; id: string; label: string; category: Concept["category"]; description: string; difficulty: Concept["difficulty"] }> = [
  { match: /oauth|auth|jwt|token|login|session/i, id: "authentication", label: "Authentication boundary", category: "concept", description: "Establishing trusted request identity before protected behavior.", difficulty: 3 },
  { match: /middleware|interceptor|guard/i, id: "middleware", label: "Request middleware", category: "pattern", description: "A boundary step that enriches or rejects a request before the handler.", difficulty: 2 },
  { match: /cache|redis|invalidate/i, id: "cache-invalidation", label: "Cache invalidation", category: "architecture_decision", description: "Keeping cached reads consistent after writes.", difficulty: 4 },
  { match: /retry|backoff|timeout/i, id: "retry-backoff", label: "Retry and backoff", category: "pattern", description: "Recovering from transient failures without amplifying load.", difficulty: 3 },
  { match: /transaction|migration|database|sql/i, id: "transaction-boundary", label: "Transaction boundary", category: "architecture_decision", description: "Making related persistence changes atomic.", difficulty: 4 }
];

export class DefaultContextCollector implements ContextCollector {
  constructor(private readonly context: ImplementationContext) {}
  async collect(): Promise<ImplementationContext> { return this.context; }
}

export class HeuristicOpportunityDetector implements OpportunityDetector {
  async detect(context: ImplementationContext): Promise<LearningOpportunity> {
    const text = `${context.implementation.task} ${context.implementation.changedFiles.map((f) => `${f.path} ${f.summary}`).join(" ")}`;
    const hits = concepts.filter((item) => item.match.test(text)).length;
    const architectureImpact = Math.min(1, hits / 3);
    const conceptDensity = Math.min(1, (hits + (context.implementation.changedFiles.length > 1 ? 1 : 0)) / 4);
    const score = Number((0.24 * Math.min(1, hits / 2) + 0.20 * architectureImpact + 0.18 * conceptDensity + 0.15 * (hits ? 0.6 : 0.1) + 0.13 * (hits ? 0.6 : 0.1) + 0.10 * architectureImpact).toFixed(2));
    const confidence = hits ? 0.78 : 0.52;
    return {
      score, confidence, estimatedMinutes: hits ? Math.min(8, 2 + hits * 2) : 2,
      recommendation: score >= 0.55 && confidence >= 0.65 ? "recommend" : score >= 0.3 ? "optional" : "skip",
      signals: { novelty: Math.min(1, hits / 2), architectureImpact, conceptDensity, dependencyDepth: hits ? 0.6 : 0.1, difficulty: hits ? 0.6 : 0.1, decisionSignificance: architectureImpact },
      reasoning: hits ? [`Detected ${hits} implementation-relevant concept area(s).`, "Recommendation is based on concepts and boundaries, not file size."] : ["No high-confidence concept cluster was detected from minimal context."]
    };
  }
}

export class HeuristicConceptExtractor implements ConceptExtractor {
  async extract(context: ImplementationContext): Promise<Concept[]> {
    const text = `${context.implementation.task} ${context.implementation.changedFiles.map((f) => `${f.path} ${f.summary} ${f.excerpt ?? ""}`).join(" ")}`;
    const evidence = context.evidence;
    const extracted: Concept[] = concepts.filter((item) => item.match.test(text)).map((item) => ({ ...item, evidence, prerequisites: [] }));
    if (extracted.some((item) => item.id === "middleware") && extracted.some((item) => item.id === "authentication")) {
      extracted.find((item) => item.id === "middleware")!.prerequisites = ["authentication"];
    }
    return extracted.length ? extracted : [{ id: "implementation-reasoning", label: "Implementation reasoning", category: "concept", description: "Relating a code change to its constraints and tradeoffs.", evidence, prerequisites: [], difficulty: 2 }];
  }
}

export class DependencyLearningPlanner implements LearningPlanner {
  async plan(items: Concept[]): Promise<LearningPlan> {
    const pending = new Map(items.map((concept) => [concept.id, concept]));
    const ordered: Concept[] = [];
    while (pending.size) {
      const ready = [...pending.values()].filter((concept) => concept.prerequisites.every((id) => !pending.has(id)));
      const next = ready.length ? ready : [pending.values().next().value as Concept];
      for (const concept of next) { ordered.push(concept); pending.delete(concept.id); }
    }
    const units = ordered.slice(0, 4).map((concept) => ({ id: `unit-${concept.id}`, conceptIds: [concept.id], title: concept.label, objective: `Explain why ${concept.label.toLowerCase()} matters in this implementation.`, prerequisites: concept.prerequisites.map((id) => `unit-${id}`), estimatedMinutes: concept.difficulty >= 4 ? 3 : 2 }));
    return { units, estimatedMinutes: units.reduce((total, unit) => total + unit.estimatedMinutes, 0), omittedConcepts: ordered.slice(4).map((concept) => concept.id) };
  }
}

export class NoopDocumentationResolver implements DocumentationResolver {
  async resolve(concept: Concept): Promise<DocumentationResult> { return { conceptId: concept.id, status: "not_needed", sources: [] }; }
}

export class GroundedTeachingEngine implements TeachingEngine {
  async teach(unitId: string, items: Concept[], context: ImplementationContext, docs: DocumentationResult[]): Promise<Lesson> {
    const concept = items[0];
    return {
      unitId, title: concept.label, what: concept.description,
      whyHere: `This matters because the implementation task is “${context.implementation.task}”.`,
      failureMode: `Without a clear ${concept.label.toLowerCase()} boundary, this change can behave incorrectly or become difficult to reason about.`,
      mentalModel: `Treat ${concept.label.toLowerCase()} as a deliberate checkpoint in the path from request to outcome.`,
      evidence: concept.evidence, documentation: docs.flatMap((result) => result.sources)
    };
  }
}

export class ReasoningQuizEngine implements QuizEngine {
  async question(unitId: string, lesson: Lesson, attempt: number): Promise<Question> {
    const correct = "causal";
    const mappingCheck = attempt === 1;
    return {
      id: `${unitId}-check-${attempt}`, unitId,
      prompt: mappingCheck
        ? `Think of ${lesson.title.toLowerCase()} as a checkpoint before a controlled area. In this implementation, what does that checkpoint represent?`
        : `In this implementation, why is ${lesson.title.toLowerCase()} needed before dependent behavior runs?`,
      choices: [
        { id: correct, text: mappingCheck ? "A technical boundary that establishes a constraint or trusted state before later behavior." : "It establishes a needed constraint or decision before the dependent behavior runs." },
        { id: "cosmetic", text: mappingCheck ? "A cosmetic sign that does not change who may enter or what happens next." : "It mainly makes the implementation shorter, without affecting behavior." },
        { id: "unrelated", text: mappingCheck ? "A separate building with no relationship to the controlled area." : "It is independent of the implementation and can be removed safely." }
      ],
      correctChoiceId: correct,
      rationales: {
        causal: mappingCheck ? "Correct: the real-world checkpoint maps to the technical boundary that establishes needed state or constraints." : "Correct: the concept exists to satisfy a dependency or behavioral constraint in this change.",
        cosmetic: "Not quite: the important reason is behavioral and architectural, not cosmetic.",
        unrelated: "Not quite: this concept is connected to the implementation's behavior and constraints."
      }
    };
  }
}

export class DeterministicEvaluationEngine implements EvaluationEngine {
  async evaluate(question: Question, choiceId: string): Promise<Evaluation> {
    const correct = choiceId === question.correctChoiceId;
    return { questionId: question.id, correct, action: correct ? "advance" : "reinforce", feedback: question.rationales[choiceId] ?? "That answer is not one of the available choices." };
  }
}
