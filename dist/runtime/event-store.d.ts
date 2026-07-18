import type { LearnEvent } from "../schemas/types.js";
export interface EventStore {
    append(event: LearnEvent): void;
    read(sessionId: string): LearnEvent[];
}
export declare class MemoryEventStore implements EventStore {
    private readonly events;
    append(event: LearnEvent): void;
    read(sessionId: string): LearnEvent[];
}
/**
 * A deliberately small caller-owned persistence option. The runtime never
 * chooses a storage location or sends events elsewhere; the adapter supplies it.
 */
export declare class JsonlEventStore implements EventStore {
    private readonly filePath;
    constructor(filePath: string);
    append(event: LearnEvent): void;
    read(sessionId: string): LearnEvent[];
}
