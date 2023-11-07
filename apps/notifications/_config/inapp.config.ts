import type { InnovationTaskStatusEnum } from '@notifications/shared/enums';

export type InAppTemplatesType = {
  // Tasks
  TA01_TASK_CREATION_TO_INNOVATOR: {
    innovationName: string;
    unitName: string;
    taskId: string;
  };
  TA02_TASK_RESPONDED_TO_OTHER_INNOVATORS: {
    innovationName: string;
    status: InnovationTaskStatusEnum;
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
  // Needs assessment
  NA01_INNOVATOR_SUBMITS_FOR_NEEDS_ASSESSMENT_TO_INNOVATOR: {
    innovationName: string;
    needsAssessment: 'assessment' | 'reassessment';
  };
  NA02_INNOVATOR_SUBMITS_FOR_NEEDS_ASSESSMENT_TO_ASSESSMENT: {
    innovationName: string;
    needsAssessment: 'assessment' | 'reassessment';
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
  AU03_INNOVATOR_IDLE_SUPPORT: {
    innovationName: string;
  };
  AU04_SUPPORT_KPI_REMINDER: {
    innovationName: string;
  };
  AU05_SUPPORT_KPI_OVERDUE: {
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
};
