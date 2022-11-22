import type { DateISOType } from '@innovations/shared/types'
import { InnovationStatisticsEnum } from '../_enums/innovation.enums'
import { actionsToSubmitStatisticsHandler } from '../_handlers/statistics/actions-to-submit.handler'
import { sectionsSubmittedStatisticsHandler } from '../_handlers/statistics/sections-submitted.handler'
import { unreadMessagesStatisticsHandler } from '../_handlers/statistics/unread-messages.handler'

export const INNOVATION_STATISTICS_CONFIG: Record<keyof typeof InnovationStatisticsEnum, {
  handler: (...args: any[]) => Promise<InnovationStatisticsTemplateType[InnovationStatisticsEnum]>,
}>  = {
  [InnovationStatisticsEnum.ACTIONS_TO_SUBMIT]: {
    handler: actionsToSubmitStatisticsHandler,
  },
  [InnovationStatisticsEnum.SECTIONS_SUBMITTED]: {
    handler: sectionsSubmittedStatisticsHandler,
  },
  [InnovationStatisticsEnum.UNREAD_MESSAGES]: {
    handler: unreadMessagesStatisticsHandler,
  },
}

export type InnovationStatisticsTemplateType = {
  [InnovationStatisticsEnum.ACTIONS_TO_SUBMIT]: { count: number; total: number; lastSubmittedAt: null | DateISOType;},
  [InnovationStatisticsEnum.SECTIONS_SUBMITTED]: { count: number; total: number; lastSubmittedAt: null | DateISOType;},
  [InnovationStatisticsEnum.UNREAD_MESSAGES]: { count: number; lastSubmittedAt: null | DateISOType;},
}
