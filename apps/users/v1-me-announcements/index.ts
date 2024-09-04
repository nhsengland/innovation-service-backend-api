import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@users/shared/decorators';
import { ServiceRoleEnum } from '@users/shared/enums';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@users/shared/helpers';
import type { AuthorizationService } from '@users/shared/services';
import SHARED_SYMBOLS from '@users/shared/services/symbols';
import type { CustomContextType } from '@users/shared/types';

import { container } from '../_config';
import type { AnnouncementsService } from '../_services/announcements.service';
import SYMBOLS from '../_services/symbols';

import type { ResponseDTO } from './transformation.dtos';
import { QueryParamsType, QueryParamsSchema } from '../v1-me-announcements/validation.schemas';

class V1MeAnnouncements {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const announcementsService = container.get<AnnouncementsService>(SYMBOLS.AnnouncementsService);

    try {
      const queryParams = JoiHelper.Validate<QueryParamsType>(QueryParamsSchema, request.query);

      const auth = await authorizationService
        .validate(context)
        .checkAccessorType()
        .checkAssessmentType()
        .checkInnovatorType()
        .verify();

      const announcements = await announcementsService.getUserRoleAnnouncements(auth.getContext().id, queryParams);

      context.res = ResponseHelper.Ok<ResponseDTO>(
        announcements.map(announcement => ({
          id: announcement.id,
          title: announcement.title,
          startsAt: announcement.startsAt,
          expiresAt: announcement.expiresAt,
          params: announcement.params,
          ...(announcement.innovations && { innovations: announcement.innovations })
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
    parameters: SwaggerHelper.paramJ2S({ query: QueryParamsSchema }),
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
