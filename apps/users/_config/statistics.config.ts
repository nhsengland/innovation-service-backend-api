import { UserStatisticsEnum } from '../_enums/user.enums'
import { waitingAssessmentStatisticsHandler } from '../_handlers/statistics/waiting-assessment.handler'

export const USER_STATISTICS_CONFIG: Record<keyof typeof UserStatisticsEnum, {
  handler: (...args: any[]) => Promise<UserStatisticsTemplateType[UserStatisticsEnum]>,
}>  = {
  [UserStatisticsEnum.WAITING_ASSESSMENT]: {
    handler: waitingAssessmentStatisticsHandler,
  },
}

export type UserStatisticsTemplateType = {
  [UserStatisticsEnum.WAITING_ASSESSMENT]: { count: number; overdue: number;},
}
