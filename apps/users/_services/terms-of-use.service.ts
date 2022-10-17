import { injectable } from 'inversify';

import { TermsOfUseTypeEnum, UserTypeEnum } from '@users/shared/enums';
import { TermsOfUseEntity } from '@users/shared/entities';
import { BadRequestError, UserErrorsEnum } from '@users/shared/errors';

import { BaseAppService } from "./base-app.service";
import type { DateISOType } from '@users/shared/types';


@injectable()
export class TermsOfUseService extends BaseAppService {

	constructor() {
		super();
	}


	async getTermsOfUseInfo(user: { id: string, type: UserTypeEnum }): Promise<{ id: string, name: string, summary: string, releasedAt: DateISOType, isAccepted: boolean }> {

		const query = this.sqlConnection.createQueryBuilder(TermsOfUseEntity, 'termsOfUse')
			.select('termsOfUse.id', 'id')
			.select('termsOfUse.name', 'name')
			.select('termsOfUse.summary', 'summary')
			.addSelect('termsOfUseUser.accepted_at', 'acceptedAt')
			.addSelect('MAX(termsOfUseUser.releasedAt)', 'maxReleasedAt')
			.leftJoinAndSelect('termsOfUse.termsOfUseUser', 'termsOfUseUser')
			.where('termsOfUseUser.user_id = :userId', { userId: user.id })

		switch (user.type) {
			case UserTypeEnum.ASSESSMENT:
			case UserTypeEnum.ACCESSOR:
				query.andWhere('termsOfUse.touType = :touType', { touType: TermsOfUseTypeEnum.SUPPORT_ORGANISATION })
				break;
			case UserTypeEnum.INNOVATOR:
				query.andWhere('termsOfUse.touType = :touType', { touType: TermsOfUseTypeEnum.INNOVATOR })
				break;
			default:
				throw new BadRequestError(UserErrorsEnum.USER_TYPE_INVALID);

		}

		const dbTermsOfUse = await query.getRawOne();


		// //Get latest released Terms of Use
		// const lastTermsOfUse = await this.repository.findOne({
		// 	where: {
		// 		touType: touType,
		// 	},
		// 	order: {
		// 		releasedAt: "DESC",
		// 	},
		// });

		// //Check if user has already accepted the latest Terms of Use
		// if (
		// 	await this.termsOfUseUserRepo.findOne({
		// 		where: {
		// 			termsOfUse: lastTermsOfUse,
		// 			user: requestUser.id,
		// 		},
		// 	})
		// ) {
		// 	isAccepted = true;
		// }

		return {
			id: dbTermsOfUse.id,
			name: dbTermsOfUse.name,
			summary: dbTermsOfUse.summary,
			releasedAt: dbTermsOfUse.maxReleasedAt,
			isAccepted: !!dbTermsOfUse.acceptedAt,
		};




	}

}
