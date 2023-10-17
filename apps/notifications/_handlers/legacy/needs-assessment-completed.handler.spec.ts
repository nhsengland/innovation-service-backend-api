import { NotificationContextDetailEnum, NotificationContextTypeEnum } from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import { CompleteScenarioType, MocksHelper, TestsHelper } from '@notifications/shared/tests';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { ENV } from '../../_config';
import { RecipientType, RecipientsService } from '../../_services/recipients.service';
import { NeedsAssessmentCompletedHandler } from './needs-assessment-completed.handler';

describe('Notifications / _handlers / needs-assessment-completed handler suite', () => {
  let testsHelper: TestsHelper;
  let scenario: CompleteScenarioType;

  let innovation: CompleteScenarioType['users']['johnInnovator']['innovations']['johnInnovation'];
  let innovationOwner: CompleteScenarioType['users']['johnInnovator'];

  let accessor: CompleteScenarioType['users']['aliceQualifyingAccessor'];

  let handler: NeedsAssessmentCompletedHandler;

  beforeAll(async () => {
    testsHelper = await new TestsHelper().init();
    scenario = testsHelper.getCompleteScenario();

    innovation = scenario.users.johnInnovator.innovations.johnInnovation;
    innovationOwner = scenario.users.johnInnovator;

    accessor = scenario.users.aliceQualifyingAccessor;
  });

  describe('Innovation owner is active', () => {
    beforeAll(async () => {
      // mock innovation info
      jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValueOnce({
        name: innovation.name,
        ownerId: innovationOwner.id,
        ownerIdentityId: innovationOwner.identityId
      });

      // mock shared orgs
      jest.spyOn(RecipientsService.prototype, 'innovationSharedOrganisationsWithUnits').mockResolvedValueOnce([
        {
          id: scenario.organisations.healthOrg.id,
          name: scenario.organisations.healthOrg.name,
          acronym: scenario.organisations.healthOrg.acronym,
          organisationUnits: [
            {
              id: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id,
              name: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.name,
              acronym: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.acronym
            },
            {
              id: scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.id,
              name: scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.name,
              acronym: scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.acronym
            }
          ]
        }
      ]);

      // mock innovation collaborators
      jest
        .spyOn(RecipientsService.prototype, 'getInnovationActiveCollaborators')
        .mockResolvedValueOnce([scenario.users.janeInnovator.id]);

      // mock qualifying accessors of suggested and shared organisation units
      jest
        .spyOn(RecipientsService.prototype, 'organisationUnitsQualifyingAccessors')
        .mockResolvedValueOnce([DTOsHelper.getRecipientUser(accessor, 'qaRole')]);
      // mock innovation owner and collaborators
      jest
        .spyOn(RecipientsService.prototype, 'getUsersRecipient')
        .mockResolvedValueOnce(DTOsHelper.getRecipientUser(innovationOwner))
        .mockResolvedValueOnce([DTOsHelper.getRecipientUser(scenario.users.janeInnovator, 'innovatorRole')]);

      handler = new NeedsAssessmentCompletedHandler(
        DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
        {
          innovationId: innovation.id,
          assessmentId: innovation.assessment.id,
          organisationUnitIds: [
            scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id,
            scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.id,
            scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.id // suggested and not shared unit
          ]
        },
        MocksHelper.mockContext()
      );

      await handler.run();
    });

    it('Should send email to innovation owner informing of assessment completion', () => {
      const expectedEmail = handler.emails.find(
        email =>
          (email.to as Omit<RecipientType, 'role' | 'userId'>).roleId === innovationOwner.roles.innovatorRole.id &&
          email.templateId === 'NEEDS_ASSESSMENT_COMPLETED_TO_INNOVATOR'
      );

      expect(expectedEmail).toMatchObject({
        templateId: 'NEEDS_ASSESSMENT_COMPLETED_TO_INNOVATOR',
        to: DTOsHelper.getRecipientUser(innovationOwner, 'innovatorRole'),
        notificationPreferenceType: null,
        params: {
          innovation_name: innovation.name,
          needs_assessment_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath('innovator/innovations/:innovationId/assessments/:assessmentId')
            .setPathParams({
              innovationId: innovation.id,
              assessmentId: innovation.assessment.id
            })
            .buildUrl()
        }
      });
    });

    it('Should send email to innovation collaborators informing of assessment completion', () => {
      const expectedEmail = handler.emails.find(
        email =>
          (email.to as Omit<RecipientType, 'role' | 'userId'>).roleId ===
            scenario.users.janeInnovator.roles.innovatorRole.id &&
          email.templateId === 'NEEDS_ASSESSMENT_COMPLETED_TO_INNOVATOR'
      );

      expect(expectedEmail).toMatchObject({
        templateId: 'NEEDS_ASSESSMENT_COMPLETED_TO_INNOVATOR',
        to: DTOsHelper.getRecipientUser(scenario.users.janeInnovator, 'innovatorRole'),
        notificationPreferenceType: null,
        params: {
          innovation_name: innovation.name,
          needs_assessment_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath('innovator/innovations/:innovationId/assessments/:assessmentId')
            .setPathParams({
              innovationId: innovation.id,
              assessmentId: innovation.assessment.id
            })
            .buildUrl()
        }
      });
    });
    it('Should send inApp to innovation owner and collaborators informing of assessment completion', () => {
      const expectedInApp = handler.inApp.find(
        inApp => inApp.context.detail === NotificationContextDetailEnum.NEEDS_ASSESSMENT_COMPLETED_TO_INNOVATOR
      );

      expect(expectedInApp).toMatchObject({
        innovationId: innovation.id,
        context: {
          type: NotificationContextTypeEnum.NEEDS_ASSESSMENT,
          detail: NotificationContextDetailEnum.NEEDS_ASSESSMENT_COMPLETED_TO_INNOVATOR,
          id: innovation.assessment.id
        },
        userRoleIds: [scenario.users.janeInnovator.roles.innovatorRole.id, innovationOwner.roles.innovatorRole.id],
        params: {}
      });
    });

    it('Should send email to QAs of suggested and shared with organisation units', () => {
      const expectedEmails = handler.emails.filter(email => email.templateId === 'ORGANISATION_SUGGESTION_TO_QA');

      expect(expectedEmails).toMatchObject([
        {
          templateId: 'ORGANISATION_SUGGESTION_TO_QA',
          to: DTOsHelper.getRecipientUser(accessor, 'qaRole'),
          notificationPreferenceType: null,
          params: {
            innovation_url: new UrlModel(ENV.webBaseTransactionalUrl)
              .addPath('accessor/innovations/:innovationId')
              .setPathParams({ innovationId: innovation.id })
              .buildUrl()
          }
        }
      ]);
    });
    it('Should send inApp to QAs of suggested and shared with organisation units', () => {
      const expectedInApp = handler.inApp.filter(
        inApp => inApp.context.detail === NotificationContextDetailEnum.NEEDS_ASSESSMENT_COMPLETED
      );

      expect(expectedInApp).toMatchObject([
        {
          innovationId: innovation.id,
          context: {
            type: NotificationContextTypeEnum.NEEDS_ASSESSMENT,
            detail: NotificationContextDetailEnum.NEEDS_ASSESSMENT_COMPLETED,
            id: innovation.assessment.id
          },
          userRoleIds: [accessor.roles.qaRole.id],
          params: {}
        }
      ]);
    });

    it('Should send email to innovation owner about suggested and not shared with organisations', () => {
      const expectedEmail = handler.emails.find(
        email =>
          (email.to as Omit<RecipientType, 'role' | 'userId'>).roleId === innovationOwner.roles.innovatorRole.id &&
          email.templateId === 'NEEDS_ASSESSMENT_SUGGESTED_ORG_NOT_SHARED_TO_INNOVATOR'
      );

      expect(expectedEmail).toMatchObject({
        templateId: 'NEEDS_ASSESSMENT_SUGGESTED_ORG_NOT_SHARED_TO_INNOVATOR',
        to: DTOsHelper.getRecipientUser(innovationOwner, 'innovatorRole'),
        notificationPreferenceType: null,
        params: {
          innovation_name: innovation.name,
          data_sharing_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath('innovator/innovations/:innovationId/support')
            .setPathParams({
              innovationId: innovation.id
            })
            .buildUrl()
        }
      });
    });
    it('Should send email to innovation collaborators about suggested and not shared with organisations', () => {
      const expectedEmail = handler.emails.find(
        email =>
          (email.to as Omit<RecipientType, 'role' | 'userId'>).roleId ===
            scenario.users.janeInnovator.roles.innovatorRole.id &&
          email.templateId === 'NEEDS_ASSESSMENT_SUGGESTED_ORG_NOT_SHARED_TO_INNOVATOR'
      );

      expect(expectedEmail).toMatchObject({
        templateId: 'NEEDS_ASSESSMENT_SUGGESTED_ORG_NOT_SHARED_TO_INNOVATOR',
        to: DTOsHelper.getRecipientUser(scenario.users.janeInnovator, 'innovatorRole'),
        notificationPreferenceType: null,
        params: {
          innovation_name: innovation.name,
          data_sharing_url: new UrlModel(ENV.webBaseTransactionalUrl)
            .addPath('innovator/innovations/:innovationId/support')
            .setPathParams({
              innovationId: innovation.id
            })
            .buildUrl()
        }
      });
    });
    it('Should send inApp to innovation owner and collaborators about suggested and not shared with organisations', () => {
      const expectedInApp = handler.inApp.find(
        inApp => inApp.context.detail === NotificationContextDetailEnum.NEEDS_ASSESSMENT_ORGANISATION_SUGGESTION
      );

      expect(expectedInApp).toMatchObject({
        innovationId: innovation.id,
        context: {
          type: NotificationContextTypeEnum.NEEDS_ASSESSMENT,
          detail: NotificationContextDetailEnum.NEEDS_ASSESSMENT_ORGANISATION_SUGGESTION,
          id: innovation.assessment.id
        },
        userRoleIds: [scenario.users.janeInnovator.roles.innovatorRole.id, innovationOwner.roles.innovatorRole.id],
        params: {}
      });
    });
  });

  describe('Innovation owner is not active', () => {
    beforeAll(async () => {
      // mock innovation info
      jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValueOnce({
        name: innovation.name,
        ownerId: innovationOwner.id,
        ownerIdentityId: innovationOwner.identityId
      });

      // mock shared orgs
      jest.spyOn(RecipientsService.prototype, 'innovationSharedOrganisationsWithUnits').mockResolvedValueOnce([
        {
          id: scenario.organisations.healthOrg.id,
          name: scenario.organisations.healthOrg.name,
          acronym: scenario.organisations.healthOrg.acronym,
          organisationUnits: [
            {
              id: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id,
              name: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.name,
              acronym: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.acronym
            },
            {
              id: scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.id,
              name: scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.name,
              acronym: scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.acronym
            }
          ]
        }
      ]);

      // mock innovation collaborators
      jest
        .spyOn(RecipientsService.prototype, 'getInnovationActiveCollaborators')
        .mockResolvedValueOnce([scenario.users.janeInnovator.id]);

      // mock qualifying accessors of suggested and shared organisation units
      jest
        .spyOn(RecipientsService.prototype, 'organisationUnitsQualifyingAccessors')
        .mockResolvedValueOnce([DTOsHelper.getRecipientUser(accessor, 'qaRole')]);
      // mock innovation owner and collaborators
      jest
        .spyOn(RecipientsService.prototype, 'getUsersRecipient')
        .mockResolvedValueOnce({ ...DTOsHelper.getRecipientUser(innovationOwner), isActive: false })
        .mockResolvedValueOnce([DTOsHelper.getRecipientUser(scenario.users.janeInnovator, 'innovatorRole')]);

      handler = new NeedsAssessmentCompletedHandler(
        DTOsHelper.getUserRequestContext(scenario.users.paulNeedsAssessor),
        {
          innovationId: innovation.id,
          assessmentId: innovation.assessment.id,
          organisationUnitIds: [
            scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id,
            scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.id,
            scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.id // suggested and not shared unit
          ]
        },
        MocksHelper.mockContext()
      );

      await handler.run();
    });

    it('Should not email innovation owner informing of assessment completion', () => {
      const expectedEmail = handler.emails.find(
        email =>
          (email.to as Omit<RecipientType, 'role' | 'userId'>).roleId === innovationOwner.roles.innovatorRole.id &&
          email.templateId === 'NEEDS_ASSESSMENT_COMPLETED_TO_INNOVATOR'
      );

      expect(expectedEmail).toBeUndefined();
    });

    it('Should not email innovation owner about organisations suggested and not shared with', () => {
      const expectedEmail = handler.emails.find(
        email =>
          (email.to as Omit<RecipientType, 'role' | 'userId'>).roleId === innovationOwner.roles.innovatorRole.id &&
          email.templateId === 'NEEDS_ASSESSMENT_SUGGESTED_ORG_NOT_SHARED_TO_INNOVATOR'
      );

      expect(expectedEmail).toBeUndefined();
    });
  });
});
