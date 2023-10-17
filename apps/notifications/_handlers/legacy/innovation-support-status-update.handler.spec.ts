import { InnovationSupportStatusUpdateHandler } from './innovation-support-status-update.handler';

import {
  InnovationSupportStatusEnum,
  NotificationContextDetailEnum,
  NotificationContextTypeEnum
} from '@notifications/shared/enums';
// import { RecipientsService } from '../_services/recipients.service';
import { randText } from '@ngneat/falso';
import { NotFoundError, OrganisationErrorsEnum } from '@notifications/shared/errors';
import { UrlModel } from '@notifications/shared/models';
import { CompleteScenarioType, MocksHelper, TestsHelper } from '@notifications/shared/tests';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import { ENV, EmailTypeEnum } from '../../_config';
import type { RecipientType } from '../../_services/recipients.service';
import { RecipientsService } from '../../_services/recipients.service';

describe('Notifications / _handlers / innovation-support-status-update suite', () => {
  let testsHelper: TestsHelper;
  let scenario: CompleteScenarioType;

  beforeAll(async () => {
    testsHelper = await new TestsHelper().init();
    scenario = testsHelper.getCompleteScenario();
  });

  describe('Request user organisation not found', () => {
    it('Should throw a not found error', async () => {
      const handler = new InnovationSupportStatusUpdateHandler(
        DTOsHelper.getUserRequestContext(scenario.users.allMighty), //admin has no org
        {
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
          innovationSupport: {
            id: scenario.users.johnInnovator.innovations.johnInnovation.supports.supportByHealthOrgUnit.id,
            status: InnovationSupportStatusEnum.ENGAGING,
            statusChanged: false,
            message: '',
            organisationUnitId:
              scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.id,
            newAssignedAccessors: [
              { id: scenario.users.aliceQualifyingAccessor.id },
              { id: scenario.users.ingridAccessor.id }
            ]
          }
        },
        MocksHelper.mockContext()
      );

      await expect(() => handler.run()).rejects.toThrowError(
        new NotFoundError(OrganisationErrorsEnum.ORGANISATION_NOT_FOUND)
      );
    });
  });
  describe('Request user organisation unit not found', () => {
    it('Should throw a not found error', async () => {
      const handler = new InnovationSupportStatusUpdateHandler(
        DTOsHelper.getUserRequestContext(scenario.users.johnInnovator, 'innovatorRole'), //innovator has no unit
        {
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
          innovationSupport: {
            id: scenario.users.johnInnovator.innovations.johnInnovation.supports.supportByHealthOrgUnit.id,
            status: InnovationSupportStatusEnum.ENGAGING,
            statusChanged: false,
            message: '',
            organisationUnitId:
              scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.id,
            newAssignedAccessors: [
              { id: scenario.users.aliceQualifyingAccessor.id },
              { id: scenario.users.ingridAccessor.id }
            ]
          }
        },
        MocksHelper.mockContext()
      );
      await expect(() => handler.run()).rejects.toThrowError(
        new NotFoundError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND)
      );
    });
  });

  describe('Innovation status has not changed', () => {
    describe('Status is ENGAGING', () => {
      let innovation: CompleteScenarioType['users']['johnInnovator']['innovations']['johnInnovation'];
      let support: CompleteScenarioType['users']['johnInnovator']['innovations']['johnInnovation']['supports']['supportByHealthOrgUnit'];
      let handler: InnovationSupportStatusUpdateHandler;

      beforeAll(async () => {
        innovation = scenario.users.johnInnovator.innovations.johnInnovation;
        support = innovation.supports.supportByHealthOrgUnit;

        jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValueOnce({
          name: innovation.name,
          ownerId: scenario.users.johnInnovator.id,
          ownerIdentityId: scenario.users.johnInnovator.identityId
        });

        //innovation owner
        jest
          .spyOn(RecipientsService.prototype, 'getUsersRecipient')
          .mockResolvedValueOnce([DTOsHelper.getRecipientUser(scenario.users.johnInnovator, 'innovatorRole')]);

        //collaborators
        jest.spyOn(RecipientsService.prototype, 'getInnovationActiveCollaborators').mockResolvedValueOnce([]);
        jest.spyOn(RecipientsService.prototype, 'getUsersRecipient').mockResolvedValueOnce([]);

        handler = new InnovationSupportStatusUpdateHandler(
          DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
          {
            innovationId: innovation.id,
            innovationSupport: {
              id: support.id,
              status: InnovationSupportStatusEnum.ENGAGING,
              statusChanged: false,
              message: '',
              organisationUnitId:
                scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.id,
              newAssignedAccessors: [
                { id: scenario.users.aliceQualifyingAccessor.id },
                { id: scenario.users.ingridAccessor.id }
              ]
            }
          },
          MocksHelper.mockContext()
        );
        await handler.run();
      });

      it('Should email new accessors', () => {
        const expectedEmail = handler.emails.find(
          email =>
            (email.to as Omit<RecipientType, 'role' | 'userId'>).roleId ===
            scenario.users.ingridAccessor.roles.accessorRole.id
        );
        expect(expectedEmail).toMatchObject({
          templateId: EmailTypeEnum.INNOVATION_SUPPORT_STATUS_UPDATE_TO_ASSIGNED_ACCESSORS,
          notificationPreferenceType: 'SUPPORT',
          to: DTOsHelper.getRecipientUser(scenario.users.ingridAccessor, 'accessorRole'),
          params: {
            qa_name: scenario.users.aliceQualifyingAccessor.name,
            innovation_url: new UrlModel(ENV.webBaseTransactionalUrl)
              .addPath('accessor/innovations/:innovationId')
              .setPathParams({ innovationId: innovation.id })
              .buildUrl()
          }
        });
      });
      it('Should send inApp to new accessors', () => {
        const expectedInApp = handler.inApp.find(inApp =>
          inApp.userRoleIds.includes(scenario.users.ingridAccessor.roles.accessorRole.id)
        );

        expect(expectedInApp).toMatchObject({
          innovationId: innovation.id,
          context: {
            type: NotificationContextTypeEnum.SUPPORT,
            detail: NotificationContextDetailEnum.SUPPORT_STATUS_UPDATE,
            id: support.id
          },
          userRoleIds: [scenario.users.ingridAccessor.roles.accessorRole.id],
          params: {
            organisationUnitName:
              scenario.users.ingridAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.name,
            supportStatus: support.status
          }
        });
      });

      it('Should filter request user out of new accessor emails', () => {
        const expectedEmail = handler.emails.find(
          email =>
            (email.to as Omit<RecipientType, 'role' | 'userId'>).roleId ===
            scenario.users.aliceQualifyingAccessor.roles.qaRole.id
        );

        expect(expectedEmail).toBeUndefined();
      });

      it('Should filter request user out of new accessor inApps', () => {
        const expectedInApp = handler.inApp.find(inApp =>
          inApp.userRoleIds.includes(scenario.users.aliceQualifyingAccessor.roles.qaRole.id)
        );

        expect(expectedInApp).toBeUndefined();
      });
    });

    describe('Status is not ENGAGING', () => {
      it('Should not send any email / inApp if support status is not ENGAGING', async () => {
        const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
        const support = innovation.supports.supportByHealthOrgUnit;
        const handler = new InnovationSupportStatusUpdateHandler(
          DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
          {
            innovationId: innovation.id,
            innovationSupport: {
              id: support.id,
              status: InnovationSupportStatusEnum.CLOSED,
              statusChanged: false,
              message: '',
              organisationUnitId:
                scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.id
            }
          },
          MocksHelper.mockContext()
        );
        await handler.run();

        expect(handler.emails).toHaveLength(0);
        expect(handler.inApp).toHaveLength(0);
      });
    });
  });

  describe.each([
    [InnovationSupportStatusEnum.CLOSED, 'closed'],
    [InnovationSupportStatusEnum.UNSUITABLE, 'unsuitable'],
    [InnovationSupportStatusEnum.UNASSIGNED, 'unassigned'],
    [InnovationSupportStatusEnum.ENGAGING, 'engaging']
  ])(
    'Innovation support status updated to %s',
    (supportStatus: InnovationSupportStatusEnum, statusEmailText: string) => {
      let innovation: CompleteScenarioType['users']['johnInnovator']['innovations']['johnInnovation'];
      let support: CompleteScenarioType['users']['johnInnovator']['innovations']['johnInnovation']['supports']['supportByHealthOrgUnit'];
      let handler: InnovationSupportStatusUpdateHandler;
      const message = randText({ charCount: 20 });

      beforeAll(async () => {
        innovation = scenario.users.johnInnovator.innovations.johnInnovation;
        support = innovation.supports.supportByHealthOrgUnit;

        jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValueOnce({
          name: innovation.name,
          ownerId: scenario.users.johnInnovator.id,
          ownerIdentityId: scenario.users.johnInnovator.identityId
        });

        //innovation owner
        jest
          .spyOn(RecipientsService.prototype, 'getUsersRecipient')
          .mockResolvedValueOnce(DTOsHelper.getRecipientUser(scenario.users.johnInnovator, 'innovatorRole'));

        //collaborators
        jest
          .spyOn(RecipientsService.prototype, 'getInnovationActiveCollaborators')
          .mockResolvedValueOnce([scenario.users.janeInnovator.id]);
        jest
          .spyOn(RecipientsService.prototype, 'getUsersRecipient')
          .mockResolvedValueOnce([DTOsHelper.getRecipientUser(scenario.users.janeInnovator, 'innovatorRole')]);

        handler = new InnovationSupportStatusUpdateHandler(
          DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
          {
            innovationId: innovation.id,
            innovationSupport: {
              id: support.id,
              status: supportStatus,
              statusChanged: true,
              message: message,
              organisationUnitId:
                scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.id
            }
          },
          MocksHelper.mockContext()
        );
        await handler.run();
      });

      it('Should send an email to innovation owner', () => {
        const expectedEmail = handler.emails.find(
          email =>
            (email.to as Omit<RecipientType, 'role' | 'userId'>).roleId ===
            scenario.users.johnInnovator.roles.innovatorRole.id
        );
        expect(expectedEmail).toEqual({
          templateId: EmailTypeEnum.INNOVATION_SUPPORT_STATUS_UPDATE_TO_INNOVATOR,
          notificationPreferenceType: 'SUPPORT',
          to: DTOsHelper.getRecipientUser(scenario.users.johnInnovator, 'innovatorRole'),
          params: {
            innovation_name: innovation.name,
            organisation_name: scenario.users.aliceQualifyingAccessor.organisations.healthOrg.name,
            support_status: statusEmailText,
            support_status_change_comment: message,
            support_url: new UrlModel(ENV.webBaseTransactionalUrl)
              .addPath('innovator/innovations/:innovationId/support')
              .setPathParams({ innovationId: innovation.id })
              .buildUrl()
          }
        });
      });
      it('Should send an email to the innovation collaborators', () => {
        const expectedEmail = handler.emails.find(
          email =>
            (email.to as Omit<RecipientType, 'role' | 'userId'>).roleId ===
            scenario.users.janeInnovator.roles.innovatorRole.id
        );
        expect(expectedEmail).toEqual({
          templateId: EmailTypeEnum.INNOVATION_SUPPORT_STATUS_UPDATE_TO_INNOVATOR,
          notificationPreferenceType: 'SUPPORT',
          to: DTOsHelper.getRecipientUser(scenario.users.janeInnovator, 'innovatorRole'),
          params: {
            innovation_name: innovation.name,
            organisation_name: scenario.users.aliceQualifyingAccessor.organisations.healthOrg.name,
            support_status: statusEmailText,
            support_status_change_comment: message,
            support_url: new UrlModel(ENV.webBaseTransactionalUrl)
              .addPath('innovator/innovations/:innovationId/support')
              .setPathParams({ innovationId: innovation.id })
              .buildUrl()
          }
        });
      });

      it('Should send inApp to innovation owner', () => {
        const expectedInApp = handler.inApp.find(inApp =>
          inApp.userRoleIds.includes(scenario.users.johnInnovator.roles.innovatorRole.id)
        );

        expect(expectedInApp).toBeDefined();
        expect(expectedInApp?.context).toMatchObject({
          type: NotificationContextTypeEnum.SUPPORT,
          detail: NotificationContextDetailEnum.SUPPORT_STATUS_UPDATE,
          id: support.id
        });
        expect(expectedInApp?.innovationId).toBe(innovation.id);
        expect(expectedInApp?.params).toMatchObject({
          organisationUnitName:
            scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.name,
          supportStatus: supportStatus
        });
      });

      it('Should send inApp to the innovation collaborators', () => {
        const expectedInApp = handler.inApp.find(inApp =>
          inApp.userRoleIds.includes(scenario.users.janeInnovator.roles.innovatorRole.id)
        );

        expect(expectedInApp).toBeDefined();
        expect(expectedInApp?.context).toMatchObject({
          type: NotificationContextTypeEnum.SUPPORT,
          detail: NotificationContextDetailEnum.SUPPORT_STATUS_UPDATE,
          id: support.id
        });
        expect(expectedInApp?.innovationId).toBe(innovation.id);
        expect(expectedInApp?.params).toMatchObject({
          organisationUnitName:
            scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.name,
          supportStatus: supportStatus
        });
      });
    }
  );

  describe.each([[InnovationSupportStatusEnum.WAITING, 'waiting']])(
    'Innovation support status updated to %s',
    (supportStatus: InnovationSupportStatusEnum, statusEmailText: string) => {
      let innovation: CompleteScenarioType['users']['johnInnovator']['innovations']['johnInnovation'];
      let support: CompleteScenarioType['users']['johnInnovator']['innovations']['johnInnovation']['supports']['supportByHealthOrgUnit'];
      let handler: InnovationSupportStatusUpdateHandler;
      const message = randText({ charCount: 20 });

      beforeAll(async () => {
        innovation = scenario.users.johnInnovator.innovations.johnInnovation;
        support = innovation.supports.supportByHealthOrgUnit;

        jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValueOnce({
          name: innovation.name,
          ownerId: scenario.users.johnInnovator.id,
          ownerIdentityId: scenario.users.johnInnovator.identityId
        });

        //innovation owner
        jest
          .spyOn(RecipientsService.prototype, 'getUsersRecipient')
          .mockResolvedValueOnce(DTOsHelper.getRecipientUser(scenario.users.johnInnovator, 'innovatorRole'));

        //collaborators
        jest
          .spyOn(RecipientsService.prototype, 'getInnovationActiveCollaborators')
          .mockResolvedValueOnce([scenario.users.janeInnovator.id]);
        jest
          .spyOn(RecipientsService.prototype, 'getUsersRecipient')
          .mockResolvedValueOnce([DTOsHelper.getRecipientUser(scenario.users.janeInnovator, 'innovatorRole')]);

        //needs assessors
        jest
          .spyOn(RecipientsService.prototype, 'needsAssessmentUsers')
          .mockResolvedValueOnce([DTOsHelper.getRecipientUser(scenario.users.paulNeedsAssessor, 'assessmentRole')]);

        handler = new InnovationSupportStatusUpdateHandler(
          DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
          {
            innovationId: innovation.id,
            innovationSupport: {
              id: support.id,
              status: supportStatus,
              statusChanged: true,
              message: message,
              organisationUnitId:
                scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.id
            }
          },
          MocksHelper.mockContext()
        );
        await handler.run();
      });

      it('Should send an email to innovation owner', () => {
        const expectedEmail = handler.emails.find(
          email =>
            (email.to as Omit<RecipientType, 'role' | 'userId'>).roleId ===
            scenario.users.johnInnovator.roles.innovatorRole.id
        );
        expect(expectedEmail).toEqual({
          templateId: EmailTypeEnum.INNOVATION_SUPPORT_STATUS_UPDATE_TO_INNOVATOR,
          notificationPreferenceType: 'SUPPORT',
          to: DTOsHelper.getRecipientUser(scenario.users.johnInnovator, 'innovatorRole'),
          params: {
            innovation_name: innovation.name,
            organisation_name: scenario.users.aliceQualifyingAccessor.organisations.healthOrg.name,
            support_status: statusEmailText,
            support_status_change_comment: message,
            support_url: new UrlModel(ENV.webBaseTransactionalUrl)
              .addPath('innovator/innovations/:innovationId/support')
              .setPathParams({ innovationId: innovation.id })
              .buildUrl()
          }
        });
      });
      it('Should send an email to the innovation collaborators', () => {
        const expectedEmail = handler.emails.find(
          email =>
            (email.to as Omit<RecipientType, 'role' | 'userId'>).roleId ===
            scenario.users.janeInnovator.roles.innovatorRole.id
        );
        expect(expectedEmail).toEqual({
          templateId: EmailTypeEnum.INNOVATION_SUPPORT_STATUS_UPDATE_TO_INNOVATOR,
          notificationPreferenceType: 'SUPPORT',
          to: DTOsHelper.getRecipientUser(scenario.users.janeInnovator, 'innovatorRole'),
          params: {
            innovation_name: innovation.name,
            organisation_name: scenario.users.aliceQualifyingAccessor.organisations.healthOrg.name,
            support_status: statusEmailText,
            support_status_change_comment: message,
            support_url: new UrlModel(ENV.webBaseTransactionalUrl)
              .addPath('innovator/innovations/:innovationId/support')
              .setPathParams({ innovationId: innovation.id })
              .buildUrl()
          }
        });
      });

      it('Should send inApp to innovation owner', () => {
        const expectedInApp = handler.inApp.find(inApp =>
          inApp.userRoleIds.includes(scenario.users.johnInnovator.roles.innovatorRole.id)
        );

        expect(expectedInApp).toBeDefined();
        expect(expectedInApp?.context).toMatchObject({
          type: NotificationContextTypeEnum.SUPPORT,
          detail: NotificationContextDetailEnum.SUPPORT_STATUS_UPDATE,
          id: support.id
        });
        expect(expectedInApp?.innovationId).toBe(innovation.id);
        expect(expectedInApp?.params).toMatchObject({
          organisationUnitName:
            scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.name,
          supportStatus: supportStatus
        });
      });

      it('Should send inApp to the innovation collaborators', () => {
        const expectedInApp = handler.inApp.find(inApp =>
          inApp.userRoleIds.includes(scenario.users.janeInnovator.roles.innovatorRole.id)
        );

        expect(expectedInApp).toBeDefined();
        expect(expectedInApp?.context).toMatchObject({
          type: NotificationContextTypeEnum.SUPPORT,
          detail: NotificationContextDetailEnum.SUPPORT_STATUS_UPDATE,
          id: support.id
        });
        expect(expectedInApp?.innovationId).toBe(innovation.id);
        expect(expectedInApp?.params).toMatchObject({
          organisationUnitName:
            scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.name,
          supportStatus: supportStatus
        });
      });

      it('Should send inApp to assessment users', () => {
        const expectedInApp = handler.inApp.find(inApp =>
          inApp.userRoleIds.includes(scenario.users.paulNeedsAssessor.roles.assessmentRole.id)
        );

        expect(expectedInApp).toMatchObject({
          innovationId: innovation.id,
          context: {
            type: NotificationContextTypeEnum.SUPPORT,
            detail: NotificationContextDetailEnum.SUPPORT_STATUS_UPDATE,
            id: support.id
          },
          userRoleIds: [scenario.users.paulNeedsAssessor.roles.assessmentRole.id],
          params: {
            organisationUnitName:
              scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.name,
            supportStatus: supportStatus
          }
        });
      });
    }
  );
});
