import { injectable } from 'inversify';

import { ServiceRoleEnum, TermsOfUseTypeEnum } from '@users/shared/enums';
import { TermsOfUseEntity, TermsOfUseUserEntity, UserEntity } from '@users/shared/entities';
import { BadRequestError, NotFoundError, UnprocessableEntityError, UserErrorsEnum } from '@users/shared/errors';
import type { DateISOType } from '@users/shared/types';

import { BaseService } from './base.service';


@injectable()
export class TermsOfUseService extends BaseService {

	constructor() {
		super();
	}


	async getActiveTermsOfUseInfo(user: { id: string }, currentRole: ServiceRoleEnum | ''): Promise<{ id: string, name: string, summary: string, releasedAt: null | DateISOType, isAccepted: boolean }> {

		let termsOfUseType: TermsOfUseTypeEnum;

		switch (currentRole) {
			case ServiceRoleEnum.ASSESSMENT:
			case ServiceRoleEnum.ACCESSOR:
			case ServiceRoleEnum.QUALIFYING_ACCESSOR:
				termsOfUseType = TermsOfUseTypeEnum.SUPPORT_ORGANISATION;
				break;
			case ServiceRoleEnum.INNOVATOR:
				termsOfUseType = TermsOfUseTypeEnum.INNOVATOR;
				break;
			default:
				throw new BadRequestError(UserErrorsEnum.USER_TYPE_INVALID);
		}


		const dbTermsOfUse = await this.sqlConnection.createQueryBuilder(TermsOfUseEntity, 'termsOfUse')
			.select('termsOfUse.id', 'id')
			.addSelect('termsOfUse.name', 'name')
			.addSelect('termsOfUse.summary', 'summary')
			.addSelect('termsOfUse.released_at', 'releasedAt')
			.addSelect('termsOfUseUsers.accepted_at', 'acceptedAt')
			.innerJoin(subQuery => subQuery
				.select('MAX(subQ_TermsOfUse.released_at)', 'maxReleasedAt')
				.from(TermsOfUseEntity, 'subQ_TermsOfUse')
				.where('subQ_TermsOfUse.touType = :termsOfUseType', { termsOfUseType })
				, 'maxTermsOfUse', 'maxTermsOfUse.maxReleasedAt = termsOfUse.releasedAt')
			.leftJoin('termsOfUse.termsOfUseUsers', 'termsOfUseUsers', 'termsOfUseUsers.user_id = :userId', { userId: user.id })
			.getRawOne();

		if (!dbTermsOfUse) {
			throw new NotFoundError(UserErrorsEnum.USER_TERMS_OF_USE_NOT_FOUND);
		}

		return {
			id: dbTermsOfUse.id,
			name: dbTermsOfUse.name,
			summary: dbTermsOfUse.summary,
			releasedAt: dbTermsOfUse.releasedAt,
			isAccepted: !!dbTermsOfUse.acceptedAt
		};

	}


	async acceptActiveTermsOfUse(requestUser: { id: string }, currentRole: ServiceRoleEnum | '' ): Promise<{ id: string }> {

		const dbTermsOfUse = await this.getActiveTermsOfUseInfo(requestUser, currentRole);

		if (!dbTermsOfUse.releasedAt) {
			throw new UnprocessableEntityError(UserErrorsEnum.USER_TERMS_OF_USE_INVALID, { message: 'Unreleased terms of use' });
		}

		if (dbTermsOfUse.isAccepted) {
			throw new UnprocessableEntityError(UserErrorsEnum.USER_TERMS_OF_USE_INVALID, { message: 'Already accepted' });
		}

		await this.sqlConnection.getRepository(TermsOfUseUserEntity).save(TermsOfUseUserEntity.new({
			termsOfUse: TermsOfUseEntity.new({ id: dbTermsOfUse.id }),
			user: UserEntity.new({ id: requestUser.id }),
			acceptedAt: new Date().toISOString()
		}));

		return {
			id: dbTermsOfUse.id
		};

	}

}
