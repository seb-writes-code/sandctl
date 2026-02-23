export interface TemplateConfig {
	template: string;
	original_name: string;
	created_at: string;
	timeout?: string;
}

export interface TemplateInitScript {
	name: string;
	normalized: string;
	script: string;
}

export interface TemplateStoreLike {
	add(name: string): Promise<TemplateConfig>;
	get(name: string): Promise<TemplateConfig>;
	list(): Promise<TemplateConfig[]>;
	remove(name: string): Promise<void>;
	exists(name: string): Promise<boolean>;
	getInitScript(name: string): Promise<TemplateInitScript>;
	getInitScriptPath(name: string): Promise<string>;
}
