import { TestsHelper } from '@notifications/shared/tests';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import type { IdentityUserInfo } from '@notifications/shared/types';
import { RecipientsService } from '../_services/recipients.service';

export class NotificationsTestsHelper extends TestsHelper {
  override async init(): Promise<this> {
    await super.init();
    const identityMap = this.completeScenarioBuilder.getIdentityMap();

    // Setup the mock for the recipients service.
    jest.spyOn(RecipientsService.prototype, 'identityId2UserId').mockImplementation(async (identityId: string) => {
      return identityMap.get(identityId)?.id || null;
    });

    jest
      .spyOn(RecipientsService.prototype, 'usersIdentityInfo')
      .mockImplementation(async (userIdentityIds?: string | string[]) => {
        if (!userIdentityIds) {
          return null;
        }
        const identityIds = Array.isArray(userIdentityIds) ? userIdentityIds : [userIdentityIds];
        const res = new Map<string, IdentityUserInfo>();
        identityIds.forEach(id => {
          if (identityMap.has(id)) {
            res.set(id, DTOsHelper.getIdentityUserInfo(identityMap.get(id)!));
          }
        });
        if (typeof userIdentityIds === 'string') {
          return res.get(userIdentityIds) ?? null;
        }
        return res;
      });

    return this;
  }
}
