import type { HttpRequest } from '@azure/functions';
import { JwtDecoder } from '@users/shared/decorators';
import { UserTypeEnum } from '@users/shared/enums';
import { BadRequestError, GenericErrorsEnum } from '@users/shared/errors';
import { JoiHelper, ResponseHelper } from '@users/shared/helpers';

import {
  AuthorizationServiceSymbol, AuthorizationServiceType,
} from '@users/shared/services';
import type { CustomContextType } from '@users/shared/types';

import { container } from '../_config';
import { UsersServiceSymbol, UsersServiceType } from '../_services/interfaces';
import type { ResponseDTO } from './transformation.dtos';
import { AccessorBodySchema, AccessorBodyType, InnovatorBodySchema, InnovatorBodyType } from './validation.schemas';


class PutMe {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const usersService = container.get<UsersServiceType>(UsersServiceSymbol);

    try {

      const authInstance = await authorizationService.validate(context.auth.user.identityId).verify();
      const requestUser = authInstance.getUserInfo();

      if (requestUser.type === UserTypeEnum.ACCESSOR) {
        const accessorBody = JoiHelper.Validate<AccessorBodyType>(AccessorBodySchema, request.body);
        authInstance
          .checkAccessorType()
          .verify();

        const accessorResult = await usersService.updateUserInfo(
          { id: requestUser.id, identityId: requestUser.identityId, type: requestUser.type },
          { displayName: accessorBody.displayName }
        );

        context.res = ResponseHelper.Ok<ResponseDTO>({ id: accessorResult.id });
        return;

      } else if (requestUser.type === UserTypeEnum.INNOVATOR) {

        const innovatorBody = JoiHelper.Validate<InnovatorBodyType>(InnovatorBodySchema, request.body);

        await authInstance
          .checkInnovatorType({ organisationId: innovatorBody.organisation.id })
          .verify();

        const innovatorResult = await usersService.updateUserInfo(
          { id: requestUser.id, identityId: requestUser.identityId, type: requestUser.type, firstTimeSignInAt: requestUser.firstTimeSignInAt },
          { displayName: innovatorBody.displayName, mobilePhone: innovatorBody.mobilePhone, organisation: innovatorBody.organisation }
        );

        context.res = ResponseHelper.Ok<ResponseDTO>({ id: innovatorResult.id });
        return;

      } else {

        throw new BadRequestError(GenericErrorsEnum.INVALID_PAYLOAD);

      }

    } catch (error) {

      context.res = ResponseHelper.Error(error);
      return;

    }
  }
}

export default PutMe.httpTrigger;
