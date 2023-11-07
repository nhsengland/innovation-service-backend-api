import type { Context } from '@azure/functions';
import type { NotifierTypeEnum } from '@notifications/shared/enums';
import { groupBy } from '@notifications/shared/helpers/misc.helper';
import type { DomainContextType, NotifierTemplatesType } from '@notifications/shared/types';
import { BaseHandler } from '../base.handler';

export class IdleSupportAccessorHandler extends BaseHandler<
  NotifierTypeEnum.IDLE_SUPPORT_ACCESSOR,
  'AU02_ACCESSOR_IDLE_ENGAGING_SUPPORT'
> {
  constructor(
    requestUser: DomainContextType,
    data: NotifierTemplatesType[NotifierTypeEnum.IDLE_SUPPORT_ACCESSOR],
    azureContext: Context
  ) {
    super(requestUser, data, azureContext);
  }

  async run(): Promise<this> {
    await this.AU02_ACCESSOR_IDLE_ENGAGING_SUPPORT();

    return this;
  }

  private async AU02_ACCESSOR_IDLE_ENGAGING_SUPPORT(): Promise<void> {
    const idleSupports = await this.recipientsService.idleEngagingSupports(30);
    const idleInnovationsMap = groupBy(idleSupports, 'innovationId');
  }
}
