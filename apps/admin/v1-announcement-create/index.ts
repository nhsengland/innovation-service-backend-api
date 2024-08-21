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
import type { ResponseDTO } from './transformation.dtos';
import { BodySchema, BodyType } from './validation.schemas';
import type { FilterPayload } from '@admin/shared/models/schema-engine/schema.model';

class V1AnnouncementsCreate {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const announcementsService = container.get<AnnouncementsService>(SYMBOLS.AnnouncementsService);

    try {
      const requestBody = JoiHelper.Validate<BodyType>(BodySchema, request.body);

      const irSchemaService = container.get<IRSchemaService>(SHARED_SYMBOLS.IRSchemaService);
      const schema = await irSchemaService.getSchema();
      const validation = schema.model.getFilterSchemaValidation(requestBody.filters || []);

      const body = { ...requestBody, ...JoiHelper.Validate<FilterPayload>(validation, requestBody.filters) };

      const auth = await authorizationService.validate(context).checkAdminType().verify();

      const result = await announcementsService.createAnnouncement(auth.getContext(), body);
      context.res = ResponseHelper.Ok<ResponseDTO>({ id: result.id });
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1AnnouncementsCreate.httpTrigger as AzureFunction, '/v1/announcements', {
  post: {
    description: 'Create an announcement.',
    operationId: 'v1-announcement-create',
    requestBody: SwaggerHelper.bodyJ2S(BodySchema),
    responses: {
      '200': {
        description: 'Announcement created.',
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
      '400': { description: 'Bad Request' },
      '401': { description: 'Unauthorized' },
      '403': { description: 'Forbidden' },
      '404': { description: 'Not Found' },
      '500': { description: 'Internal Server Error' }
    }
  }
});
