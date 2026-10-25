import { spawnSync } from "node:child_process";
import {
    copyFileSync,
    mkdirSync,
    mkdtempSync,
    rmSync,
    symlinkSync,
    unlinkSync,
    writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const serverRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixtures: string[] = [];

function writeJson(fileName: string, value: unknown) {
    writeFileSync(fileName, JSON.stringify(value));
}

function createProject(maxErrors = 1, source = 'const value: number = "one";\n') {
    const fixture = mkdtempSync(join(tmpdir(), "sway-typecheck-"));
    fixtures.push(fixture);
    const project = join(fixture, "server");
    mkdirSync(join(project, "scripts"), { recursive: true });
    mkdirSync(join(project, "node_modules"), { recursive: true });
    copyFileSync(
        join(serverRoot, "scripts/check-typecheck.ts"),
        join(project, "scripts/check-typecheck.ts"),
    );
    symlinkSync(
        join(serverRoot, "node_modules/typescript"),
        join(project, "node_modules/typescript"),
        "dir",
    );
    writeJson(join(project, "typecheck-baseline.json"), { maxErrors });
    writeJson(join(project, "tsconfig.json"), {
        compilerOptions: { strict: true, skipLibCheck: true, types: [] },
        files: ["entry.ts"],
    });
    writeFileSync(join(project, "entry.ts"), source);
    return project;
}

function runGuard(project: string) {
    const result = spawnSync("bun", ["run", join(project, "scripts/check-typecheck.ts")], {
        // The guard must resolve its own project, regardless of the caller's directory.
        cwd: tmpdir(),
        encoding: "utf8",
        timeout: 15_000,
    });
    expect(result.error).toBeUndefined();
    expect(result.signal).toBeNull();
    return { status: result.status, output: result.stdout + result.stderr };
}

afterEach(() => {
    for (const fixture of fixtures.splice(0)) {
        rmSync(fixture, { recursive: true, force: true });
    }
});

describe("Typecheck CI ratchet", () => {
    it("allows existing errors and reductions, and rejects an increase", () => {
        const project = createProject();
        expect(runGuard(project)).toMatchObject({ status: 0 });

        writeJson(join(project, "typecheck-baseline.json"), { maxErrors: 2 });
        expect(runGuard(project)).toMatchObject({ status: 0 });

        writeFileSync(
            join(project, "entry.ts"),
            'const value: number = "one";\nconst other: number = "two";\nconst third: number = "three";\n',
        );
        const result = runGuard(project);
        expect(result.status).toBe(1);
        expect(result.output).toContain("TypeScript errors: 3; allowed: 2.");
    });

    it("requires a clean check when the baseline reaches zero", () => {
        const project = createProject(0, "const value: number = 1;\n");
        expect(runGuard(project)).toMatchObject({ status: 0 });

        writeFileSync(join(project, "entry.ts"), 'const value: number = "one";\n');
        expect(runGuard(project)).toMatchObject({ status: 1 });
    });

    it("counts diagnostics rather than diagnostic-like text inside an error message", () => {
        const result = runGuard(createProject(1, 'const value: number = "error TS9999:";\n'));
        expect(result.status).toBe(0);
        expect(result.output).toContain("TypeScript errors: 1; allowed: 1.");
    });

    it("rejects missing type libraries even when their diagnostic count fits the baseline", () => {
        const project = createProject(225);
        writeJson(join(project, "tsconfig.json"), {
            compilerOptions: { types: ["sway-nonexistent-types"] },
            files: ["entry.ts"],
        });
        const result = runGuard(project);
        expect(result.status).toBe(1);
        expect(result.output).toContain("TS2688");
        expect(result.output).toContain("could not complete a full check");
    });

    it("rejects invalid compiler options rather than accepting them as existing type debt", () => {
        const project = createProject(225);
        writeJson(join(project, "tsconfig.json"), {
            compilerOptions: { notARealCompilerOption: true },
            files: ["entry.ts"],
        });
        const result = runGuard(project);
        expect(result.status).toBe(1);
        expect(result.output).toContain("TS5023");
    });

    it("rejects syntax errors that can stop the compiler from checking semantic errors", () => {
        const result = runGuard(createProject(225, "const value: number = ;\n"));
        expect(result.status).toBe(1);
        expect(result.output).toContain("could not complete a full check");
    });

    it("rejects a project with no inputs", () => {
        const project = createProject(225);
        writeJson(join(project, "tsconfig.json"), { files: [] });
        const result = runGuard(project);
        expect(result.status).toBe(1);
        expect(result.output).toContain("TS18002");
    });

    it("requires the server config instead of falling back to an ancestor config", () => {
        const project = createProject(225);
        writeJson(join(dirname(project), "tsconfig.json"), { files: ["server/entry.ts"] });
        unlinkSync(join(project, "tsconfig.json"));
        const result = runGuard(project);
        expect(result.status).toBe(1);
        expect(result.output).toContain("TS5083");
    });

    it("performs semantic checks even if noCheck is enabled in the config", () => {
        const project = createProject(0);
        writeJson(join(project, "tsconfig.json"), {
            compilerOptions: { noCheck: true, types: [] },
            files: ["entry.ts"],
        });
        const result = runGuard(project);
        expect(result.status).toBe(1);
        expect(result.output).toContain("TS2322");
    });

    it("fails when the compiler cannot be loaded", () => {
        const project = createProject(225);
        unlinkSync(join(project, "node_modules/typescript"));
        expect(runGuard(project)).toMatchObject({ status: 1 });
    });

    it("fails when the compiler throws", () => {
        const project = createProject(225);
        const compiler = join(project, "node_modules/typescript");
        unlinkSync(compiler);
        mkdirSync(compiler);
        writeJson(join(compiler, "package.json"), { type: "module", main: "index.js" });
        writeFileSync(
            join(compiler, "index.js"),
            'export default { sys: { readFile() {} }, readConfigFile() { throw new Error("simulated compiler failure"); } };\n',
        );
        const result = runGuard(project);
        expect(result.status).toBe(1);
        expect(result.output).toContain("TypeScript could not complete.");
        expect(result.output).toContain("simulated compiler failure");
    });

    it("rejects an invalid baseline before accepting a compiler result", () => {
        const project = createProject();
        writeJson(join(project, "typecheck-baseline.json"), { maxErrors: "225" });
        const result = runGuard(project);
        expect(result.status).toBe(1);
        expect(result.output).toContain("must contain a nonnegative integer maxErrors");
    });
});
