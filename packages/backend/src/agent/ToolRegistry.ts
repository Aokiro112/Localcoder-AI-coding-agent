import { type ToolDefinition } from './OllamaClient';

export interface ToolResult {
  success: boolean;
  output?: unknown;
  error?: string;
}

export interface Tool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  requiresApproval?: boolean;
  execute(input: Record<string, unknown>, workspacePath: string): Promise<ToolResult>;
}

export class ToolRegistry {
  private tools = new Map<string, Tool>();

  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  getToolSchemas(): ToolDefinition[] {
    return Array.from(this.tools.values()).map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    }));
  }

  requiresApproval(name: string): boolean {
    return this.tools.get(name)?.requiresApproval ?? false;
  }
}
