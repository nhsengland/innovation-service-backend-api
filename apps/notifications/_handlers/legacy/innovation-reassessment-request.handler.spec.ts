import { NotificationContextDetailEnum, NotificationContextTypeEnum } from '@notifications/shared/enums';
import { UrlModel } from '@notifications/shared/models';
import { CompleteScenarioType, MocksHelper, TestsHelper } from '@notifications/shared/tests';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { ENV } from '../../_config';
import { RecipientsService } from '../../_services/recipients.service';
import { InnovationReassessmentRequestHandler } from './innovation-reassessment-request.handler';

describe('Notifications / _handlers / innovation-reassessment-request handler suite', () => {
  let testsHelper: TestsHelper;
  let scenario: CompleteScenarioType;

  let handler: InnovationReassessmentRequestHandler;

  let innovation: CompleteScenarioType['users']['johnInnovator']['innovations']['johnInnovation'];
  let innovationOwner: CompleteScenarioType['users']['johnInnovator'];

  beforeAll(async () => {
    testsHelper = await new TestsHelper().init();
    scenario = testsHelper.getCompleteScenario();

    innovation = scenario.users.johnInnovator.innovations.johnInnovation;
    innovationOwner = scenario.users.johnInnovator;
  });

  describe('Innovation submitted by innovation owner', () => {
    beforeAll(async () => {
      // mock innovation info
      jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValueOnce({
        id: innovation.id,
        name: innovation.name,
        ownerId: innovationOwner.id,
        ownerIdentityId: innovationOwner.identityId
      });

      // mock innovation active collaborators
      jest
        .spyOn(RecipientsService.prototype, 'getInnovationActiveCollaborators')
        .mockResolvedValueOnce([scenario.users.janeInnovator.id]);

      // mock needs assessment users
      jest
        .spyOn(RecipientsService.prototype, 'needsAssessmentUsers')
        .mockResolvedValueOnce([DTOsHelper.getRecipientUser(scenario.users.paulNeedsAssessor)]);

      handler = new InnovationReassessmentRequestHandler(
        DTOsHelper.getUserRequestContext(innovationOwner, 'innovatorRole'),
        {
          innovationId: innovation.id
        },
        MocksHelper.mockContext()
      );

      await handler.run();
    });

    it('Should send confirmation email to innovation owner', () => {
      const expectedEmail = handler.emails.find(
        email => email.templateId === 'INNOVATION_REASSESSMENT_REQUEST_TO_INNOVATOR'
      );

      expect(expectedEmail).toMatchObject({
        templateId: 'INNOVATION_REASSESSMENT_REQUEST_TO_INNOVATOR',
        to: DTOsHelper.getRecipientUser(innovationOwner, 'innovatorRole'),
        notificationPreferenceType: null,
        params: {
          innovation_name: innovation.name
        }
      });
    });

    it('Should send confirmation inApp to innovation owner', () => {
      const expectedInApp = handler.inApp.find(inApp =>
        inApp.userRoleIds.includes(innovationOwner.roles.innovatorRole.id)
      );

      expect(expectedInApp).toMatchObject({
        innovationId: innovation.id,
        context: {
          type: NotificationContextTypeEnum.INNOVATION,
          detail: NotificationContextDetailEnum.INNOVATION_SUBMISSION_REASSESSMENT,
          id: innovation.id
        },
        userRoleIds: [innovationOwner.roles.innovatorRole.id],
        params: {}
      });
    });

    it('Should send email to all collaborators', () => {
      const expectedEmails = handler.emails.filter(
        email => email.templateId === 'INNOVATION_SUBMITTED_TO_ALL_INNOVATORS'
      );

      expect(expectedEmails).toMatchObject([
        {
          templateId: 'INNOVATION_SUBMITTED_TO_ALL_INNOVATORS',
          to: DTOsHelper.getRecipientUser(scenario.users.janeInnovator, 'innovatorRole'),
          notificationPreferenceType: null,
          params: {
            innovation_name: innovation.name
          }
        }
      ]);
    });

    it('Should send inApp to all collaborators', () => {
      const expectedInApp = handler.inApp.find(inApp =>
        inApp.userRoleIds.includes(scenario.users.janeInnovator.roles.innovatorRole.id)
      );

      expect(expectedInApp).toMatchObject({
        innovationId: innovation.id,
        context: {
          type: NotificationContextTypeEnum.INNOVATION,
          detail: NotificationContextDetailEnum.INNOVATION_SUBMISSION_REASSESSMENT,
          id: innovation.id
        },
        userRoleIds: [scenario.users.janeInnovator.roles.innovatorRole.id],
        params: {}
      });
    });

    it('Should send email to assessment users', () => {
      const expectedEmails = handler.emails.filter(
        email => email.templateId === 'INNOVATION_REASSESSMENT_REQUEST_TO_NEEDS_ASSESSMENT'
      );

      expect(expectedEmails).toMatchObject([
        {
          templateId: 'INNOVATION_REASSESSMENT_REQUEST_TO_NEEDS_ASSESSMENT',
          to: DTOsHelper.getRecipientUser(scenario.users.paulNeedsAssessor, 'assessmentRole'),
          notificationPreferenceType: null,
          params: {
            innovation_name: innovation.name,
            innovation_url: new UrlModel(ENV.webBaseTransactionalUrl)
              .addPath('assessment/innovations/:innovationId')
              .setPathParams({
                innovationId: innovation.id
              })
              .buildUrl()
          }
        }
      ]);
    });

    it('Should send inApp to assessment users', () => {
      const expectedInApp = handler.inApp.find(inApp =>
        inApp.userRoleIds.includes(scenario.users.paulNeedsAssessor.roles.assessmentRole.id)
      );

      expect(expectedInApp).toMatchObject({
        innovationId: innovation.id,
        context: {
          type: NotificationContextTypeEnum.INNOVATION,
          detail: NotificationContextDetailEnum.INNOVATION_REASSESSMENT_REQUEST,
          id: innovation.id
        },
        userRoleIds: [scenario.users.paulNeedsAssessor.roles.assessmentRole.id],
        params: {}
      });
    });
  });

  describe('Innovation submitted by innovation collaborator', () => {
    beforeAll(async () => {
      // mock innovation info
      jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValueOnce({
        id: innovation.id,
        name: innovation.name,
        ownerId: innovationOwner.id,
        ownerIdentityId: innovationOwner.identityId
      });

      // mock innovation active collaborators
      jest
        .spyOn(RecipientsService.prototype, 'getInnovationActiveCollaborators')
        .mockResolvedValueOnce([scenario.users.janeInnovator.id]);

      // mock needs assessment users
      jest
        .spyOn(RecipientsService.prototype, 'needsAssessmentUsers')
        .mockResolvedValueOnce([DTOsHelper.getRecipientUser(scenario.users.paulNeedsAssessor)]);

      handler = new InnovationReassessmentRequestHandler(
        DTOsHelper.getUserRequestContext(scenario.users.adamInnovator, 'innovatorRole'),
        {
          innovationId: innovation.id
        },
        MocksHelper.mockContext()
      );

      await handler.run();
    });

    it('Should send confirmation email to innovation collaborator', () => {
      const expectedEmail = handler.emails.find(
        email => email.templateId === 'INNOVATION_REASSESSMENT_REQUEST_TO_INNOVATOR'
      );

      expect(expectedEmail).toMatchObject({
        templateId: 'INNOVATION_REASSESSMENT_REQUEST_TO_INNOVATOR',
        to: DTOsHelper.getRecipientUser(scenario.users.adamInnovator, 'innovatorRole'),
        notificationPreferenceType: null,
        params: {
          innovation_name: innovation.name
        }
      });
    });

    it('Should send confirmation inApp to innovation collaborator', () => {
      const expectedInApp = handler.inApp.find(inApp =>
        inApp.userRoleIds.includes(scenario.users.adamInnovator.roles.innovatorRole.id)
      );

      expect(expectedInApp).toMatchObject({
        innovationId: innovation.id,
        context: {
          type: NotificationContextTypeEnum.INNOVATION,
          detail: NotificationContextDetailEnum.INNOVATION_SUBMISSION_REASSESSMENT,
          id: innovation.id
        },
        userRoleIds: [scenario.users.adamInnovator.roles.innovatorRole.id],
        params: {}
      });
    });

    it('Should send email to innovation owner and all other collaborators', () => {
      const expectedEmails = handler.emails.filter(
        email => email.templateId === 'INNOVATION_SUBMITTED_TO_ALL_INNOVATORS'
      );

      expect(expectedEmails).toMatchObject([
        {
          templateId: 'INNOVATION_SUBMITTED_TO_ALL_INNOVATORS',
          to: DTOsHelper.getRecipientUser(innovationOwner, 'innovatorRole'),
          notificationPreferenceType: null,
          params: {
            innovation_name: innovation.name
          }
        },
        {
          templateId: 'INNOVATION_SUBMITTED_TO_ALL_INNOVATORS',
          to: DTOsHelper.getRecipientUser(scenario.users.janeInnovator, 'innovatorRole'),
          notificationPreferenceType: null,
          params: {
            innovation_name: innovation.name
          }
        }
      ]);
    });

    it('Should send inApp to innovation owner and all other collaborators', () => {
      const expectedInApp = handler.inApp.find(inApp =>
        inApp.userRoleIds.includes(scenario.users.janeInnovator.roles.innovatorRole.id)
      );

      expect(expectedInApp).toMatchObject({
        innovationId: innovation.id,
        context: {
          type: NotificationContextTypeEnum.INNOVATION,
          detail: NotificationContextDetailEnum.INNOVATION_SUBMISSION_REASSESSMENT,
          id: innovation.id
        },
        userRoleIds: [innovationOwner.roles.innovatorRole.id, scenario.users.janeInnovator.roles.innovatorRole.id],
        params: {}
      });
    });

    it('Should send email to assessment users', () => {
      const expectedEmails = handler.emails.filter(
        email => email.templateId === 'INNOVATION_REASSESSMENT_REQUEST_TO_NEEDS_ASSESSMENT'
      );

      expect(expectedEmails).toMatchObject([
        {
          templateId: 'INNOVATION_REASSESSMENT_REQUEST_TO_NEEDS_ASSESSMENT',
          to: DTOsHelper.getRecipientUser(scenario.users.paulNeedsAssessor, 'assessmentRole'),
          notificationPreferenceType: null,
          params: {
            innovation_name: innovation.name,
            innovation_url: new UrlModel(ENV.webBaseTransactionalUrl)
              .addPath('assessment/innovations/:innovationId')
              .setPathParams({ innovationId: innovation.id })
              .buildUrl()
          }
        }
      ]);
    });

    it('Should send inApp to assessment users', () => {
      const expectedInApp = handler.inApp.find(inApp =>
        inApp.userRoleIds.includes(scenario.users.paulNeedsAssessor.roles.assessmentRole.id)
      );

      expect(expectedInApp).toMatchObject({
        innovationId: innovation.id,
        context: {
          type: NotificationContextTypeEnum.INNOVATION,
          detail: NotificationContextDetailEnum.INNOVATION_REASSESSMENT_REQUEST,
          id: innovation.id
        },
        userRoleIds: [scenario.users.paulNeedsAssessor.roles.assessmentRole.id],
        params: {}
      });
    });
  });

  describe('Request user info is not found', () => {
    beforeAll(async () => {
      // mock innovation info
      jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValueOnce({
        id: innovation.id,
        name: innovation.name,
        ownerId: innovationOwner.id,
        ownerIdentityId: innovationOwner.identityId
      });

      // mock innovation active collaborators
      jest
        .spyOn(RecipientsService.prototype, 'getInnovationActiveCollaborators')
        .mockResolvedValueOnce([scenario.users.janeInnovator.id]);

      // mock needs assessment users
      jest
        .spyOn(RecipientsService.prototype, 'needsAssessmentUsers')
        .mockResolvedValueOnce([DTOsHelper.getRecipientUser(scenario.users.paulNeedsAssessor)]);

      // mock innovator recipients and request user recipient
      jest
        .spyOn(RecipientsService.prototype, 'getUsersRecipient')
        .mockResolvedValueOnce([DTOsHelper.getRecipientUser(scenario.users.janeInnovator, 'innovatorRole')])
        .mockResolvedValueOnce(null);

      handler = new InnovationReassessmentRequestHandler(
        DTOsHelper.getUserRequestContext(innovationOwner, 'innovatorRole'),
        {
          innovationId: innovation.id
        },
        MocksHelper.mockContext()
      );

      await handler.run();
    });

    it('Should not send confirmation email', () => {
      const expectedEmail = handler.emails.find(
        email => email.templateId === 'INNOVATION_SUBMITED_CONFIRMATION_TO_INNOVATOR'
      );

      expect(expectedEmail).toBeUndefined();
    });

    it('Should not send confirmation inApp', () => {
      const expectedInApp = handler.inApp.find(inApp =>
        inApp.userRoleIds.includes(scenario.users.adamInnovator.roles.innovatorRole.id)
      );

      expect(expectedInApp).toBeUndefined();
    });
  });

  describe('Request user is not innovator', () => {
    beforeAll(async () => {
      // mock innovation info
      jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValueOnce({
        id: innovation.id,
        name: innovation.name,
        ownerId: innovationOwner.id,
        ownerIdentityId: innovationOwner.identityId
      });

      // mock innovation active collaborators
      jest
        .spyOn(RecipientsService.prototype, 'getInnovationActiveCollaborators')
        .mockResolvedValueOnce([scenario.users.janeInnovator.id]);

      // mock needs assessment users
      jest
        .spyOn(RecipientsService.prototype, 'needsAssessmentUsers')
        .mockResolvedValueOnce([DTOsHelper.getRecipientUser(scenario.users.paulNeedsAssessor)]);

      handler = new InnovationReassessmentRequestHandler(
        DTOsHelper.getUserRequestContext(scenario.users.allMighty, 'admin'),
        {
          innovationId: innovation.id
        },
        MocksHelper.mockContext()
      );

      await handler.run();
    });

    it('Should not send any email', () => {
      expect(handler.emails).toHaveLength(0);
    });

    it('Should not send any inApp', () => {
      expect(handler.inApp).toHaveLength(0);
    });
  });
});
