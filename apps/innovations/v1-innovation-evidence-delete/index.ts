import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@innovations/shared/helpers';
import type { AuthorizationService } from '@innovations/shared/services';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';

import type { InnovationSectionsService } from '../_services/innovation-sections.service';
import SYMBOLS from '../_services/symbols';
import { ParamsSchema, ParamsType } from './validation.schemas';

class V1InnovationEvidenceDelete {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const innovationSectionsService = container.get<InnovationSectionsService>(SYMBOLS.InnovationSectionsService);

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      const auth = await authorizationService
        .validate(context)
        .setInnovation(params.innovationId)
        .checkInnovatorType()
        .checkInnovation()
        .verify();

      const innovation = auth.getInnovationInfo();

      await innovationSectionsService.deleteInnovationEvidence(auth.getContext(), innovation.id, params.evidenceId);

      context.res = ResponseHelper.NoContent();
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(
  V1InnovationEvidenceDelete.httpTrigger as AzureFunction,
  '/v1/{innovationId}/evidence/{evidenceId}',
  {
    delete: {
      description: 'Delete an innovation evidence entry.',
      tags: ['Innovation'],
      summary: 'Delete an innovation evidence entry.',
      operationId: 'v1-innovation-evidence-delete',
      parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
      responses: {
        204: { description: 'Success.' },
        400: { description: 'Bad Request' },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden' },
        404: { description: 'Not found' },
        500: { description: 'Internal server error' }
      }
    }
  }
);
