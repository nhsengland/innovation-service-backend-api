import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { AzureFunction, HttpRequest } from '@azure/functions';

import { container } from '../_config';

import { Audit, JwtDecoder } from '@admin/shared/decorators';
import { GenericErrorsEnum, NotImplementedError } from '@admin/shared/errors';
import { JoiHelper, ResponseHelper, SwaggerHelper } from '@admin/shared/helpers';
import type { AuthorizationService } from '@admin/shared/services';
import { ActionEnum, TargetEnum } from '@admin/shared/services/integrations/audit.service';
import SHARED_SYMBOLS from '@admin/shared/services/symbols';
import type { CustomContextType } from '@admin/shared/types';

import type { DemoService } from '../_services/demo.service';
import SYMBOLS from '../_services/symbols';
import { ParamsSchema, ParamsType } from './validation.schemas';

class V1InnovationCreate {
  @JwtDecoder()
  @Audit({
    action: ActionEnum.CREATE,
    identifierResponseField: 'id',
    target: TargetEnum.INNOVATION
  })
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
    const authorizationService = container.get<AuthorizationService>(SHARED_SYMBOLS.AuthorizationService);
    const demoService = container.get<DemoService>(SYMBOLS.DemoService);

    try {
      if (process.env['DEMO_MODE'] !== 'true') {
        throw new NotImplementedError(GenericErrorsEnum.NOT_IMPLEMENTED_ERROR);
      }

      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      const auth = await authorizationService.validate(context).checkInnovatorType().checkAdminType().verify();

      await demoService.updateInnovationWithDemoData(auth.getContext(), params.innovationId);
      context.res = ResponseHelper.NoContent();
      return;
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1InnovationCreate.httpTrigger as AzureFunction, '/v1/demo/innovation/{innovationId}', {
  post: {
    description: 'Create an innovation IR demo data (depends on environment)',
    operationId: 'v1-innovation-create-demo',
    parameters: SwaggerHelper.paramJ2S({ path: ParamsSchema }),
    responses: {
      204: { description: 'Success' },
      400: { description: 'Invalid innovation payload' },
      422: { description: 'Unprocessable entity' }
    }
  }
});
