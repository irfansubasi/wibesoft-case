import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const method = request.method;
    const url = request.url;
    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = ctx.getResponse<Response>();
          const delay = Date.now() - now;
          this.logger.log(
            `${method} ${url} ${response.statusCode} - ${delay}ms`,
          );
        },
        error: (error: unknown) => {
          const delay = Date.now() - now;
          const status =
            error instanceof HttpException ? error.getStatus() : 500;
          const message =
            error instanceof HttpException
              ? error.message
              : error instanceof Error
                ? error.message
                : 'Internal server error';
          this.logger.error(
            `${method} ${url} ${status} - ${delay}ms - ${message}`,
          );
        },
      }),
    );
  }
}
