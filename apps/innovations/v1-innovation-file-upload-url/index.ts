import { container } from '../_config';

import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@innovations/shared/helpers';
import type { AuthorizationService } from '@innovations/shared/services';
import SHARED_SYMBOLS from '@innovations/shared/services/symbols';
import type { CustomContextType } from '@innovations/shared/types';

import type { InnovationFileService } from '../_services/innovation-file.service';
import SYMBOLS from '../_services/symbols';
import { ResponseBodySchema, type ResponseDTO } from './transformation.dtos';
import { BodySchema, BodyType, ParamsSchema, ParamsType } from './validation.schemas';

class V1InnovationFileUploadUrl {
  // @Audit({
  //   action: ActionEnum.UPDATE,
  //   target: TargetEnum.INNOVATION,
  //   identifierParam: 'innovationId'
  // })
  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const innovationFileService = container.get<InnovationFileService>(SYMBOLS.InnovationFileService);

    try {
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);
      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);

      await authorizationService
        .validate(context)
        .setInnovation(params.innovationId)
        .checkInnovatorType()
        .checkAccessorType()
        .checkAssessmentType()
        .checkInnovation()
        .verify();

      const res = await innovationFileService.getFileUploadUrl(body.filename);

      context.res = ResponseHelper.Ok<ResponseDTO>(res);
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1InnovationFileUploadUrl.httpTrigger as AzureFunction, '/v1/{innovationId}/files/upload-url', {
  post: {
    operationId: 'v1-innovation-file-upload-url',
    description: 'Get the upload url for an innovation file.',
    tags: ['[v1] Innovation Files'],
    parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
    requestBody: SwaggerHelper.bodyJ2S(BodySchema),
    responses: {
      200: SwaggerHelper.responseJ2S(ResponseBodySchema, {
        description: 'Success'
      }),
      400: { description: 'Invalid payload' },
      404: { description: 'Innovation not found' }
    }
  }
});
