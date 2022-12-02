import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@innovations/shared/services';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';
import type { CustomContextType } from '@innovations/shared/types';
import { container } from '../_config';
import { InnovationSectionsServiceSymbol, InnovationSectionsServiceType } from '../_services/interfaces';
import type { ResponseDTO } from './transformation.dtos';
import { ParamsSchema, ParamsType } from './validation.schemas';
import { ClinicalEvidenceTypeCatalogueEnum, EvidenceTypeCatalogueEnum } from '@innovations/shared/enums';


class CreateInnovationEvidence {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const innovationSectionsService = container.get<InnovationSectionsServiceType>(InnovationSectionsServiceSymbol);

    try {
      
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params)

      const auth = await authorizationService.validate(context.auth.user.identityId)
        .setInnovation(params.innovationId)
        .checkInnovatorType()
        .checkInnovation()
        .verify();

      const requestUser = auth.getUserInfo();

      const result = await innovationSectionsService.createInnovationEvidence(
        { id: requestUser.id },
        params.innovationId,
        body.evidenceData);
      context.res = ResponseHelper.Ok<ResponseDTO>({
        id: result.id
      });
      return;

    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }

  }

}

export default openApi(CreateInnovationEvidence.httpTrigger as AzureFunction, 'v1/{innovationId}/evidences/{evidenceId}', {
  get: {
    description: 'Get an innovation evidence info.',
    tags: ['Innovation'],
    summary: 'Get an innovation evidence info.',
    operationId: 'getInnovationEvidenceInfo',
    parameters: [],
    responses: {
      200: {
        description: 'Innovation section info.',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'Innovation evidence id.',
                },
                evidenceType: {
                  type: 'string',
                  enum: [Object.values(EvidenceTypeCatalogueEnum)],
                  description: 'Evidence type.',
                },
                clinicalEvidenceType: {
                  type: 'string',
                  enum: [Object.values(ClinicalEvidenceTypeCatalogueEnum)],
                  description: 'Clinical Evidence type.',
                },
                description: {
                  type: 'string',
                  description: 'Evidence description.',
                },
                summary: {
                  type: 'string',
                  description: 'Evidence summary.',
                },
                files: {
                  type: 'array',
                  description: 'Innovation evidence files.',
                  items: {
                    type: 'object',
                    properties: {
                      id: {
                        type: 'string',
                        description: 'File id.',
                      },
                      displayFileName: {
                        type: 'string',
                        description: 'File display name.',
                      },
                      url: {
                        type: 'string',
                        description: 'File url.',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      401: {
        description: 'Unauthorized',
      },
      403: {
        description: 'Forbidden',
      },
      404: {
        description: 'Not found',
      },
      500: {
        description: 'Internal server error',
      },
    },
  },
});
