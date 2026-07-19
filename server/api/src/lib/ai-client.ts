import { config } from './config';

interface ChatMessage {
  role: 'system' | 'user';
  content: string;
}

const REQUEST_TIMEOUT_MS = 60000;

export function isAiConfigured(): boolean {
  return config.ai.apiKey.length > 0;
}

interface ChatCompletionResponse {
  choices?: { message?: { content?: string } }[];
}

export async function chatJson(messages: ChatMessage[]): Promise<unknown> {
  if (!isAiConfigured()) {
    throw new Error('AI provider is not configured. Set AI_API_KEY.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${config.ai.baseUrl}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.ai.apiKey}`,
      },
      body: JSON.stringify({
        model: config.ai.model,
        messages,
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });
  } catch (error) {
    throw new Error(error instanceof Error && error.name === 'AbortError'
      ? 'AI request timed out.'
      : 'Failed to reach AI provider.');
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    throw new Error(`AI provider returned ${res.status}.`);
  }

  const body = (await res.json()) as ChatCompletionResponse;
  const content = body.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || content.trim().length === 0) {
    throw new Error('AI provider returned an empty response.');
  }

  try {
    return JSON.parse(content);
  } catch {
    throw new Error('AI provider returned malformed JSON.');
  }
}
