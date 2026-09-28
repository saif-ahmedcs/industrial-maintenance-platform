import { DiagnosticContext } from './diagnostic-context';

export const DIAGNOSTIC_NOTE_PROVIDER = Symbol('DIAGNOSTIC_NOTE_PROVIDER');

export interface DiagnosticNoteProvider {
  generate(
    context: DiagnosticContext,
    options?: { signal?: AbortSignal },
  ): Promise<string>;
}
