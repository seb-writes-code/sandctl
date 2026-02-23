import { Command } from "commander";

import { registerTemplateAddCommand } from "@/commands/template/add";
import { registerTemplateEditCommand } from "@/commands/template/edit";
import { registerTemplateListCommand } from "@/commands/template/list";
import { registerTemplateRemoveCommand } from "@/commands/template/remove";
import { registerTemplateShowCommand } from "@/commands/template/show";

export function registerTemplateCommand(): Command {
	return new Command("template")
		.description("Manage template configurations")
		.addCommand(registerTemplateAddCommand())
		.addCommand(registerTemplateListCommand())
		.addCommand(registerTemplateShowCommand())
		.addCommand(registerTemplateEditCommand())
		.addCommand(registerTemplateRemoveCommand());
}
