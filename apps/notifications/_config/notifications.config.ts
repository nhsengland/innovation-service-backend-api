import Joi from 'joi';

import { TEXTAREA_LENGTH_LIMIT } from '@notifications/shared/constants';
import {
  InnovationCollaboratorStatusEnum,
  InnovationSupportStatusEnum,
  InnovationTaskStatusEnum,
  NotifierTypeEnum,
  ServiceRoleEnum
} from '@notifications/shared/enums';
import type { NotifierTemplatesType } from '@notifications/shared/types';

import {
  AccessorUnitChangeHandler,
  ActionCreationHandler,
  ActionUpdateHandler,
  DailyDigestHandler,
  IdleInnovatorsHandler,
  IdleSupportHandler,
  InnovationCollaboratorInviteHandler,
  InnovationCollaboratorUpdateHandler,
  InnovationOrganisationUnitsSuggestionHandler,
  InnovationReassessmentRequestHandler,
  InnovationRecordExportFeedbackHandler,
  InnovationRecordExportRequestHandler,
  InnovationStopSharingHandler,
  InnovationSubmittedHandler,
  InnovationSupportStatusChangeRequestHandler,
  InnovationSupportStatusUpdateHandler,
  InnovationTransferOwnershipCompletedHandler,
  InnovationTransferOwnershipCreationHandler,
  InnovationTransferOwnershipExpirationHandler,
  InnovationTransferOwnershipReminderHandler,
  InnovationWithdrawnHandler,
  InnovatorAccountCreationHandler,
  InnovatorAccountDeletionHandler,
  LockUserHandler,
  NeedsAssessmentAssessorUpdateHandler,
  NeedsAssessmentCompletedHandler,
  NeedsAssessmentStartedHandler,
  SupportSummaryUpdateHandler,
  ThreadCreationHandler,
  ThreadMessageCreationHandler,
  UnitInactivationSupportStatusCompletedHandler
} from '../_handlers';

export const NOTIFICATIONS_CONFIG = {
  [NotifierTypeEnum.INNOVATOR_ACCOUNT_CREATION]: {
    handler: InnovatorAccountCreationHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.INNOVATOR_ACCOUNT_CREATION]>({})
  },

  [NotifierTypeEnum.INNOVATOR_ACCOUNT_DELETION_WITH_PENDING_TRANSFER]: {
    handler: InnovatorAccountDeletionHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.INNOVATOR_ACCOUNT_DELETION_WITH_PENDING_TRANSFER]>(
      {
        innovations: Joi.array()
          .items(
            Joi.object({
              id: Joi.string().guid().required(),
              name: Joi.string().required(),
              transferExpireDate: Joi.date().required()
            })
          )
          .required()
      }
    ).required()
  },

  [NotifierTypeEnum.INNOVATION_SUBMITED]: {
    handler: InnovationSubmittedHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.INNOVATION_SUBMITED]>({
      innovationId: Joi.string().guid().required()
    }).required()
  },

  [NotifierTypeEnum.NEEDS_ASSESSMENT_COMPLETED]: {
    handler: NeedsAssessmentCompletedHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.NEEDS_ASSESSMENT_COMPLETED]>({
      innovationId: Joi.string().guid().required(),
      assessmentId: Joi.string().guid().required(),
      organisationUnitIds: Joi.array().items(Joi.string().guid()).required()
    }).required()
  },

  [NotifierTypeEnum.NEEDS_ASSESSMENT_STARTED]: {
    handler: NeedsAssessmentStartedHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.NEEDS_ASSESSMENT_STARTED]>({
      innovationId: Joi.string().guid().required(),
      assessmentId: Joi.string().guid().required(),
      threadId: Joi.string().guid().required()
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

  [NotifierTypeEnum.INNOVATION_SUPPORT_STATUS_UPDATE]: {
    handler: InnovationSupportStatusUpdateHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.INNOVATION_SUPPORT_STATUS_UPDATE]>({
      innovationId: Joi.string().guid().required(),
      innovationSupport: Joi.object<
        NotifierTemplatesType[NotifierTypeEnum.INNOVATION_SUPPORT_STATUS_UPDATE]['innovationSupport']
      >({
        id: Joi.string().guid().required(),
        status: Joi.string()
          .valid(...Object.values(InnovationSupportStatusEnum))
          .required(),
        statusChanged: Joi.boolean().strict().required(),
        organisationUnitId: Joi.string().guid().required(),
        newAssignedAccessors: Joi.array().items(Joi.object({ id: Joi.string().guid().required() })),
        message: Joi.string().max(TEXTAREA_LENGTH_LIMIT.xl).trim().required()
      }).required()
    }).required()
  },

  [NotifierTypeEnum.SUPPORT_SUMMARY_UPDATE]: {
    handler: SupportSummaryUpdateHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.SUPPORT_SUMMARY_UPDATE]>({
      innovationId: Joi.string().guid().required(),
      organisationUnitId: Joi.string().guid().required(),
      supportId: Joi.string().guid().required()
    }).required()
  },

  [NotifierTypeEnum.INNOVATION_ORGANISATION_UNITS_SUGGESTION]: {
    handler: InnovationOrganisationUnitsSuggestionHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.INNOVATION_ORGANISATION_UNITS_SUGGESTION]>({
      innovationId: Joi.string().guid().required(),
      organisationUnitIds: Joi.array().items(Joi.string().guid()).required()
    }).required()
  },

  [NotifierTypeEnum.TASK_CREATION]: {
    handler: ActionCreationHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.TASK_CREATION]>({
      innovationId: Joi.string().guid().required(),
      task: Joi.object<NotifierTemplatesType[NotifierTypeEnum.TASK_CREATION]['task']>({
        id: Joi.string().guid().required()
      }).required()
    }).required()
  },

  [NotifierTypeEnum.TASK_UPDATE]: {
    handler: ActionUpdateHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.TASK_UPDATE]>({
      innovationId: Joi.string().guid().required(),
      task: Joi.object<NotifierTemplatesType[NotifierTypeEnum.TASK_UPDATE]['task']>({
        id: Joi.string().guid().required(),
        status: Joi.string()
          .valid(...Object.values(InnovationTaskStatusEnum))
          .required()
      }).required(),
      message: Joi.string().optional()
    }).required()
  },

  [NotifierTypeEnum.THREAD_CREATION]: {
    handler: ThreadCreationHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.THREAD_CREATION]>({
      innovationId: Joi.string().guid().required(),
      threadId: Joi.string().guid().required(),
      messageId: Joi.string().guid().required()
    }).required()
  },

  [NotifierTypeEnum.THREAD_MESSAGE_CREATION]: {
    handler: ThreadMessageCreationHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.THREAD_MESSAGE_CREATION]>({
      innovationId: Joi.string().guid().required(),
      threadId: Joi.string().guid().required(),
      messageId: Joi.string().guid().required()
    }).required()
  },

  [NotifierTypeEnum.INNOVATION_WITHDRAWN]: {
    handler: InnovationWithdrawnHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.INNOVATION_WITHDRAWN]>({
      innovation: Joi.object<NotifierTemplatesType[NotifierTypeEnum.INNOVATION_WITHDRAWN]['innovation']>({
        id: Joi.string().guid().required(),
        name: Joi.string().required(),
        affectedUsers: Joi.array()
          .items(
            Joi.object({
              userId: Joi.string().guid().required(),
              userType: Joi.string()
                .valid(...Object.values(ServiceRoleEnum))
                .required(),
              organisationId: Joi.string().guid(),
              organisationUnitId: Joi.string().guid()
            })
          )
          .required()
      }).required()
    }).required()
  },

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

  [NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_EXPIRATION]: {
    handler: InnovationTransferOwnershipExpirationHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_EXPIRATION]>({
      innovationId: Joi.string().guid().required(),
      transferId: Joi.string().guid().required()
    }).required()
  },

  [NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_REMINDER]: {
    handler: InnovationTransferOwnershipReminderHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_REMINDER]>({
      innovationId: Joi.string().guid().required(),
      innovationName: Joi.string().required(),
      transferId: Joi.string().guid().required(),
      recipientEmail: Joi.string().required()
    }).required()
  },

  [NotifierTypeEnum.INNOVATION_RECORD_EXPORT_REQUEST]: {
    handler: InnovationRecordExportRequestHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.INNOVATION_RECORD_EXPORT_REQUEST]>({
      innovationId: Joi.string().guid().required(),
      requestId: Joi.string().guid().required()
    }).required()
  },

  [NotifierTypeEnum.INNOVATION_RECORD_EXPORT_FEEDBACK]: {
    handler: InnovationRecordExportFeedbackHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.INNOVATION_RECORD_EXPORT_FEEDBACK]>({
      innovationId: Joi.string().guid().required(),
      requestId: Joi.string().guid().required()
    }).required()
  },

  [NotifierTypeEnum.INNOVATION_SUPPORT_STATUS_CHANGE_REQUEST]: {
    handler: InnovationSupportStatusChangeRequestHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.INNOVATION_SUPPORT_STATUS_CHANGE_REQUEST]>({
      innovationId: Joi.string().guid().required(),
      supportId: Joi.string().guid().required(),
      proposedStatus: Joi.string()
        .valid(...Object.values(InnovationSupportStatusEnum))
        .required(),
      requestStatusUpdateComment: Joi.string().required()
    }).required()
  },

  [NotifierTypeEnum.INNOVATION_STOP_SHARING]: {
    handler: InnovationStopSharingHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.INNOVATION_STOP_SHARING]>({
      innovationId: Joi.string().guid().required(),
      previousAssignedAccessors: Joi.array()
        .items(
          Joi.object({
            id: Joi.string().guid().required(),
            userType: Joi.string()
              .valid(...Object.values(ServiceRoleEnum))
              .required(),
            organisationUnitId: Joi.string().guid().required()
          })
        )
        .required(),
      message: Joi.string().required()
    }).required()
  },

  [NotifierTypeEnum.INNOVATION_REASSESSMENT_REQUEST]: {
    handler: InnovationReassessmentRequestHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.INNOVATION_REASSESSMENT_REQUEST]>({
      innovationId: Joi.string().guid().required()
    }).required()
  },

  [NotifierTypeEnum.INNOVATION_COLLABORATOR_INVITE]: {
    handler: InnovationCollaboratorInviteHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.INNOVATION_COLLABORATOR_INVITE]>({
      innovationId: Joi.string().guid().required(),
      innovationCollaboratorId: Joi.string().guid().required()
    }).required()
  },

  [NotifierTypeEnum.INNOVATION_COLLABORATOR_UPDATE]: {
    handler: InnovationCollaboratorUpdateHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.INNOVATION_COLLABORATOR_UPDATE]>({
      innovationId: Joi.string().guid().required(),
      innovationCollaborator: Joi.object({
        id: Joi.string().guid().required(),
        status: Joi.string()
          .valid(...Object.values(InnovationCollaboratorStatusEnum))
          .required()
      })
    }).required()
  },

  // Admin module.

  [NotifierTypeEnum.LOCK_USER]: {
    handler: LockUserHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.LOCK_USER]>({
      user: Joi.object<NotifierTemplatesType[NotifierTypeEnum.LOCK_USER]['user']>({
        identityId: Joi.string().guid().required()
      }).required()
    }).required()
  },

  [NotifierTypeEnum.ACCESSOR_UNIT_CHANGE]: {
    handler: AccessorUnitChangeHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.ACCESSOR_UNIT_CHANGE]>({
      user: Joi.object<NotifierTemplatesType[NotifierTypeEnum.ACCESSOR_UNIT_CHANGE]['user']>({
        id: Joi.string().guid().required(),
        identityId: Joi.string().guid().required()
      }).required(),
      oldOrganisationUnitId: Joi.string().guid().required(),
      newOrganisationUnitId: Joi.string().guid().required()
    }).required()
  },

  [NotifierTypeEnum.UNIT_INACTIVATION_SUPPORT_COMPLETED]: {
    handler: UnitInactivationSupportStatusCompletedHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.UNIT_INACTIVATION_SUPPORT_COMPLETED]>({
      innovationId: Joi.string().guid().required(),
      unitId: Joi.string().guid().required()
    }).required()
  },

  // Recurrent notifications.
  [NotifierTypeEnum.DAILY_DIGEST]: {
    handler: DailyDigestHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.DAILY_DIGEST]>({})
  },

  [NotifierTypeEnum.INCOMPLETE_INNOVATION_RECORD]: {
    handler: IdleInnovatorsHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.INCOMPLETE_INNOVATION_RECORD]>({})
  },

  [NotifierTypeEnum.IDLE_SUPPORT]: {
    handler: IdleSupportHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.IDLE_SUPPORT]>({})
  }
} as const;
