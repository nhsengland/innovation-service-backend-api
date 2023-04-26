import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, Context, HttpRequest } from '@azure/functions';

import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';

import { container } from '../_config';
import {
  InnovationTransferServiceSymbol,
  InnovationTransferServiceType,
} from '../_services/interfaces';

import type { ResponseDTO } from './transformation.dtos';
import { ParamsSchema, ParamsType } from './validations.schema';

class V1InnovationTransferCheck {
  static async httpTrigger(context: Context, request: HttpRequest): Promise<void> {
    const transferService = container.get<InnovationTransferServiceType>(
      InnovationTransferServiceSymbol
    );

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      const result = await transferService.getPendingInnovationTransferInfo(params.transferId);

      context.res = ResponseHelper.Ok<ResponseDTO>({ userExists: result.userExists });
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(
  V1InnovationTransferCheck.httpTrigger as AzureFunction,
  '/v1/transfers/{transferId}/check',
  {
    get: {
      description: 'Get details of pending innovations transfers',
      operationId: 'v1-innovation-transfer-check',
      parameters: [{ in: 'path', name: 'transferId', required: true, schema: { type: 'string' } }],
      responses: {
        200: {
          description: 'Ok',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  userExists: { type: 'boolean', description: 'User exists in service' },
                },
              },
            },
          },
        },
        404: {
          description: 'The innovation transfer does not exist',
        },
      },
    },
  }
);
