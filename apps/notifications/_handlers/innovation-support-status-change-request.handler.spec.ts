import { randText } from '@ngneat/falso';
import { InnovationSupportStatusEnum } from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import { CompleteScenarioType, MocksHelper, TestsHelper } from '@notifications/shared/tests';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import type { InnovatorDomainContextType } from '@notifications/shared/types';
import { ENV, EmailTypeEnum } from '../_config';
import { RecipientsService } from '../_services/recipients.service';
import { InnovationSupportStatusChangeRequestHandler } from './innovation-support-status-change-request.handler';

describe('Notifications / _handlers / innovation-support-status-change-request handler suite', () => {
  let testsHelper: TestsHelper;
  let scenario: CompleteScenarioType;

  let innovation: CompleteScenarioType['users']['johnInnovator']['innovations']['johnInnovation'];
  let innovationOwner: CompleteScenarioType['users']['johnInnovator'];

  let requestComment: string;

  let handler: InnovationSupportStatusChangeRequestHandler;

  beforeAll(async () => {
    testsHelper = await new TestsHelper().init();
    scenario = testsHelper.getCompleteScenario();

    innovation = scenario.users.johnInnovator.innovations.johnInnovation;
    innovationOwner = scenario.users.johnInnovator;

    requestComment = randText({ charCount: 10 });
  });

  beforeEach(() => {
    jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValueOnce({
      name: innovation.name,
      ownerId: innovationOwner.id,
      ownerIdentityId: innovationOwner.identityId
    });
  });

  it('Should send email to all QAs of unit', async () => {
    jest
      .spyOn(RecipientsService.prototype, 'organisationUnitsQualifyingAccessors')
      .mockResolvedValueOnce([DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor)]);

    handler = new InnovationSupportStatusChangeRequestHandler(
      DTOsHelper.getUserRequestContext(scenario.users.ingridAccessor, 'accessorRole'),
      {
        innovationId: innovation.id,
        supportId: innovation.supports.supportByHealthOrgUnit.id,
        proposedStatus: InnovationSupportStatusEnum.CLOSED,
        requestStatusUpdateComment: requestComment
      },
      MocksHelper.mockContext()
    );

    await handler.run();

    expect(handler.emails).toMatchObject([
      {
        templateId: EmailTypeEnum.ACCESSOR_TO_QA_SUPPORT_CHANGE_REQUEST,
        to: DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor, 'qaRole'),
        notificationPreferenceType: null,
        params: {
          innovation_name: innovation.name,
          accessor_name: scenario.users.ingridAccessor.name,
          proposed_status: 'closed',
          request_status_update_comment: requestComment,
          innovation_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath('accessor/innovations/:innovationId/support/:supportId')
            .setPathParams({
              innovationId: innovation.id,
              supportId: innovation.supports.supportByHealthOrgUnit.id
            })
            .buildUrl()
        }
      }
    ]);
  });

  it('Should correct accessor name in email to all QAs when accessor info is not found', async () => {
    jest.spyOn(RecipientsService.prototype, 'usersIdentityInfo').mockResolvedValueOnce(null);

    jest
      .spyOn(RecipientsService.prototype, 'organisationUnitsQualifyingAccessors')
      .mockResolvedValueOnce([DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor)]);

    handler = new InnovationSupportStatusChangeRequestHandler(
      DTOsHelper.getUserRequestContext(scenario.users.ingridAccessor, 'accessorRole'),
      {
        innovationId: innovation.id,
        supportId: innovation.supports.supportByHealthOrgUnit.id,
        proposedStatus: InnovationSupportStatusEnum.CLOSED,
        requestStatusUpdateComment: requestComment
      },
      MocksHelper.mockContext()
    );

    await handler.run();

    expect(handler.emails).toMatchObject([
      {
        templateId: EmailTypeEnum.ACCESSOR_TO_QA_SUPPORT_CHANGE_REQUEST,
        to: DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor, 'qaRole'),
        notificationPreferenceType: null,
        params: {
          innovation_name: innovation.name,
          accessor_name: 'user',
          proposed_status: 'closed',
          request_status_update_comment: requestComment,
          innovation_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath('accessor/innovations/:innovationId/support/:supportId')
            .setPathParams({
              innovationId: innovation.id,
              supportId: innovation.supports.supportByHealthOrgUnit.id
            })
            .buildUrl()
        }
      }
    ]);
  });

  it('Should not send any email if QA is found', async () => {
    jest.spyOn(RecipientsService.prototype, 'organisationUnitsQualifyingAccessors').mockResolvedValueOnce([]);

    handler = new InnovationSupportStatusChangeRequestHandler(
      {
        ...DTOsHelper.getUserRequestContext(scenario.users.ingridAccessor, 'accessorRole'),
        organisation: {
          id: scenario.organisations.healthOrg.id,
          name: scenario.organisations.healthOrg.name,
          acronym: scenario.organisations.healthOrg.acronym
        }
      } as InnovatorDomainContextType,
      {
        innovationId: innovation.id,
        supportId: innovation.supports.supportByHealthOrgUnit.id,
        proposedStatus: InnovationSupportStatusEnum.CLOSED,
        requestStatusUpdateComment: requestComment
      },
      MocksHelper.mockContext()
    );

    await handler.run();

    expect(handler.emails).toHaveLength(0);
  });
});
