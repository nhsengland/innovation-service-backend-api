import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction } from '@azure/functions';

import { JwtDecoder } from '@users/shared/decorators';
import { AnnouncementTemplateType, ServiceRoleEnum } from '@users/shared/enums';
import { ResponseHelper } from '@users/shared/helpers';
import type { AuthorizationService } from '@users/shared/services';
import SHARED_SYMBOLS from '@users/shared/services/symbols';
import type { CustomContextType } from '@users/shared/types';

import { container } from '../_config';
import type { AnnouncementsService } from '../_services/announcements.service';
import SYMBOLS from '../_services/symbols';

import type { ResponseDTO } from './transformation.dtos';

class V1MeAnnouncements {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const announcementsService = container.get<AnnouncementsService>(SYMBOLS.AnnouncementsService);

    try {
      const authInstance = await authorizationService
        .validate(context)
        .checkAccessorType()
        .checkAssessmentType()
        .checkInnovatorType()
        .verify();

      const announcements = await announcementsService.getUserAnnouncements(authInstance.getContext());
      context.res = ResponseHelper.Ok<ResponseDTO>(
        announcements.map(announcement => ({
          id: announcement.id,
          title: announcement.title,
          template: announcement.template,
          startsAt: announcement.startsAt,
          expiresAt: announcement.expiresAt,
          params: announcement.params
        }))
      );
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1MeAnnouncements.httpTrigger as AzureFunction, '/v1/me/announcements', {
  get: {
    description: 'Returns unread announcements',
    operationId: 'v1-me-announcements',
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
                  title: { type: 'string' },
                  template: { type: 'string', enum: Object.keys(AnnouncementTemplateType) },
                  userRoles: { type: 'array', items: { type: 'string', enum: Object.keys(ServiceRoleEnum) } },
                  createdAt: { type: 'string', format: 'date-time' },
                  params: { type: 'object' }
                }
              }
            }
          }
        }
      }
    }
  }
});
