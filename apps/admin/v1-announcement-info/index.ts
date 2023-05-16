import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@admin/shared/decorators';
import { AnnouncementTemplateType, ServiceRoleEnum } from '@admin/shared/enums';
import { JoiHelper, ResponseHelper } from '@admin/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@admin/shared/services';
import type { CustomContextType } from '@admin/shared/types';

import { container } from '../_config';
import type { AnnouncementsService } from '../_services/announcements.service';
import SYMBOLS from '../_services/symbols';

import type { ResponseDTO } from './transformation.dtos';
import { ParamsSchema, ParamsType } from './validation.schemas';

class V1AnnouncementsInfo {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const announcementsService = container.get<AnnouncementsService>(SYMBOLS.AnnouncementsService);

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      await authorizationService.validate(context).checkAdminType().verify();

      const result = await announcementsService.getAnnouncementInfo(params.announcementId);
      context.res = ResponseHelper.Ok<ResponseDTO>({
        id: result.id,
        userRoles: result.userRoles,
        params: result.params,
        startsAt: result.startsAt,
        expiresAt: result.expiresAt,
        status: result.status
      });

      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1AnnouncementsInfo.httpTrigger as AzureFunction, '/v1/announcements', {
  get: {
    description: 'Get an announcement info.',
    operationId: 'v1-announcement-info',
    responses: {
      '200': {
        description: 'Announcement created.',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                template: { type: 'string', enum: Object.keys(AnnouncementTemplateType) },
                userRoles: { type: 'array', items: { type: 'string', enum: Object.keys(ServiceRoleEnum) } },
                params: { type: 'object' },
                createdAt: { type: 'string', format: 'date-time' },
                expiresAt: { type: 'string', format: 'date-time' }
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
