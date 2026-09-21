import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@innovations/shared/helpers';
import type { AuthorizationService } from '@innovations/shared/services';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';

import { InnovationsService } from '../_services/innovations.service';
import SYMBOLS from '../_services/symbols';
import { ParamsSchema, ParamsType } from './validation.schemas';

class V1InnovationsShareWithOrganisation {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const innovationsService = container.get<InnovationsService>(SYMBOLS.InnovationsService);

    try {
      const authInstance = await authorizationService.validate(context).checkInnovatorType().verify();
      const domainContext = authInstance.getContext();

      const { organisationId } = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      await innovationsService.shareInnovationsWithOrganisation(domainContext, organisationId);

      context.res = ResponseHelper.NoContent();

      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(
  V1InnovationsShareWithOrganisation.httpTrigger as AzureFunction,
  '/v1/share-with-organisation/{organisationId}',
  {
    post: {
      operationId: 'v1-innovations-share-with-organisation',
      description: 'Share all user innovations with an organisation',
      parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
      responses: {
        204: { description: 'Success' },
        400: { description: 'Bad Request' },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden' },
        404: { description: 'Not Found' },
        500: { description: 'Internal Server Error' }
      }
    }
  }
);
