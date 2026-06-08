import { config } from '../config';

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
}

export interface OllamaToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

export interface OllamaResponse {
  message: {
    role: string;
    content: string;
    tool_calls?: OllamaToolCall[];
  };
  done: boolean;
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export class OllamaClient {
  private baseUrl: string;
  private model: string;

  constructor() {
    this.baseUrl = config.ollamaHost;
    this.model = config.ollamaModel;
  }

  async chat(
    messages: OllamaMessage[],
    tools: ToolDefinition[],
    onToken?: (token: string) => void,
  ): Promise<OllamaResponse> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages,
        tools: tools.length > 0 ? tools : undefined,
        stream: true,
        options: {
          temperature: 0.1,
          num_ctx: 32768,
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Ollama request failed (${response.status}): ${text}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body from Ollama');

    let fullContent = '';
    let toolCalls: OllamaToolCall[] | undefined;
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter((l) => l.trim());

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line) as OllamaResponse;
          if (parsed.message?.content) {
            fullContent += parsed.message.content;
            if (onToken) onToken(parsed.message.content);
          }
          if (parsed.message?.tool_calls) {
            toolCalls = parsed.message.tool_calls;
          }
        } catch {
          // Partial JSON line — skip
        }
      }
    }

    return {
      message: {
        role: 'assistant',
        content: fullContent,
        tool_calls: toolCalls,
      },
      done: true,
    };
  }

  async checkAvailability(): Promise<{ ok: boolean; model?: string; error?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`);
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
      const data = (await res.json()) as { models: { name: string }[] };
      const models = data.models?.map((m) => m.name) ?? [];
      const hasModel = models.some((m) => m.startsWith(this.model.split(':')[0]));
      return { ok: true, model: hasModel ? this.model : undefined };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  }
}
