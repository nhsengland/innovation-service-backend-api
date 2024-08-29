import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@admin/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@admin/shared/helpers';
import type { AuthorizationService, IRSchemaService } from '@admin/shared/services';
import type { CustomContextType } from '@admin/shared/types';

import { container } from '../_config';
import type { AnnouncementsService } from '../_services/announcements.service';
import SYMBOLS from '../_services/symbols';

import SHARED_SYMBOLS from '@admin/shared/services/symbols';
import { BodySchema, BodyType, ParamsSchema, ParamsType } from './validation.schemas';
import type { FilterPayload } from '@admin/shared/models/schema-engine/schema.model';

class V1AnnouncementsUpdate {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const announcementsService = container.get<AnnouncementsService>(SYMBOLS.AnnouncementsService);

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      let body = JoiHelper.Validate<BodyType>(BodySchema, request.body);

      if (body.filters) {
        const irSchemaService = container.get<IRSchemaService>(SHARED_SYMBOLS.IRSchemaService);
        const schema = await irSchemaService.getSchema();
        const validation = schema.model.getFilterSchemaValidation(body.filters || []);

        body = { ...body, ...JoiHelper.Validate<FilterPayload>(validation, body.filters) };
      }

      const auth = await authorizationService.validate(context).checkAdminType().verify();

      await announcementsService.updateAnnouncement(auth.getContext(), params.announcementId, body);
      context.res = ResponseHelper.NoContent();
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1AnnouncementsUpdate.httpTrigger as AzureFunction, '/v1/announcements/{announcementId}', {
  put: {
    description: 'Update an announcement.',
    operationId: 'v1-announcement-update',
    parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
    requestBody: SwaggerHelper.bodyJ2S(BodySchema),
    responses: {
      '200': {
        description: 'Announcement updated.',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: { type: 'string' }
              }
            }
          }
        }
      },
      '400': { description: 'Bad request' },
      '401': { description: 'Not authorized' },
      '500': { description: 'An error occurred' }
    }
  }
});
