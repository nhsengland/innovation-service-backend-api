import type { AzureFunction, HttpRequest } from '@azure/functions'
import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@innovations/shared/services';
import type { CustomContextType } from '@innovations/shared/types';

import { container } from '../_config';
import { InnovationsServiceSymbol, InnovationsServiceType } from '../_services/interfaces';

import type { ResponseDTO } from './transformation.dtos';
import { ParamsSchema, ParamsType, QueryParamsSchema, QueryParamsType } from './validation.schemas';
import { UserTypeEnum } from '@innovations/shared/enums';


class V1InnovationInfo {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const innovationsService = container.get<InnovationsServiceType>(InnovationsServiceSymbol);

    try {

      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);
      const queryParams = JoiHelper.Validate<QueryParamsType>(QueryParamsSchema, request.query);

      const auth = await authorizationService.validate(context.auth.user.identityId)
        .setInnovation(params.innovationId)
        .checkAssessmentType()
        .checkAssessmentType()
        .checkAccessorType()
        .checkInnovatorType()
        .checkInnovation()
        .verify();
      const requestUser = auth.getUserInfo();

      const result = await innovationsService.getInnovationInfo(
        {
          id: requestUser.id,
          type: requestUser.type,
          ...(requestUser.organisations[0]?.organisationUnits[0]?.id ? { organisationUnitId: requestUser.organisations[0].organisationUnits[0].id } : {}),
        },
        params.innovationId,
        queryParams
      );
      context.res = ResponseHelper.Ok<ResponseDTO>({
        id: result.id,
        name: result.name,
        description: result.description,
        status: result.status,
        submittedAt: result.submittedAt,
        countryName: result.countryName,
        postCode: result.postCode,
        categories: result.categories,
        otherCategoryDescription: result.otherCategoryDescription,
        owner: {
          id: result.owner.id,
          name: result.owner.name,
          isActive: result.owner.isActive,
          // Contact details only sent to Assessment users.
          ...(requestUser.type === UserTypeEnum.ASSESSMENT ? { email: result.owner.email } : {}),
          ...(requestUser.type === UserTypeEnum.ASSESSMENT ? { mobilePhone: result.owner.mobilePhone } : {}),
          organisations: result.owner.organisations.length > 0 ? result.owner.organisations : null
        },
        lastEndSupportAt: result.lastEndSupportAt,
        canUserExport: result.canUserExport,
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
