import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { Audit, JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@innovations/shared/services';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';
import { InnovationsServiceSymbol, InnovationsServiceType } from '../_services/interfaces';

import { UserTypeEnum } from '@innovations/shared/enums';
import { ActionEnum, TargetEnum } from '@innovations/shared/services/integrations/audit.service';
import type { ResponseDTO } from './transformation.dtos';
import { ParamsSchema, ParamsType, QueryParamsSchema, QueryParamsType } from './validation.schemas';


class V1InnovationInfo {

  @JwtDecoder()
  @Audit({ action: ActionEnum.READ, target: TargetEnum.INNOVATION, identifierParam: 'innovationId' })
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const innovationsService = container.get<InnovationsServiceType>(InnovationsServiceSymbol);

    try {

      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);
      const queryParams = JoiHelper.Validate<QueryParamsType>(QueryParamsSchema, request.query);

      const auth = await authorizationService.validate(context)
        .setInnovation(params.innovationId)
        .checkInnovation()
        .verify();

      const requestUser = auth.getUserInfo();
      const domainContext = auth.getContext();

      const result = await innovationsService.getInnovationInfo(
        {
          id: requestUser.id,
          type: requestUser.type,
          ...(domainContext.organisation?.organisationUnit?.id ? { organisationUnitId: domainContext.organisation.organisationUnit.id } : {}),
        },
        params.innovationId,
        queryParams
      );
      context.res = ResponseHelper.Ok<ResponseDTO>({
        id: result.id,
        name: result.name,
        description: result.description,
        status: result.status,
        statusUpdatedAt: result.statusUpdatedAt,
        submittedAt: result.submittedAt,
        countryName: result.countryName,
        postCode: result.postCode,
        categories: result.categories,
        otherCategoryDescription: result.otherCategoryDescription,
        owner: {
          id: result.owner.id,
          name: result.owner.name,
          isActive: result.owner.isActive,
          // Contact details only sent to Assessment and Admin users.
          ...([UserTypeEnum.ASSESSMENT, UserTypeEnum.ADMIN].includes(requestUser.type) ? { email: result.owner.email } : {}),
          ...([UserTypeEnum.ASSESSMENT, UserTypeEnum.ADMIN].includes(requestUser.type) ? { mobilePhone: result.owner.mobilePhone } : {}),
          organisations: result.owner.organisations.length > 0 ? result.owner.organisations : null,
          ...([UserTypeEnum.ADMIN].includes(requestUser.type) ? { lastLoginAt: result.owner.lastLoginAt } : {}),

        },
        lastEndSupportAt: result.lastEndSupportAt,
        export: result.export,
        ...(result.assessment === undefined ? {} : { assessment: result.assessment }),
        ...(result.supports === undefined ? {} : {
          supports: result.supports.map(s => ({
            id: s.id,
            status: s.status,
            organisationUnitId: s.organisationUnitId
          }))
        })
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
    parameters: [
      {
        name: 'innovationId',
        in: 'path',
        required: true,
        description: 'Innovation ID',
        schema: {
          type: 'string',
          format: 'uuid'
        }
      },
    ],
    responses: {
      200: { description: 'Success' },
      400: { description: 'Invalid innovation payload' },
    },
  },
});
