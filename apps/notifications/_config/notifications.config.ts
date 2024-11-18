import Joi from 'joi';

import { TEXTAREA_LENGTH_LIMIT } from '@notifications/shared/constants';
import {
  InnovationCollaboratorStatusEnum,
  InnovationStatusEnum,
  InnovationSupportStatusEnum,
  InnovationTaskStatusEnum,
  NotifierTypeEnum,
  ServiceRoleEnum
} from '@notifications/shared/enums';
import type { NotifierTemplatesType } from '@notifications/shared/types';

import { JoiHelper } from '@notifications/shared/helpers';
import {
  AccountCreationHandler,
  AccountDeletionHandler,
  CollaboratorInviteHandler,
  CollaboratorUpdateHandler,
  DocumentUploadHandler,
  ExportRequestFeedbackHandler,
  ExportRequestSubmittedHandler,
  IdleSupportAccessorHandler,
  IdleSupportInnovatorHandler,
  IncompleteRecordHandler,
  InnovationArchiveHandler,
  InnovationDelayedSharedSuggestionHandler,
  InnovationStopSharingHandler,
  InnovationSubmittedHandler,
  InnovationTransferOwnershipCompletedHandler,
  InnovationTransferOwnershipCreationHandler,
  InnovationTransferOwnershipExpirationHandler,
  InnovationTransferOwnershipReminderHandler,
  LockUserHandler,
  MessageCreationHandler,
  NeedsAssessmentAssessorUpdateHandler,
  NeedsAssessmentCompleteHandler,
  NeedsAssessmentStartedHandler,
  NewAccountHandler,
  NewAnnouncementHandler,
  OrganisationUnitsSuggestionHandler,
  SupportNewAssignedAccessorsHandler,
  SupportStatusChangeRequestHandler,
  SupportStatusUpdateHandler,
  SupportSummaryUpdateHandler,
  TaskCreationHandler,
  TaskUpdateHandler,
  ThreadAddFollowersHandler,
  ThreadCreationHandler,
  UnitInactivatedHandler,
  UnitKPIHandler,
  UserEmailAddressUpdatedHandler
} from '../_handlers';
import { SatisfactionSurveyReminderHandler } from '../_handlers/automatic/satisfaction-survey-reminder.handler';

export const NOTIFICATIONS_CONFIG = {
  // Account
  [NotifierTypeEnum.ACCOUNT_CREATION]: {
    handler: AccountCreationHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.ACCOUNT_CREATION]>({})
  },

  // Documents
  [NotifierTypeEnum.INNOVATION_DOCUMENT_UPLOADED]: {
    handler: DocumentUploadHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.INNOVATION_DOCUMENT_UPLOADED]>({
      innovationId: JoiHelper.AppCustomJoi().string().guid().required(),
      file: Joi.object<NotifierTemplatesType[NotifierTypeEnum.INNOVATION_DOCUMENT_UPLOADED]['file']>({
        id: JoiHelper.AppCustomJoi().string().guid().required()
      }).required()
    }).required()
  },

  // Tasks
  [NotifierTypeEnum.TASK_CREATION]: {
    handler: TaskCreationHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.TASK_CREATION]>({
      innovationId: JoiHelper.AppCustomJoi().string().guid().required(),
      task: Joi.object<NotifierTemplatesType[NotifierTypeEnum.TASK_CREATION]['task']>({
        id: JoiHelper.AppCustomJoi().string().guid().required()
      }).required()
    }).required()
  },
  [NotifierTypeEnum.TASK_UPDATE]: {
    handler: TaskUpdateHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.TASK_UPDATE]>({
      innovationId: JoiHelper.AppCustomJoi().string().guid().required(),
      task: Joi.object<NotifierTemplatesType[NotifierTypeEnum.TASK_UPDATE]['task']>({
        id: JoiHelper.AppCustomJoi().string().guid().required(),
        status: JoiHelper.AppCustomJoi()
          .string()
          .valid(...Object.values(InnovationTaskStatusEnum))
          .required()
      }).required(),
      message: JoiHelper.AppCustomJoi().string().required(),
      messageId: JoiHelper.AppCustomJoi().string().guid().required(),
      threadId: JoiHelper.AppCustomJoi().string().guid().required()
    }).required()
  },

  // Messages
  [NotifierTypeEnum.THREAD_CREATION]: {
    handler: ThreadCreationHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.THREAD_CREATION]>({
      innovationId: JoiHelper.AppCustomJoi().string().guid().required(),
      threadId: JoiHelper.AppCustomJoi().string().guid().required(),
      messageId: JoiHelper.AppCustomJoi().string().guid().required()
    }).required()
  },

  [NotifierTypeEnum.THREAD_ADD_FOLLOWERS]: {
    handler: ThreadAddFollowersHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.THREAD_ADD_FOLLOWERS]>({
      innovationId: JoiHelper.AppCustomJoi().string().guid().required(),
      threadId: JoiHelper.AppCustomJoi().string().guid().required(),
      newFollowersRoleIds: Joi.array().items(JoiHelper.AppCustomJoi().string().guid()).required()
    }).required()
  },
  [NotifierTypeEnum.THREAD_MESSAGE_CREATION]: {
    handler: MessageCreationHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.THREAD_MESSAGE_CREATION]>({
      innovationId: JoiHelper.AppCustomJoi().string().guid().required(),
      threadId: JoiHelper.AppCustomJoi().string().guid().required(),
      messageId: JoiHelper.AppCustomJoi().string().guid().required()
    }).required()
  },

  // Support
  [NotifierTypeEnum.SUPPORT_STATUS_UPDATE]: {
    handler: SupportStatusUpdateHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.SUPPORT_STATUS_UPDATE]>({
      innovationId: JoiHelper.AppCustomJoi().string().guid().required(),
      threadId: JoiHelper.AppCustomJoi().string().guid().required(),
      support: Joi.object<NotifierTemplatesType[NotifierTypeEnum.SUPPORT_STATUS_UPDATE]['support']>({
        id: JoiHelper.AppCustomJoi().string().guid().required(),
        status: JoiHelper.AppCustomJoi()
          .string()
          .valid(...Object.values(InnovationSupportStatusEnum))
          .required(),
        message: JoiHelper.AppCustomJoi().string().max(TEXTAREA_LENGTH_LIMIT.xl).required(),
        newAssignedAccessorsIds: Joi.array().items(JoiHelper.AppCustomJoi().string().guid())
      }).required()
    }).required()
  },
  [NotifierTypeEnum.SUPPORT_NEW_ASSIGN_ACCESSORS]: {
    handler: SupportNewAssignedAccessorsHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.SUPPORT_NEW_ASSIGN_ACCESSORS]>({
      innovationId: JoiHelper.AppCustomJoi().string().guid().required(),
      supportId: JoiHelper.AppCustomJoi().string().guid().required(),
      threadId: JoiHelper.AppCustomJoi().string().guid().required(),
      message: JoiHelper.AppCustomJoi().string().max(TEXTAREA_LENGTH_LIMIT.xl).required(),
      newAssignedAccessorsRoleIds: Joi.array().items(JoiHelper.AppCustomJoi().string().guid()),
      removedAssignedAccessorsRoleIds: Joi.array().items(JoiHelper.AppCustomJoi().string().guid()),
      changedStatus: Joi.boolean().strict().required()
    }).required()
  },
  [NotifierTypeEnum.SUPPORT_STATUS_CHANGE_REQUEST]: {
    handler: SupportStatusChangeRequestHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.SUPPORT_STATUS_CHANGE_REQUEST]>({
      innovationId: JoiHelper.AppCustomJoi().string().guid().required(),
      supportId: JoiHelper.AppCustomJoi().string().guid().required(),
      proposedStatus: JoiHelper.AppCustomJoi()
        .string()
        .valid(...Object.values(InnovationSupportStatusEnum))
        .required(),
      requestStatusUpdateComment: JoiHelper.AppCustomJoi().string().required()
    }).required()
  },

  // Needs Assessment
  [NotifierTypeEnum.INNOVATION_SUBMITTED]: {
    handler: InnovationSubmittedHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.INNOVATION_SUBMITTED]>({
      innovationId: JoiHelper.AppCustomJoi().string().guid().required(),
      reassessment: Joi.boolean().strict().required()
    }).required()
  },
  [NotifierTypeEnum.NEEDS_ASSESSMENT_STARTED]: {
    handler: NeedsAssessmentStartedHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.NEEDS_ASSESSMENT_STARTED]>({
      innovationId: JoiHelper.AppCustomJoi().string().guid().required(),
      assessmentId: JoiHelper.AppCustomJoi().string().guid().required(),
      message: JoiHelper.AppCustomJoi().string().max(TEXTAREA_LENGTH_LIMIT.s).required(),
      messageId: JoiHelper.AppCustomJoi().string().guid().required(),
      threadId: JoiHelper.AppCustomJoi().string().guid().required()
    }).required()
  },
  [NotifierTypeEnum.NEEDS_ASSESSMENT_COMPLETED]: {
    handler: NeedsAssessmentCompleteHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.NEEDS_ASSESSMENT_COMPLETED]>({
      innovationId: JoiHelper.AppCustomJoi().string().guid().required(),
      assessmentId: JoiHelper.AppCustomJoi().string().guid().required()
    }).required()
  },
  [NotifierTypeEnum.NEEDS_ASSESSMENT_ASSESSOR_UPDATE]: {
    handler: NeedsAssessmentAssessorUpdateHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.NEEDS_ASSESSMENT_ASSESSOR_UPDATE]>({
      innovationId: JoiHelper.AppCustomJoi().string().guid().required(),
      assessmentId: JoiHelper.AppCustomJoi().string().guid().required(),
      previousAssessor: Joi.object({
        id: JoiHelper.AppCustomJoi().string().guid().required()
      }).required(),
      newAssessor: Joi.object({
        id: JoiHelper.AppCustomJoi().string().guid().required()
      }).required()
    }).required()
  },

  // Support Summary
  [NotifierTypeEnum.SUPPORT_SUMMARY_UPDATE]: {
    handler: SupportSummaryUpdateHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.SUPPORT_SUMMARY_UPDATE]>({
      innovationId: JoiHelper.AppCustomJoi().string().guid().required(),
      supportId: JoiHelper.AppCustomJoi().string().guid().required()
    }).required()
  },

  // Suggestions
  [NotifierTypeEnum.ORGANISATION_UNITS_SUGGESTION]: {
    handler: OrganisationUnitsSuggestionHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.ORGANISATION_UNITS_SUGGESTION]>({
      innovationId: JoiHelper.AppCustomJoi().string().guid().required(),
      unitsIds: Joi.array().items(JoiHelper.AppCustomJoi().string().guid().required()).min(1).required(),
      comment: JoiHelper.AppCustomJoi().string().max(TEXTAREA_LENGTH_LIMIT.xl).required()
    }).required()
  },
  [NotifierTypeEnum.INNOVATION_DELAYED_SHARE]: {
    handler: InnovationDelayedSharedSuggestionHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.INNOVATION_DELAYED_SHARE]>({
      innovationId: JoiHelper.AppCustomJoi().string().guid().required(),
      newSharedOrgIds: Joi.array().items(JoiHelper.AppCustomJoi().string().guid().required()).required()
    })
  },

  // Innovations
  // // Export Request
  [NotifierTypeEnum.EXPORT_REQUEST_SUBMITTED]: {
    handler: ExportRequestSubmittedHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.EXPORT_REQUEST_SUBMITTED]>({
      innovationId: JoiHelper.AppCustomJoi().string().guid().required(),
      exportRequestId: JoiHelper.AppCustomJoi().string().guid().required(),
      comment: JoiHelper.AppCustomJoi().string().max(TEXTAREA_LENGTH_LIMIT.s).required()
    }).required()
  },
  [NotifierTypeEnum.EXPORT_REQUEST_FEEDBACK]: {
    handler: ExportRequestFeedbackHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.EXPORT_REQUEST_FEEDBACK]>({
      innovationId: JoiHelper.AppCustomJoi().string().guid().required(),
      exportRequestId: JoiHelper.AppCustomJoi().string().guid().required()
    }).required()
  },
  // // Delete Account
  [NotifierTypeEnum.ACCOUNT_DELETION]: {
    handler: AccountDeletionHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.ACCOUNT_DELETION]>({
      innovations: Joi.array()
        .items(
          Joi.object({
            id: JoiHelper.AppCustomJoi().string().guid().required(),
            transferExpireDate: Joi.date().optional(),
            affectedUsers: Joi.array()
              .items(
                Joi.object({
                  userId: JoiHelper.AppCustomJoi().string().guid().required(),
                  userType: JoiHelper.AppCustomJoi()
                    .string()
                    .valid(...Object.values(ServiceRoleEnum))
                    .required(),
                  unitId: JoiHelper.AppCustomJoi().string().guid().optional()
                })
              )
              .optional()
          })
        )
        .min(1)
        .required()
    }).required()
  },
  // // Collaborators
  [NotifierTypeEnum.COLLABORATOR_INVITE]: {
    handler: CollaboratorInviteHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.COLLABORATOR_INVITE]>({
      innovationId: JoiHelper.AppCustomJoi().string().guid().required(),
      collaboratorId: JoiHelper.AppCustomJoi().string().guid().required()
    }).required()
  },
  [NotifierTypeEnum.COLLABORATOR_UPDATE]: {
    handler: CollaboratorUpdateHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.COLLABORATOR_UPDATE]>({
      innovationId: JoiHelper.AppCustomJoi().string().guid().required(),
      collaborator: Joi.object({
        id: JoiHelper.AppCustomJoi().string().guid().required(),
        status: JoiHelper.AppCustomJoi()
          .string()
          .valid(...Object.values(InnovationCollaboratorStatusEnum))
          .required()
      })
    }).required()
  },
  // // Stop Sharing
  [NotifierTypeEnum.INNOVATION_STOP_SHARING]: {
    handler: InnovationStopSharingHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.INNOVATION_STOP_SHARING]>({
      innovationId: JoiHelper.AppCustomJoi().string().guid().required(),
      organisationId: JoiHelper.AppCustomJoi().string().required(),
      affectedUsers: Joi.object({
        roleIds: Joi.array().items(JoiHelper.AppCustomJoi().string().guid().required())
      }).optional()
    }).required()
  },
  // // Archived
  [NotifierTypeEnum.INNOVATION_ARCHIVE]: {
    handler: InnovationArchiveHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.INNOVATION_ARCHIVE]>({
      innovationId: JoiHelper.AppCustomJoi().string().guid().required(),
      reassessment: Joi.boolean().strict().required(),
      previousStatus: JoiHelper.AppCustomJoi()
        .string()
        .valid(...Object.values(InnovationStatusEnum))
        .required(),
      affectedUsers: Joi.array()
        .items(
          Joi.object({
            userId: JoiHelper.AppCustomJoi().string().guid().required(),
            userType: JoiHelper.AppCustomJoi()
              .string()
              .valid(...Object.values(ServiceRoleEnum))
              .required(),
            unitId: JoiHelper.AppCustomJoi().string().guid()
          })
        )
        .required()
    }).required()
  },
  // // Transfer Ownership
  [NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_CREATION]: {
    handler: InnovationTransferOwnershipCreationHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_CREATION]>({
      innovationId: JoiHelper.AppCustomJoi().string().guid().required(),
      transferId: JoiHelper.AppCustomJoi().string().guid().required()
    }).required()
  },

  [NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_COMPLETED]: {
    handler: InnovationTransferOwnershipCompletedHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_COMPLETED]>({
      innovationId: JoiHelper.AppCustomJoi().string().guid().required(),
      transferId: JoiHelper.AppCustomJoi().string().guid().required()
    }).required()
  },

  // Admin
  [NotifierTypeEnum.LOCK_USER]: {
    handler: LockUserHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.LOCK_USER]>({
      identityId: JoiHelper.AppCustomJoi().string().guid().required()
    }).required()
  },
  [NotifierTypeEnum.UNIT_INACTIVATED]: {
    handler: UnitInactivatedHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.UNIT_INACTIVATED]>({
      unitId: JoiHelper.AppCustomJoi().string().guid().required(),
      completedInnovationIds: Joi.array().items(JoiHelper.AppCustomJoi().string().guid().required()).required()
    }).required()
  },
  [NotifierTypeEnum.USER_EMAIL_ADDRESS_UPDATED]: {
    handler: UserEmailAddressUpdatedHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.USER_EMAIL_ADDRESS_UPDATED]>({
      identityId: JoiHelper.AppCustomJoi().string().guid().required(),
      oldEmail: JoiHelper.AppCustomJoi().string().required(),
      newEmail: JoiHelper.AppCustomJoi().string().required()
    }).required()
  },
  [NotifierTypeEnum.NEW_SUPPORTING_ACCOUNT]: {
    handler: NewAccountHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.NEW_SUPPORTING_ACCOUNT]>({
      recipientEmail: JoiHelper.AppCustomJoi().string().required()
    }).required()
  },

  [NotifierTypeEnum.NEW_ANNOUNCEMENT]: {
    handler: NewAnnouncementHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.NEW_ANNOUNCEMENT]>({
      announcementId: JoiHelper.AppCustomJoi().string().guid().required()
    }).required()
  },

  // Recurrent notifications.
  [NotifierTypeEnum.INCOMPLETE_INNOVATION_RECORD]: {
    handler: IncompleteRecordHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.INCOMPLETE_INNOVATION_RECORD]>({})
  },
  [NotifierTypeEnum.IDLE_SUPPORT_INNOVATOR]: {
    handler: IdleSupportInnovatorHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.IDLE_SUPPORT_INNOVATOR]>({})
  },
  [NotifierTypeEnum.IDLE_SUPPORT_ACCESSOR]: {
    handler: IdleSupportAccessorHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.IDLE_SUPPORT_ACCESSOR]>({})
  },
  [NotifierTypeEnum.UNIT_KPI]: {
    handler: UnitKPIHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.UNIT_KPI]>({})
  },
  [NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_EXPIRATION]: {
    handler: InnovationTransferOwnershipExpirationHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_EXPIRATION]>({
      innovationId: JoiHelper.AppCustomJoi().string().guid().required()
    }).required()
  },
  [NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_REMINDER]: {
    handler: InnovationTransferOwnershipReminderHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_REMINDER]>({
      innovationId: JoiHelper.AppCustomJoi().string().guid().required(),
      innovationName: JoiHelper.AppCustomJoi().string().required(),
      recipientEmail: JoiHelper.AppCustomJoi().string().required()
    }).required()
  },
  [NotifierTypeEnum.SURVEY_END_SUPPORT_REMINDER]: {
    handler: SatisfactionSurveyReminderHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.SURVEY_END_SUPPORT_REMINDER]>({})
  }
} as const;
