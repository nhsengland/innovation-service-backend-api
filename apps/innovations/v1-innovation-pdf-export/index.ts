//import { mapOpenApi3 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';
import type { HttpRequest } from '@azure/functions';

//import { JwtDecoder } from '@innovations/shared/decorators';
import { JoiHelper, ResponseHelper } from '@innovations/shared/helpers';
import type { CustomContextType } from '@innovations/shared/types';
import { container } from '../_config';
import { InnovationSectionsServiceSymbol, InnovationSectionsServiceType } from '../_services/interfaces';
import { ParamsSchema, ParamsType } from './validation.schemas';


class PostInnovationPDFExport {

  //@JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const innovationSectionsService = container.get<InnovationSectionsServiceType>(InnovationSectionsServiceSymbol);
  
    try {

      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      const data = await innovationSectionsService.findAllSections(params.innovationId);


      const documentDefinition = {
        content: [
          {
            text: data.innovation.name,
            style: 'document-title',
            pageBreak: 'after',
          },
          { 
            toc: {
              title: { text: 'INDEX', style: 'header' },
              //textMargin: [0, 0, 0, 0],
              //textStyle: {italics: true},
              numberStyle: { bold: true }
            }
          },
        ]
      }

      data.innovationSections.forEach((entry) => {
        documentDefinition.content.push({
          toc: {
            title: {
              text: entry.section.section || '',
              style: 'header',
            },
            numberStyle: { bold: true },
          }
        });
       });

      

      return;
        
    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }

  }

}

export default PostInnovationPDFExport.httpTrigger;