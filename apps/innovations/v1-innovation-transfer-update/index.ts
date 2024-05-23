import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { ElasticSearchDocumentUpdate, JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';
import type { AuthorizationService } from '@innovations/shared/services';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';

import type { InnovationTransferService } from '../_services/innovation-transfer.service';
import SYMBOLS from '../_services/symbols';
import type { ResponseDTO } from './transformation.dtos';
import { BodySchema, BodyType, ParamsSchema, ParamsType } from './validation.schemas';

class V1InnovationTransferUpdate {
  @JwtDecoder()
  @ElasticSearchDocumentUpdate('INNOVATION_UPDATE')
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const transferService = container.get<InnovationTransferService>(SYMBOLS.InnovationTransferService);

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);
      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);

      const auth = await authorizationService.validate(context).checkInnovatorType().verify();
      const requestUser = auth.getUserInfo();
      const domainContext = auth.getContext();

      const result = await transferService.updateInnovationTransferStatus(
        {
          id: requestUser.id,
          identityId: requestUser.identityId
        },
        domainContext,
        params.transferId,
        body.status
      );

      context.res = ResponseHelper.Ok<ResponseDTO>({ id: result.id });
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1InnovationTransferUpdate.httpTrigger as AzureFunction, '/v1/transfers/{transferId}', {
  patch: {
    description: 'Update an innovation transfer status',
    operationId: 'v1-innovation-transfer-update',
    parameters: [
      {
        name: 'transferId',
        in: 'path',
        required: true,
        description: 'The innovation transfer id',
        schema: {
          type: 'string'
        }
      }
    ],
    requestBody: {
      description: 'The innovation transfer status',
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object'
          }
        }
      }
    },
    responses: {
      204: {
        description: 'The innovation transfer status has been updated'
      },
      400: {
        description: 'The innovation transfer status is invalid'
      },
      401: {
        description: 'The user is not authorized to update the innovation transfer status'
      },
      404: {
        description: 'The innovation transfer does not exist'
      },
      500: {
        description: 'An error occurred while updating the innovation transfer status'
      }
    }
  }
});
