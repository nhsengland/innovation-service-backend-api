
import type { InnovationActionStatusEnum, InnovationSectionEnum, InnovationSupportStatusEnum } from '../enums/innovation.enums';
import type { NotifierTypeEnum } from '../enums/notifier.enums';


export type NotifierTemplatesType = {

  [NotifierTypeEnum.INNOVATOR_ACCOUNT_CREATION]: Record<string, never>,

  [NotifierTypeEnum.INNOVATION_SUBMITED]: {
    innovationId: string
  },

  [NotifierTypeEnum.NEEDS_ASSESSMENT_STARTED]: {
    innovationId: string,
    threadId: string
  },

  [NotifierTypeEnum.NEEDS_ASSESSMENT_COMPLETED]: {
    innovationId: string,
    assessmentId: string,
    organisationUnitIds: string[] // Suggested organisation units.
  },

  [NotifierTypeEnum.NEEDS_ASSESSMENT_ASSESSOR_UPDATE]: {
    innovationId: string
    assessmentId: string,
    previousAssessor: { identityId: string },
    newAssessor: { identityId: string }
  },

  [NotifierTypeEnum.INNOVATION_SUPPORT_STATUS_UPDATE]: {
    innovationId: string,
    innovationSupport: {
      id: string, status: InnovationSupportStatusEnum, statusChanged: boolean, message: string,
      newAssignedAccessors?: { id: string }[] // Newly assigned accessors
    }
  },

  [NotifierTypeEnum.INNOVATION_ORGANISATION_UNITS_SUGGESTION]: {
    innovationId: string,
    organisationUnitIds: string[] // Suggested organisation units.
  },

  [NotifierTypeEnum.ACTION_CREATION]: {
    innovationId: string,
    action: { id: string, section: InnovationSectionEnum }
  },

  [NotifierTypeEnum.ACTION_UPDATE]: {
    innovationId: string,
    action: { id: string, section: InnovationSectionEnum, status: InnovationActionStatusEnum }
    comment?: string
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

  [NotifierTypeEnum.INNOVATION_WITHDRAWN]: {
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

  [NotifierTypeEnum.INNOVATION_RECORD_EXPORT_REQUEST]: {
    innovationId: string,
    requestId: string,
  },

  [NotifierTypeEnum.INNOVATION_RECORD_EXPORT_FEEDBACK]: {
    innovationId: string,
    requestId: string
  },

  [NotifierTypeEnum.INNOVATION_SUPPORT_STATUS_CHANGE_REQUEST]: {
    innovationId: string,
    supportId: string,
    proposedStatus: InnovationSupportStatusEnum,
    requestStatusUpdateComment: string
  },

  [NotifierTypeEnum.INNOVATION_STOP_SHARING]: {
    innovationId: string,
    previousAssignedAccessors: { id: string, organisationUnitId: string }[],
    message: string
  },

  [NotifierTypeEnum.INNOVATION_REASSESSMENT_REQUEST]: {
    innovationId: string
  },


  // Admin module.
  [NotifierTypeEnum.SLS_VALIDATION]: {
    code: string
  },

  [NotifierTypeEnum.LOCK_USER]: {
    user: { id: string }
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

  // Recurrent notifications.
  [NotifierTypeEnum.DAILY_DIGEST]: Record<string, never>,
  [NotifierTypeEnum.INCOMPLETE_INNOVATION_RECORD]: Record<string, never>,
  [NotifierTypeEnum.IDLE_SUPPORT]: Record<string, never>

}
