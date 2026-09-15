import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';
import { RequestContext } from '../context/request-context';

const REQUEST_ID_HEADER = 'x-request-id';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const incoming = req.headers[REQUEST_ID_HEADER];
    const requestId = typeof incoming === 'string' ? incoming : randomUUID();

    res.setHeader(REQUEST_ID_HEADER, requestId);

    RequestContext.run({ requestId }, () => {
      const start = Date.now();
      this.logger.log(`--> ${req.method} ${req.originalUrl} [${requestId}]`);

      res.on('finish', () => {
        const duration = Date.now() - start;
        this.logger.log(
          `<-- ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms [${requestId}]`,
        );
      });

      next();
    });
  }
}
