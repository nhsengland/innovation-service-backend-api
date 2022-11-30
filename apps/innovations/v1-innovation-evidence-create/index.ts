// import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
// import type { AzureFunction, HttpRequest } from '@azure/functions';

// import { JwtDecoder } from '@innovations/shared/decorators';
// import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';
// import {
//   AuthorizationServiceSymbol,
//   AuthorizationServiceType,
// } from '@innovations/shared/services';
// import type { CustomContextType } from '@innovations/shared/types';

// import { container } from '../_config';
// import {
//   InnovationSectionsServiceSymbol,
//   InnovationSectionsServiceType,
// } from '../_services/interfaces';

// import type { ResponseDTO } from './transformation.dtos';
// import { ParamsSchema, ParamsType } from './validation.schemas';

// class InnovatorsCreateInnovationEvidence {
//   @JwtDecoder()
//   static async httpTrigger(
//     context: CustomContextType,
//     req: HttpRequest
//   ): Promise<void> {
//     const evidence = req.body;
//     const innovationId = req.params.innovationId;

//     evidence.innovation = innovationId;

//     let result;
//     try {
//       result = await persistence.createInnovationEvidence(
//         context,
//         evidence,
//         InnovationSectionCatalogue.EVIDENCE_OF_EFFECTIVENESS
//       );
//     } catch (error) {
//       context.logger(`[${req.method}] ${req.url}`, Severity.Error, { error });
//       context.log.error(error);
//       context.res = Responsify.ErroHandling(error);
//       return;
//     }

//     context.res = Responsify.Created({ id: result.id });
//   }
// }

// export default InnovatorsCreateInnovationEvidence.httpTrigger;
