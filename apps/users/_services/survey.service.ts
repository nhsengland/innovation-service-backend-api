
import { SurveyModel } from '@users/shared/schemas/survey.schema';
import type { Document } from 'mongoose';

import { BaseAppService } from "./base-app.service";

export class SurveyService extends BaseAppService {

	constructor() {
		super();
	}

	async save(data: any): Promise<Document<typeof SurveyModel>> {
		const survey = new SurveyModel({
			answers: {
				...data,
			},
		});

		//TODO: remove this any. check mongoose version, etc.
		const result = survey.save() as any;

		return result;
	};

	getId(doc: Document<typeof SurveyModel>): string {
		return doc.get("_id").toString();
	};
}