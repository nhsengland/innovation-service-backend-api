import { UserStatisticsEnum } from '../_enums/user.enums';
import { assignedInnovationsStatisticsHandler } from '../_handlers/statistics/assigned-innovations.handler';
import { innovationsAssignedToMeStatisticsHandler } from '../_handlers/statistics/innovations-assigned-to-me.handler';
import { innovationsToReviewStatisticsHandler } from '../_handlers/statistics/innovations-to-review.handler';
import { tasksRespondedStatisticsHandler } from '../_handlers/statistics/tasks-responded.handler';
import { waitingAssessmentStatisticsHandler } from '../_handlers/statistics/waiting-assessment.handler';

export const USER_STATISTICS_CONFIG: Record<
  keyof typeof UserStatisticsEnum,
  {
    handler: (...args: any[]) => Promise<UserStatisticsTemplateType[UserStatisticsEnum]>;
  }
> = {
  [UserStatisticsEnum.WAITING_ASSESSMENT_COUNTER]: {
    handler: waitingAssessmentStatisticsHandler
  },
  [UserStatisticsEnum.ASSIGNED_INNOVATIONS_COUNTER]: {
    handler: assignedInnovationsStatisticsHandler
  },

  [UserStatisticsEnum.INNOVATIONS_ASSIGNED_TO_ME_COUNTER]: {
    handler: innovationsAssignedToMeStatisticsHandler
  },

  [UserStatisticsEnum.TASKS_RESPONDED_COUNTER]: {
    handler: tasksRespondedStatisticsHandler
  },

  [UserStatisticsEnum.INNOVATIONS_TO_REVIEW_COUNTER]: {
    handler: innovationsToReviewStatisticsHandler
  }
};

export type UserStatisticsTemplateType = {
  [UserStatisticsEnum.WAITING_ASSESSMENT_COUNTER]: { count: number; overdue: number };
  [UserStatisticsEnum.ASSIGNED_INNOVATIONS_COUNTER]: {
    count: number;
    total: number;
    overdue: number;
  };
  [UserStatisticsEnum.INNOVATIONS_ASSIGNED_TO_ME_COUNTER]: {
    count: number;
    total: number;
    lastSubmittedAt: null | Date;
  };
  [UserStatisticsEnum.TASKS_RESPONDED_COUNTER]: {
    count: number;
    total: number;
    lastSubmittedAt: null | Date;
  };
  [UserStatisticsEnum.INNOVATIONS_TO_REVIEW_COUNTER]: {
    count: number;
    lastSubmittedAt: null | Date;
  };
};
