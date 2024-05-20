import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { Audit, ElasticSearchDocumentUpdate, JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@innovations/shared/helpers';
import type { AuthorizationService } from '@innovations/shared/services';
import { ActionEnum, TargetEnum } from '@innovations/shared/services/integrations/audit.service';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';

import type { InnovationsService } from '../_services/innovations.service';
import SYMBOLS from '../_services/symbols';
import type { ResponseDTO } from './transformation.dtos';
import { BodySchema, BodyType } from './validation.schemas';

class V1InnovationCreate {
  @JwtDecoder()
  @Audit({
    action: ActionEnum.CREATE,
    identifierResponseField: 'id',
    target: TargetEnum.INNOVATION
  })
  @ElasticSearchDocumentUpdate('INNOVATION_UPDATE')
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const innovationService = container.get<InnovationsService>(SYMBOLS.InnovationsService);

    try {
      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);

      const auth = await authorizationService.validate(context).checkInnovatorType().verify();

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
    operationId: 'v1-innovation-create',
    parameters: [],
    requestBody: SwaggerHelper.bodyJ2S(BodySchema, {
      description: 'The innovation to be created.'
    }),
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Unique identifier for innovation object' }
              }
            }
          }
        }
      },
      400: { description: 'Invalid innovation payload' },
      422: { description: 'Unprocessable entity' }
    }
  }
});
