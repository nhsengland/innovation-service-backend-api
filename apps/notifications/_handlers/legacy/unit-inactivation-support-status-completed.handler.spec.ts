import { UrlModel } from '@notifications/shared/models';
import { CompleteScenarioType, MocksHelper, TestsHelper } from '@notifications/shared/tests';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { ENV, EmailTypeEnum } from '../../_config';
import { RecipientsService } from '../../_services/recipients.service';
import { UnitInactivationSupportStatusCompletedHandler } from './unit-inactivation-support-status-completed.handler';

describe('Notifications / _handlers / unit-inactivation-support-status-completed handler suite', () => {
  let testsHelper: TestsHelper;
  let scenario: CompleteScenarioType;

  let handler: UnitInactivationSupportStatusCompletedHandler;

  let innovation: CompleteScenarioType['users']['johnInnovator']['innovations']['johnInnovation'];
  let innovationOwner: CompleteScenarioType['users']['johnInnovator'];

  let unit: CompleteScenarioType['organisations']['healthOrg']['organisationUnits']['healthOrgUnit'];

  beforeAll(async () => {
    testsHelper = await new TestsHelper().init();
    scenario = testsHelper.getCompleteScenario();

    innovation = scenario.users.johnInnovator.innovations.johnInnovation;
    innovationOwner = scenario.users.johnInnovator;
    unit = scenario.organisations.healthOrg.organisationUnits.healthOrgUnit;
  });

  beforeEach(() => {
    jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValueOnce({
      name: innovation.name,
      ownerId: innovationOwner.id,
      ownerIdentityId: innovationOwner.identityId
    });

    jest.spyOn(RecipientsService.prototype, 'organisationUnitInfo').mockResolvedValueOnce({
      organisation: {
        id: scenario.organisations.healthOrg.id,
        name: scenario.organisations.healthOrg.name,
        acronym: scenario.organisations.healthOrg.acronym
      },
      organisationUnit: {
        id: unit.id,
        name: unit.name,
        acronym: unit.acronym
      }
    });
  });

  it('Should send email to innovation owner', async () => {
    jest
      .spyOn(RecipientsService.prototype, 'getUsersRecipient')
      .mockResolvedValueOnce(DTOsHelper.getRecipientUser(innovationOwner, 'innovatorRole'));

    handler = new UnitInactivationSupportStatusCompletedHandler(
      DTOsHelper.getUserRequestContext(scenario.users.allMighty, 'admin'),
      {
        innovationId: innovation.id,
        unitId: unit.id
      },
      MocksHelper.mockContext()
    );

    await handler.run();

    expect(handler.emails).toMatchObject([
      {
        templateId: EmailTypeEnum.UNIT_INACTIVATION_SUPPORT_COMPLETED,
        to: DTOsHelper.getRecipientUser(innovationOwner, 'innovatorRole'),
        notificationPreferenceType: null,
        params: {
          innovation_name: innovation.name,
          unit_name: unit.name,
          support_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath('innovator/innovations/:innovationId/support')
            .setPathParams({ innovationId: innovation.id })
            .buildUrl()
        }
      }
    ]);
  });

  it('Should not send any email if the innovation owner is not found', async () => {
    jest.spyOn(RecipientsService.prototype, 'getUsersRecipient').mockResolvedValueOnce(null);

    jest.spyOn(RecipientsService.prototype, 'usersIdentityInfo').mockResolvedValueOnce(null);

    handler = new UnitInactivationSupportStatusCompletedHandler(
      DTOsHelper.getUserRequestContext(scenario.users.allMighty, 'admin'),
      {
        innovationId: innovation.id,
        unitId: unit.id
      },
      MocksHelper.mockContext()
    );

    await handler.run();

    expect(handler.emails).toHaveLength(0);
  });
});
