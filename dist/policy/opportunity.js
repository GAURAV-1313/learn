const strongRules = [
    { id: "external_contract_or_integration", match: /\b(oauth|webhook|sdk|integration|third[- ]party|api endpoint|public api|protocol|schema|migration|openapi|graphql)\b/i },
    { id: "architecture_or_cross_component_flow", match: /\b(middleware|pipeline|cross[- ]?(service|component)|event[- ]?driven|controller|service layer|handler|boundary)\b/i },
    { id: "security_or_reliability_boundary", match: /\b(auth(?:entication|orization)?|jwt|token|permission|security|encrypt|concurrenc\w*|race condition|retry|backoff|timeout|idempoten\w*|transaction|consisten\w*|failure handling|error handling)\b/i },
    { id: "consequential_tradeoff", match: /\b(trade[- ]?off|design decision|chose|choose|instead of|compatib(?:ility|le)|backward[- ]?compatible)\b/i }
];
const moderateRules = [
    { id: "reusable_pattern_or_lifecycle", match: /\b(adapter|strategy|factory|observer|cache|queue|algorithm|state machine|lifecycle|framework)\b/i },
    { id: "operational_behavior", match: /\b(config(?:uration)?|environment variable|feature flag|log(?:ging)?|metric|trace|observability|validat(?:e|ion)|test harness|fixture|mock|e2e|ci|deploy(?:ment)?)\b/i }
];
const excludedRules = [
    { id: "formatting_or_copy", match: /\b(format(?:ting)?|prettier|lint(?:ing)?|whitespace|copy change|comment(?:s)?|typo)\b/i },
    { id: "documentation_only", match: /\b(readme|documentation|docs?|changelog)\b/i },
    { id: "mechanical_rename", match: /\b(rename|renaming|move(?:d)? files?)\b/i },
    { id: "dependency_bump", match: /\b(dependency|package) (?:bump|update|upgrade)\b/i },
    { id: "straightforward_local_fix", match: /\b(simple|straightforward|localized|local) (?:bug )?fix\b/i }
];
function implementationText(context) {
    const { implementation } = context;
    return `${implementation.task} ${implementation.conversationSummary ?? ""} ${implementation.changedFiles.map((file) => `${file.path} ${file.summary} ${file.excerpt ?? ""}`).join(" ")}`;
}
function isGenerated(file) {
    return /(^|\/)(dist|build|coverage|generated)(\/|$)|\.(lock|snap)$/i.test(file.path) || /generated file/i.test(file.summary);
}
function isTestFile(file) {
    return /(^|\/)(test|tests|__tests__|spec)(\/|$)|\.(test|spec)\.[cm]?[jt]sx?$/i.test(file.path);
}
function isDocumentationFile(file) {
    return /(^|\/)(readme|changelog|docs?)(\/|\.|$)|\.(md|mdx|txt)$/i.test(file.path);
}
function isDependencyFile(file) {
    return /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|composer\.lock|poetry\.lock)$/i.test(file.path);
}
function uniqueMatches(text, rules) {
    return rules.filter((rule) => rule.match.test(text)).map((rule) => rule.id);
}
function sourceLabel(context) {
    const file = context.implementation.changedFiles.find((candidate) => !isGenerated(candidate));
    if (file)
        return file.path;
    const evidence = context.evidence.find((candidate) => candidate.path || candidate.label);
    return evidence?.path ?? evidence?.label ?? "the completed implementation";
}
/**
 * Deterministic parity policy for the agent-backed skill. It is deliberately
 * evidence-based and selective; it is not the production authority on a
 * conversation's technical meaning.
 */
export function evaluateLearningOpportunity(context) {
    const { implementation } = context;
    const text = implementationText(context);
    const excludedChangeCategories = uniqueMatches(text, excludedRules);
    if (implementation.changedFiles.some(isGenerated))
        excludedChangeCategories.push("generated_or_lockfile_change");
    const inspectable = Boolean(implementation.task.trim()) && (context.evidence.length > 0 || implementation.changedFiles.length > 0);
    const strongSignals = uniqueMatches(text, strongRules);
    const moderateSignals = uniqueMatches(text, moderateRules);
    const changedSourceFiles = implementation.changedFiles.filter((file) => !isGenerated(file) && !isTestFile(file) && !isDocumentationFile(file) && !isDependencyFile(file));
    const testFiles = implementation.changedFiles.filter(isTestFile);
    const testStrategy = moderateSignals.includes("operational_behavior");
    if (changedSourceFiles.length >= 2 && /\b(import|depend(?:s|ency|ent)|consumer|producer|route|service|handler)\b/i.test(text)) {
        moderateSignals.push("cross_component_dependency");
    }
    if (testFiles.length > 0 && changedSourceFiles.length === 0 && !testStrategy)
        excludedChangeCategories.push("test_only_without_strategy");
    const uniqueStrong = [...new Set(strongSignals)];
    const uniqueModerate = [...new Set(moderateSignals)];
    const meaningfulEvidence = changedSourceFiles.length > 0 || (testFiles.length > 0 && testStrategy);
    const onlyExcluded = implementation.changedFiles.length > 0 && !meaningfulEvidence;
    const conceptFingerprint = `learning-policy/v1:${[...uniqueStrong, ...uniqueModerate].sort().join("+") || "no-meaningful-cluster"}`;
    if (!inspectable || onlyExcluded) {
        const reason = !inspectable
            ? "Skipped automatic learning because the completed implementation lacks inspectable task or file evidence."
            : `Skipped automatic learning because the change is limited to ${[...new Set(excludedChangeCategories)].join(", ")}.`;
        return {
            score: 0,
            confidence: 0.9,
            estimatedMinutes: 0,
            recommendation: "skip",
            signals: {},
            strongSignals: uniqueStrong,
            moderateSignals: uniqueModerate,
            excludedChangeCategories: [...new Set(excludedChangeCategories)],
            conceptFingerprint,
            reasoning: [reason, "Manual /codecall or $codecall remains available."]
        };
    }
    const recommendation = uniqueStrong.length >= 1 || uniqueModerate.length >= 2
        ? "recommend"
        : uniqueModerate.length === 1 ? "optional" : "skip";
    const score = Number(Math.min(1, uniqueStrong.length * 0.65 + uniqueModerate.length * 0.3).toFixed(2));
    const signalNames = [...uniqueStrong, ...uniqueModerate];
    const reason = signalNames.length
        ? `Implementation evidence in ${sourceLabel(context)} indicates ${signalNames.join(", ")}.`
        : `No strong signal or pair of moderate signals was found in ${sourceLabel(context)}.`;
    return {
        score,
        confidence: 0.8,
        estimatedMinutes: recommendation === "recommend" ? Math.min(8, 3 + signalNames.length) : recommendation === "optional" ? 3 : 0,
        recommendation,
        signals: Object.fromEntries([...uniqueStrong.map((id) => [id, 1]), ...uniqueModerate.map((id) => [id, 0.5])]),
        strongSignals: uniqueStrong,
        moderateSignals: uniqueModerate,
        excludedChangeCategories: [...new Set(excludedChangeCategories)],
        conceptFingerprint,
        reasoning: [reason, "Decision is based on implementation evidence and policy signals, never line count."]
    };
}
/** Deduplicates concept clusters for the lifetime of one runtime/session only. */
export class SessionOpportunityDeduper {
    evaluatedFingerprints = new Set();
    evaluate(context) {
        const opportunity = evaluateLearningOpportunity(context);
        if (this.evaluatedFingerprints.has(opportunity.conceptFingerprint)) {
            return {
                ...opportunity,
                recommendation: "skip",
                estimatedMinutes: 0,
                excludedChangeCategories: [...opportunity.excludedChangeCategories, "already_evaluated_in_session"],
                reasoning: [`Skipped automatic learning because ${opportunity.conceptFingerprint} was already evaluated in this session.`, "Manual /codecall or $codecall remains available."]
            };
        }
        this.evaluatedFingerprints.add(opportunity.conceptFingerprint);
        return opportunity;
    }
}
