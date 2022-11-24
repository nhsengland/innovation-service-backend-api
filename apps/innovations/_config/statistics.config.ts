import type { DateISOType } from '@innovations/shared/types'
import { InnovationStatisticsEnum } from '../_enums/innovation.enums'
import { actionsToReviewStatisticsHandler } from '../_handlers/statistics/actions-to-review.handler'
import { actionsToSubmitStatisticsHandler } from '../_handlers/statistics/actions-to-submit.handler'
import { sectionsSubmittedSinceSupportStartStatisticsHandler } from '../_handlers/statistics/sections-submitted-since-support-start.handler'
import { sectionsSubmittedStatisticsHandler } from '../_handlers/statistics/sections-submitted.handler'
import { unreadMessagesStatisticsHandler } from '../_handlers/statistics/unread-messages.handler'

export const INNOVATION_STATISTICS_CONFIG: Record<keyof typeof InnovationStatisticsEnum, {
  handler: (...args: any[]) => Promise<InnovationStatisticsTemplateType[InnovationStatisticsEnum]>,
}>  = {
  [InnovationStatisticsEnum.ACTIONS_TO_SUBMIT_COUNTER]: {
    handler: actionsToSubmitStatisticsHandler,
  },
  [InnovationStatisticsEnum.SECTIONS_SUBMITTED_COUNTER]: {
    handler: sectionsSubmittedStatisticsHandler,
  },
  [InnovationStatisticsEnum.UNREAD_MESSAGES_COUNTER]: {
    handler: unreadMessagesStatisticsHandler,
  },
  [InnovationStatisticsEnum.ACTIONS_TO_REVIEW_COUNTER]: {
    handler: actionsToReviewStatisticsHandler,
  },
  [InnovationStatisticsEnum.SECTIONS_SUBMITTED_SINCE_SUPPORT_START_COUNTER]: {
    handler: sectionsSubmittedSinceSupportStartStatisticsHandler,
  },
}

export type InnovationStatisticsTemplateType = {
  [InnovationStatisticsEnum.ACTIONS_TO_SUBMIT_COUNTER]: { count: number; total: number; lastSubmittedAt: null | DateISOType;},
  [InnovationStatisticsEnum.SECTIONS_SUBMITTED_COUNTER]: { count: number; total: number; lastSubmittedAt: null | DateISOType;},
  [InnovationStatisticsEnum.UNREAD_MESSAGES_COUNTER]: { count: number; lastSubmittedAt: null | DateISOType;},
  [InnovationStatisticsEnum.ACTIONS_TO_REVIEW_COUNTER]: { count: number; lastSubmittedAt: null | DateISOType;},
  [InnovationStatisticsEnum.SECTIONS_SUBMITTED_SINCE_SUPPORT_START_COUNTER]: { count: number; lastSubmittedAt: null | DateISOType;},
}
