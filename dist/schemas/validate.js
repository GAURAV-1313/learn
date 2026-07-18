export function assertImplementation(input) {
    if (!input.task.trim())
        throw new Error("Implementation task is required.");
    if (!Array.isArray(input.changedFiles))
        throw new Error("changedFiles must be an array.");
    for (const file of input.changedFiles) {
        if (!file.path || !file.summary)
            throw new Error("Every changed file needs a path and summary.");
    }
}
export function assertQuestion(question) {
    if (question.choices.length < 2)
        throw new Error("A question needs at least two choices.");
    if (!question.choices.some((choice) => choice.id === question.correctChoiceId)) {
        throw new Error("Question correct choice must exist in choices.");
    }
}
