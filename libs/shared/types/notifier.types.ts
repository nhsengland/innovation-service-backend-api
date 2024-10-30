import type { ServiceRoleEnum } from '../enums';
import type {
  InnovationCollaboratorStatusEnum,
  InnovationStatusEnum,
  InnovationSupportStatusEnum,
  InnovationTaskStatusEnum
} from '../enums/innovation.enums';
import type { NotifierTypeEnum } from '../enums/notifier.enums';

export type NotifierTemplatesType = {
  // Account
  [NotifierTypeEnum.ACCOUNT_CREATION]: Record<string, never>;
  [NotifierTypeEnum.ACCOUNT_DELETION]: {
    innovations: {
      id: string;
      transferExpireDate?: string;
      affectedUsers?: { userId: string; userType: ServiceRoleEnum; unitId?: string }[];
    }[];
  };

  // Admin
  [NotifierTypeEnum.LOCK_USER]: {
    identityId: string;
  };
  [NotifierTypeEnum.UNIT_INACTIVATED]: {
    unitId: string;
    completedInnovationIds: string[];
  };
  [NotifierTypeEnum.USER_EMAIL_ADDRESS_UPDATED]: {
    identityId: string;
    oldEmail: string;
    newEmail: string;
  };

  // Documents
  [NotifierTypeEnum.INNOVATION_DOCUMENT_UPLOADED]: {
    innovationId: string;
    file: { id: string };
  };

  // Innovations
  // // Collaborators
  [NotifierTypeEnum.COLLABORATOR_INVITE]: {
    innovationId: string;
    collaboratorId: string;
  };
  [NotifierTypeEnum.COLLABORATOR_UPDATE]: {
    innovationId: string;
    collaborator: { id: string; status: InnovationCollaboratorStatusEnum };
  };
  // // Stop Sharing
  [NotifierTypeEnum.INNOVATION_STOP_SHARING]: {
    innovationId: string;
    organisationId: string;
    affectedUsers?: {
      roleIds: string[];
    };
  };
  // // Archive
  [NotifierTypeEnum.INNOVATION_ARCHIVE]: {
    innovationId: string;
    message: string;
    previousStatus: InnovationStatusEnum;
    reassessment: boolean;
    affectedUsers: {
      userId: string;
      userType: ServiceRoleEnum;
      unitId?: string;
    }[];
  };
  // // Transfer Ownership
  [NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_CREATION]: {
    innovationId: string;
    transferId: string;
  };
  [NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_COMPLETED]: {
    innovationId: string;
    transferId: string;
  };
  // // Export Request
  [NotifierTypeEnum.EXPORT_REQUEST_SUBMITTED]: {
    innovationId: string;
    exportRequestId: string;
    comment: string;
  };
  [NotifierTypeEnum.EXPORT_REQUEST_FEEDBACK]: {
    innovationId: string;
    exportRequestId: string;
  };

  // Threads/Messages
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

  // Needs Assessment
  [NotifierTypeEnum.INNOVATION_SUBMITTED]: {
    innovationId: string;
    reassessment: boolean;
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
  [NotifierTypeEnum.NEEDS_ASSESSMENT_ASSESSOR_UPDATE]: {
    innovationId: string;
    assessmentId: string;
    previousAssessor?: { id: string };
    newAssessor: { id: string };
  };

  // Suggestions
  [NotifierTypeEnum.ORGANISATION_UNITS_SUGGESTION]: {
    innovationId: string;
    unitsIds: string[];
    comment: string;
  };
  [NotifierTypeEnum.INNOVATION_DELAYED_SHARE]: {
    innovationId: string;
    newSharedOrgIds: string[];
  };

  // Support Summary
  [NotifierTypeEnum.SUPPORT_SUMMARY_UPDATE]: {
    innovationId: string;
    supportId: string;
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
    changedStatus: boolean;
  };
  [NotifierTypeEnum.SUPPORT_STATUS_CHANGE_REQUEST]: {
    innovationId: string;
    supportId: string;
    proposedStatus: InnovationSupportStatusEnum;
    requestStatusUpdateComment: string;
  };

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

  // Recurrent notifications.
  [NotifierTypeEnum.INCOMPLETE_INNOVATION_RECORD]: Record<string, never>;
  [NotifierTypeEnum.IDLE_SUPPORT_ACCESSOR]: Record<string, never>;
  [NotifierTypeEnum.IDLE_SUPPORT_INNOVATOR]: Record<string, never>;
  [NotifierTypeEnum.UNIT_KPI]: Record<string, never>;

  // Automatic / Transfer
  [NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_EXPIRATION]: {
    innovationId: string;
  };
  [NotifierTypeEnum.INNOVATION_TRANSFER_OWNERSHIP_REMINDER]: {
    innovationId: string;
    innovationName: string;
    recipientEmail: string;
  };

  // // Qualifying acessor and accessor welcome email
  [NotifierTypeEnum.NEW_SUPPORTING_ACCOUNT]: {
    recipientEmail: string;
  };

  [NotifierTypeEnum.NEW_ANNOUNCEMENT]: {
    announcementId: string;
  };
};
