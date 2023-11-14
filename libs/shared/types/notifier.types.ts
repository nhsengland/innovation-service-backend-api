import type { ServiceRoleEnum } from '../enums';
import type {
  InnovationCollaboratorStatusEnum,
  InnovationSupportStatusEnum,
  InnovationTaskStatusEnum
} from '../enums/innovation.enums';
import type { NotifierTypeEnum } from '../enums/notifier.enums';

export type NotifierTemplatesType = {
  // Tasks
  [NotifierTypeEnum.TASK_CREATION]: {
    innovationId: string;
    task: { id: string };
  };

  [NotifierTypeEnum.TASK_UPDATE]: {
    innovationId: string;
    task: {
      id: string;
      status: InnovationTaskStatusEnum;
    };
    message: string;
    messageId: string;
    threadId: string;
  };

  // Documents
  [NotifierTypeEnum.INNOVATION_DOCUMENT_UPLOADED]: {
    innovationId: string;
    file: { id: string };
  };

  // Messages
  [NotifierTypeEnum.THREAD_CREATION]: {
    innovationId: string;
    threadId: string;
    messageId: string;
  };

  [NotifierTypeEnum.THREAD_ADD_FOLLOWERS]: {
    innovationId: string;
    threadId: string;
    newFollowersRoleIds: string[];
  };

  [NotifierTypeEnum.THREAD_MESSAGE_CREATION]: {
    innovationId: string;
    threadId: string;
    messageId: string;
  };

  // Supports
  [NotifierTypeEnum.SUPPORT_STATUS_UPDATE]: {
    innovationId: string;
    threadId: string;
    support: {
      id: string;
      status: InnovationSupportStatusEnum;
      message: string;
      newAssignedAccessorsIds?: string[]; // Newly assigned accessors for Engaging
    };
  };
  [NotifierTypeEnum.SUPPORT_NEW_ASSIGN_ACCESSORS]: {
    innovationId: string;
    threadId: string;
    supportId: string;
    message: string;
    newAssignedAccessorsRoleIds: string[];
    removedAssignedAccessorsRoleIds: string[];
  };

  // Needs Assessment
  [NotifierTypeEnum.INNOVATION_SUBMITTED]: {
    innovationId: string;
    reassessment: boolean;
  };

  // Support Summary
  [NotifierTypeEnum.SUPPORT_SUMMARY_UPDATE]: {
    innovationId: string;
    supportId: string;
  };

  // Organisation Suggestions
  [NotifierTypeEnum.ORGANISATION_UNITS_SUGGESTION]: {
    innovationId: string;
    unitsIds: string[];
    comment: string;
  };
  [NotifierTypeEnum.INNOVATION_DELAYED_SHARE]: {
    innovationId: string;
    newSharedOrgIds: string[];
  };

  // Innovation (management?)
  [NotifierTypeEnum.EXPORT_REQUEST_SUBMITTED]: {
    innovationId: string;
    exportRequestId: string;
    comment: string;
  };
  [NotifierTypeEnum.EXPORT_REQUEST_FEEDBACK]: {
    innovationId: string;
    exportRequestId: string;
  };
  [NotifierTypeEnum.INNOVATION_WITHDRAWN]: {
    innovation: {
      id: string;
      name: string;
      affectedUsers: {
        userId: string;
        userType: ServiceRoleEnum;
        unitId?: string;
      }[];
    };
  };
  [NotifierTypeEnum.COLLABORATOR_INVITE]: {
    innovationId: string;
    collaboratorId: string;
  };

  // Admin
  [NotifierTypeEnum.LOCK_USER]: {
    identityId: string;
  };
  [NotifierTypeEnum.UNIT_INACTIVATED]: {
    unitId: string;
    completedInnovationIds: string[];
  };

  // Account
  [NotifierTypeEnum.ACCOUNT_CREATION]: Record<string, never>;
  [NotifierTypeEnum.ACCOUNT_DELETION]: {
    innovations: { id: string; name: string; transferExpireDate: string }[];
  };

  // OLD
  [NotifierTypeEnum.INNOVATOR_ACCOUNT_CREATION]: Record<string, never>;

  // Old one with typo
  [NotifierTypeEnum.INNOVATION_SUBMITED]: {
    innovationId: string;
  };

  [NotifierTypeEnum.NEEDS_ASSESSMENT_STARTED]: {
    innovationId: string;
    assessmentId: string; // not really used
    message: string;
    messageId: string;
    threadId: string;
  };

  [NotifierTypeEnum.NEEDS_ASSESSMENT_COMPLETED]: {
    innovationId: string;
    assessmentId: string;
  };

  // OLD
  [NotifierTypeEnum.INNOVATOR_ACCOUNT_CREATION]: Record<string, never>;

  // Old one with typo
  [NotifierTypeEnum.INNOVATION_SUBMITED]: {
    innovationId: string;
  };

  [NotifierTypeEnum.NEEDS_ASSESSMENT_ASSESSOR_UPDATE]: {
    innovationId: string;
    assessmentId: string;
    previousAssessor?: { id: string };
    newAssessor: { id: string };
  };

  [NotifierTypeEnum.INNOVATION_SUPPORT_STATUS_UPDATE]: {
    innovationId: string;
    innovationSupport: {
      id: string;
      status: InnovationSupportStatusEnum;
      statusChanged: boolean;
      message: string;
      organisationUnitId: string;
      newAssignedAccessors?: { id: string }[]; // Newly assigned accessors
    };
  };

  [NotifierTypeEnum.INNOVATION_ORGANISATION_UNITS_SUGGESTION]: {
    innovationId: string;
    organisationUnitIds: string[]; // Suggested organisation units.
  };

  [NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_CREATION]: {
    innovationId: string;
    transferId: string;
  };

  [NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_COMPLETED]: {
    innovationId: string;
    transferId: string;
  };

  [NotifierTypeEnum.INNOVATION_SUPPORT_STATUS_CHANGE_REQUEST]: {
    innovationId: string;
    supportId: string;
    proposedStatus: InnovationSupportStatusEnum;
    requestStatusUpdateComment: string;
  };

  [NotifierTypeEnum.INNOVATION_STOP_SHARING]: {
    innovationId: string;
    message: string;
    affectedUsers: {
      id: string;
      role: ServiceRoleEnum;
      unitId?: string;
    }[];
  };

  [NotifierTypeEnum.INNOVATION_REASSESSMENT_REQUEST]: {
    innovationId: string;
  };

  [NotifierTypeEnum.INNOVATION_COLLABORATOR_UPDATE]: {
    innovationId: string;
    innovationCollaborator: { id: string; status: InnovationCollaboratorStatusEnum };
  };

  // Admin module.

  [NotifierTypeEnum.ACCESSOR_UNIT_CHANGE]: {
    user: { id: string; identityId: string };
    oldOrganisationUnitId: string;
    newOrganisationUnitId: string;
  };

  [NotifierTypeEnum.UNIT_INACTIVATION_SUPPORT_COMPLETED]: {
    innovationId: string;
    unitId: string;
  };

  // Recurrent notifications.
  [NotifierTypeEnum.INCOMPLETE_INNOVATION_RECORD]: Record<string, never>;
  [NotifierTypeEnum.IDLE_SUPPORT_ACCESSOR]: Record<string, never>;
  [NotifierTypeEnum.IDLE_SUPPORT_INNOVATOR]: Record<string, never>;
  [NotifierTypeEnum.UNIT_KPI]: Record<string, never>;

  // Automatic / Transfer
  [NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_EXPIRATION]: {
    innovationId: string;
    innovationName: string;
  };

  [NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_REMINDER]: {
    innovationId: string;
    innovationName: string;
    recipientEmail: string;
  };
};
