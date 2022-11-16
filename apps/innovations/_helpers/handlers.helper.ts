import type { UserTypeEnum } from '@innovations/shared/enums';

import { INNOVATION_STATISTICS_CONFIG } from '../_config';
import type { BaseHandler } from '../_handlers/base.handler';
import type { InnovationStatisticsEnum } from '../_enums/innovation.enums';


export class HandlersHelper {

  static async runHandler(
    requestUser: { id: string, identityId: string, type: UserTypeEnum },
    action: InnovationStatisticsEnum,
    params: { [key: string]: any }
  ): Promise<BaseHandler<InnovationStatisticsEnum>> {

    return new INNOVATION_STATISTICS_CONFIG[action].handler(requestUser, params).run()

  }

}
