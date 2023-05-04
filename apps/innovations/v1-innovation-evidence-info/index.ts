import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@innovations/shared/services';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@innovations/shared/helpers';
import { CurrentCatalogTypes } from '@innovations/shared/schemas/innovation-record';
import type { CustomContextType } from '@innovations/shared/types';
import { container } from '../_config';
import type { InnovationSectionsService } from '../_services/innovation-sections.service';
import SYMBOLS from '../_services/symbols';
import type { ResponseDTO } from './transformation.dtos';
import { ParamsSchema, ParamsType } from './validation.schemas';

class GetInnovationEvidenceInfo {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationServiceType>(
      AuthorizationServiceSymbol
    );
    const innovationSectionsService = container.get<InnovationSectionsService>(
      SYMBOLS.InnovationSectionsService
    );

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      await authorizationService
        .validate(context)
        .setInnovation(params.innovationId)
        .checkAssessmentType()
        .checkAccessorType()
        .checkInnovatorType()
        .checkAdminType()
        .checkInnovation()
        .verify();

      const result = await innovationSectionsService.getInnovationEvidenceInfo(
        params.innovationId,
        params.evidenceOffset
      );
      context.res = ResponseHelper.Ok<ResponseDTO>({
        evidenceType: result.evidenceType,
        evidenceSubmitType: result.evidenceSubmitType,
        description: result.description,
        summary: result.summary,
        files: result.files,
      });
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(
  GetInnovationEvidenceInfo.httpTrigger as AzureFunction,
  '/v1/{innovationId}/evidences/{evidenceOffset}',
  {
    get: {
      description: 'Get an innovation evidence info.',
      tags: ['Innovation'],
      summary: 'Get an innovation evidence info.',
      operationId: 'v1-innovation-evidence-info',
      parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
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
                    enum: Object.values(CurrentCatalogTypes.catalogEvidenceType),
                    description: 'Evidence type.',
                  },
                  evidenceSubmitType: {
                    type: 'string',
                    enum: Object.values(CurrentCatalogTypes.catalogEvidenceSubmitType),
                    description: 'Clinical submit type.',
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
  }
);
