import { describe, expect, test } from "bun:test";

import { parseEditorCommand } from "@/utils/editor";

describe("utils/editor parseEditorCommand", () => {
	test("parses command with flags", () => {
		expect(parseEditorCommand("code -w")).toEqual({
			command: "code",
			args: ["-w"],
		});
	});

	test("parses quoted executable path", () => {
		expect(
			parseEditorCommand(
				"'/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code' -w",
			),
		).toEqual({
			command:
				"/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code",
			args: ["-w"],
		});
	});

	test("returns null for blank command", () => {
		expect(parseEditorCommand("   ")).toBeNull();
	});
});
