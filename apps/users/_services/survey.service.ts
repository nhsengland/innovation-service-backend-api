
import { injectable } from 'inversify';

import { SurveyModel } from '@users/shared/schemas/survey.schema';

import { BaseAppService } from "./base-app.service";


@injectable()
export class SurveyService extends BaseAppService {

	constructor() {
		super();
	}

	// TODO: Remove this ANY!
	async saveSurvey(data: any): Promise<{ id: string }> {

		const survey = new SurveyModel({ answers: data });

		//TODO: remove this any. check mongoose version, etc.
		const result = survey.save() as any;

		return {
			id: result.get('_id').toString()
		};

	}

}
