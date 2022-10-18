import { injectable } from 'inversify';

import { SurveyAnswersType, SurveyModel } from '@users/shared/schemas';

import { BaseAppService } from './base-app.service';


@injectable()
export class SurveyService extends BaseAppService {

	constructor() {
		super();
	}


	async saveSurvey(data: SurveyAnswersType): Promise<{ id: string }> {

		const result = await new SurveyModel({ answers: data }).save();

		return {
			id: result.get('_id').toString()
		};

	}

}
