import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { ServiceRoleEnum } from '@innovations/shared/enums';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@innovations/shared/helpers';
import type { AuthorizationService } from '@innovations/shared/services';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';

import type { InnovationCollaboratorsService } from '../_services/innovation-collaborators.service';
import SYMBOLS from '../_services/symbols';
import { ResponseBodySchema, type ResponseDTO } from './transformation.dtos';
import { ParamsSchema, ParamsType, QueryParamsSchema, QueryParamsType } from './validation.schemas';

class V1InnovationCollaboratorsList {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const innovationCollaboratorsService = container.get<InnovationCollaboratorsService>(
      SYMBOLS.InnovationCollaboratorsService
    );

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);
      const queryParams = JoiHelper.Validate<QueryParamsType>(QueryParamsSchema, request.query);
      const { skip, take, order, ...filters } = queryParams;

      const auth = await authorizationService
        .validate(context)
        .setInnovation(params.innovationId)
        .checkInnovatorType()
        .checkAccessorType()
        .checkAssessmentType()
        .checkAdminType()
        .checkInnovation()
        .verify();

      const domainContext = auth.getContext();

      const result = await innovationCollaboratorsService.getCollaboratorsList(params.innovationId, filters, {
        skip,
        take,
        order
      });

      context.res = ResponseHelper.Ok<ResponseDTO>({
        count: result.count,
        data: result.data.map(collaborator => ({
          id: collaborator.id,
          status: collaborator.status,
          ...([ServiceRoleEnum.ADMIN, ServiceRoleEnum.ASSESSMENT, ServiceRoleEnum.INNOVATOR].includes(
            domainContext.currentRole.role
          ) && { email: collaborator.email }),
          ...(collaborator.role && { role: collaborator.role }),
          ...(collaborator.name && { name: collaborator.name, isActive: collaborator.isActive })
        }))
      });
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1InnovationCollaboratorsList.httpTrigger as AzureFunction, '/v1/{innovationId}/collaborators', {
  get: {
    description: 'Get a list of innovation collaborators.',
    operationId: 'v1-innovation-collaborators-list',
    tags: ['[v1] Innovation Collaborators'],
    parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
    responses: {
      200: SwaggerHelper.responseJ2S(ResponseBodySchema, {
        description: 'The list of innovation collaborators.'
      }),
      400: {
        description: 'The request is invalid.'
      },
      401: {
        description: 'The user is not authenticated.'
      },
      403: {
        description: 'The user is not authorized to access this resource.'
      },
      500: {
        description: 'An error occurred while processing the request.'
      }
    }
  }
});
