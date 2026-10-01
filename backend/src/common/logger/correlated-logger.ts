import { ConsoleLogger, LoggerService } from '@nestjs/common';
import { RequestContext } from '../context/request-context';

export class CorrelatedLogger implements LoggerService {
  private readonly delegate = new ConsoleLogger();

  private tag(message: any): any {
    const requestId = RequestContext.requestId;
    return requestId && typeof message === 'string'
      ? `[${requestId}] ${message}`
      : message;
  }

  log(message: any, ...optionalParams: any[]): void {
    this.delegate.log(this.tag(message), ...optionalParams);
  }

  error(message: any, ...optionalParams: any[]): void {
    this.delegate.error(this.tag(message), ...optionalParams);
  }

  warn(message: any, ...optionalParams: any[]): void {
    this.delegate.warn(this.tag(message), ...optionalParams);
  }

  debug(message: any, ...optionalParams: any[]): void {
    this.delegate.debug(this.tag(message), ...optionalParams);
  }

  verbose(message: any, ...optionalParams: any[]): void {
    this.delegate.verbose(this.tag(message), ...optionalParams);
  }
}
