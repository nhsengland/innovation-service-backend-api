import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { Audit, JwtDecoder } from '@innovations/shared/decorators';
import { InnovationStatusEnum, ServiceRoleEnum } from '@innovations/shared/enums';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@innovations/shared/helpers';
import type { AuthorizationService } from '@innovations/shared/services';
import { ActionEnum, TargetEnum } from '@innovations/shared/services/integrations/audit.service';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';

import type { InnovationsService } from '../_services/innovations.service';
import SYMBOLS from '../_services/symbols';
import { ResponseBodySchema, type ResponseDTO } from './transformation.dtos';
import { ParamsSchema, ParamsType, QueryParamsSchema, QueryParamsType } from './validation.schemas';

class V1InnovationInfo {
  @JwtDecoder()
  @Audit({
    action: ActionEnum.READ,
    target: TargetEnum.INNOVATION,
    identifierParam: 'innovationId'
  })
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const innovationsService = container.get<InnovationsService>(SYMBOLS.InnovationsService);

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);
      const queryParams = JoiHelper.Validate<QueryParamsType>(QueryParamsSchema, request.query);

      const auth = await authorizationService
        .validate(context)
        .setInnovation(params.innovationId)
        .checkInnovation()
        .verify();
      const domainContext = auth.getContext();

      const result = await innovationsService.getInnovationInfo(domainContext, params.innovationId, queryParams);
      context.res = ResponseHelper.Ok<ResponseDTO>({
        id: result.id,
        uniqueId: result.uniqueId,
        name: result.name,
        description: result.description,
        version: result.version,
        status: result.status,
        groupedStatus: result.groupedStatus,
        hasBeenAssessed: result.hasBeenAssessed,
        statusUpdatedAt: result.statusUpdatedAt,
        submittedAt: result.submittedAt,
        countryName: result.countryName,
        postCode: result.postCode,
        categories: result.categories,
        otherCategoryDescription: result.otherCategoryDescription,
        ...(result.owner === undefined
          ? {}
          : {
              owner: {
                id: result.owner.id,
                name: result.owner.name,
                isActive: result.owner.isActive,
                organisation: result.owner.organisation,
                // Contact details are always sent to ADMIN and sent to non innovators if innovation is not archived
                ...(domainContext.currentRole.role === ServiceRoleEnum.ADMIN ||
                (domainContext.currentRole.role !== ServiceRoleEnum.INNOVATOR &&
                  result.status !== InnovationStatusEnum.ARCHIVED)
                  ? {
                      email: result.owner.email,
                      mobilePhone: result.owner.mobilePhone,
                      contactByEmail: result.owner.contactByEmail,
                      contactByPhone: result.owner.contactByPhone,
                      contactByPhoneTimeframe: result.owner.contactByPhoneTimeframe,
                      contactDetails: result.owner.contactDetails
                    }
                  : {}),
                ...([ServiceRoleEnum.ADMIN].includes(domainContext.currentRole.role as ServiceRoleEnum)
                  ? { lastLoginAt: result.owner.lastLoginAt }
                  : {})
              }
            }),
        daysSinceNoActiveSupport: result.daysSinceNoActiveSupport,
        expectedArchiveDate: result.expectedArchiveDate,
        ...(result.assessment === undefined ? {} : { assessment: result.assessment }),
        ...(result.supports === undefined
          ? {}
          : {
              supports: result.supports.map(s => ({
                id: s.id,
                status: s.status,
                organisationUnitId: s.organisationUnitId
              }))
            }),
        collaboratorId: result.collaboratorId,
        createdAt: result.createdAt
      });
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1InnovationInfo.httpTrigger as AzureFunction, '/v1/{innovationId}', {
  get: {
    operationId: 'v1-innovation-info',
    description: 'Get innovation information.',
    tags: ['[v1] Innovation'],
    parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
    responses: {
      200: SwaggerHelper.responseJ2S(ResponseBodySchema, {
        description: 'Success'
      }),
      400: { description: 'Invalid innovation payload' }
    }
  }
});
