import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';
import {
  AuthorizationServiceSymbol,
  type AuthorizationServiceType,
} from '@innovations/shared/services';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';

import type { InnovationSupportsService } from '../_services/innovation-supports.service';
import SYMBOLS from '../_services/symbols';
import type { ResponseDTO } from './transformation.dtos';
import {
  ParamsSchema,
  QueryParamsSchema,
  type ParamsType,
  type QueryParamsType,
} from './validation.schemas';

class V1InnovationSupportsList {
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
      const queryParams = JoiHelper.Validate<QueryParamsType>(QueryParamsSchema, request.query);

      await authorizationService
        .validate(context)
        .setInnovation(params.innovationId)
        .checkAssessmentType()
        .checkAccessorType()
        .checkInnovatorType()
        .checkAdminType()
        .checkInnovation()
        .verify();

      const result = await innovationSupportsService.getInnovationSupportsList(
        params.innovationId,
        queryParams
      );
      context.res = ResponseHelper.Ok<ResponseDTO>(
        result.map((item) => ({
          id: item.id,
          status: item.status,
          organisation: {
            id: item.organisation.id,
            name: item.organisation.name,
            acronym: item.organisation.acronym!,
            unit: {
              id: item.organisation.unit.id,
              name: item.organisation.unit.name,
              acronym: item.organisation.unit.acronym!,
            },
          },
          ...(item.engagingAccessors === undefined
            ? {}
            : { engagingAccessors: item.engagingAccessors }),
        }))
      );
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(
  V1InnovationSupportsList.httpTrigger as AzureFunction,
  '/v1/{innovationId}/supports',
  {
    get: {
      description: `Get a list with all Innovation's Supports.`,
      operationId: 'v1-innovations-supports-list',
      tags: ['[v1] Innovation Support'],
      parameters: [
        {
          in: 'path',
          name: 'innovationId',
          required: true,
          schema: {
            type: 'string',
          },
        },
        {
          in: 'query',
          name: 'status',
          required: false,
          schema: {
            type: 'string',
          },
        },
      ],
      responses: {
        200: {
          description: 'Success',
        },
        404: {
          description: 'Not found',
        },
      },
    },
  }
);
