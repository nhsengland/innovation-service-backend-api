import type { Context } from '@azure/functions';

import { NotifierServiceSymbol, NotifierServiceType } from '@notifications/shared/services';
import { NotifierTypeEnum, ServiceRoleEnum } from '@notifications/shared/enums';

import { container } from '../_config';
import type { AdminDomainContextType } from '@notifications/shared/types';

// Run every day at 01:00 (Summer Time) or 02:00 (Winter time)
class V1SystemSchedule {
  static async cronTrigger(_context: Context): Promise<void> {
    const notifierService = container.get<NotifierServiceType>(NotifierServiceSymbol);
    const domainContext: AdminDomainContextType = {
      id: 'F4D75573-47CF-EC11-B656-0050F25A2AF6',
      identityId: 'f4d75573-47cf-ec11-b656-0050f25a2af6',
      currentRole: { id: '', role: ServiceRoleEnum.ADMIN },
    };

    await notifierService.send(
      {
        id: 'F4D75573-47CF-EC11-B656-0050F25A2AF6',
        identityId: 'f4d75573-47cf-ec11-b656-0050f25a2af6',
      },
      NotifierTypeEnum.DAILY_DIGEST,
      {},
      domainContext
    );

    await notifierService.send(
      {
        id: 'F4D75573-47CF-EC11-B656-0050F25A2AF6',
        identityId: 'f4d75573-47cf-ec11-b656-0050f25a2af6',
      },
      NotifierTypeEnum.INCOMPLETE_INNOVATION_RECORD,
      {},
      domainContext
    );

    await notifierService.send(
      {
        id: 'F4D75573-47CF-EC11-B656-0050F25A2AF6',
        identityId: 'f4d75573-47cf-ec11-b656-0050f25a2af6',
      },
      NotifierTypeEnum.IDLE_SUPPORT,
      {},
      domainContext
    );
  }
}

export default V1SystemSchedule.cronTrigger;
