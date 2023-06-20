/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { IdleSupportHandler } from './idle-support.handler';

import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { RecipientType, RecipientsService } from '../_services/recipients.service';
import { CompleteScenarioType, MocksHelper, TestsHelper } from '@notifications/shared/tests';
import { ENV, EmailTypeEnum } from '../_config';
import { UrlModel } from '@notifications/shared/models';
import { NotificationLogTypeEnum } from '@notifications/shared/enums';
import { randUuid } from '@ngneat/falso';

describe('Notifications / _handlers / idle-innovators handler suite', () => {
  let testsHelper: TestsHelper;
  let scenario: CompleteScenarioType;

  let handler: IdleSupportHandler;

  const idleSupports: Record<
    string,
    {
      innovationId: string;
      innovationName: string;
      ownerIdentityId: string;
      unitId: string;
      recipient: RecipientType;
    }
  > = {};

  beforeAll(async () => {
    testsHelper = await new TestsHelper().init();
    scenario = testsHelper.getCompleteScenario();

    idleSupports['johnInnovationByAlice'] = {
      recipient: DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor, 'qaRole'),
      innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
      innovationName: scenario.users.johnInnovator.innovations.johnInnovation.name,
      ownerIdentityId: scenario.users.johnInnovator.identityId,
      unitId: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id
    };
    idleSupports['johnInnovationBySam'] = {
      recipient: DTOsHelper.getRecipientUser(scenario.users.samAccessor, 'accessorRole'),
      innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
      innovationName: scenario.users.johnInnovator.innovations.johnInnovation.name,
      ownerIdentityId: scenario.users.johnInnovator.identityId,
      unitId: scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.id
    };

    idleSupports['noOwner'] = {
      recipient: DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor, 'qaRole'),
      innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
      innovationName: scenario.users.johnInnovator.innovations.johnInnovation.name,
      ownerIdentityId: randUuid(),
      unitId: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id
    };
  });

  it(`Shouldn't do anything when there are no idle supports`, async () => {
    jest.spyOn(RecipientsService.prototype, 'idleSupports').mockResolvedValueOnce([]);

    handler = new IdleSupportHandler(
      DTOsHelper.getUserRequestContext(scenario.users.allMighty),
      {},
      MocksHelper.mockContext()
    );

    await handler.run();

    expect(handler.emails).toHaveLength(0);
  });

  it('Should email all QAs with innovations having idle supports', async () => {
    jest
      .spyOn(RecipientsService.prototype, 'idleSupports')
      .mockResolvedValueOnce([idleSupports['johnInnovationByAlice']!, idleSupports['johnInnovationBySam']!]);

    handler = new IdleSupportHandler(
      DTOsHelper.getUserRequestContext(scenario.users.allMighty),
      {},
      MocksHelper.mockContext()
    );

    await handler.run();

    expect(handler.emails).toHaveLength(2);
    expect(handler.emails).toMatchObject([
      {
        templateId: EmailTypeEnum.QA_A_IDLE_SUPPORT,
        to: idleSupports['johnInnovationByAlice']?.recipient,
        notificationPreferenceType: null,
        params: {
          innovation_name: idleSupports['johnInnovationByAlice']?.innovationName,
          innovator_name: scenario.users.johnInnovator.name,
          message_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath('accessor/innovations/:innovationId/threads')
            .setPathParams({
              innovationId: idleSupports['johnInnovationByAlice']!.innovationId
            })
            .buildUrl()
        },
        log: {
          type: NotificationLogTypeEnum.QA_A_IDLE_SUPPORT,
          params: {
            innovationId: idleSupports['johnInnovationByAlice']?.innovationId,
            unitId: idleSupports['johnInnovationByAlice']?.unitId
          }
        }
      },
      {
        templateId: EmailTypeEnum.QA_A_IDLE_SUPPORT,
        to: idleSupports['johnInnovationBySam']?.recipient,
        notificationPreferenceType: null,
        params: {
          innovation_name: idleSupports['johnInnovationBySam']?.innovationName,
          innovator_name: scenario.users.johnInnovator.name,
          message_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath('accessor/innovations/:innovationId/threads')
            .setPathParams({
              innovationId: idleSupports['johnInnovationBySam']!.innovationId
            })
            .buildUrl()
        },
        log: {
          type: NotificationLogTypeEnum.QA_A_IDLE_SUPPORT,
          params: {
            innovationId: idleSupports['johnInnovationBySam']?.innovationId,
            unitId: idleSupports['johnInnovationBySam']?.unitId
          }
        }
      }
    ]);
  });

  describe('Innovation owner not found for innovation with idle support', () => {

    let loggerSpy: jest.SpyInstance<void, any[]>;

    beforeEach(async () => {
      jest.spyOn(RecipientsService.prototype, 'idleSupports').mockResolvedValueOnce([idleSupports['noOwner']!]);

      handler = new IdleSupportHandler(
        DTOsHelper.getUserRequestContext(scenario.users.allMighty),
        {},
        MocksHelper.mockContext()
      );

      loggerSpy = jest.spyOn(handler.logger, 'error');

      await handler.run();
    });

    it('Should log that the innovation owner was not found', () => {
      expect(loggerSpy).toHaveBeenCalled();
    });

    it('Should not send email to the QA with idle support on that innovation', () => {
      expect(handler.emails).toHaveLength(0);
    });
  });
});
