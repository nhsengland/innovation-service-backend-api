import { GenericErrorsEnum } from '../enums/error.enums';

import type { AppResponse } from '../types';


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
  static UnprocessableEntity<T>(data?: T): AppResponse { return this.FormattedResponse(422, data); }

  // 500 Range.
  static Internal<T>(data?: T): AppResponse { return this.FormattedResponse(500, data); }
  static ServiceUnavailable<T>(data?: T): AppResponse { return this.FormattedResponse(503, data); }


  static Error(error: any): AppResponse {

    try {
      return error.errorResponse();
    } catch (e) {
      console.log('[UNKNOWN ERROR]: ', error);
      return this.Internal({ error: GenericErrorsEnum.UNKNOWN_ERROR, message: 'Unknown error.' });
    }

  }


}
