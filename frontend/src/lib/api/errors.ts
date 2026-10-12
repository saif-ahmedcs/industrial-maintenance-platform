export interface ApiErrorInit {
  status: number;
  message: string;
  requestId?: string;
  path: string;
  validationMessages?: string[];
}

export class ApiError extends Error {
  readonly status: number;
  readonly requestId?: string;
  readonly path: string;
  readonly validationMessages?: string[];

  constructor({
    status,
    message,
    requestId,
    path,
    validationMessages,
  }: ApiErrorInit) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.requestId = requestId;
    this.path = path;
    this.validationMessages = validationMessages;
  }

  static async fromResponse(
    response: Response,
    path: string,
  ): Promise<ApiError> {
    const body = await ApiError.readJson(response);

    return new ApiError({
      status: response.status,
      message:
        ApiError.extractMessage(body) ??
        response.statusText ??
        'Request failed',
      requestId: ApiError.extractString(body, 'requestId'),
      path: ApiError.extractString(body, 'path') ?? path,
      validationMessages: ApiError.extractValidationMessages(body),
    });
  }

  private static async readJson(response: Response): Promise<unknown> {
    try {
      const text = await response.text();
      return text ? JSON.parse(text) : null;
    } catch {
      return null;
    }
  }

  private static extractMessage(body: unknown): string | undefined {
    if (!body || typeof body !== 'object' || !('message' in body)) {
      return undefined;
    }
    const message = (body as { message?: unknown }).message;
    if (Array.isArray(message)) {
      const joined = message
        .filter((entry): entry is string => typeof entry === 'string')
        .join(' ');
      return joined || undefined;
    }
    return typeof message === 'string' ? message : undefined;
  }

  private static extractString(body: unknown, key: string): string | undefined {
    if (!body || typeof body !== 'object' || !(key in body)) {
      return undefined;
    }
    const value = (body as Record<string, unknown>)[key];
    return typeof value === 'string' ? value : undefined;
  }

  private static extractValidationMessages(
    body: unknown,
  ): string[] | undefined {
    if (!body || typeof body !== 'object' || !('message' in body)) {
      return undefined;
    }
    const message = (body as { message?: unknown }).message;
    if (!Array.isArray(message)) {
      return undefined;
    }
    const strings = message.filter(
      (entry): entry is string => typeof entry === 'string',
    );
    return strings.length > 0 ? strings : undefined;
  }
}

export interface UserMessage {
  message: string;
  field?: string;
}

const FIELD_NAME_PATTERN = /^[a-z][a-zA-Z0-9]*$/;

function splitFieldFromValidationMessage(raw: string): UserMessage {
  const spaceIndex = raw.indexOf(' ');
  if (spaceIndex === -1) {
    return { message: raw };
  }
  const candidate = raw.slice(0, spaceIndex);
  if (!FIELD_NAME_PATTERN.test(candidate)) {
    return { message: raw };
  }
  return { field: candidate, message: raw.slice(spaceIndex + 1) };
}

export function toUserMessage(error: ApiError): UserMessage {
  if (error.status === 403) {
    return { message: 'You do not have permission to do this.' };
  }

  if (error.status === 409) {
    return { message: error.message };
  }

  if (error.status === 400 || error.status === 422) {
    const first = error.validationMessages?.[0] ?? error.message;
    return splitFieldFromValidationMessage(first);
  }

  if (error.status >= 500) {
    return {
      message: error.requestId
        ? `Something went wrong on our side. Quote request ID ${error.requestId} if you contact support.`
        : 'Something went wrong on our side.',
    };
  }

  return { message: error.message };
}
