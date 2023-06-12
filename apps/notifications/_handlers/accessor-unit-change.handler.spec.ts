
describe('Notifications / _handlers / accessor-unit-change suite', () => {
  let testsHelper: TestsHelper;
  let scenario: CompleteScenarioType;
  let innovation: CompleteScenarioType['users']['johnInnovator']['innovations']['johnInnovation'];
  let actionByQA: {
    action: CompleteScenarioType['users']['johnInnovator']['innovations']['johnInnovation']['actions']['actionByAlice'];
    owner: CompleteScenarioType['users']['aliceQualifyingAccessor'];
  };
  let actionByNA: {
    action: CompleteScenarioType['users']['johnInnovator']['innovations']['johnInnovation']['actions']['actionByPaul'];
    owner: CompleteScenarioType['users']['paulNeedsAssessor'];
  };

  beforeAll(async () => {
    testsHelper = await new TestsHelper().init();
    scenario = testsHelper.getCompleteScenario();

    innovation = scenario.users.johnInnovator.innovations.johnInnovation;
    actionByQA = { action: innovation.actions.actionByAlice, owner: scenario.users.aliceQualifyingAccessor };
    actionByNA = { action: innovation.actions.actionByPaul, owner: scenario.users.paulNeedsAssessor };
  });

  beforeEach(() => {
    // mock innovation info
    jest.spyOn(RecipientsService.prototype, 'innovationInfo').mockResolvedValueOnce({
      name: innovation.name,
      ownerId: scenario.users.johnInnovator.id,
      ownerIdentityId: scenario.users.johnInnovator.identityId
    });
    // mock innovation owner info
    jest
      .spyOn(RecipientsService.prototype, 'getUsersRecipient')
      .mockResolvedValueOnce(DTOsHelper.getRecipientUser(scenario.users.johnInnovator, 'innovatorRole'));
  });

  // afterEach(() => {
  //   jest.restoreAllMocks();
  // });

  describe.each([
    [
      ServiceRoleEnum.ACCESSOR as const,
      InnovationActionStatusEnum.SUBMITTED,
      {
        toActionOwner: EmailTypeEnum.ACTION_SUBMITTED_TO_ACCESSOR_OR_ASSESSMENT,
        toInnovator: EmailTypeEnum.ACTION_SUBMITTED_CONFIRMATION
      }
    ],
    [
      ServiceRoleEnum.ACCESSOR as const,
      InnovationActionStatusEnum.DECLINED,
      {
        toActionOwner: EmailTypeEnum.ACTION_DECLINED_TO_ACCESSOR_OR_ASSESSMENT,
        toInnovator: EmailTypeEnum.ACTION_DECLINED_CONFIRMATION
      }
    ],
    [
      ServiceRoleEnum.ASSESSMENT as const,
      InnovationActionStatusEnum.SUBMITTED,
      {
        toActionOwner: EmailTypeEnum.ACTION_SUBMITTED_TO_ACCESSOR_OR_ASSESSMENT,
        toInnovator: EmailTypeEnum.ACTION_SUBMITTED_CONFIRMATION
      }
    ],
    [
      ServiceRoleEnum.ASSESSMENT as const,
      InnovationActionStatusEnum.DECLINED,
      {
        toActionOwner: EmailTypeEnum.ACTION_DECLINED_TO_ACCESSOR_OR_ASSESSMENT,
        toInnovator: EmailTypeEnum.ACTION_DECLINED_CONFIRMATION
      }
    ]
  ])(
    'Innovation owner updates action of %s to status %s',
    (
      actionOwnerRoleType: ServiceRoleEnum.ACCESSOR | ServiceRoleEnum.ASSESSMENT,
      actionStatus: InnovationActionStatusEnum,
      emailTemplates: { toActionOwner: EmailTypeEnum; toInnovator: EmailTypeEnum }
    ) => {
      let requestUser: DomainContextType;
      let handler: ActionUpdateHandler;

      let action: typeof actionByQA | typeof actionByNA;
      let actionOwnerRoleId: string;
      let actionOwnerUnitName: string;
      let basePath: string;

      let declinedReason: string | undefined;

      beforeEach(async () => {
        // mock request user info
        jest
          .spyOn(RecipientsService.prototype, 'getUsersRecipient')
          .mockResolvedValueOnce(DTOsHelper.getRecipientUser(scenario.users.johnInnovator, 'innovatorRole'));

        if (actionOwnerRoleType === ServiceRoleEnum.ACCESSOR) {
          action = actionByQA;
          actionOwnerRoleId = actionByQA.owner.roles.qaRole.id;
          actionOwnerUnitName = actionByQA.owner.organisations.healthOrg.organisationUnits.healthOrgUnit.name;
          basePath = 'accessor';
        } else {
          action = actionByNA;
          actionOwnerRoleId = actionByNA.owner.roles.assessmentRole.id;
          actionOwnerUnitName = 'needs assessment';
          basePath = 'assessment';
        }

        // mock action info
        jest.spyOn(RecipientsService.prototype, 'actionInfoWithOwner').mockResolvedValueOnce({
          id: action.action.id,
          displayId: action.action.displayId,
          status: actionStatus,
          owner: DTOsHelper.getRecipientUser(action.owner),
          ...(actionOwnerRoleType === ServiceRoleEnum.ACCESSOR && {
            organisationUnit: {
              id: actionByQA.owner.organisations.healthOrg.organisationUnits.healthOrgUnit.id,
              name: actionByQA.owner.organisations.healthOrg.organisationUnits.healthOrgUnit.name,
              acronym: actionByQA.owner.organisations.healthOrg.organisationUnits.healthOrgUnit.acronym
            }
          })
        });

        requestUser = DTOsHelper.getUserRequestContext(scenario.users.johnInnovator, 'innovatorRole');

        declinedReason = actionStatus === InnovationActionStatusEnum.DECLINED ? randText({ charCount: 20 }) : undefined;

        handler = new ActionUpdateHandler(
          requestUser,
          {
            innovationId: innovation.id,
            action: { ...action.action, status: actionStatus },
            ...(declinedReason && { comment: declinedReason })
          },
          MocksHelper.mockContext()
        );

        await handler.run();
      });

      it('Should send email to action owner', () => {
        const expectedEmail = handler.emails.find(email => email.templateId === emailTemplates.toActionOwner);

        expect(expectedEmail).toMatchObject({
          templateId: emailTemplates.toActionOwner,
          notificationPreferenceType: 'ACTION',
          to: DTOsHelper.getRecipientUser(action.owner),
          params: {
            innovator_name: scenario.users.johnInnovator.name,
            innovation_name: innovation.name,
            ...(declinedReason && {
              declined_action_reason: declinedReason
            }),
            action_url: new UrlModel(ENV.webBaseTransactionalUrl)
              .addPath(':basePath/innovations/:innovationId/action-tracker/:actionId')
              .setPathParams({
                basePath,
                innovationId: innovation.id,
                actionId: action.action.id
              })
              .buildUrl()
          }
        });
      });

      it('Should send confirmation email to innovator', () => {
        const expectedEmail = handler.emails.find(email => email.templateId === emailTemplates.toInnovator);

        expect(expectedEmail).toMatchObject({
          templateId: emailTemplates.toInnovator,
          notificationPreferenceType: 'ACTION',
          to: DTOsHelper.getRecipientUser(scenario.users.johnInnovator, 'innovatorRole'),
          params: {
            accessor_name: action.owner.name,
            unit_name: actionOwnerUnitName,
            action_url: new UrlModel(ENV.webBaseTransactionalUrl)
              .addPath('innovator/innovations/:innovationId/action-tracker/:actionId')
              .setPathParams({
                innovationId: innovation.id,
                actionId: action.action.id
              })
              .buildUrl()
          }
        });
      });

      it('Should send inApp to action owner', () => {
        const expectedInApp = handler.inApp.find(inApp => inApp.userRoleIds.includes(actionOwnerRoleId));

        expect(expectedInApp).toMatchObject({
          innovationId: innovation.id,
          context: {
            type: NotificationContextTypeEnum.ACTION,
            detail: NotificationContextDetailEnum.ACTION_UPDATE,
            id: action.action.id
          },
          userRoleIds: [actionOwnerRoleId],
          params: {
            actionCode: action.action.displayId,
            actionStatus: actionStatus,
            section: action.action.section
          }
        });
      });

      it('Should send confirmation inApp to innovator', () => {
        const expectedInApp = handler.inApp.find(inApp => inApp.userRoleIds.includes(requestUser.currentRole.id));

        expect(expectedInApp).toMatchObject({
          innovationId: innovation.id,
          context: {
            type: NotificationContextTypeEnum.ACTION,
            detail: NotificationContextDetailEnum.ACTION_UPDATE,
            id: action.action.id
          },
          userRoleIds: [requestUser.currentRole.id],
          params: {
            actionCode: action.action.displayId,
            actionStatus: actionStatus,
            section: action.action.section
          }
        });
      });
    }
  );

  describe.each([
    [ServiceRoleEnum.ACCESSOR as const, InnovationActionStatusEnum.SUBMITTED],
    [ServiceRoleEnum.ACCESSOR as const, InnovationActionStatusEnum.DECLINED],
    [ServiceRoleEnum.ASSESSMENT as const, InnovationActionStatusEnum.SUBMITTED],
    [ServiceRoleEnum.ASSESSMENT as const, InnovationActionStatusEnum.DECLINED]
  ])(
    'Innovation collaborator updates action of %s to status %s',
    (
      actionOwnerRoleType: ServiceRoleEnum.ACCESSOR | ServiceRoleEnum.ASSESSMENT,
      actionStatus: InnovationActionStatusEnum
    ) => {
      let handler: ActionUpdateHandler;

      let action: typeof actionByQA | typeof actionByNA;
      let actionOwnerUnitName: string;

      let declinedReason: string | undefined;

      beforeEach(async () => {
        // mock request user info
        jest
          .spyOn(RecipientsService.prototype, 'getUsersRecipient')
          .mockResolvedValueOnce(DTOsHelper.getRecipientUser(scenario.users.janeInnovator, 'innovatorRole'));

        if (actionOwnerRoleType === ServiceRoleEnum.ACCESSOR) {
          action = actionByQA;
          actionOwnerUnitName = actionByQA.owner.organisations.healthOrg.organisationUnits.healthOrgUnit.name;
        } else {
          action = actionByNA;
          actionOwnerUnitName = 'needs assessment';
        }

        // mock action info
        jest.spyOn(RecipientsService.prototype, 'actionInfoWithOwner').mockResolvedValueOnce({
          id: action.action.id,
          displayId: action.action.displayId,
          status: actionStatus,
          owner: DTOsHelper.getRecipientUser(action.owner),
          ...(actionOwnerRoleType === ServiceRoleEnum.ACCESSOR && {
            organisationUnit: {
              id: actionByQA.owner.organisations.healthOrg.organisationUnits.healthOrgUnit.id,
              name: actionByQA.owner.organisations.healthOrg.organisationUnits.healthOrgUnit.name,
              acronym: actionByQA.owner.organisations.healthOrg.organisationUnits.healthOrgUnit.acronym
            }
          })
        });

        MocksHelper.mockIdentityServiceGetUserInfo(action.owner);

        MocksHelper.mockIdentityServiceGetUserInfo(scenario.users.janeInnovator);
        jest
          .spyOn(RecipientsService.prototype, 'usersIdentityInfo')
          .mockResolvedValueOnce(DTOsHelper.getIdentityUserInfo(action.owner));

        declinedReason = actionStatus === InnovationActionStatusEnum.DECLINED ? randText({ charCount: 20 }) : undefined;

        const requestUser = DTOsHelper.getUserRequestContext(scenario.users.janeInnovator, 'innovatorRole');

        handler = new ActionUpdateHandler(
          requestUser,
          {
            innovationId: innovation.id,
            action: { ...action.action, status: actionStatus },
            ...(declinedReason && { comment: declinedReason })
          },
          MocksHelper.mockContext()
        );

        await handler.run();
      });

      it('Should send email to innovation owner', () => {
        const emailTemplate = EmailTypeEnum.ACTION_RESPONDED_BY_COLLABORATOR_TO_OWNER;
        const expectedEmail = handler.emails.find(email => email.templateId === emailTemplate);

        expect(expectedEmail).toMatchObject({
          templateId: emailTemplate,
          notificationPreferenceType: 'ACTION',
          to: DTOsHelper.getRecipientUser(scenario.users.johnInnovator, 'innovatorRole'),
          params: {
            collaborator_name: scenario.users.janeInnovator.name,
            accessor_name: action.owner.name,
            unit_name: actionOwnerUnitName,
            action_url: new UrlModel(ENV.webBaseTransactionalUrl)
              .addPath('innovator/innovations/:innovationId/action-tracker/:actionId')
              .setPathParams({
                innovationId: innovation.id,
                actionId: action.action.id
              })
              .buildUrl()
          }
        });
      });

      it('Should send confirmation inApp to innovation owner', () => {
        const expectedInApp = handler.inApp.find(inApp =>
          inApp.userRoleIds.includes(scenario.users.johnInnovator.roles.innovatorRole.id)
        );

        expect(expectedInApp).toMatchObject({
          innovationId: innovation.id,
          context: {
            type: NotificationContextTypeEnum.ACTION,
            detail: NotificationContextDetailEnum.ACTION_UPDATE,
            id: action.action.id
          },
          userRoleIds: [scenario.users.johnInnovator.roles.innovatorRole.id],
          params: {
            actionCode: action.action.displayId,
            actionStatus: actionStatus,
            section: action.action.section
          }
        });
      });
    }
  );

  describe.each([
    [
      ServiceRoleEnum.ACCESSOR as const,
      InnovationActionStatusEnum.COMPLETED,
      EmailTypeEnum.ACTION_COMPLETED_TO_INNOVATOR
    ],
    [
      ServiceRoleEnum.ACCESSOR as const,
      InnovationActionStatusEnum.CANCELLED,
      EmailTypeEnum.ACTION_CANCELLED_TO_INNOVATOR
    ],
    [
      ServiceRoleEnum.ACCESSOR as const,
      InnovationActionStatusEnum.REQUESTED,
      EmailTypeEnum.ACTION_REQUESTED_TO_INNOVATOR
    ],
    [
      ServiceRoleEnum.ASSESSMENT as const,
      InnovationActionStatusEnum.COMPLETED,
      EmailTypeEnum.ACTION_COMPLETED_TO_INNOVATOR
    ],
    [
      ServiceRoleEnum.ASSESSMENT as const,
      InnovationActionStatusEnum.CANCELLED,
      EmailTypeEnum.ACTION_CANCELLED_TO_INNOVATOR
    ],
    [
      ServiceRoleEnum.ASSESSMENT as const,
      InnovationActionStatusEnum.REQUESTED,
      EmailTypeEnum.ACTION_REQUESTED_TO_INNOVATOR
    ]
  ])(
    '%s updates action to status %s',
    (
      requestUserRoleType: ServiceRoleEnum.ACCESSOR | ServiceRoleEnum.ASSESSMENT,
      actionStatus: InnovationActionStatusEnum,
      emailTemplate: EmailTypeEnum
    ) => {
      let requestTestUser:
        | CompleteScenarioType['users']['aliceQualifyingAccessor']
        | CompleteScenarioType['users']['paulNeedsAssessor'];
      let handler: ActionUpdateHandler;

      let action: typeof actionByQA | typeof actionByNA;
      let requestUserUnitName: string;

      beforeEach(async () => {
        if (requestUserRoleType === ServiceRoleEnum.ACCESSOR) {
          requestTestUser = scenario.users.aliceQualifyingAccessor;
          action = actionByQA;
          requestUserUnitName = actionByQA.owner.organisations.healthOrg.organisationUnits.healthOrgUnit.name;
        } else {
          requestTestUser = scenario.users.paulNeedsAssessor;
          action = actionByNA;
          requestUserUnitName = 'needs assessment';
        }

        MocksHelper.mockIdentityServiceGetUserInfo(requestTestUser);

        // mock action info
        jest.spyOn(RecipientsService.prototype, 'actionInfoWithOwner').mockResolvedValueOnce({
          id: action.action.id,
          displayId: action.action.displayId,
          status: actionStatus,
          owner: DTOsHelper.getRecipientUser(action.owner),
          ...(requestUserRoleType === ServiceRoleEnum.ACCESSOR && {
            organisationUnit: {
              id: actionByQA.owner.organisations.healthOrg.organisationUnits.healthOrgUnit.id,
              name: actionByQA.owner.organisations.healthOrg.organisationUnits.healthOrgUnit.name,
              acronym: actionByQA.owner.organisations.healthOrg.organisationUnits.healthOrgUnit.acronym
            }
          })
        });

        const requestUser = DTOsHelper.getUserRequestContext(requestTestUser);

        handler = new ActionUpdateHandler(
          requestUser,
          {
            innovationId: innovation.id,
            action: { ...action.action, status: actionStatus }
          },
          MocksHelper.mockContext()
        );

        await handler.run();
      });
      it('Should send email to innovation owner', () => {
        const expectedEmail = handler.emails.find(email => email.templateId === emailTemplate);

        expect(expectedEmail).toMatchObject({
          templateId: emailTemplate,
          notificationPreferenceType: 'ACTION',
          to: DTOsHelper.getRecipientUser(scenario.users.johnInnovator, 'innovatorRole'),
          params: {
            accessor_name: action.owner.name,
            unit_name: requestUserUnitName,
            action_url: new UrlModel(ENV.webBaseTransactionalUrl)
              .addPath('innovator/innovations/:innovationId/action-tracker/:actionId')
              .setPathParams({
                innovationId: innovation.id,
                actionId: action.action.id
              })
              .buildUrl()
          }
        });
      });

      it('Should send inApp to innovation owner', () => {
        const expectedInApp = handler.inApp.find(inApp =>
          inApp.userRoleIds.includes(scenario.users.johnInnovator.roles.innovatorRole.id)
        );

        expect(expectedInApp).toMatchObject({
          innovationId: innovation.id,
          context: {
            type: NotificationContextTypeEnum.ACTION,
            detail: NotificationContextDetailEnum.ACTION_UPDATE,
            id: action.action.id
          },
          userRoleIds: [scenario.users.johnInnovator.roles.innovatorRole.id],
          params: {
            actionCode: action.action.displayId,
            actionStatus: actionStatus,
            section: action.action.section
          }
        });
      });
    }
  );

  describe('Updated action has been previously submitted by a collaborator', () => {
    it('Should send inApp to the collaborator', async () => {
      const requestTestUser = scenario.users.aliceQualifyingAccessor;
      const action = innovation.actions.actionByAlice;
      const actionStatus = InnovationActionStatusEnum.COMPLETED;

      MocksHelper.mockIdentityServiceGetUserInfo(requestTestUser);

      // mock action info
      jest.spyOn(RecipientsService.prototype, 'actionInfoWithOwner').mockResolvedValueOnce({
        id: action.id,
        displayId: action.displayId,
        status: actionStatus,
        owner: DTOsHelper.getRecipientUser(requestTestUser),
        organisationUnit: {
          id: actionByQA.owner.organisations.healthOrg.organisationUnits.healthOrgUnit.id,
          name: actionByQA.owner.organisations.healthOrg.organisationUnits.healthOrgUnit.name,
          acronym: actionByQA.owner.organisations.healthOrg.organisationUnits.healthOrgUnit.acronym
        }
      });

      const requestUser = DTOsHelper.getUserRequestContext(requestTestUser);

      const handler = new ActionUpdateHandler(
        requestUser,
        {
          innovationId: innovation.id,
          action: {
            ...action,
            status: actionStatus,
            previouslyUpdatedByUserRole: scenario.users.janeInnovator.roles.innovatorRole
          }
        },
        MocksHelper.mockContext()
      );

      await handler.run();

      const expectedInApp = handler.inApp.find(inApp =>
        inApp.userRoleIds.includes(scenario.users.janeInnovator.roles.innovatorRole.id)
      );

      expect(expectedInApp).toMatchObject({
        innovationId: innovation.id,
        context: {
          type: NotificationContextTypeEnum.ACTION,
          detail: NotificationContextDetailEnum.ACTION_UPDATE,
          id: action.id
        },
        userRoleIds: [scenario.users.janeInnovator.roles.innovatorRole.id],
        params: {
          actionCode: action.displayId,
          actionStatus: actionStatus,
          section: action.section
        }
      });
    });
  });

  describe('Action updated by invalid user type', () => {
    it('Should not send any email/inApp', async () => {
      const handler = new ActionUpdateHandler(
        DTOsHelper.getUserRequestContext(scenario.users.allMighty),
        {
          innovationId: innovation.id,
          action: {
            ...scenario.users.johnInnovator.innovations.johnInnovation.actions.actionByAlice,
            status: InnovationActionStatusEnum.CANCELLED,
          }
        },
        MocksHelper.mockContext()
      );

      await handler.run();

      expect(handler.emails).toHaveLength(0);
      expect(handler.inApp).toHaveLength(0);
    })
  })

  describe('Action updated by innovator to invalid status', () => {
    it('Should not send any email/inApp', async () => {
      const handler = new ActionUpdateHandler(
        DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
        {
          innovationId: innovation.id,
          action: {
            ...scenario.users.johnInnovator.innovations.johnInnovation.actions.actionByAlice,
            status: InnovationActionStatusEnum.CANCELLED,
          }
        },
        MocksHelper.mockContext()
      );

      await handler.run();

      expect(handler.emails).toHaveLength(0);
      expect(handler.inApp).toHaveLength(0);
    })
  })
});
