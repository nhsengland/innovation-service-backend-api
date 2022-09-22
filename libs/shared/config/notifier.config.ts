import type { InnovationActionStatusEnum, InnovationSectionCatalogueEnum, InnovationSupportStatusEnum } from '../enums/innovation.enums';


export enum NotifierTypeEnum {
  INNOVATOR_ACCOUNT_CREATION = 'INNOVATOR_ACCOUNT_CREATION',
  INNOVATION_SUBMITED = 'INNOVATION_SUBMITED',
  NEEDS_ASSESSMENT_COMPLETED = 'NEEDS_ASSESSMENT_COMPLETED',
  INNOVATION_SUPPORT_STATUS_UPDATE = 'INNOVATION_SUPPORT_STATUS_UPDATE',
  INNOVATION_ORGANISATION_UNITS_SUGGESTION = 'INNOVATION_ORGANISATION_UNITS_SUGGESTION',
  ACTION_CREATION = 'ACTION_CREATION',
  ACTION_UPDATE = 'ACTION_UPDATE',
  COMMENT_CREATION = 'COMMENT_CREATION', // TODO: Deprecated!
  THREAD_CREATION = 'THREAD_CREATION',
  THREAD_MESSAGE_CREATION = 'THREAD_MESSAGE_CREATION',
  INNOVATION_ARCHIVED = 'INNOVATION_ARCHIVED',
  INNOVATION_TRANSFER_OWNERSHIP_CREATION = 'INNOVATION_TRANSFER_OWNERSHIP_CREATION',
  INNOVATION_TRANSFER_OWNERSHIP_COMPLETED = 'INNOVATION_TRANSFER_OWNERSHIP_COMPLETED',
  SLS_VALIDATION = 'SLS_VALIDATION',
  // Admin module.
  LOCK_USER = 'LOCK_USER',
  ACCESSOR_UNIT_CHANGE = 'ACCESSOR_UNIT_CHANGE',
  UNIT_INACTIVATION_SUPPORT_COMPLETED = 'UNIT_INACTIVATION_SUPPORT_COMPLETED',
  // DIGEST
  DAILY_DIGEST = 'DAILY_DIGEST'
}

export type NotifierTemplatesType = {

  [NotifierTypeEnum.INNOVATOR_ACCOUNT_CREATION]: Record<string, never>,

  [NotifierTypeEnum.INNOVATION_SUBMITED]: {
    innovationId: string
  },

  [NotifierTypeEnum.NEEDS_ASSESSMENT_COMPLETED]: {
    innovationId: string,
    assessmentId: string,
    organisationUnitIds: string[] // Suggested organisation units.
  },

  [NotifierTypeEnum.INNOVATION_SUPPORT_STATUS_UPDATE]: {
    innovationId: string,
    innovationSupport: {
      id: string, status: InnovationSupportStatusEnum, statusChanged: boolean
    }
  },

  [NotifierTypeEnum.INNOVATION_ORGANISATION_UNITS_SUGGESTION]: {
    innovationId: string,
    organisationUnitIds: string[] // Suggested organisation units.
  },

  [NotifierTypeEnum.ACTION_CREATION]: {
    innovationId: string,
    action: { id: string, section: InnovationSectionCatalogueEnum }
  },

  [NotifierTypeEnum.ACTION_UPDATE]: {
    innovationId: string,
    action: { id: string, section: InnovationSectionCatalogueEnum, status: InnovationActionStatusEnum }
  },

  [NotifierTypeEnum.COMMENT_CREATION]: {
    innovationId: string,
    commentId: string,
    replyToId?: string
  },

  [NotifierTypeEnum.THREAD_CREATION]: {
    innovationId: string,
    threadId: string,
    messageId: string
  },

  [NotifierTypeEnum.THREAD_MESSAGE_CREATION]: {
    innovationId: string,
    threadId: string,
    messageId: string
  },

  [NotifierTypeEnum.INNOVATION_ARCHIVED]: {
    innovation: { id: string, name: string, assignedUserIds: string[] }
  },

  [NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_CREATION]: {
    innovationId: string,
    transferId: string
  },

  [NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_COMPLETED]: {
    innovationId: string,
    transferId: string
  },

  [NotifierTypeEnum.SLS_VALIDATION]: {
    code: string
  },

  [NotifierTypeEnum.LOCK_USER]: {
    user: { id: string, identityId: string }
  },

  [NotifierTypeEnum.ACCESSOR_UNIT_CHANGE]: {
    user: { id: string },
    oldOrganisationUnitId: string,
    newOrganisationUnitId: string
  },

  [NotifierTypeEnum.UNIT_INACTIVATION_SUPPORT_COMPLETED]: {
    innovationId: string,
    unitId: string
  },

  [NotifierTypeEnum.DAILY_DIGEST]: Record<string, never>

}
