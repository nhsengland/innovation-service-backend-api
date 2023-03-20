import type { Context } from '@azure/functions';
import { GenericErrorsEnum } from '../errors';
import { AppResponse, isBaseErrorType } from '../types';


export class ResponseHelper {

  private static FormattedResponse(status: number, data?: any): AppResponse {
    return {
      isRaw: true,
      status,
      body: data,
      headers: { 'Content-Type': 'application/json' }
    };
  }


  // 200 Range.
  static Ok<T>(data: T): AppResponse { return this.FormattedResponse(200, data); }
  static Created<T>(data?: T): AppResponse { return this.FormattedResponse(201, data); }
  static NoContent(): AppResponse { return this.FormattedResponse(204); }

  // 400 Range.
  static BadRequest<T>(data?: T): AppResponse { return this.FormattedResponse(400, data); }
  static Unauthorized<T>(data?: T): AppResponse { return this.FormattedResponse(401, data); }
  static Forbidden<T>(data?: T): AppResponse { return this.FormattedResponse(403, data); }
  static NotFound<T>(data?: T): AppResponse { return this.FormattedResponse(404, data); }
  static Conflict<T>(data?: T): AppResponse { return this.FormattedResponse(409, data); }
  static UnprocessableEntity<T>(data?: T): AppResponse { return this.FormattedResponse(422, data); }

  // 500 Range.
  static Internal<T>(data?: T): AppResponse { return this.FormattedResponse(500, data); }
  static NotImplemented<T>(data?: T): AppResponse { return this.FormattedResponse(501, data); }
  static ServiceUnavailable<T>(data?: T): AppResponse { return this.FormattedResponse(503, data); }


  /**
   * this helper function is used to format the response of the function logging the errors into app insights
   * @param context Azure Function Context.
   * @param error the error to be handled.
   * @returns the http response to be sent to the client.
   */
  static Error(context: Context, error: any): AppResponse {

    if(isBaseErrorType(error)) { 
      const res = error.errorResponse();
      // Log 400s error, excluding 401 since they are normal in our execussion flow and 501 since it's not implemented to app insights as information.
      if([400, 403, 404, 422, 501].includes(res.status)) {
        context.log.info(JSON.stringify({
          invocationId: context.invocationId,
          error: res.body.error,
          message: res.body.message,
          details: res.body.details ?? {},
          stack: error.stack
        }));
      } else if (res.status >= 500) {
        // All other 500s should be logged as error
        context.log.error(JSON.stringify({
          invocationId: context.invocationId,
          error: res.body.error,
          message: res.body.message,
          details: res.body.details ?? {},
          stack: error.stack
        }));
      }
      return res;
    } else {
      // All errors we don't know about should be logged as error
      context.log.error(JSON.stringify({
        invocationId: context.invocationId,
        error: 'UNKNOWN_ERROR',
        message: 'messsage' in error ? error.message : 'Unknown error',
        details: 'details' in error ? error.details : {},
        stack: 'stack' in error ? error.stack : 'No stack trace'
      }));
      return this.Internal({ error: GenericErrorsEnum.UNKNOWN_ERROR, message: 'Unknown error.' });
    }
  }


}
