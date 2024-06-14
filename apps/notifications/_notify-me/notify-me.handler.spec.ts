import { NotifyMeHandler } from './notify-me.handler';

import { randUuid } from '@ngneat/falso';
import { InnovationSupportStatusEnum } from '@notifications/shared/enums';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { NotificationsTestsHelper } from '../_tests/notifications-test.helper';

const recipientMock = {} as any;
const notifyMeServiceMock = {} as any;

describe('NotifyMe Handler Suite', () => {
  const testsHelper = new NotificationsTestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  beforeAll(async () => {
    await testsHelper.init();
  });

  const unit = scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id;
  const user = DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor);

  // describe('execute', () => {
  //   it('fails', () => {
  //     fail('todo');
  //   });
  // });

  describe('validatePreconditions', () => {
    it('ignores field in the event if it is not in the preConditions', () => {
      const handler = new NotifyMeHandler(notifyMeServiceMock, recipientMock, {
        innovationId: randUuid(),
        requestUser: user,
        params: {
          status: InnovationSupportStatusEnum.ENGAGING,
          units: unit,
          fake: 'test'
        } as any,
        type: 'SUPPORT_UPDATED' as const
      });

      const res = handler['validatePreconditions']({
        id: randUuid(),
        roleId: user.currentRole.id,
        innovationId: randUuid(),
        config: {
          eventType: 'SUPPORT_UPDATED',
          subscriptionType: 'INSTANTLY',
          preConditions: {
            status: [InnovationSupportStatusEnum.ENGAGING],
            units: [unit]
          }
        }
      });

      expect(res).toBe(true);
    });

    it('fails', () => {
      fail('todo');
    });
  });

  // describe('getInAppParams', () => {
  //   describe('Support Updated', () => {
  //     it('should return the correct params', () => {
  //       fail('todo');
  //     });

  //     it('should translate the status correctly', () => {
  //       fail('todo');
  //     });
  //   });
  // });

  // describe('getEmailParams', () => {
  //   describe('Support Updated', () => {
  //     it('should return the correct params', () => {
  //       fail('todo');
  //     });

  //     it('should translate the status correctly', () => {
  //       fail('todo');
  //     });
  //   });
  // });
});
