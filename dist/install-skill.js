import { cpSync, existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
/** Copy the packaged Codex skill into the user's discoverable skill directory. */
export function installSkill(destinationRoot = process.env.CODEX_HOME ? join(process.env.CODEX_HOME, "skills") : join(homedir(), ".codex", "skills")) {
    const here = dirname(fileURLToPath(import.meta.url));
    const source = join(here, "..", "skill");
    if (!existsSync(source))
        throw new Error(`Packaged skill source was not found: ${source}`);
    mkdirSync(destinationRoot, { recursive: true });
    const destination = join(destinationRoot, "learn");
    cpSync(source, destination, { recursive: true, force: true });
    return destination;
}
const invokedAsScript = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedAsScript) {
    if (process.argv.includes("--global-only") && process.env.npm_config_global !== "true")
        process.exit(0);
    try {
        console.log(`Installed Codex skill at ${installSkill()}`);
    }
    catch (error) {
        console.warn(`Could not install the Codex skill: ${error instanceof Error ? error.message : String(error)}`);
    }
}
