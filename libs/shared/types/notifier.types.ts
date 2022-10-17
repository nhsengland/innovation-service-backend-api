import type { InnovationActionStatusEnum, InnovationSectionCatalogueEnum, InnovationSupportStatusEnum } from '../enums/innovation.enums';
import type { NotifierTypeEnum } from '../enums/notifier.enums';


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

  [NotifierTypeEnum.DAILY_DIGEST]: Record<string, never>,
  [NotifierTypeEnum.INCOMPLETE_INNOVATION_RECORD]: Record<string, never>,
  [NotifierTypeEnum.IDLE_SUPPORT]: Record<string, never>,

}
