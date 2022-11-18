import type { DateISOType } from '@admin/shared/types'
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


type CounterType = {
  count: number;
  total: number;
  lastSubmittedAt: null | DateISOType;
  overdue: null | DateISOType;
}

export type InnovationStatisticsTemplateType = {

  [InnovationStatisticsEnum.ACTIONS_TO_SUBMIT]: Pick<CounterType, 'count' | 'total' | 'lastSubmittedAt'>,

  [InnovationStatisticsEnum.SECTIONS_SUBMITTED]: Pick<CounterType, 'count' | 'total' | 'lastSubmittedAt'>,

  [InnovationStatisticsEnum.UNREAD_MESSAGES]: Pick<CounterType, 'count' | 'lastSubmittedAt'>,

}
