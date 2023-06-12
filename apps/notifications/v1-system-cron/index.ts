import type { Context } from '@azure/functions';

import { NotifierTypeEnum } from '@notifications/shared/enums';
import type { NotifierService } from '@notifications/shared/services';
import SHARED_SYMBOLS from '@notifications/shared/services/symbols';

import { container } from '../_config';

// Run every day at 01:00 (Summer Time) or 02:00 (Winter time)
class V1SystemSchedule {
  static async cronTrigger(_context: Context): Promise<void> {
    const notifierService = container.get<NotifierService>(SHARED_SYMBOLS.NotifierService);

    await notifierService.sendSystemNotification(NotifierTypeEnum.DAILY_DIGEST, {});

    await notifierService.sendSystemNotification(NotifierTypeEnum.INCOMPLETE_INNOVATION_RECORD, {});

    await notifierService.sendSystemNotification(NotifierTypeEnum.IDLE_SUPPORT, {});
  }
}

export default V1SystemSchedule.cronTrigger;
