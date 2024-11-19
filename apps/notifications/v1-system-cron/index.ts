import type { Context } from '@azure/functions';

import { NotifierTypeEnum } from '@notifications/shared/enums';
import type { NotifierService } from '@notifications/shared/services';
import SHARED_SYMBOLS from '@notifications/shared/services/symbols';

import { container } from '../_config';

// Run every day at 01:00 (Summer Time) or 02:00 (Winter time)
class V1SystemSchedule {
  static async cronTrigger(_context: Context): Promise<void> {
    if (process.env['DISABLE_AUTOMATIC_NOTIFICATIONS'] !== 'true') {
      const notifierService = container.get<NotifierService>(SHARED_SYMBOLS.NotifierService);

      await notifierService.sendSystemNotification(NotifierTypeEnum.INCOMPLETE_INNOVATION_RECORD, {});

      await notifierService.sendSystemNotification(NotifierTypeEnum.IDLE_SUPPORT_ACCESSOR, {});

      await notifierService.sendSystemNotification(NotifierTypeEnum.IDLE_SUPPORT_INNOVATOR, {});

      await notifierService.sendSystemNotification(NotifierTypeEnum.UNIT_KPI, {});

      await notifierService.sendSystemNotification(NotifierTypeEnum.SURVEY_END_SUPPORT_REMINDER, {});
    }
  }
}

export default V1SystemSchedule.cronTrigger;
