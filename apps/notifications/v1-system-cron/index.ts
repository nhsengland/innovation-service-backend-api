import type { Context } from '@azure/functions';

import { NotifierServiceSymbol, NotifierServiceType } from '@notifications/shared/services';
import { NotifierTypeEnum, UserTypeEnum } from '@notifications/shared/enums';

import { container } from '../_config';


// Run every day at 01:00 (Summer Time) or 02:00 (Winter time)
class V1SystemSchedule {

  static async cronTrigger(_context: Context): Promise<void> {

    const notifierService = container.get<NotifierServiceType>(NotifierServiceSymbol);

    await notifierService.send(
      { id: 'F4D75573-47CF-EC11-B656-0050F25A2AF6', identityId: 'f4d75573-47cf-ec11-b656-0050f25a2af6', type: UserTypeEnum.ADMIN },
      NotifierTypeEnum.DAILY_DIGEST,
      {}
    );

  }

}

export default V1SystemSchedule.cronTrigger;
