import type { IdentityOperationsTypeEnum } from '../enums'


export type IdentityOperationsTemplatesType = {

    [IdentityOperationsTypeEnum.LOCK_USER]: {
        identityId: string
    },

    [IdentityOperationsTypeEnum.UNLOCK_USER]: {
        identityId: string
    }

}