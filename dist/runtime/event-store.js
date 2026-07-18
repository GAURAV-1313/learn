import { appendFileSync, existsSync, readFileSync } from "node:fs";
export class MemoryEventStore {
    events = [];
    append(event) {
        this.events.push(structuredClone(event));
    }
    read(sessionId) {
        return this.events.filter((event) => event.sessionId === sessionId).map((event) => structuredClone(event));
    }
}
/**
 * A deliberately small caller-owned persistence option. The runtime never
 * chooses a storage location or sends events elsewhere; the adapter supplies it.
 */
export class JsonlEventStore {
    filePath;
    constructor(filePath) {
        this.filePath = filePath;
    }
    append(event) {
        appendFileSync(this.filePath, `${JSON.stringify(event)}\n`, "utf8");
    }
    read(sessionId) {
        if (!existsSync(this.filePath))
            return [];
        return readFileSync(this.filePath, "utf8")
            .split("\n")
            .filter(Boolean)
            .map((line) => JSON.parse(line))
            .filter((event) => event.sessionId === sessionId);
    }
}
