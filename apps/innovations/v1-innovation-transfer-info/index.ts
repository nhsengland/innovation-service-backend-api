import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@innovations/shared/helpers';
import type { AuthorizationService } from '@innovations/shared/services';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';
import type { InnovationTransferService } from '../_services/innovation-transfer.service';
import SYMBOLS from '../_services/symbols';
import { ResponseBodySchema, type ResponseDTO } from './transformation.dtos';
import { ParamsSchema, ParamsType } from './validation.schemas';

class GetInnovationTransfer {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const innovationTransferService = container.get<InnovationTransferService>(SYMBOLS.InnovationTransferService);

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      await authorizationService.validate(context).checkInnovatorType().verify();

      const result = await innovationTransferService.getInnovationTransferInfo(params.transferId);
      context.res = ResponseHelper.Ok<ResponseDTO>({
        id: result.id,
        email: result.email,
        innovation: {
          id: result.innovation.id,
          name: result.innovation.name,
          owner: { name: result.innovation.owner.name }
        }
      });
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(GetInnovationTransfer.httpTrigger as AzureFunction, '/v1/transfers/{transferId}', {
  get: {
    description: 'Get an innovation transfer',
    operationId: 'getInnovationTransfer',
    parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
    responses: {
      200: SwaggerHelper.responseJ2S(ResponseBodySchema, {
        description: 'Success'
      }),
      404: {
        description: 'Not Found',
        content: {
          'application/json': {
            schema: {
              type: 'object'
            }
          }
        }
      }
    }
  }
});
