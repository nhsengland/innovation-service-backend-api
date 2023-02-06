import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction } from '@azure/functions';

import { JwtDecoder } from '@users/shared/decorators';
import { ResponseHelper } from '@users/shared/helpers';
import { AuthorizationServiceSymbol, AuthorizationServiceType } from '@users/shared/services';
import type { CustomContextType } from '@users/shared/types';

import { container } from '../_config';
import { TermsOfUseServiceSymbol, TermsOfUseServiceType } from '../_services/interfaces';

import type { ResponseDTO } from './transformation.dtos';


class V1MeTermsOfUseInfo {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const termsOfUseService = container.get<TermsOfUseServiceType>(TermsOfUseServiceSymbol);

    try {

      const authInstance = await authorizationService.validate(context)
        .checkAssessmentType()
        .checkAccessorType()
        .checkInnovatorType()
        .verify();
      const requestUser = authInstance.getUserInfo();
      const domainContext = authInstance.getContext();

      const result = await termsOfUseService.getActiveTermsOfUseInfo({ id: requestUser.id }, domainContext.currentRole.role);

      context.res = ResponseHelper.Ok<ResponseDTO>({
        id: result.id,
        name: result.name,
        summary: result.summary,
        releasedAt: result.releasedAt,
        isAccepted: result.isAccepted
      });
      return;

    } catch (error) {

      context.res = ResponseHelper.Error(context, error);
      return;

    }

  }

}


// TODO: Improve response
export default openApi(V1MeTermsOfUseInfo.httpTrigger as AzureFunction, '/v1/me/terms-of-use', {
  get: {
    description: 'Retrieves the user terms of use',
    operationId: 'v1-me-terms-of-use-info',
    tags: ['[v1] Terms of Use'],
    parameters: [],
    responses: {
      200: { description: 'Successful operation'},
      404: { description: 'Terms of use not found' }
    }
  }
});
