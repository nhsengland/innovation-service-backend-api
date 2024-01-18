import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { Audit, JwtDecoder } from '@innovations/shared/decorators';
import { InnovationStatusEnum } from '@innovations/shared/enums';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@innovations/shared/helpers';
import type { AuthorizationService } from '@innovations/shared/services';
import { ActionEnum, TargetEnum } from '@innovations/shared/services/integrations/audit.service';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';

import type { InnovationsService } from '../_services/innovations.service';
import SYMBOLS from '../_services/symbols';
import type { ResponseDTO } from './transformation.dtos';
import { BodySchema, BodyType, ParamsSchema, ParamsType } from './validation.schemas';

class V1InnovationPause {
  @JwtDecoder()
  @Audit({
    action: ActionEnum.UPDATE,
    target: TargetEnum.INNOVATION,
    identifierParam: 'innovationId'
  })
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const innovationsService = container.get<InnovationsService>(SYMBOLS.InnovationsService);

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);
      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);

      const auth = await authorizationService
        .validate(context)
        .setInnovation(params.innovationId)
        .checkInnovatorType()
        .checkInnovation({ isOwner: true, status: [InnovationStatusEnum.IN_PROGRESS] })
        .verify();

      const domainContext = auth.getContext();

      const result = await innovationsService.pauseInnovation(domainContext, params.innovationId, {
        message: body.message
      });
      context.res = ResponseHelper.Ok<ResponseDTO>({ id: result.id });
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1InnovationPause.httpTrigger as AzureFunction, '/v1/{innovationId}/pause', {
  patch: {
    summary: 'Pause an innovation',
    description: 'Pause an innovation.',
    operationId: 'v1-innovation-pause',
    tags: ['Innovation'],
    parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
    requestBody: SwaggerHelper.bodyJ2S(BodySchema),
    responses: {
      200: {
        description: 'Innovation paused successfully.',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Innovation ID' }
              }
            }
          }
        }
      }
    }
  }
});
