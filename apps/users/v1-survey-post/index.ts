import type { HttpRequest } from '@azure/functions';
import { JwtDecoder } from '@users/shared/decorators';
import { NOSQLConnectionServiceSymbol, NOSQLConnectionServiceType } from '@users/shared/services';
import type { CustomContextType } from '@users/shared/types';
import { container } from '../_config';

/**
 * TODO: Rework this into a service
 */
import { SurveyModel } from '@users/shared/schemas/survey.schema';
import { Document } from 'mongoose';
import { Data } from 'applicationinsights/out/Declarations/Contracts';

class V1SurveyPOST {

    @JwtDecoder()
    static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {
        
        const data = request.body;
        const survey = new SurveyModel({
            answers: {
                ...data,
            }
        })

        const result = await survey.save();

        const docId = result.get('_id').toString();

    }
}

export default V1SurveyPOST.httpTrigger;