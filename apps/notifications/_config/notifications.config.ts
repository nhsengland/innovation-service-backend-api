import type { Schema } from 'joi';
import Joi from 'joi';

import { TEXTAREA_LENGTH_LIMIT } from '@notifications/shared/constants';
import {
  InnovationActionStatusEnum,
  InnovationCollaboratorStatusEnum,
  InnovationSupportStatusEnum,
  NotifierTypeEnum,
  ServiceRoleEnum,
} from '@notifications/shared/enums';
import type { NotifierTemplatesType } from '@notifications/shared/types';

import { CurrentCatalogTypes } from '@notifications/shared/schemas/innovation-record';
import {
  AccessorUnitChangeHandler,
  ActionCreationHandler,
  ActionUpdateHandler,
  BaseHandler,
  DailyDigestHandler,
  IdleInnovatorsHandler,
  IdleSupportHandler,
  InnovationCollaboratorInviteHandler,
  InnovationCollaboratorUpdateHandler,
  InnovationOrganisationUnitsSuggestionHandler,
  InnovationReassessmentRequestHandler,
  // InnovationRecordExportApprovedHandler,
  InnovationRecordExportFeedbackHandler,
  // InnovationRecordExportRejectedHandler,
  InnovationRecordExportRequestHandler,
  InnovationStopSharingHandler,
  InnovationSubmitedHandler,
  InnovationSupportStatusChangeRequestHandler,
  InnovationSupportStatusUpdateHandler,
  InnovationTransferOwnershipCompletedHandler,
  InnovationTransferOwnershipCreationHandler,
  InnovationWithdrawnHandler,
  InnovatorAccountCreationHandler,
  LockUserHandler,
  NeedsAssessmentAssessorUpdateHandler,
  NeedsAssessmentCompletedHandler,
  NeedsAssessmentStartedHandler,
  ThreadCreationHandler,
  ThreadMessageCreationHandler,
  UnitInactivationSupportStatusCompletedHandler,
} from '../_handlers';
import { InnovationTransferOwnershipExpirationHandler } from '../_handlers/innovation-transfer-ownership-exipraton.handler';
import { InnovationTransferOwnershipReminderHandler } from '../_handlers/innovation-transfer-ownership-reminder.handler';
import type { EmailTypeEnum } from './emails.config';
import { InnovatorAccountDeletionHandler } from '../_handlers/innovation-owner-delete-account.handler';

export const NOTIFICATIONS_CONFIG: {
  [key in NotifierTypeEnum]: {
    handler: {
      new (...args: any[]): BaseHandler<NotifierTypeEnum, EmailTypeEnum, Record<string, unknown>>;
    };
    joiDefinition: Schema;
  };
} = {
  [NotifierTypeEnum.INNOVATOR_ACCOUNT_CREATION]: {
    handler: InnovatorAccountCreationHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.INNOVATOR_ACCOUNT_CREATION]>(
      {}
    ),
  },

  [NotifierTypeEnum.INNOVATOR_ACCOUNT_DELETION_WITH_PENDING_TRANSFER]: {
    handler: InnovatorAccountDeletionHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.INNOVATOR_ACCOUNT_DELETION_WITH_PENDING_TRANSFER]>({
      innovations: Joi.array().items(Joi.object({
        id: Joi.string().guid().required(),
        name: Joi.string().required(),
        transferExpireDate: Joi.date().required()
      })).required()
    }).required(),
  },

  [NotifierTypeEnum.INNOVATION_SUBMITED]: {
    handler: InnovationSubmitedHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.INNOVATION_SUBMITED]>({
      innovationId: Joi.string().guid().required(),
    }).required(),
  },

  [NotifierTypeEnum.NEEDS_ASSESSMENT_STARTED]: {
    handler: NeedsAssessmentStartedHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.NEEDS_ASSESSMENT_STARTED]>({
      innovationId: Joi.string().guid().required(),
      threadId: Joi.string().guid().required(),
    }).required(),
  },

  [NotifierTypeEnum.NEEDS_ASSESSMENT_COMPLETED]: {
    handler: NeedsAssessmentCompletedHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.NEEDS_ASSESSMENT_COMPLETED]>({
      innovationId: Joi.string().guid().required(),
      assessmentId: Joi.string().guid().required(),
      organisationUnitIds: Joi.array().items(Joi.string().guid()).required(),
    }).required(),
  },

  [NotifierTypeEnum.NEEDS_ASSESSMENT_ASSESSOR_UPDATE]: {
    handler: NeedsAssessmentAssessorUpdateHandler,
    joiDefinition: Joi.object<
      NotifierTemplatesType[NotifierTypeEnum.NEEDS_ASSESSMENT_ASSESSOR_UPDATE]
    >({
      innovationId: Joi.string().guid().required(),
      assessmentId: Joi.string().guid().required(),
      previousAssessor: Joi.object({
        identityId: Joi.string().guid().required(),
      }).required(),
      newAssessor: Joi.object({
        identityId: Joi.string().guid().required(),
      }).required(),
    }).required(),
  },

  [NotifierTypeEnum.INNOVATION_SUPPORT_STATUS_UPDATE]: {
    handler: InnovationSupportStatusUpdateHandler,
    joiDefinition: Joi.object<
      NotifierTemplatesType[NotifierTypeEnum.INNOVATION_SUPPORT_STATUS_UPDATE]
    >({
      innovationId: Joi.string().guid().required(),
      innovationSupport: Joi.object<
        NotifierTemplatesType[NotifierTypeEnum.INNOVATION_SUPPORT_STATUS_UPDATE]['innovationSupport']
      >({
        id: Joi.string().guid().required(),
        status: Joi.string()
          .valid(...Object.values(InnovationSupportStatusEnum))
          .required(),
        statusChanged: Joi.boolean().strict().required(),
        newAssignedAccessors: Joi.array().items(Joi.object({ id: Joi.string().guid().required() })),
        message: Joi.string().max(TEXTAREA_LENGTH_LIMIT.large).trim().required(),
      }).required(),
    }).required(),
  },

  [NotifierTypeEnum.INNOVATION_ORGANISATION_UNITS_SUGGESTION]: {
    handler: InnovationOrganisationUnitsSuggestionHandler,
    joiDefinition: Joi.object<
      NotifierTemplatesType[NotifierTypeEnum.INNOVATION_ORGANISATION_UNITS_SUGGESTION]
    >({
      innovationId: Joi.string().guid().required(),
      organisationUnitIds: Joi.array().items(Joi.string().guid()).required(),
    }).required(),
  },

  [NotifierTypeEnum.ACTION_CREATION]: {
    handler: ActionCreationHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.ACTION_CREATION]>({
      innovationId: Joi.string().guid().required(),
      action: Joi.object<NotifierTemplatesType[NotifierTypeEnum.ACTION_CREATION]['action']>({
        id: Joi.string().guid().required(),
        section: Joi.string()
          .valid(...CurrentCatalogTypes.InnovationSections)
          .required(),
      }).required(),
    }).required(),
  },

  [NotifierTypeEnum.ACTION_UPDATE]: {
    handler: ActionUpdateHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.ACTION_UPDATE]>({
      innovationId: Joi.string().guid().required(),
      action: Joi.object<NotifierTemplatesType[NotifierTypeEnum.ACTION_UPDATE]['action']>({
        id: Joi.string().guid().required(),
        section: Joi.string()
          .valid(...CurrentCatalogTypes.InnovationSections)
          .required(),
        status: Joi.string()
          .valid(...Object.values(InnovationActionStatusEnum))
          .required(),
      }).required(),
      comment: Joi.string().optional(),
    }).required(),
  },

  [NotifierTypeEnum.THREAD_CREATION]: {
    handler: ThreadCreationHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.THREAD_CREATION]>({
      innovationId: Joi.string().guid().required(),
      threadId: Joi.string().guid().required(),
      messageId: Joi.string().guid().required(),
    }).required(),
  },

  [NotifierTypeEnum.THREAD_MESSAGE_CREATION]: {
    handler: ThreadMessageCreationHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.THREAD_MESSAGE_CREATION]>({
      innovationId: Joi.string().guid().required(),
      threadId: Joi.string().guid().required(),
      messageId: Joi.string().guid().required(),
    }).required(),
  },

  [NotifierTypeEnum.INNOVATION_WITHDRAWN]: {
    handler: InnovationWithdrawnHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.INNOVATION_WITHDRAWN]>({
      innovation: Joi.object<
        NotifierTemplatesType[NotifierTypeEnum.INNOVATION_WITHDRAWN]['innovation']
      >({
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
              organisationUnitId: Joi.string().guid(),
            })
          )
          .required(),
      }).required(),
    }).required(),
  },

  [NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_CREATION]: {
    handler: InnovationTransferOwnershipCreationHandler,
    joiDefinition: Joi.object<
      NotifierTemplatesType[NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_CREATION]
    >({
      innovationId: Joi.string().guid().required(),
      transferId: Joi.string().guid().required(),
    }).required(),
  },

  [NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_COMPLETED]: {
    handler: InnovationTransferOwnershipCompletedHandler,
    joiDefinition: Joi.object<
      NotifierTemplatesType[NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_COMPLETED]
    >({
      innovationId: Joi.string().guid().required(),
      transferId: Joi.string().guid().required(),
    }).required(),
  },

  [NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_EXPIRATION]: {
    handler: InnovationTransferOwnershipExpirationHandler,
    joiDefinition: Joi.object<
      NotifierTemplatesType[NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_EXPIRATION]
    >({
      innovationId: Joi.string().guid().required(),
      transferId: Joi.string().guid().required(),
    }).required(),
  },

  [NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_REMINDER]: {
    handler: InnovationTransferOwnershipReminderHandler,
    joiDefinition: Joi.object<
      NotifierTemplatesType[NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_REMINDER]
    >({
      innovationId: Joi.string().guid().required(),
      innovationName: Joi.string().required(),
      transferId: Joi.string().guid().required(),
      recipientEmail: Joi.string().required(),
    }).required(),
  },

  [NotifierTypeEnum.INNOVATION_RECORD_EXPORT_REQUEST]: {
    handler: InnovationRecordExportRequestHandler,
    joiDefinition: Joi.object<
      NotifierTemplatesType[NotifierTypeEnum.INNOVATION_RECORD_EXPORT_REQUEST]
    >({
      innovationId: Joi.string().guid().required(),
      requestId: Joi.string().guid().required(),
    }).required(),
  },

  [NotifierTypeEnum.INNOVATION_RECORD_EXPORT_FEEDBACK]: {
    handler: InnovationRecordExportFeedbackHandler,
    joiDefinition: Joi.object<
      NotifierTemplatesType[NotifierTypeEnum.INNOVATION_RECORD_EXPORT_FEEDBACK]
    >({
      innovationId: Joi.string().guid().required(),
      requestId: Joi.string().guid().required(),
    }).required(),
  },

  [NotifierTypeEnum.INNOVATION_SUPPORT_STATUS_CHANGE_REQUEST]: {
    handler: InnovationSupportStatusChangeRequestHandler,
    joiDefinition: Joi.object<
      NotifierTemplatesType[NotifierTypeEnum.INNOVATION_SUPPORT_STATUS_CHANGE_REQUEST]
    >({
      innovationId: Joi.string().guid().required(),
      supportId: Joi.string().guid().required(),
      proposedStatus: Joi.string()
        .valid(...Object.values(InnovationSupportStatusEnum))
        .required(),
      requestStatusUpdateComment: Joi.string().required(),
    }).required(),
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
            organisationUnitId: Joi.string().guid().required(),
          })
        )
        .required(),
      message: Joi.string().required(),
    }).required(),
  },

  [NotifierTypeEnum.INNOVATION_REASSESSMENT_REQUEST]: {
    handler: InnovationReassessmentRequestHandler,
    joiDefinition: Joi.object<
      NotifierTemplatesType[NotifierTypeEnum.INNOVATION_REASSESSMENT_REQUEST]
    >({
      innovationId: Joi.string().guid().required(),
    }).required(),
  },

  [NotifierTypeEnum.INNOVATION_COLLABORATOR_INVITE]: {
    handler: InnovationCollaboratorInviteHandler,
    joiDefinition: Joi.object<
      NotifierTemplatesType[NotifierTypeEnum.INNOVATION_COLLABORATOR_INVITE]
    >({
      innovationId: Joi.string().guid().required(),
      innovationCollaboratorId: Joi.string().guid().required(),
    }).required(),
  },

  [NotifierTypeEnum.INNOVATION_COLLABORATOR_UPDATE]: {
    handler: InnovationCollaboratorUpdateHandler,
    joiDefinition: Joi.object<
      NotifierTemplatesType[NotifierTypeEnum.INNOVATION_COLLABORATOR_UPDATE]
    >({
      innovationId: Joi.string().guid().required(),
      innovationCollaborator: Joi.object({
        id: Joi.string().guid().required(),
        status: Joi.string()
          .valid(...Object.values(InnovationCollaboratorStatusEnum))
          .required(),
      }),
    }).required(),
  },

  // Admin module.

  [NotifierTypeEnum.LOCK_USER]: {
    handler: LockUserHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.LOCK_USER]>({
      user: Joi.object<NotifierTemplatesType[NotifierTypeEnum.LOCK_USER]['user']>({
        id: Joi.string().guid().required(),
      }).required(),
    }).required(),
  },

  [NotifierTypeEnum.ACCESSOR_UNIT_CHANGE]: {
    handler: AccessorUnitChangeHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.ACCESSOR_UNIT_CHANGE]>({
      user: Joi.object<NotifierTemplatesType[NotifierTypeEnum.ACCESSOR_UNIT_CHANGE]['user']>({
        id: Joi.string().guid().required(),
      }).required(),
      oldOrganisationUnitId: Joi.string().guid().required(),
      newOrganisationUnitId: Joi.string().guid().required(),
    }).required(),
  },

  [NotifierTypeEnum.UNIT_INACTIVATION_SUPPORT_COMPLETED]: {
    handler: UnitInactivationSupportStatusCompletedHandler,
    joiDefinition: Joi.object<
      NotifierTemplatesType[NotifierTypeEnum.UNIT_INACTIVATION_SUPPORT_COMPLETED]
    >({
      innovationId: Joi.string().guid().required(),
      unitId: Joi.string().guid().required(),
    }).required(),
  },

  // Recurrent notifications.
  [NotifierTypeEnum.DAILY_DIGEST]: {
    handler: DailyDigestHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.DAILY_DIGEST]>({}),
  },

  [NotifierTypeEnum.INCOMPLETE_INNOVATION_RECORD]: {
    handler: IdleInnovatorsHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.INCOMPLETE_INNOVATION_RECORD]>(
      {}
    ),
  },

  [NotifierTypeEnum.IDLE_SUPPORT]: {
    handler: IdleSupportHandler,
    joiDefinition: Joi.object<NotifierTemplatesType[NotifierTypeEnum.IDLE_SUPPORT]>({}),
  },
};
