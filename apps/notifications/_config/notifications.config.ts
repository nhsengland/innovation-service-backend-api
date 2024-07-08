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
  UnitKPIHandler
} from '../_handlers';
import { UserEmailAddressUpdatedHandler } from '../_handlers/admin/user-email-address-updated.handler';

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
      innovationId: Joi.string().guid().required(),
      file: Joi.object<NotifierTemplatesType[NotifierTypeEnum.INNOVATION_DOCUMENT_UPLOADED]['file']>({
        id: Joi.string().guid().required()
      }).required()
    }).required()
  },

  // Tasks
  [NotifierTypeEnum.TASK_CREATION]: {
    handler: TaskCreationHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.TASK_CREATION]>({
      innovationId: Joi.string().guid().required(),
      task: Joi.object<NotifierTemplatesType[NotifierTypeEnum.TASK_CREATION]['task']>({
        id: Joi.string().guid().required()
      }).required()
    }).required()
  },
  [NotifierTypeEnum.TASK_UPDATE]: {
    handler: TaskUpdateHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.TASK_UPDATE]>({
      innovationId: Joi.string().guid().required(),
      task: Joi.object<NotifierTemplatesType[NotifierTypeEnum.TASK_UPDATE]['task']>({
        id: Joi.string().guid().required(),
        status: Joi.string()
          .valid(...Object.values(InnovationTaskStatusEnum))
          .required()
      }).required(),
      message: Joi.string().required(),
      messageId: Joi.string().guid().required(),
      threadId: Joi.string().guid().required()
    }).required()
  },

  // Messages
  [NotifierTypeEnum.THREAD_CREATION]: {
    handler: ThreadCreationHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.THREAD_CREATION]>({
      innovationId: Joi.string().guid().required(),
      threadId: Joi.string().guid().required(),
      messageId: Joi.string().guid().required()
    }).required()
  },

  [NotifierTypeEnum.THREAD_ADD_FOLLOWERS]: {
    handler: ThreadAddFollowersHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.THREAD_ADD_FOLLOWERS]>({
      innovationId: Joi.string().guid().required(),
      threadId: Joi.string().guid().required(),
      newFollowersRoleIds: Joi.array().items(Joi.string().guid()).required()
    }).required()
  },
  [NotifierTypeEnum.THREAD_MESSAGE_CREATION]: {
    handler: MessageCreationHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.THREAD_MESSAGE_CREATION]>({
      innovationId: Joi.string().guid().required(),
      threadId: Joi.string().guid().required(),
      messageId: Joi.string().guid().required()
    }).required()
  },

  // Support
  [NotifierTypeEnum.SUPPORT_STATUS_UPDATE]: {
    handler: SupportStatusUpdateHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.SUPPORT_STATUS_UPDATE]>({
      innovationId: Joi.string().guid().required(),
      threadId: Joi.string().guid().required(),
      support: Joi.object<NotifierTemplatesType[NotifierTypeEnum.SUPPORT_STATUS_UPDATE]['support']>({
        id: Joi.string().guid().required(),
        status: Joi.string()
          .valid(...Object.values(InnovationSupportStatusEnum))
          .required(),
        message: Joi.string().max(TEXTAREA_LENGTH_LIMIT.xl).trim().required(),
        newAssignedAccessorsIds: Joi.array().items(Joi.string().guid())
      }).required()
    }).required()
  },
  [NotifierTypeEnum.SUPPORT_NEW_ASSIGN_ACCESSORS]: {
    handler: SupportNewAssignedAccessorsHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.SUPPORT_NEW_ASSIGN_ACCESSORS]>({
      innovationId: Joi.string().guid().required(),
      supportId: Joi.string().guid().required(),
      threadId: Joi.string().guid().required(),
      message: Joi.string().max(TEXTAREA_LENGTH_LIMIT.xl).trim().required(),
      newAssignedAccessorsRoleIds: Joi.array().items(Joi.string().guid()),
      removedAssignedAccessorsRoleIds: Joi.array().items(Joi.string().guid())
    }).required()
  },
  [NotifierTypeEnum.SUPPORT_STATUS_CHANGE_REQUEST]: {
    handler: SupportStatusChangeRequestHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.SUPPORT_STATUS_CHANGE_REQUEST]>({
      innovationId: Joi.string().guid().required(),
      supportId: Joi.string().guid().required(),
      proposedStatus: Joi.string()
        .valid(...Object.values(InnovationSupportStatusEnum))
        .required(),
      requestStatusUpdateComment: Joi.string().required()
    }).required()
  },

  // Needs Assessment
  [NotifierTypeEnum.INNOVATION_SUBMITTED]: {
    handler: InnovationSubmittedHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.INNOVATION_SUBMITTED]>({
      innovationId: Joi.string().guid().required(),
      reassessment: Joi.boolean().strict().required()
    }).required()
  },
  [NotifierTypeEnum.NEEDS_ASSESSMENT_STARTED]: {
    handler: NeedsAssessmentStartedHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.NEEDS_ASSESSMENT_STARTED]>({
      innovationId: Joi.string().guid().required(),
      assessmentId: Joi.string().guid().required(),
      message: Joi.string().max(TEXTAREA_LENGTH_LIMIT.s).trim().required(),
      messageId: Joi.string().guid().required(),
      threadId: Joi.string().guid().required()
    }).required()
  },
  [NotifierTypeEnum.NEEDS_ASSESSMENT_COMPLETED]: {
    handler: NeedsAssessmentCompleteHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.NEEDS_ASSESSMENT_COMPLETED]>({
      innovationId: Joi.string().guid().required(),
      assessmentId: Joi.string().guid().required()
    }).required()
  },
  [NotifierTypeEnum.NEEDS_ASSESSMENT_ASSESSOR_UPDATE]: {
    handler: NeedsAssessmentAssessorUpdateHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.NEEDS_ASSESSMENT_ASSESSOR_UPDATE]>({
      innovationId: Joi.string().guid().required(),
      assessmentId: Joi.string().guid().required(),
      previousAssessor: Joi.object({
        id: Joi.string().guid().required()
      }).required(),
      newAssessor: Joi.object({
        id: Joi.string().guid().required()
      }).required()
    }).required()
  },

  // Support Summary
  [NotifierTypeEnum.SUPPORT_SUMMARY_UPDATE]: {
    handler: SupportSummaryUpdateHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.SUPPORT_SUMMARY_UPDATE]>({
      innovationId: Joi.string().guid().required(),
      supportId: Joi.string().guid().required()
    }).required()
  },

  // Suggestions
  [NotifierTypeEnum.ORGANISATION_UNITS_SUGGESTION]: {
    handler: OrganisationUnitsSuggestionHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.ORGANISATION_UNITS_SUGGESTION]>({
      innovationId: Joi.string().guid().required(),
      unitsIds: Joi.array().items(Joi.string().guid().required()).min(1).required(),
      comment: Joi.string().max(TEXTAREA_LENGTH_LIMIT.xl).trim().required()
    }).required()
  },
  [NotifierTypeEnum.INNOVATION_DELAYED_SHARE]: {
    handler: InnovationDelayedSharedSuggestionHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.INNOVATION_DELAYED_SHARE]>({
      innovationId: Joi.string().guid().required(),
      newSharedOrgIds: Joi.array().items(Joi.string().guid().required()).required()
    })
  },

  // Innovations
  // // Export Request
  [NotifierTypeEnum.EXPORT_REQUEST_SUBMITTED]: {
    handler: ExportRequestSubmittedHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.EXPORT_REQUEST_SUBMITTED]>({
      innovationId: Joi.string().guid().required(),
      exportRequestId: Joi.string().guid().required(),
      comment: Joi.string().max(TEXTAREA_LENGTH_LIMIT.s).required()
    }).required()
  },
  [NotifierTypeEnum.EXPORT_REQUEST_FEEDBACK]: {
    handler: ExportRequestFeedbackHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.EXPORT_REQUEST_FEEDBACK]>({
      innovationId: Joi.string().guid().required(),
      exportRequestId: Joi.string().guid().required()
    }).required()
  },
  // // Delete Account
  [NotifierTypeEnum.ACCOUNT_DELETION]: {
    handler: AccountDeletionHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.ACCOUNT_DELETION]>({
      innovations: Joi.array()
        .items(
          Joi.object({
            id: Joi.string().guid().required(),
            transferExpireDate: Joi.date().optional(),
            affectedUsers: Joi.array()
              .items(
                Joi.object({
                  userId: Joi.string().guid().required(),
                  userType: Joi.string()
                    .valid(...Object.values(ServiceRoleEnum))
                    .required(),
                  unitId: Joi.string().guid().optional()
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
      innovationId: Joi.string().guid().required(),
      collaboratorId: Joi.string().guid().required()
    }).required()
  },
  [NotifierTypeEnum.COLLABORATOR_UPDATE]: {
    handler: CollaboratorUpdateHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.COLLABORATOR_UPDATE]>({
      innovationId: Joi.string().guid().required(),
      collaborator: Joi.object({
        id: Joi.string().guid().required(),
        status: Joi.string()
          .valid(...Object.values(InnovationCollaboratorStatusEnum))
          .required()
      })
    }).required()
  },
  // // Stop Sharing
  [NotifierTypeEnum.INNOVATION_STOP_SHARING]: {
    handler: InnovationStopSharingHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.INNOVATION_STOP_SHARING]>({
      innovationId: Joi.string().guid().required(),
      organisationId: Joi.string().required(),
      affectedUsers: Joi.object({
        roleIds: Joi.array().items(Joi.string().guid().required())
      }).optional()
    }).required()
  },
  // // Archived
  [NotifierTypeEnum.INNOVATION_ARCHIVE]: {
    handler: InnovationArchiveHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.INNOVATION_ARCHIVE]>({
      innovationId: Joi.string().guid().required(),
      message: Joi.string().max(TEXTAREA_LENGTH_LIMIT.xl).trim().required(),
      reassessment: Joi.boolean().strict().required(),
      previousStatus: Joi.string()
        .valid(...Object.values(InnovationStatusEnum))
        .required(),
      affectedUsers: Joi.array()
        .items(
          Joi.object({
            userId: Joi.string().guid().required(),
            userType: Joi.string()
              .valid(...Object.values(ServiceRoleEnum))
              .required(),
            unitId: Joi.string().guid()
          })
        )
        .required()
    }).required()
  },
  // // Transfer Ownership
  [NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_CREATION]: {
    handler: InnovationTransferOwnershipCreationHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_CREATION]>({
      innovationId: Joi.string().guid().required(),
      transferId: Joi.string().guid().required()
    }).required()
  },

  [NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_COMPLETED]: {
    handler: InnovationTransferOwnershipCompletedHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_COMPLETED]>({
      innovationId: Joi.string().guid().required(),
      transferId: Joi.string().guid().required()
    }).required()
  },

  // Admin
  [NotifierTypeEnum.LOCK_USER]: {
    handler: LockUserHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.LOCK_USER]>({
      identityId: Joi.string().guid().required()
    }).required()
  },
  [NotifierTypeEnum.UNIT_INACTIVATED]: {
    handler: UnitInactivatedHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.UNIT_INACTIVATED]>({
      unitId: Joi.string().guid().required(),
      completedInnovationIds: Joi.array().items(Joi.string().guid().required()).required()
    }).required()
  },
  [NotifierTypeEnum.USER_EMAIL_ADDRESS_UPDATED]: {
    handler: UserEmailAddressUpdatedHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.USER_EMAIL_ADDRESS_UPDATED]>({
      identityId: Joi.string().guid().required(),
      oldEmail: Joi.string().required(),
      newEmail: Joi.string().required()
    }).required()
  },
  [NotifierTypeEnum.NEW_SUPPORTING_ACCOUNT]: {
    handler: NewAccountHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.NEW_SUPPORTING_ACCOUNT]>({
      recipientEmail: Joi.string().required()
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
      innovationId: Joi.string().guid().required()
    }).required()
  },
  [NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_REMINDER]: {
    handler: InnovationTransferOwnershipReminderHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_REMINDER]>({
      innovationId: Joi.string().guid().required(),
      innovationName: Joi.string().required(),
      recipientEmail: Joi.string().required()
    }).required()
  }
} as const;
