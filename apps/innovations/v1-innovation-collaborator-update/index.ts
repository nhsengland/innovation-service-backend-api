import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@innovations/shared/helpers';
import type { AuthorizationService } from '@innovations/shared/services';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';

import type { InnovationCollaboratorsService } from '../_services/innovation-collaborators.service';
import SYMBOLS from '../_services/symbols';
import { ResponseBodySchema, type ResponseDTO } from './transformation.dtos';
import { BodySchema, BodyType, ParamsSchema, ParamsType } from './validation.schemas';

class V1InnovationCollaboratorUpdate {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const innovationCollaboratorsService = container.get<InnovationCollaboratorsService>(
      SYMBOLS.InnovationCollaboratorsService
    );

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      const auth = await authorizationService.validate(context).checkInnovatorType().verify();

      const domainContext = auth.getContext();
      const userInfo = auth.getUserInfo();

      const { type: collaboratorType } = await innovationCollaboratorsService.getCollaborationInfo(
        { id: domainContext.id, email: userInfo.email },
        params.collaboratorId
      );

      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body, { collaboratorType });

      const result = await innovationCollaboratorsService.updateCollaborator(
        domainContext,
        params.collaboratorId,
        params.innovationId,
        collaboratorType === 'OWNER',
        body
      );

      context.res = ResponseHelper.Ok<ResponseDTO>({ id: result.id });
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(
  V1InnovationCollaboratorUpdate.httpTrigger as AzureFunction,
  '/v1/{innovationId}/collaborators/{collaboratorId}',
  {
    patch: {
      description: 'Updates information of collaborator.',
      operationId: 'v1-innovation-collaborator-update',
      tags: ['[v1] Innovation Collaborators'],
      parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
      requestBody: SwaggerHelper.bodyJ2S(BodySchema, {
        description: 'The information to update collaborator invite.'
      }),
      responses: {
        200: SwaggerHelper.responseJ2S(ResponseBodySchema, {
          description: 'The collaborator has been updated.'
        }),
        400: {
          description: 'The collaborator could not be updated.'
        },
        401: {
          description: 'The user is not authorized to update an collaborator.'
        },
        403: {
          description: 'The user is not allowed to update an collaborator.'
        },
        404: {
          description: 'The innovation could not be found.'
        },
        500: {
          description: 'An unexpected error occurred while updating the collaborator.'
        }
      }
    }
  }
);
