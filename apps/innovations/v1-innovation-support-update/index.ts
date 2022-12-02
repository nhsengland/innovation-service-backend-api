import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { AccessorOrganisationRoleEnum } from '@innovations/shared/enums';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@innovations/shared/services';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';
import { InnovationSupportsServiceSymbol, InnovationSupportsServiceType } from '../_services/interfaces';

import type { ResponseDTO } from './transformation.dtos';
import { BodySchema, ParamsSchema, type BodyType, type ParamsType } from './validation.schemas';


class V1InnovationSupportUpdate {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const innovationSupportsService = container.get<InnovationSupportsServiceType>(InnovationSupportsServiceSymbol);

    try {

      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);
      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);

      const auth = await authorizationService.validate(context.auth.user.identityId)
        .setInnovation(params.innovationId)
        .checkAccessorType({ organisationRole: [AccessorOrganisationRoleEnum.QUALIFYING_ACCESSOR] })
        .checkInnovation()
        .verify();
      const requestUser = auth.getUserInfo();

      const result = await innovationSupportsService.updateInnovationSupport(
        { id: requestUser.id, identityId: requestUser.identityId, type: requestUser.type },
        params.innovationId,
        params.supportId,
        body
      );
      context.res = ResponseHelper.Ok<ResponseDTO>({ id: result.id });
      return;

    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }

  }

}

export default openApi(V1InnovationSupportUpdate.httpTrigger as AzureFunction, '/v1/{innovationId}/supports/{supportId}', {
  put: {
    description: 'Update support on innovation.',
    operationId: 'v1-innovation-support-update',
    tags: ['Innovation Support'],
    parameters: [
      {
        in: 'path',
        name: 'innovationId',
        description: 'Unique innovation ID',
        required: true,
        schema: {
          type: 'string',
        }
      },
      {
        in: 'path',
        name: 'supportId',
        required: true,
        schema: {
          type: 'string',
        }
      },
    ],
    requestBody: {
      description: '',
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              status: {
                'type': 'string',
                'enum': [
                  'ENGAGING',
                  'FURTHER_INFO_REQUIRED',
                  'WAITING',
                  'NOT_YET',
                  'UNSUITABLE',
                  'COMPLETE'
                ]
              },
              message: {
                'type': 'string',
                'maxLength': 400
              },
              accessors: {
                'type': 'array',
                'items': {
                  'type': 'object',
                  'properties': {
                    accessorId: {
                      'type': 'string',
                      'format': 'uuid'
                    },
                    organisationalUnitId: {
                      'type': 'string',
                      'format': 'uuid'
                    },
                  },
                },
              },
            },
            required: ['status', 'message'],
            additionalProperties: false,
          },
        },
      }
    },
    responses: {
      '200': {
        description: 'Innovation ID',
        content: {
          'application/json': {
            schema: {
              'type': 'object',
              'properties': {
                'id': {
                  'type': 'string',
                  'format': 'uuid'
                },
              },
              'required': ['id'],
            }
          }
        },
      }
    }
  }
});
