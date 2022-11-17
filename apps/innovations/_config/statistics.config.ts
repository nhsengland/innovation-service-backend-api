import type { DateISOType } from '@admin/shared/types'
import { InnovationStatisticsEnum } from '../_enums/innovation.enums'
import { actionsToSubmitStatisticsHandler } from '../_handlers/statistics/actions-to-submit.handler'
import { sectionsSubmittedStatisticsHandler } from '../_handlers/statistics/sections-submitted.handler'
import { unreadMessagesStatisticsHandler } from '../_handlers/statistics/unread-messages.handler'

export const INNOVATION_STATISTICS_CONFIG: Record<keyof typeof InnovationStatisticsEnum, {
  handler: (...args: any[]) => Promise<InnovationStatisticsTemplateType[InnovationStatisticsEnum]>,
}>  = {
  [InnovationStatisticsEnum.ACTIONS]: {
    handler: actionsToSubmitStatisticsHandler,
  },
  [InnovationStatisticsEnum.INNOVATION_RECORD]: {
    handler: sectionsSubmittedStatisticsHandler,
  },
  [InnovationStatisticsEnum.MESSAGES]: {
    handler: unreadMessagesStatisticsHandler,
  },
}

export type InnovationStatisticsInputType = {

  [InnovationStatisticsEnum.ACTIONS]: {
    innovationId: string,
  },

  [InnovationStatisticsEnum.INNOVATION_RECORD]: {
    innovationId: string,
  },

  [InnovationStatisticsEnum.MESSAGES]: {
    innovationId: string,
  },

}

export type InnovationStatisticsTemplateType = {

  [InnovationStatisticsEnum.ACTIONS]: {
    total: number,
    from: number,
    lastSubmittedAt: null | DateISOType,
  },

  [InnovationStatisticsEnum.INNOVATION_RECORD]: {
    total: number,
    from: number,
    lastSubmittedAt: null | DateISOType,
  },

  [InnovationStatisticsEnum.MESSAGES]: {
    total: number,
    lastSubmittedAt: null | DateISOType,
  },

}
