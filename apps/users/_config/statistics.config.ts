import { UserStatisticsEnum } from '../_enums/user.enums'
import { assignedInnovationsStatisticsHandler } from '../_handlers/statistics/assigned-innovations.handler';
import { waitingAssessmentStatisticsHandler } from '../_handlers/statistics/waiting-assessment.handler'

export const USER_STATISTICS_CONFIG: Record<keyof typeof UserStatisticsEnum, {
  handler: (...args: any[]) => Promise<UserStatisticsTemplateType[UserStatisticsEnum]>,
}>  = {
  [UserStatisticsEnum.WAITING_ASSESSMENT]: {
    handler: waitingAssessmentStatisticsHandler,
  },
  [UserStatisticsEnum.ASSIGNED_INNOVATIONS]: {
    handler: assignedInnovationsStatisticsHandler,
  },
}

export type UserStatisticsTemplateType = {
  [UserStatisticsEnum.WAITING_ASSESSMENT]: { count: number; overdue: number;},
  [UserStatisticsEnum.ASSIGNED_INNOVATIONS]: { count: number; total: number; overdue: number;},
}
