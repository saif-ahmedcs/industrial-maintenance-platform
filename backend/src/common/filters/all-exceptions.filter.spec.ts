import {
  ArgumentsHost,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { RequestContext } from '../context/request-context';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;

  function mockHost(overrides?: { requestId?: string }) {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const response = { status };
    const request = { method: 'GET', url: '/widgets/123' };

    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    } as unknown as ArgumentsHost;

    return { host, status, json, requestId: overrides?.requestId };
  }

  function queryFailedError(code: string): QueryFailedError {
    const err = new QueryFailedError('SELECT 1', [], new Error('db error'));
    (err as QueryFailedError & { code?: string }).code = code;
    return err;
  }

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    jest.restoreAllMocks();
    jest.spyOn(RequestContext, 'requestId', 'get').mockReturnValue(undefined);
  });

  it('maps a known HttpException (e.g. NotFoundException) to its own status and message', () => {
    const { host, status, json } = mockHost();

    filter.catch(new NotFoundException('Work order abc not found'), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        error: 'Not Found',
        message: 'Work order abc not found',
        path: '/widgets/123',
      }),
    );
  });

  it('maps a ConflictException thrown by application code to 409', () => {
    const { host, status, json } = mockHost();

    filter.catch(new ConflictException('Cannot transition work order'), host);

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 409, error: 'Conflict' }),
    );
  });

  it('maps a unique-violation QueryFailedError (23505) to 409 with a generic message', () => {
    const { host, status, json } = mockHost();

    filter.catch(queryFailedError('23505'), host);

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 409,
        message: 'A record with these details already exists',
      }),
    );
  });

  it('maps a foreign-key-violation QueryFailedError (23503) to 409 with a generic message', () => {
    const { host, status, json } = mockHost();

    filter.catch(queryFailedError('23503'), host);

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 409,
        message: 'This operation violates a related record constraint',
      }),
    );
  });

  it('maps a not-null-violation QueryFailedError (23502) to 400 with a generic message', () => {
    const { host, status, json } = mockHost();

    filter.catch(queryFailedError('23502'), host);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: 'A required field was missing',
      }),
    );
  });

  it('maps a QueryFailedError with an unmapped Postgres code to 500 without leaking the DB message', () => {
    const { host, status, json } = mockHost();

    filter.catch(queryFailedError('40001'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'A database error occurred',
      }),
    );
  });

  it('maps an arbitrary unhandled Error to 500 without leaking its message', () => {
    const { host, status, json } = mockHost();

    filter.catch(new Error('something internal and sensitive broke'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
      }),
    );
    const body = json.mock.calls[0][0];
    expect(JSON.stringify(body)).not.toContain('sensitive');
  });

  it('maps a non-Error thrown value (e.g. a string) to the same 500 shape', () => {
    const { host, status, json } = mockHost();

    filter.catch('just a string was thrown', host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 500 }),
    );
  });

  it('always includes a valid ISO timestamp and the request path', () => {
    const { host, json } = mockHost();

    filter.catch(new NotFoundException('nope'), host);

    const body = json.mock.calls[0][0];
    expect(body.path).toBe('/widgets/123');
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false);
  });

  it('carries the current request id from RequestContext into the body', () => {
    jest.spyOn(RequestContext, 'requestId', 'get').mockReturnValue('req-42');
    const { host, json } = mockHost();

    filter.catch(new NotFoundException('nope'), host);

    expect(json.mock.calls[0][0].requestId).toBe('req-42');
  });

  it('omits requestId when none is set on RequestContext', () => {
    const { host, json } = mockHost();

    filter.catch(new NotFoundException('nope'), host);

    expect(json.mock.calls[0][0].requestId).toBeUndefined();
  });
});
