import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { Audit, JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@innovations/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@innovations/shared/services';
import { ActionEnum, TargetEnum } from '@innovations/shared/services/integrations/audit.service';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';
import { InnovationsServiceSymbol, InnovationsServiceType } from '../_services/interfaces';

import type { ResponseDTO } from './transformation.dtos';
import { BodySchema, BodyType } from './validation.schemas';


class V1InnovationCreate {

  @JwtDecoder()
  @Audit({ action: ActionEnum.CREATE, target: TargetEnum.INNOVATION, identifierResponseField: 'id' })
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const innovationService = container.get<InnovationsServiceType>(InnovationsServiceSymbol);

    try {

      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);

      const auth = await authorizationService.validate(context)
        .checkInnovatorType()
        .verify();

      const result = await innovationService.createInnovation(auth.getContext(), body);
      context.res = ResponseHelper.Ok<ResponseDTO>({ id: result.id });
      return;

    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }

  }

}

export default openApi(V1InnovationCreate.httpTrigger as AzureFunction, '/v1', {
  post: {
    description: 'Create an innovation',
    parameters: [],
    operationId: 'v1-innovation-create',
    requestBody: SwaggerHelper.bodyJ2S(BodySchema, { description: 'The innovation to be created.' }),
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Unique identifier for innovation object' },
              },
            },
          },
        },
      },
      400: { description: 'Invalid innovation payload' },
      422: { description: 'Unprocessable entity' },
    },
  },
});
