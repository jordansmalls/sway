import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const formatHost: ts.FormatDiagnosticsHost = {
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: () => projectRoot,
    getNewLine: () => "\n",
};

function reportCompilerErrors(diagnostics: readonly ts.Diagnostic[]) {
    if (!diagnostics.some((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error)) {
        return false;
    }
    process.stdout.write(ts.formatDiagnostics(diagnostics, formatHost));
    console.error(
        "TypeScript could not complete a full check. Fix compiler or configuration errors.",
    );
    return true;
}

function checkTypecheck() {
    const baseline: { maxErrors?: unknown } | null = JSON.parse(
        readFileSync(resolve(projectRoot, "typecheck-baseline.json"), "utf8"),
    );
    if (
        typeof baseline?.maxErrors !== "number" ||
        !Number.isSafeInteger(baseline.maxErrors) ||
        baseline.maxErrors < 0
    ) {
        throw new Error("typecheck-baseline.json must contain a nonnegative integer maxErrors.");
    }

    const configPath = resolve(projectRoot, "tsconfig.json");
    const config = ts.readConfigFile(configPath, ts.sys.readFile);
    if (config.error && reportCompilerErrors([config.error])) {
        return 1;
    }
    const parsed = ts.parseJsonConfigFileContent(
        config.config,
        ts.sys,
        projectRoot,
        { noEmit: true, noCheck: false },
        configPath,
    );
    if (reportCompilerErrors(parsed.errors)) {
        return 1;
    }

    const program = ts.createProgram({
        rootNames: parsed.fileNames,
        options: parsed.options,
        projectReferences: parsed.projectReferences,
    });
    // These failures can prevent tsc from checking the existing semantic errors at all.
    if (
        reportCompilerErrors([
            ...program.getOptionsDiagnostics(),
            ...program.getGlobalDiagnostics(),
            ...program.getSyntacticDiagnostics(),
        ])
    ) {
        return 1;
    }

    const diagnostics = ts.getPreEmitDiagnostics(program);
    process.stdout.write(ts.formatDiagnostics(diagnostics, formatHost));
    const errors = diagnostics.filter(
        (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
    ).length;
    console.log(`TypeScript errors: ${errors}; allowed: ${baseline.maxErrors}.`);
    if (errors > baseline.maxErrors) {
        console.error("Typecheck failed. Fix new errors without increasing the baseline.");
        return 1;
    }
    if (errors < baseline.maxErrors) {
        console.log(
            `Lower typecheck-baseline.json maxErrors to ${errors} to keep this improvement.`,
        );
    }
    return 0;
}

if (import.meta.main) {
    try {
        process.exitCode = checkTypecheck();
    } catch (error) {
        console.error("TypeScript could not complete.", error);
        process.exitCode = 1;
    }
}
