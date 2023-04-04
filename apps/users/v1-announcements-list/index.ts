import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction } from '@azure/functions';
import { JwtDecoder } from '@users/shared/decorators';
import { ResponseHelper } from '@users/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@users/shared/services';
import type { CustomContextType } from '@users/shared/types';


import { container } from '../_config';
import { AnnouncementsServiceSymbol, AnnouncementsServiceType } from '../_services/interfaces';

import { AnnouncementTemplateType, ServiceRoleEnum } from '@users/shared/enums';
import type { ResponseDTO } from './transformation.dtos';


class V1UserAnnouncements {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType): Promise<void> {

    const authService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const announcementsService = container.get<AnnouncementsServiceType>(AnnouncementsServiceSymbol);

    try {
      const authInstance = await authService.validate(context)
        .checkAccessorType()
        .checkAssessmentType()
        .checkInnovatorType()
        .verify();
      const domainContext = authInstance.getContext();

      const announcements = await announcementsService.getAnnouncements(domainContext);
      context.res = ResponseHelper.Ok<ResponseDTO>(announcements.map((announcement) => ({
        id: announcement.id,
        params: announcement.params,
        createdAt: announcement.createdAt,
        targetRoles: announcement.targetRoles,
        template: announcement.template
      })));
      return;

    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }

  }

}

export default openApi(V1UserAnnouncements.httpTrigger as AzureFunction, '/v1/announcements', {
  get: {
    description: 'Returns the user announcements',
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
                  id: {
                    type: 'string',
                    format: 'uuid',
                  },
                  template: {
                    type: 'string',
                    enum: Object.keys(AnnouncementTemplateType),
                  },
                  targetRoles: {
                    type: 'array',
                    items: {
                      type: 'string',
                      enum: Object.keys(ServiceRoleEnum)
                    }
                  },
                  createdAt: {
                    type: 'string',
                    format: 'date-time',
                  },
                  params: {
                    type: 'object',
                  },
                }
              }
            },
          }
        }
      },
    },
  },
});
