import type { LearnEventType, Session, SessionState } from "../schemas/types.js";
export declare function assertTransition(session: Session, event: LearnEventType): void;
export declare function reduceState(state: SessionState, event: LearnEventType, payload: unknown): SessionState;
