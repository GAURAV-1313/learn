import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
function packagedSkillSource() {
    const here = dirname(fileURLToPath(import.meta.url));
    return join(here, "..", "skill");
}
function copySkill(destinationRoot) {
    const source = packagedSkillSource();
    if (!existsSync(source))
        throw new Error(`Packaged skill source was not found: ${source}`);
    mkdirSync(destinationRoot, { recursive: true });
    const destination = join(destinationRoot, "codecall");
    cpSync(source, destination, { recursive: true, force: true });
    const legacySkill = join(destinationRoot, "learn");
    if (existsSync(legacySkill))
        rmSync(legacySkill, { recursive: true, force: true });
    return destination;
}
/** Copy the packaged skill into Codex's discoverable skill directory. */
export function installSkill(destinationRoot = process.env.CODEX_HOME ? join(process.env.CODEX_HOME, "skills") : join(homedir(), ".codex", "skills")) {
    return copySkill(destinationRoot);
}
/** Copy the same Agent Skills-standard skill into Claude Code's personal directory. */
export function installClaudeSkill(destinationRoot = process.env.CLAUDE_CONFIG_DIR ? join(process.env.CLAUDE_CONFIG_DIR, "skills") : join(homedir(), ".claude", "skills")) {
    return copySkill(destinationRoot);
}
const invokedAsScript = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedAsScript) {
    if (process.argv.includes("--global-only") && process.env.npm_config_global !== "true")
        process.exit(0);
    try {
        console.log(`Installed Codex skill at ${installSkill()}`);
        console.log(`Installed Claude Code skill at ${installClaudeSkill()}`);
    }
    catch (error) {
        console.warn(`Could not install the codecall skill: ${error instanceof Error ? error.message : String(error)}`);
    }
}
