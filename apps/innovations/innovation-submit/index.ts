import type { HttpRequest } from '@azure/functions';

import {
  AuthorizationServiceSymbol, AuthorizationServiceType,
} from '@innovations/shared/services';

import { JwtDecoder } from '@innovations/shared/decorators';
import type { CustomContextType } from '@innovations/shared/types';
import { ResponseHelper, JoiHelper } from '@innovations/shared/helpers';

import { container } from '../_config';
import { InnovationsServiceSymbol, InnovationsServiceType } from '../_services/interfaces';
import type { ResponseDTO } from './transformation.dtos';
import { ParamsSchema, ParamsType } from './validation.schemas';


class GetInnovations {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const innovationsService = container.get<InnovationsServiceType>(InnovationsServiceSymbol);

    try {

      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      const auth = await authorizationService.validate(context.auth.user.identityId)
        .setInnovation(params.innovationId)
        .checkInnovatorType()
        .checkInnovation()
        .verify();

      const innovationId = auth.getInnovationInfo();

      const result = await innovationsService.submitInnovation(innovationId.id, context.auth.user.identityId)
      context.res = ResponseHelper.Ok<ResponseDTO>({
        id: result.id,
        status: result.status,
      });
      return;

    } catch (error) {
      context.res = ResponseHelper.Error(error);
      return;
    }

  }

}

export default GetInnovations.httpTrigger;
