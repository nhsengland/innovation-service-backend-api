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
  DocumentUploadHandler,
  InnovationCollaboratorInviteHandler,
  InnovationCollaboratorUpdateHandler,
  InnovationOrganisationUnitsSuggestionHandler,
  InnovationReassessmentRequestHandler,
  InnovationSubmittedHandler,
  InnovationSupportStatusUpdateHandler,
  InnovationTransferOwnershipCompletedHandler,
  InnovationTransferOwnershipCreationHandler,
  InnovationTransferOwnershipExpirationHandler,
  InnovationTransferOwnershipReminderHandler,
  InnovatorAccountCreationHandler,
  SupportSummaryUpdateHandler,
  UnitInactivationSupportStatusCompletedHandler
} from '../_handlers';
import { AccountCreationHandler } from '../_handlers/account/account-creation.handler';
import { LockUserHandler } from '../_handlers/admin/lock-user.handler';
import { UnitInactivatedHandler } from '../_handlers/admin/unit-inactivated.handler';
import { IdleSupportAccessorHandler } from '../_handlers/automatic/idle-support-accessor.handler';
import { IdleSupportInnovatorHandler } from '../_handlers/automatic/idle-support-innovator.handler';
import { IncompleteRecordHandler } from '../_handlers/automatic/incomplete-record.handler';
import { UnitKPIHandler } from '../_handlers/automatic/unit-kpi.handler';
import { AccountDeletionHandler } from '../_handlers/innovations/delete-account/account-deletion.handler';
import { ExportRequestFeedbackHandler } from '../_handlers/innovations/export-request-feedback.handler';
import { ExportRequestSubmittedHandler } from '../_handlers/innovations/export-request-submitted.handler';
import { InnovationStopSharingHandler } from '../_handlers/innovations/stop-sharing-innovation/innovation-stop-sharing.handler';
import { InnovationWithdrawnHandler } from '../_handlers/innovations/withdraw-innovation/innovation-withdrawn.handler';
import { MessageCreationHandler } from '../_handlers/messages/message-creation.handler';
import { ThreadAddFollowersHandler } from '../_handlers/messages/thread-add-followers.handler';
import { ThreadCreationHandler } from '../_handlers/messages/thread-creation.handler';
import { NeedsAssessmentAssessorUpdateHandler } from '../_handlers/needs-assessment/needs-assessment-assessor-update.handler';
import { NeedsAssessmentCompleteHandler } from '../_handlers/needs-assessment/needs-assessment-complete.handler';
import { NeedsAssessmentStartedHandler } from '../_handlers/needs-assessment/needs-assessment-started.handler';
import { InnovationDelayedSharedSuggestionHandler } from '../_handlers/suggestions/innovation-delayed-shared-suggestion.handler';
import { OrganisationUnitsSuggestionHandler } from '../_handlers/suggestions/organisation-units-suggestion.handler';
import { SupportNewAssignedAccessorsHandler } from '../_handlers/supports/support-new-assigned-accessors.handler';
import { SupportStatusChangeRequestHandler } from '../_handlers/supports/support-status-change-request.handler';
import { SupportStatusUpdateHandler } from '../_handlers/supports/support-status-update.handler';

export const NOTIFICATIONS_CONFIG = {
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

  // Support
  [NotifierTypeEnum.THREAD_MESSAGE_CREATION]: {
    handler: MessageCreationHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.THREAD_MESSAGE_CREATION]>({
      innovationId: Joi.string().guid().required(),
      threadId: Joi.string().guid().required(),
      messageId: Joi.string().guid().required()
    }).required()
  },

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

  // Assessment
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

  // Organisation Suggestions
  [NotifierTypeEnum.ORGANISATION_UNITS_SUGGESTION]: {
    handler: OrganisationUnitsSuggestionHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.ORGANISATION_UNITS_SUGGESTION]>({
      innovationId: Joi.string().guid().required(),
      unitsIds: Joi.array().items(Joi.string().guid().required()).min(1).required(),
      comment: Joi.string().max(TEXTAREA_LENGTH_LIMIT.xl).trim().required()
    }).required()
  },

  // Innovations
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
              unitId: Joi.string().guid()
            })
          )
          .min(1)
          .required()
      }).required()
    }).required()
  },
  [NotifierTypeEnum.ACCOUNT_DELETION]: {
    handler: AccountDeletionHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.ACCOUNT_DELETION]>({
      innovations: Joi.array()
        .items(
          Joi.object({
            id: Joi.string().guid().required(),
            name: Joi.string().required(),
            transferExpireDate: Joi.date().required()
          })
        )
        .min(1)
        .required()
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

  // Account
  [NotifierTypeEnum.ACCOUNT_CREATION]: {
    handler: AccountCreationHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.INNOVATOR_ACCOUNT_CREATION]>({})
  },

  // OLD
  [NotifierTypeEnum.INNOVATOR_ACCOUNT_CREATION]: {
    handler: InnovatorAccountCreationHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.INNOVATOR_ACCOUNT_CREATION]>({})
  },

  [NotifierTypeEnum.INNOVATION_SUBMITTED]: {
    handler: InnovationSubmittedHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.INNOVATION_SUBMITTED]>({
      innovationId: Joi.string().guid().required(),
      reassessment: Joi.boolean().strict().required()
    }).required()
  },

  [NotifierTypeEnum.INNOVATION_SUBMITED]: {
    handler: InnovationSubmittedHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.INNOVATION_SUBMITED]>({
      innovationId: Joi.string().guid().required()
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
      message: Joi.string().required(),
      messageId: Joi.string().guid().required(),
      threadId: Joi.string().guid().required()
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
  },

  [NotifierTypeEnum.INNOVATION_SUPPORT_STATUS_CHANGE_REQUEST]: {
    handler: SupportStatusChangeRequestHandler,
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
      affectedUsers: Joi.array()
        .items(
          Joi.object({
            id: Joi.string().guid().required(),
            role: Joi.string()
              .valid(...Object.values(ServiceRoleEnum))
              .required(),
            unitId: Joi.string().guid().optional()
          })
        )
        .required(),
      message: Joi.string().max(TEXTAREA_LENGTH_LIMIT.xs).trim().required()
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

  [NotifierTypeEnum.INNOVATION_DELAYED_SHARE]: {
    handler: InnovationDelayedSharedSuggestionHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.INNOVATION_DELAYED_SHARE]>({
      innovationId: Joi.string().guid().required(),
      newSharedOrgIds: Joi.array().items(Joi.string().guid().required()).required()
    })
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
  }
} as const;
