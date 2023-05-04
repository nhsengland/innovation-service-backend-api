import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@innovations/shared/services';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';

import type { InnovationSupportsService } from '../_services/innovation-supports.service';
import SYMBOLS from '../_services/symbols';
import type { ResponseDTO } from './transformation.dtos';
import { BodySchema, ParamsSchema, type BodyType, type ParamsType } from './validation.schemas';

class V1InnovationSupportChangeRequest {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationServiceType>(
      AuthorizationServiceSymbol
    );
    const innovationSupportsService = container.get<InnovationSupportsService>(
      SYMBOLS.InnovationSupportsService
    );

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);
      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);

      const auth = await authorizationService
        .validate(context)
        .setInnovation(params.innovationId)
        .checkAccessorType()
        .checkInnovation()
        .verify();

      const requestUser = auth.getUserInfo();
      const domainContext = auth.getContext();

      const result = await innovationSupportsService.changeInnovationSupportStatusRequest(
        requestUser,
        domainContext,
        params.innovationId,
        params.supportId,
        body.status,
        body.message
      );

      context.res = ResponseHelper.Ok<ResponseDTO>({ success: result });

      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(
  V1InnovationSupportChangeRequest.httpTrigger as AzureFunction,
  '/v1/{innovationId}/supports/{supportId}/change-request',
  {
    post: {
      description: 'Request Change Support for a given innovation.',
      operationId: 'v1-innovation-support-change-request',
      tags: ['Innovation Support'],
      parameters: [
        {
          in: 'path',
          name: 'innovationId',
          description: 'Unique innovation ID',
          required: true,
        },
        {
          in: 'path',
          name: 'supportId',
          required: true,
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
                  type: 'string',
                  enum: [
                    'ENGAGING',
                    'FURTHER_INFO_REQUIRED',
                    'WAITING',
                    'NOT_YET',
                    'UNSUITABLE',
                    'COMPLETE',
                  ],
                },
                message: {
                  type: 'string',
                  maxLength: 400,
                },
              },
              required: ['status', 'message'],
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Innovation ID',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                    format: 'uuid',
                  },
                },
                required: ['id'],
              },
            },
          },
        },
      },
    },
  }
);
