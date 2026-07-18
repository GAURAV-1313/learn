const transitions = {
    SESSION_STARTED: ["idle"],
    CONTEXT_READY: ["collecting_context"],
    OPPORTUNITY_DETECTED: ["analyzing"],
    CONCEPTS_EXTRACTED: ["analyzing"],
    PLAN_CREATED: ["planning"],
    LEARNING_RECOMMENDATION_PRESENTED: ["planning"],
    DECISION_RECORDED: ["waiting_for_decision"],
    CONFIDENCE_RECORDED: ["waiting_for_confidence"],
    LESSON_READY: ["teaching", "quiz"],
    QUESTION_PRESENTED: ["teaching", "quiz"],
    QUESTION_ANSWERED: ["quiz"],
    ANSWER_EVALUATED: ["quiz"],
    REINFORCEMENT_READY: ["quiz"],
    SUMMARY_READY: ["quiz", "teaching"],
    SESSION_FINISHED: ["summary"],
    SESSION_CANCELLED: ["collecting_context", "analyzing", "planning", "waiting_for_decision", "waiting_for_confidence", "teaching", "quiz"],
    OPERATION_FAILED: ["collecting_context", "analyzing", "planning", "teaching", "quiz"]
};
export function assertTransition(session, event) {
    const allowed = transitions[event] ?? [];
    if (!allowed.includes(session.state)) {
        throw new Error(`Cannot emit ${event} while session is ${session.state}.`);
    }
}
export function reduceState(state, event, payload) {
    switch (event) {
        case "SESSION_STARTED": return "collecting_context";
        case "CONTEXT_READY": return "analyzing";
        case "PLAN_CREATED": return "planning";
        case "LEARNING_RECOMMENDATION_PRESENTED": return "waiting_for_decision";
        // A declined decision is recorded before the explicit cancellation event so
        // consumers can distinguish “declined” from other cancellation causes.
        case "DECISION_RECORDED": return payload.accepted ? "waiting_for_confidence" : "waiting_for_decision";
        case "CONFIDENCE_RECORDED": return "teaching";
        case "QUESTION_PRESENTED": return "quiz";
        case "SUMMARY_READY": return "summary";
        case "SESSION_FINISHED": return "completed";
        case "SESSION_CANCELLED": return "cancelled";
        case "OPERATION_FAILED": return "failed";
        default: return state;
    }
}
