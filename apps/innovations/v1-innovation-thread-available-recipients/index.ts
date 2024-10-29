import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@innovations/shared/helpers';
import type { AuthorizationService } from '@innovations/shared/services';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';

import SYMBOLS from '../_services/symbols';
import type { ResponseDTO } from './transformation.dtos';
import { ParamsSchema, type ParamsType } from './validation.schemas';
import type { InnovationsService } from '../_services/innovations.service';

class V1InnovationThreadAvailableRecipients {
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const innovationService = container.get<InnovationsService>(SYMBOLS.InnovationsService);

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

      const result = await innovationService.getInnovationRelavantOrganisationsStatusList(params.innovationId, true);
      const filteredResult = result.filter(item => item.recipients !== undefined && item.recipients.length > 0);

      context.res = ResponseHelper.Ok<ResponseDTO>(
        filteredResult
          .map(item => ({
            id: item.id,
            status: item.status,
            organisation: {
              id: item.organisation.id,
              name: item.organisation.name,
              acronym: item.organisation.acronym!,
              unit: {
                id: item.organisation.unit.id,
                name: item.organisation.unit.name,
                acronym: item.organisation.unit.acronym!
              }
            },
            //This is needed for typescript < 5.5
            recipients: item.recipients ? item.recipients : []
          }))
          .sort((a, b) => a.organisation.unit.name.localeCompare(b.organisation.unit.name))
      );
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(
  V1InnovationThreadAvailableRecipients.httpTrigger as AzureFunction,
  '/v1/{innovationId}/threads/available-recipients',
  {
    get: {
      description: `Get a list with a list of thread recipients for a respective innovation.`,
      operationId: 'v1-innovations-threads-available-recipients',
      tags: ['[v1] Innovation Threads Available Recipients'],
      parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
      responses: {
        200: {
          description: 'Success'
        },
        404: {
          description: 'Not found'
        }
      }
    }
  }
);
