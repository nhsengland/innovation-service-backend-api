import { TermsOfUseEntity } from '@admin/shared/entities';
import type { TermsOfUseTypeEnum } from '@admin/shared/enums';
import type { DateISOType } from '@admin/shared/types';
import { injectable } from 'inversify';
import { BaseService } from './base.service';


@injectable()
export class AdminTermsOfUseService extends BaseService {

    constructor() {
        super();
    }
    
    async createTermsOfUse(
        requestUser: { id: string },
        touPayload: {
            name: string,
            touType: TermsOfUseTypeEnum,
            summary?: string,
            releasedAt?: DateISOType
        }
    ):
    Promise<{ id: string }> {

        return await this.sqlConnection.transaction(async transaction => {

            const savedToU = await transaction.save(
                TermsOfUseEntity,
                TermsOfUseEntity.new({
                    name: touPayload.name,
                    touType: touPayload.touType,
                    summary: touPayload.summary || '',
                    createdBy: requestUser.id,
                    updatedBy: requestUser.id,
                    releasedAt: touPayload.releasedAt || null
                })
            )

            return { id: savedToU.id }
             
        })
    }

    async updateTermsOfUse(
        requestUser: { id: string },
        touPayload: {
            name: string,
            touType: TermsOfUseTypeEnum,
            summary?: string,
            releasedAt?: DateISOType
        },
        touId: string
    ):
    Promise<{ id: string }> {

        await this.sqlConnection.transaction(async transaction => {

            await transaction.update(
                TermsOfUseEntity,
                { id: touId },
                {
                    name: touPayload.name,
                    touType: touPayload.touType,
                    summary: touPayload.summary || '',
                    updatedBy: requestUser.id,
                    releasedAt: touPayload.releasedAt || null
                }
            )
        })

        return { id: touId }
    }
}