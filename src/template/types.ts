export interface TemplateInitScript {
	name: string;
	normalized: string;
	script: string;
}

export interface TemplateConfig {
	template: string;
	original_name: string;
	created_at: string;
	timeout?: string;
}

export interface TemplateStoreLike {
	getInitScript(name: string): Promise<TemplateInitScript>;
	add(name: string): Promise<TemplateConfig>;
	get(name: string): Promise<TemplateConfig>;
	list(): Promise<TemplateConfig[]>;
	remove(name: string): Promise<void>;
	exists(name: string): Promise<boolean>;
	getInitScriptPath(name: string): Promise<string>;
}
