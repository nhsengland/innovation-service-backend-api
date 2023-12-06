import type { InnovationFileContextTypeEnum, ServiceRoleEnum } from '@innovations/shared/enums';
import { InnovationStatisticsEnum } from '../_enums/innovation.enums';
import { DocumentsStatisticsHandler } from '../_handlers/statistics/documents-statistics.handler';
import { PendingExportRequestsStatisticsHandler } from '../_handlers/statistics/pending-export-requests.handler';
import { SectionsSubmittedSinceAssessmentStartStatisticsHandler } from '../_handlers/statistics/sections-submitted-since-assessment-start.handler';
import { SectionsSubmittedSinceSupportStartStatisticsHandler } from '../_handlers/statistics/sections-submitted-since-support-start.handler';
import { SectionsSubmittedStatisticsHandler } from '../_handlers/statistics/sections-submitted.handler';
import { TasksOpenStatisticsHandler } from '../_handlers/statistics/tasks-open.handler';
import { TasksRespondedStatisticsHandler } from '../_handlers/statistics/tasks-responded.handler';
import { UnreadMessagesThreadsInitiatedByStatisticsHandler } from '../_handlers/statistics/unread-messages-initiated-by.handler';
import { UnreadMessagesStatisticsHandler } from '../_handlers/statistics/unread-messages.handler';
import type { InnovationsStatisticsHandler } from '../_types/statistics-handlers.types';

export const INNOVATION_STATISTICS_CONFIG: Record<
  keyof typeof InnovationStatisticsEnum,
  {
    handler: { new (...args: any[]): InnovationsStatisticsHandler };
  }
> = {
  [InnovationStatisticsEnum.TASKS_OPEN_COUNTER]: {
    handler: TasksOpenStatisticsHandler
  },
  [InnovationStatisticsEnum.TASKS_RESPONDED_COUNTER]: {
    handler: TasksRespondedStatisticsHandler
  },
  [InnovationStatisticsEnum.SECTIONS_SUBMITTED_COUNTER]: {
    handler: SectionsSubmittedStatisticsHandler
  },
  [InnovationStatisticsEnum.UNREAD_MESSAGES_COUNTER]: {
    handler: UnreadMessagesStatisticsHandler
  },
  [InnovationStatisticsEnum.SECTIONS_SUBMITTED_SINCE_SUPPORT_START_COUNTER]: {
    handler: SectionsSubmittedSinceSupportStartStatisticsHandler
  },
  [InnovationStatisticsEnum.SECTIONS_SUBMITTED_SINCE_ASSESSMENT_START_COUNTER]: {
    handler: SectionsSubmittedSinceAssessmentStartStatisticsHandler
  },
  [InnovationStatisticsEnum.UNREAD_MESSAGES_THREADS_INITIATED_BY_COUNTER]: {
    handler: UnreadMessagesThreadsInitiatedByStatisticsHandler
  },
  [InnovationStatisticsEnum.PENDING_EXPORT_REQUESTS_COUNTER]: {
    handler: PendingExportRequestsStatisticsHandler
  },
  [InnovationStatisticsEnum.DOCUMENTS_STATISTICS_COUNTER]: {
    handler: DocumentsStatisticsHandler
  }
};

export type InnovationStatisticsTemplateType = {
  [InnovationStatisticsEnum.TASKS_OPEN_COUNTER]: {
    count: number;
    lastSubmittedSection: null | string;
    lastSubmittedAt: null | Date;
  };
  [InnovationStatisticsEnum.TASKS_RESPONDED_COUNTER]: {
    count: number;
    total: number;
    lastUpdatedSection: null | string;
    lastUpdatedAt: null | Date;
  };
  [InnovationStatisticsEnum.SECTIONS_SUBMITTED_COUNTER]: {
    count: number;
    total: number;
    lastSubmittedSection: null | string;
    lastSubmittedAt: null | Date;
  };
  [InnovationStatisticsEnum.UNREAD_MESSAGES_COUNTER]: {
    count: number;
    lastSubmittedAt: null | Date;
  };
  [InnovationStatisticsEnum.SECTIONS_SUBMITTED_SINCE_SUPPORT_START_COUNTER]: {
    count: number;
    total: number;
    lastSubmittedSection: null | string;
    lastSubmittedAt: null | Date;
  };

  [InnovationStatisticsEnum.SECTIONS_SUBMITTED_SINCE_ASSESSMENT_START_COUNTER]: {
    count: number;
    total: number;
    lastSubmittedSection: null | string;
    lastSubmittedAt: null | Date;
  };
  [InnovationStatisticsEnum.UNREAD_MESSAGES_THREADS_INITIATED_BY_COUNTER]: {
    count: number;
    lastSubmittedAt: null | Date;
  };
  [InnovationStatisticsEnum.PENDING_EXPORT_REQUESTS_COUNTER]: {
    count: number;
  };
  [InnovationStatisticsEnum.DOCUMENTS_STATISTICS_COUNTER]: {
    uploadedByRoles: { role: ServiceRoleEnum; count: number }[];
    uploadedByUnits: { id: string; unit: string; count: number }[];
    locations: { location: InnovationFileContextTypeEnum; count: number }[];
  };
};

export type InnovationStatisticsParamsTemplateType = {
  [InnovationStatisticsEnum.TASKS_OPEN_COUNTER]: { innovationId: string };
  [InnovationStatisticsEnum.TASKS_RESPONDED_COUNTER]: { innovationId: string };
  [InnovationStatisticsEnum.SECTIONS_SUBMITTED_COUNTER]: { innovationId: string };
  [InnovationStatisticsEnum.UNREAD_MESSAGES_COUNTER]: { innovationId: string };
  [InnovationStatisticsEnum.SECTIONS_SUBMITTED_SINCE_SUPPORT_START_COUNTER]: {
    innovationId: string;
  };

  [InnovationStatisticsEnum.SECTIONS_SUBMITTED_SINCE_ASSESSMENT_START_COUNTER]: {
    innovationId: string;
  };
  [InnovationStatisticsEnum.UNREAD_MESSAGES_THREADS_INITIATED_BY_COUNTER]: { innovationId: string };
  [InnovationStatisticsEnum.PENDING_EXPORT_REQUESTS_COUNTER]: { innovationId: string };
  [InnovationStatisticsEnum.DOCUMENTS_STATISTICS_COUNTER]: { innovationId: string };
};
