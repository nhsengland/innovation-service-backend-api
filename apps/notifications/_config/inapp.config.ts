export type InAppTemplatesType = {
  // Tasks
  TA01_TASK_CREATION_TO_INNOVATOR: {
    innovationName: string;
    unitName: string;
    taskId: string;
  };
  TA02_TASK_RESPONDED_TO_OTHER_INNOVATORS: {
    innovationName: string;
    status: string;
    requestUserName: string;
    threadId: string;
    messageId: string;
  };
  TA03_TASK_DONE_TO_ACCESSOR_OR_ASSESSMENT: {
    innovationName: string;
    requestUserName: string;
    threadId: string;
    messageId: string;
  };
  TA04_TASK_DECLINED_TO_ACCESSOR_OR_ASSESSMENT: {
    innovationName: string;
    requestUserName: string;
    threadId: string;
    messageId: string;
  };
  TA05_TASK_CANCELLED_TO_INNOVATOR: {
    innovationName: string;
    requestUserName: string;
    unitName: string;
    threadId: string;
    messageId: string;
  };
  TA06_TASK_REOPEN_TO_INNOVATOR: {
    innovationName: string;
    requestUserName: string;
    unitName: string;
    threadId: string;
    messageId: string;
  };
  // Documents
  DC01_UPLOADED_DOCUMENT_TO_INNOVATOR: {
    unitName: string;
    fileId: string;
  };
  // Messages
  ME01_THREAD_CREATION: {
    senderDisplayInformation: string;
    innovationName: string;
    threadId: string;
    messageId: string;
  };
  ME02_THREAD_ADD_FOLLOWERS: {
    senderDisplayInformation: string;
    innovationName: string;
    threadId: string;
  };
  ME03_THREAD_MESSAGE_CREATION: {
    senderDisplayInformation: string;
    innovationName: string;
    threadId: string;
    messageId: string;
  };
  // Supports
  ST01_SUPPORT_STATUS_TO_ENGAGING: {
    unitName: string;
    innovationName: string;
    threadId: string;
  };
  ST02_SUPPORT_STATUS_TO_OTHER: {
    unitId: string;
    unitName: string;
    innovationName: string;
    status: string;
  };
  ST03_SUPPORT_STATUS_TO_WAITING: {
    unitId: string;
    unitName: string;
    innovationName: string;
    status: string;
  };
  ST04_SUPPORT_NEW_ASSIGNED_ACCESSORS_TO_INNOVATOR: {
    unitName: string;
    innovationName: string;
    threadId: string;
  };
  ST05_SUPPORT_NEW_ASSIGNED_ACCESSOR_TO_NEW_QA: {
    innovationName: string;
  };
  ST06_SUPPORT_NEW_ASSIGNED_ACCESSOR_TO_OLD_QA: {
    innovationName: string;
  };
  ST07_SUPPORT_STATUS_CHANGE_REQUEST: {
    accessorName: string;
    innovationName: string;
    status: string;
  };
  // Needs assessment
  NA01_INNOVATOR_SUBMITS_FOR_NEEDS_ASSESSMENT_TO_INNOVATOR: {
    innovationName: string;
    assessmentType: 'assessment' | 'reassessment';
  };
  NA02_INNOVATOR_SUBMITS_FOR_NEEDS_ASSESSMENT_TO_ASSESSMENT: {
    innovationName: string;
    assessmentType: 'assessment' | 'reassessment';
  };
  NA03_NEEDS_ASSESSMENT_STARTED_TO_INNOVATOR: {
    innovationName: string;
    messageId: string;
    threadId: string;
  };
  NA04_NEEDS_ASSESSMENT_COMPLETE_TO_INNOVATOR: {
    innovationName: string;
    assessmentId: string;
  };
  NA06_NEEDS_ASSESSOR_REMOVED: {
    innovationName: string;
  };
  NA07_NEEDS_ASSESSOR_ASSIGNED: {
    innovationName: string;
  };

  // Automatic
  AU01_INNOVATOR_INCOMPLETE_RECORD: Record<string, never>;
  AU02_ACCESSOR_IDLE_ENGAGING_SUPPORT: {
    innovationName: string;
    supportId: string;
    unitId: string;
  };
  AU03_INNOVATOR_IDLE_SUPPORT: {
    innovationName: string;
  };
  AU04_SUPPORT_KPI_REMINDER: {
    innovationName: string;
  };
  AU05_SUPPORT_KPI_OVERDUE: {
    innovationName: string;
  };
  AU06_ACCESSOR_IDLE_WAITING: {
    innovationName: string;
    supportId: string; // really not required atm
  };
  AU10_ACCESSOR_IDLE_ENGAGING_SUPPORT_FOR_SIX_WEEKS: {
    innovationName: string;
    supportId: string;
    unitId: string;
  };
  // Automatic / Transfer
  AU08_TRANSFER_ONE_WEEK_REMINDER_EXISTING_USER: {
    innovationName: string;
  };
  AU09_TRANSFER_EXPIRED: {
    innovationName: string;
  };

  // Support Summary
  SS01_SUPPORT_SUMMARY_UPDATE_TO_INNOVATORS: {
    innovationName: string;
    unitName: string;
    unitId: string;
  };
  SS02_SUPPORT_SUMMARY_UPDATE_TO_OTHER_ENGAGING_ACCESSORS: {
    innovationName: string;
    unitName: string;
    unitId: string;
  };

  // Organisation Suggestions
  OS01_UNITS_SUGGESTION_TO_SUGGESTED_UNITS_QA: {
    innovationName: string;
    senderDisplayInformation: string;
  };
  OS02_UNITS_SUGGESTION_NOT_SHARED_TO_INNOVATOR: Record<string, never>;
  OS03_INNOVATION_DELAYED_SHARED_SUGGESTION: {
    innovationName: string;
  };

  // Innovation (management?)
  RE01_EXPORT_REQUEST_SUBMITTED: {
    unitName: string;
    innovationName: string;
    exportRequestId: string;
  };
  RE02_EXPORT_REQUEST_APPROVED: {
    innovationName: string;
    exportRequestId: string;
  };
  RE03_EXPORT_REQUEST_REJECTED: {
    innovationName: string;
    exportRequestId: string;
  };
  AI01_INNOVATION_ARCHIVED_TO_SELF: {
    innovationName: string;
  };
  AI02_INNOVATION_ARCHIVED_TO_COLLABORATORS: {
    innovationName: string;
  };
  AI03_INNOVATION_ARCHIVED_TO_ENGAGING_QA_A: {
    innovationName: string;
    archivedUrl: string;
  };
  AI04_INNOVATION_ARCHIVED_TO_NA_DURING_NEEDS_ASSESSMENT: {
    innovationName: string;
    assessmentType: 'assessment' | 'reassessment';
  };
  SH04_INNOVATION_STOPPED_SHARING_WITH_INDIVIDUAL_ORG_TO_OWNER: {
    innovationName: string;
    organisationName: string;
  };
  SH05_INNOVATION_STOPPED_SHARING_WITH_INDIVIDUAL_ORG_TO_QA_A: {
    innovationName: string;
  };
  DA01_OWNER_DELETED_ACCOUNT_WITH_PENDING_TRANSFER_TO_COLLABORATOR: {
    innovationName: string;
  };
  DA02_OWNER_DELETED_ACCOUNT_WITHOUT_PENDING_TRANSFER_TO_COLLABORATOR: {
    innovationName: string;
  };
  MC01_COLLABORATOR_INVITE_EXISTING_USER: {
    requestUserName: string;
    innovationName: string;
    collaboratorId: string;
  };
  MC02_COLLABORATOR_INVITE_NEW_USER: Record<string, never>;
  MC03_COLLABORATOR_UPDATE_CANCEL_INVITE: {
    requestUserName: string;
    innovationName: string;
    collaboratorId: string;
  };
  MC04_COLLABORATOR_UPDATE_ACCEPTS_INVITE: {
    requestUserName: string;
    innovationName: string;
    collaboratorId: string;
  };
  MC05_COLLABORATOR_UPDATE_DECLINES_INVITE: {
    requestUserName: string;
    innovationName: string;
    collaboratorId: string;
  };
  MC06_COLLABORATOR_UPDATE_REMOVED_COLLABORATOR: {
    requestUserName: string;
    innovationName: string;
    collaboratorId: string;
  };
  MC07_COLLABORATOR_UPDATE_COLLABORATOR_LEFT_TO_INNOVATORS: {
    requestUserName: string;
    innovationName: string;
    collaboratorId: string;
  };
  MC08_COLLABORATOR_UPDATE_COLLABORATOR_LEFT_TO_SELF: {
    innovationName: string;
    collaboratorId: string;
  };
  // Innovation Management / Transfer
  TO02_TRANSFER_OWNERSHIP_EXISTING_USER: {
    innovationName: string;
    transferId: string;
  };
  TO06_TRANSFER_OWNERSHIP_ACCEPTS_PREVIOUS_OWNER: {
    innovationName: string;
    newInnovationOwner: string;
  };
  TO07_TRANSFER_OWNERSHIP_ACCEPTS_ASSIGNED_ACCESSORS: {
    oldInnovationOwnerName: string;
    innovationName: string;
    newInnovationOwnerName: string;
  };
  TO08_TRANSFER_OWNERSHIP_DECLINES_PREVIOUS_OWNER: {
    innovationName: string;
  };
  TO09_TRANSFER_OWNERSHIP_CANCELED_NEW_OWNER: {
    innovationName: string;
    innovationOwner: string;
  };

  // Admin
  AP02_INNOVATOR_LOCKED_TO_ASSIGNED_USERS: {
    innovationName: string;
  };
  AP07_UNIT_INACTIVATED_TO_ENGAGING_INNOVATIONS: {
    unitName: string;
    innovationName: string;
  };
  AP08_USER_EMAIL_ADDRESS_UPDATED: Record<string, never>;

  // Notify Me
  SUPPORT_UPDATED: {
    event: string;
    innovation: string;
    supportStatus: string;
    organisation: string;
  };
  PROGRESS_UPDATE_CREATED: {
    event: string;
    innovation: string;
    unit: string;
  };
  REMINDER: {
    innovation: string;
    message: string;
  };
};
