#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { learn } from "./public.js";
function parseArguments(values) {
    const parsed = { fromGit: false, help: false };
    for (let index = 0; index < values.length; index += 1) {
        if (values[index] === "--task")
            parsed.task = values[++index];
        else if (values[index] === "--from-git")
            parsed.fromGit = true;
        else if (values[index] === "--help" || values[index] === "-h")
            parsed.help = true;
        else
            throw new Error(`Unknown argument: ${values[index]}`);
    }
    return parsed;
}
function help() {
    console.log(`Usage: learn --task "Describe the implementation" [--from-git]

Starts an adaptive learning session. --from-git adds changed-file summaries and
small excerpts from the current working tree. For the full agent-backed
experience, invoke $learn in Codex after completing an implementation.`);
}
function changedFilesFromGit() {
    const options = { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] };
    try {
        // Porcelain status includes staged, unstaged, and newly-created files, even
        // in a repository that has not created its first commit yet.
        const names = execFileSync("git", ["status", "--porcelain"], options)
            .split("\n")
            .map((line) => line.slice(3).trim())
            .map((path) => path.includes(" -> ") ? path.split(" -> ").at(-1) : path)
            .filter(Boolean);
        return names.slice(0, 12).map((path) => {
            let excerpt;
            try {
                excerpt = readFileSync(path, "utf8").slice(0, 1_500);
            }
            catch { /* deleted or binary file */ }
            return { path, summary: "Changed in the current Git diff.", excerpt };
        });
    }
    catch {
        return [];
    }
}
function latest(events, type) {
    return [...events].reverse().find((event) => event.type === type)?.payload;
}
function printLesson(lesson) {
    console.log(`\n${lesson.title}\n${lesson.what}\n\nWhy here: ${lesson.whyHere}\nWhat breaks: ${lesson.failureMode}\nMental model: ${lesson.mentalModel}`);
}
async function main() {
    const args = parseArguments(process.argv.slice(2));
    if (args.help)
        return help();
    const rl = createInterface({ input, output });
    try {
        const task = args.task ?? await rl.question("What implementation did you complete? ");
        const implementation = { task, changedFiles: args.fromGit ? changedFilesFromGit() : [] };
        const runtime = learn(implementation);
        const session = await runtime.start(implementation);
        const opportunity = session.opportunity;
        console.log(`\nLearning opportunity: ${opportunity.recommendation} · ${opportunity.estimatedMinutes} minutes\n${opportunity.reasoning.join(" ")}`);
        const accepted = /^(y|yes)$/i.test(await rl.question("Start learning? [y/N] "));
        runtime.decide(session, accepted);
        if (!accepted) {
            console.log("Learning skipped.");
            return;
        }
        const confidence = (await rl.question("Confidence [expert / comfortable / heard_of_it / never_learned]: ")).trim();
        if (!["expert", "comfortable", "heard_of_it", "never_learned"].includes(confidence)) {
            throw new Error("Choose expert, comfortable, heard_of_it, or never_learned.");
        }
        await runtime.setConfidence(session, confidence);
        let renderedLessonCount = 0;
        while (session.state === "quiz" && session.currentQuestion) {
            const events = runtime.history(session.id);
            const lessons = events.filter((event) => event.type === "LESSON_READY");
            if (lessons.length > renderedLessonCount) {
                printLesson(latest(events, "LESSON_READY"));
                renderedLessonCount = lessons.length;
            }
            const question = session.currentQuestion;
            console.log(`\n${question.prompt}`);
            question.choices.forEach((choice, index) => console.log(`  ${index + 1}. ${choice.text}`));
            const selected = Number(await rl.question("Your answer: ")) - 1;
            const choice = question.choices[selected];
            if (!choice) {
                console.log("Choose one of the displayed numbers.");
                continue;
            }
            await runtime.answer(session, choice.id);
            const feedback = latest(runtime.history(session.id), "ANSWER_EVALUATED");
            if (feedback)
                console.log(`\n${feedback.feedback}`);
        }
        if (session.summary)
            console.log(`\nSession complete\nMastery: ${session.summary.estimatedSessionMastery}\nTakeaways:\n- ${session.summary.keyTakeaways.join("\n- ")}`);
    }
    finally {
        rl.close();
    }
}
main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
