import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, Context, HttpRequest } from '@azure/functions';

import { JoiHelper, ResponseHelper, SwaggerHelper } from '@innovations/shared/helpers';

import { container } from '../_config';

import type { InnovationTransferService } from '../_services/innovation-transfer.service';
import SYMBOLS from '../_services/symbols';
import type { ResponseDTO } from './transformation.dtos';
import type { ParamsType } from './validation.schemas';
import { ParamsSchema } from './validation.schemas';

class V1InnovationTransferCheck {
  static async httpTrigger(context: Context, request: HttpRequest): Promise<void> {
    const transferService = container.get<InnovationTransferService>(SYMBOLS.InnovationTransferService);

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

export default openApi(V1InnovationTransferCheck.httpTrigger as AzureFunction, '/v1/transfers/{transferId}/check', {
  get: {
    description: 'Get details of pending innovations transfers',
    operationId: 'v1-innovation-transfer-check',
    parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
    responses: {
      200: {
        description: 'Ok',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                userExists: { type: 'boolean', description: 'User exists in service' }
              }
            }
          }
        }
      },
      404: {
        description: 'The innovation transfer does not exist'
      }
    }
  }
});
