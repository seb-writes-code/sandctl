import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
	cleanupTempHome,
	hasCompiledBinary,
	makeTempHome,
	runBinary,
} from "./helpers";

describe("template commands contract", () => {
	const templateTests = hasCompiledBinary() ? test : test.skip;

	templateTests(
		"add -> list -> show -> edit -> remove works on compiled binary",
		() => {
			const home = makeTempHome();
			const templateName = "My API";
			const normalizedName = "my-api";
			const templateDir = path.join(
				home,
				".sandctl",
				"templates",
				normalizedName,
			);
			const configPath = path.join(templateDir, "config.yaml");
			const initPath = path.join(templateDir, "init.sh");

			try {
				const addResult = runBinary(["template", "add", templateName], {
					env: { HOME: home, EDITOR: "true" },
				});
				expect(addResult.code).toBe(0);
				expect(addResult.stdout).toContain(
					`Created template '${templateName}'`,
				);
				expect(existsSync(configPath)).toBeTrue();
				expect(existsSync(initPath)).toBeTrue();

				const configContent = readFileSync(configPath, "utf8");
				expect(configContent).toContain("template: my-api");
				expect(configContent).toContain("original_name: My API");

				const listResult = runBinary(["template", "list"], {
					env: { HOME: home },
				});
				expect(listResult.code).toBe(0);
				expect(listResult.stdout).toContain("NAME");
				expect(listResult.stdout).toContain("CREATED");
				expect(listResult.stdout).toContain(templateName);

				const showResult = runBinary(["template", "show", templateName], {
					env: { HOME: home },
				});
				expect(showResult.code).toBe(0);
				expect(showResult.stdout).toContain("#!/bin/bash");
				expect(showResult.stdout).toContain(
					"Template 'My API' initialized successfully",
				);

				const editResult = runBinary(["template", "edit", templateName], {
					env: { HOME: home, EDITOR: "true" },
				});
				expect(editResult.code).toBe(0);

				const removeResult = runBinary(
					["template", "remove", templateName, "--force"],
					{ env: { HOME: home } },
				);
				expect(removeResult.code).toBe(0);
				expect(removeResult.stdout).toContain(
					`Template '${templateName}' deleted.`,
				);
				expect(existsSync(templateDir)).toBeFalse();
			} finally {
				cleanupTempHome(home);
			}
		},
	);

	templateTests("remove without --force fails in non-interactive mode", () => {
		const home = makeTempHome();
		try {
			const addResult = runBinary(["template", "add", "Ghost"], {
				env: { HOME: home, EDITOR: "true" },
			});
			expect(addResult.code).toBe(0);

			const removeResult = runBinary(["template", "remove", "Ghost"], {
				env: { HOME: home },
			});
			expect(removeResult.code).toBe(1);
			expect(removeResult.stderr).toContain(
				"confirmation required. Run in interactive terminal or use --force flag",
			);
		} finally {
			cleanupTempHome(home);
		}
	});
});
