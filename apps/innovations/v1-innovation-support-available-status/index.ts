import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@innovations/shared/helpers';
import type { AuthorizationService } from '@innovations/shared/services';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import { isAccessorDomainContextType, type CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';

import { InnovationSupportStatusEnum } from '@innovations/shared/enums';
import { BadRequestError, UserErrorsEnum } from '@innovations/shared/errors';
import type { InnovationSupportsService } from '../_services/innovation-supports.service';
import SYMBOLS from '../_services/symbols';
import type { ResponseDTO } from './transformation.dtos';
import { ParamsSchema, type ParamsType } from './validation.schemas';

class V1InnovationSupportAvailableStatus {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const innovationSupportsService = container.get<InnovationSupportsService>(SYMBOLS.InnovationSupportsService);

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      const auth = await authorizationService
        .validate(context)
        .setInnovation(params.innovationId)
        .checkAccessorType()
        .checkInnovation()
        .verify();
      const domainContext = auth.getContext();

      if (!isAccessorDomainContextType(domainContext)) throw new BadRequestError(UserErrorsEnum.USER_TYPE_INVALID);

      const result = await innovationSupportsService.getValidSupportStatuses(
        params.innovationId,
        domainContext.organisation.organisationUnit.id
      );

      context.res = ResponseHelper.Ok<ResponseDTO>({ availableStatus: result });
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(
  V1InnovationSupportAvailableStatus.httpTrigger as AzureFunction,
  '/v1/{innovationId}/supports/available-status',
  {
    get: {
      description: 'Get available status for a support',
      operationId: 'v1-innovation-support-available-status',
      tags: ['[v1] Innovation Support'],
      parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
      responses: {
        200: {
          description: 'OK',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  availableStatus: {
                    type: 'array',
                    items: { type: 'string', enum: Object.keys(InnovationSupportStatusEnum) }
                  }
                }
              }
            }
          }
        },
        400: { description: 'Bad Request' },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden' },
        404: { description: 'Not found' },
        500: { description: 'Internal server error' }
      }
    }
  }
);
