import { Command } from "commander";

import { registerTemplateAddCommand } from "@/commands/template-add";
import { registerTemplateEditCommand } from "@/commands/template-edit";
import { registerTemplateListCommand } from "@/commands/template-list";
import { registerTemplateRemoveCommand } from "@/commands/template-remove";
import { registerTemplateShowCommand } from "@/commands/template-show";

export function registerTemplateCommand(): Command {
	const cmd = new Command("template").description(
		"Manage template configurations",
	);

	cmd.addCommand(registerTemplateAddCommand());
	cmd.addCommand(registerTemplateListCommand());
	cmd.addCommand(registerTemplateShowCommand());
	cmd.addCommand(registerTemplateEditCommand());
	cmd.addCommand(registerTemplateRemoveCommand());

	return cmd;
}
