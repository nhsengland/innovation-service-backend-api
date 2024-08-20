import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@admin/shared/decorators';
import { AnnouncementTemplateType, ServiceRoleEnum } from '@admin/shared/enums';
import { JoiHelper, ResponseHelper } from '@admin/shared/helpers';
import type { AuthorizationService } from '@admin/shared/services';
import type { CustomContextType } from '@admin/shared/types';

import { container } from '../_config';
import type { AnnouncementsService } from '../_services/announcements.service';
import SYMBOLS from '../_services/symbols';

import SHARED_SYMBOLS from '@admin/shared/services/symbols';
import type { ResponseDTO } from './transformation.dtos';
import { AdminQueryParamsSchema, AdminQueryParamsType } from './validation.schemas';

class V1AnnouncementsList {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const announcementsService = container.get<AnnouncementsService>(SYMBOLS.AnnouncementsService);

    try {
      const queryParams = JoiHelper.Validate<AdminQueryParamsType>(AdminQueryParamsSchema, request.query);

      await authorizationService.validate(context).checkAdminType().verify();

      const result = await announcementsService.getAnnouncementsList(queryParams);
      context.res = ResponseHelper.Ok<ResponseDTO>({
        count: result.count,
        data: result.data.map(item => ({
          id: item.id,
          title: item.title,
          startsAt: item.startsAt,
          expiresAt: item.expiresAt,
          status: item.status,
          type: item.type,
          filters: item.filters
        }))
      });
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1AnnouncementsList.httpTrigger as AzureFunction, '/v1/announcements', {
  get: {
    description: 'Returns announcements list',
    operationId: 'v1-announcements-list',
    tags: ['[v1] Announcements'],
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: {
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
        }
      }
    }
  }
});
