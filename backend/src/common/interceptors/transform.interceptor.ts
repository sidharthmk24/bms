import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Standard success envelope shape.
 */
export interface StandardResponse<T> {
  success: true;
  data: T;
  message: string;
}

/**
 * TransformInterceptor — wraps every successful response in our standard
 * envelope: { success: true, data: ..., message: '...' }.
 *
 * Why a global interceptor: controllers return plain objects. This single
 * place wraps them so the frontend always gets the same shape, whether it's
 * a list, a single entity, or a simple confirmation.
 *
 * The controller can return an object with a `message` field to customise
 * the message. Otherwise a sensible default is used.
 */
@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, StandardResponse<T>>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<StandardResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // Allow controllers to return { data, message } to customise the message
        if (
          data &&
          typeof data === 'object' &&
          'data' in data &&
          'message' in data
        ) {
          return {
            success: true as const,
            data: data.data,
            message: data.message,
          };
        }

        return {
          success: true as const,
          data: data ?? null,
          message: 'OK',
        };
      }),
    );
  }
}
