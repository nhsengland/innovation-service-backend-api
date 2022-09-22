import jwt_decode from 'jwt-decode';
import type { HttpRequest } from '@azure/functions';

import { UnauthorizedError } from '../config';
import { UserErrorsEnum } from '../enums/error.enums';
import { ResponseHelper } from '../helpers';
import type { CustomContextType } from '../types';


type JWTType = {
  oid: string;
  name: string;
  extension_surveyId: string;
  extension_passwordResetOn: number;
  exp: number;
  nbf: number;
  ver: string;
  iss: string;
  sub: string;
  aud: string;
  acr: string;
  nonce: string;
  iat: number;
  auth_time: number;
  tid: string;
  c_hash: string;
};


export function JwtDecoder() {

  return function (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) {

    const original = descriptor.value;

    descriptor.value = async function (...args: any[]) {

      const context: CustomContextType = args[0];
      const request: HttpRequest = args[1];
      const token = request.headers['authorization'] || '';

      try {

        const jwt = jwt_decode<JWTType>(token);

        context.auth = {
          user: {
            identityId: jwt.oid,
            name: jwt.name,
            surveyId: jwt.extension_surveyId
          }
        };

      }
      catch (error) {
        context.res = ResponseHelper.Error(new UnauthorizedError(UserErrorsEnum.REQUEST_USER_INVALID_TOKEN));
        return;
      }

      await original.apply(this, args);

    };

  };

}
