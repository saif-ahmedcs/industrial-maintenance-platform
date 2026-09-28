import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DiagnosticContext } from './diagnostic-context';
import { DiagnosticNoteProvider } from './diagnostic-note.provider';
import { buildUserPrompt, SYSTEM_PROMPT } from './diagnostic-prompt';

export const GROQ_CHAT_COMPLETIONS_URL =
  'https://api.groq.com/openai/v1/chat/completions';
export const GROQ_MAX_TOKENS = 150;

@Injectable()
export class GroqDiagnosticProvider implements DiagnosticNoteProvider {
  constructor(private readonly config: ConfigService) {}

  buildRequestBody(context: DiagnosticContext) {
    return {
      model: this.config.get<string>('GROQ_MODEL') ?? 'llama-3.1-8b-instant',
      max_tokens: GROQ_MAX_TOKENS,
      temperature: 0.2,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(context) },
      ],
    };
  }

  async generate(
    context: DiagnosticContext,
    options?: { signal?: AbortSignal },
  ): Promise<string> {
    const apiKey = this.config.get<string>('GROQ_API_KEY');
    if (!apiKey) {
      throw new Error('GROQ_API_KEY is not configured');
    }

    const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(this.buildRequestBody(context)),
      signal: options?.signal,
    });

    if (!response.ok) {
      throw new Error(`Groq responded with HTTP ${response.status}`);
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: unknown } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || content.trim() === '') {
      throw new Error('Groq returned an empty or malformed response');
    }
    return content;
  }
}
