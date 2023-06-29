/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { randUuid } from '@ngneat/falso';
import { InnovationEntity, UserEntity, UserRoleEntity } from '@notifications/shared/entities';
import {
  InnovationCollaboratorStatusEnum,
  InnovationSupportStatusEnum,
  UserStatusEnum
} from '@notifications/shared/enums';
import { InnovationErrorsEnum, NotFoundError } from '@notifications/shared/errors';
import { DomainInnovationsService } from '@notifications/shared/services';
import { TestsHelper } from '@notifications/shared/tests';
import { InnovationSupportBuilder } from '@notifications/shared/tests/builders/innovation-support.builder';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import type { EntityManager } from 'typeorm';
import { container } from '../_config';
import type { RecipientsService } from './recipients.service';
import { SYMBOLS } from './symbols';

describe('Notifications / _services / recipients service suite', () => {
  let sut: RecipientsService;

  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  let em: EntityManager;

  beforeAll(async () => {
    sut = container.get<RecipientsService>(SYMBOLS.RecipientsService);
    await testsHelper.init();
  });

  beforeEach(async () => {
    em = await testsHelper.getQueryRunnerEntityManager();
  });

  afterEach(async () => {
    await testsHelper.releaseQueryRunnerEntityManager();
  });

  describe('getUsersIdentityInfo suite', () => {
    it('Should get an identity info when passed a valid user identity id', async () => {
      const identityInfo = await sut.usersIdentityInfo(scenario.users.johnInnovator.identityId);

      expect(identityInfo).toMatchObject(DTOsHelper.getIdentityUserInfo(scenario.users.johnInnovator));
    });

    it('Should get multiple identity info when passed an array of user identity ids', async () => {
      const identityInfo = await sut.usersIdentityInfo([
        scenario.users.johnInnovator.identityId,
        scenario.users.adamInnovator.identityId,
        scenario.users.ingridAccessor.identityId
      ]);

      expect(identityInfo.size).toBe(3);
      expect(identityInfo).toMatchObject(
        new Map([
          [scenario.users.johnInnovator.identityId, DTOsHelper.getIdentityUserInfo(scenario.users.johnInnovator)],
          [scenario.users.adamInnovator.identityId, DTOsHelper.getIdentityUserInfo(scenario.users.adamInnovator)],
          [scenario.users.ingridAccessor.identityId, DTOsHelper.getIdentityUserInfo(scenario.users.ingridAccessor)]
        ])
      );
    });

    it('Should return null when passed a non existent user identity id', async () => {
      const identityInfo = await sut.usersIdentityInfo(randUuid());

      expect(identityInfo).toBeNull();
    });

    it('Should return null when no arguments passed', async () => {
      const identityInfo = await sut.usersIdentityInfo();

      expect(identityInfo).toBeNull();
    });

    it('It should return empty array when passed an empty array of user identity ids', async () => {
      const identityInfo = await sut.usersIdentityInfo([]);

      expect(identityInfo.size).toBe(0);
    });

    it('Should filter out non existent user identity ids', async () => {
      const identityInfo = await sut.usersIdentityInfo([
        scenario.users.johnInnovator.identityId,
        randUuid(),
        scenario.users.ingridAccessor.identityId
      ]);

      expect(identityInfo.size).toBe(2);
      expect(identityInfo).toMatchObject(
        new Map([
          [scenario.users.johnInnovator.identityId, DTOsHelper.getIdentityUserInfo(scenario.users.johnInnovator)],
          [scenario.users.ingridAccessor.identityId, DTOsHelper.getIdentityUserInfo(scenario.users.ingridAccessor)]
        ])
      );
    });
  });

  describe('innovationInfo suite', () => {
    it('Should get innovation info', async () => {
      const dbInnovation = scenario.users.johnInnovator.innovations.johnInnovation;

      const innovation = await sut.innovationInfo(dbInnovation.id);

      expect(innovation).toMatchObject({
        name: dbInnovation.name,
        ownerId: scenario.users.johnInnovator.id,
        ownerIdentityId: scenario.users.johnInnovator.identityId
      });
    });

    it('Should fail to get non-existent innovation info', async () => {
      await expect(() => sut.innovationInfo(randUuid())).rejects.toThrowError(
        new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND)
      );
    });

    it('Should throw error if innovation is deleted', async () => {
      const dbInnovation = scenario.users.johnInnovator.innovations.johnInnovation;
      await em.getRepository(InnovationEntity).softRemove({ id: dbInnovation.id });

      await expect(() => sut.innovationInfo(dbInnovation.id, false, em)).rejects.toThrowError(
        new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND)
      );
    });

    it('Should return deleted innovations if withDeleted', async () => {
      const dbInnovation = scenario.users.johnInnovator.innovations.johnInnovation;
      await em.getRepository(InnovationEntity).softRemove({ id: dbInnovation.id });

      const innovation = await sut.innovationInfo(dbInnovation.id, true, em);

      expect(innovation).toMatchObject({
        name: dbInnovation.name,
        ownerId: scenario.users.johnInnovator.id,
        ownerIdentityId: scenario.users.johnInnovator.identityId
      });
    });
  });

  describe('getInnovationCollaborators', () => {
    const expectedCollaborators = [
      {
        email: scenario.users.janeInnovator.email,
        status: InnovationCollaboratorStatusEnum.ACTIVE,
        userId: scenario.users.janeInnovator.id
      },
      {
        email: scenario.users.johnInnovator.innovations.johnInnovation.collaborators.elisaPendingCollaborator.email,
        status: InnovationCollaboratorStatusEnum.PENDING,
        userId: undefined
      },
      {
        email: scenario.users.johnInnovator.innovations.johnInnovation.collaborators.sebastiaoCollaborator.email,
        status: InnovationCollaboratorStatusEnum.LEFT,
        userId: undefined
      },
      {
        email: scenario.users.johnInnovator.innovations.johnInnovation.collaborators.adamCollaborator.email,
        status: InnovationCollaboratorStatusEnum.PENDING,
        userId: scenario.users.adamInnovator.id
      }
    ];

    it('should return a list of innovation collaborators', async () => {
      const collaborators = await sut['getInnovationCollaborators'](
        scenario.users.johnInnovator.innovations.johnInnovation.id
      );

      expect(collaborators).toHaveLength(4);
      expect(collaborators).toMatchObject(expectedCollaborators);
    });

    it('should return an empty list if no collaborators', async () => {
      const collaborators = await sut['getInnovationCollaborators'](
        scenario.users.adamInnovator.innovations.adamInnovation.id
      );

      expect(collaborators).toHaveLength(0);
    });

    it('should filter by status', async () => {
      const collaborators = await sut['getInnovationCollaborators'](
        scenario.users.johnInnovator.innovations.johnInnovation.id,
        [InnovationCollaboratorStatusEnum.ACTIVE]
      );

      expect(collaborators).toHaveLength(1);
      expect(collaborators).toMatchObject([
        {
          email: scenario.users.janeInnovator.email,
          status: InnovationCollaboratorStatusEnum.ACTIVE,
          userId: scenario.users.janeInnovator.id
        }
      ]);
    });

    it('should ignore status if empty array', async () => {
      const collaborators = await sut['getInnovationCollaborators'](
        scenario.users.johnInnovator.innovations.johnInnovation.id,
        []
      );

      expect(collaborators).toHaveLength(4);
      expect(collaborators).toMatchObject(expectedCollaborators);
    });

    it('should support multiple status', async () => {
      const collaborators = await sut['getInnovationCollaborators'](
        scenario.users.johnInnovator.innovations.johnInnovation.id,
        [
          InnovationCollaboratorStatusEnum.ACTIVE,
          InnovationCollaboratorStatusEnum.PENDING,
          InnovationCollaboratorStatusEnum.EXPIRED
        ]
      );

      expect(collaborators).toHaveLength(3);
      expect(collaborators).toMatchObject(
        expectedCollaborators.filter(c => c.status !== InnovationCollaboratorStatusEnum.LEFT)
      );
    });

    it('should not return user id if user deleted', async () => {
      await em.getRepository(UserEntity).softRemove({ id: scenario.users.janeInnovator.id });
      const collaborators = await sut['getInnovationCollaborators'](
        scenario.users.johnInnovator.innovations.johnInnovation.id,
        [InnovationCollaboratorStatusEnum.ACTIVE],
        em
      );

      expect(collaborators).toHaveLength(1);
      expect(collaborators).toMatchObject([
        {
          email: scenario.users.janeInnovator.email,
          status: InnovationCollaboratorStatusEnum.ACTIVE,
          userId: undefined
        }
      ]);
    });
  });

  describe('innovationSharedOrganisationsWithUnits suite', () => {
    it('Should return not found if innovation not found', async () => {
      await expect(() => sut.innovationSharedOrganisationsWithUnits(randUuid())).rejects.toThrowError(
        new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND)
      );
    });

    it('Should return list of organisations and units that the innovation is shared with', async () => {
      const shares = await sut.innovationSharedOrganisationsWithUnits(
        scenario.users.johnInnovator.innovations.johnInnovation.id
      );
      expect(shares).toHaveLength(2);
      expect(shares).toMatchObject([
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
        },
        {
          id: scenario.organisations.medTechOrg.id,
          name: scenario.organisations.medTechOrg.name,
          acronym: scenario.organisations.medTechOrg.acronym,
          organisationUnits: [
            {
              id: scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.id,
              name: scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.name,
              acronym: scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.acronym
            }
          ]
        }
      ]);
    });
  });

  describe('innovationAssignedRecipients suite', () => {
    it('Returns a list of recipients for the innovation', async () => {
      const res = await sut.innovationAssignedRecipients(scenario.users.johnInnovator.innovations.johnInnovation.id);
      expect(res).toHaveLength(3);
      expect(res).toMatchObject([
        DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor, 'qaRole'),
        DTOsHelper.getRecipientUser(scenario.users.jamieMadroxAccessor, 'healthAccessorRole'),
        DTOsHelper.getRecipientUser(scenario.users.samAccessor, 'accessorRole')
      ]);
    });

    it('Returns multiple roles if the same user support in multiple contexts', async () => {
      // Add madrox as an accessor for the innovation in another unit
      const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
      await new InnovationSupportBuilder(em)
        .setStatus(InnovationSupportStatusEnum.ENGAGING)
        .setInnovation(innovation.id)
        .setOrganisationUnit(scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.id)
        .setAccessors([scenario.users.jamieMadroxAccessor])
        .save();

      const res = await sut.innovationAssignedRecipients(
        scenario.users.johnInnovator.innovations.johnInnovation.id,
        em
      );
      expect(res).toHaveLength(4);
      expect(res).toMatchObject([
        DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor, 'qaRole'),
        DTOsHelper.getRecipientUser(scenario.users.jamieMadroxAccessor, 'healthAccessorRole'),
        DTOsHelper.getRecipientUser(scenario.users.jamieMadroxAccessor, 'aiRole'),
        DTOsHelper.getRecipientUser(scenario.users.samAccessor, 'accessorRole')
      ]);
    });

    it('Returns empty array if no recipients found', async () => {
      const res = await sut.innovationAssignedRecipients(
        scenario.users.ottoOctaviusInnovator.innovations.brainComputerInterfaceInnovation.id,
        em
      );
      expect(res).toHaveLength(0);
    });

    it('Checks if user is active', async () => {
      await testsHelper.deactivateUser(scenario.users.samAccessor.id, em);
      const res = await sut.innovationAssignedRecipients(
        scenario.users.johnInnovator.innovations.johnInnovation.id,
        em
      );
      expect(res).toHaveLength(3);
      expect(res).toMatchObject([
        DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor, 'qaRole'),
        DTOsHelper.getRecipientUser(scenario.users.jamieMadroxAccessor, 'healthAccessorRole'),
        { ...DTOsHelper.getRecipientUser(scenario.users.samAccessor, 'accessorRole'), isActive: false }
      ]);
    });

    it('Checks if user role is active', async () => {
      await testsHelper.deactivateUserRole(scenario.users.jamieMadroxAccessor.roles.healthAccessorRole.id, em);
      const res = await sut.innovationAssignedRecipients(
        scenario.users.johnInnovator.innovations.johnInnovation.id,
        em
      );
      expect(res).toHaveLength(3);
      expect(res).toMatchObject([
        DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor, 'qaRole'),
        { ...DTOsHelper.getRecipientUser(scenario.users.jamieMadroxAccessor, 'healthAccessorRole'), isActive: false },
        DTOsHelper.getRecipientUser(scenario.users.samAccessor, 'accessorRole')
      ]);
    });

    it('Filters deleted users', async () => {
      await testsHelper.deleteUser(scenario.users.samAccessor.id, em);
      const res = await sut.innovationAssignedRecipients(
        scenario.users.johnInnovator.innovations.johnInnovation.id,
        em
      );
      expect(res).toHaveLength(2);
      expect(res).toMatchObject([
        DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor, 'qaRole'),
        DTOsHelper.getRecipientUser(scenario.users.jamieMadroxAccessor, 'healthAccessorRole')
      ]);
    });
  });

  describe('userInnovationsWithAssignedRecipients suite', () => {
    it('should list all user innovations with assigned recipients', async () => {
      const res = await sut.userInnovationsWithAssignedRecipients(scenario.users.ottoOctaviusInnovator.id);
      expect(res).toHaveLength(2);
      expect(res).toMatchObject([
        {
          id: scenario.users.ottoOctaviusInnovator.innovations.chestHarnessInnovation.id,
          name: scenario.users.ottoOctaviusInnovator.innovations.chestHarnessInnovation.name,
          assignedUsers: [
            DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor, 'qaRole'),
            DTOsHelper.getRecipientUser(scenario.users.jamieMadroxAccessor, 'healthAccessorRole')
          ]
        },
        {
          id: scenario.users.ottoOctaviusInnovator.innovations.tentaclesInnovation.id,
          name: scenario.users.ottoOctaviusInnovator.innovations.tentaclesInnovation.name,
          assignedUsers: [DTOsHelper.getRecipientUser(scenario.users.jamieMadroxAccessor, 'healthAccessorRole')]
        }
      ]);
    });

    it('should return empty array if no assigned recipients', async () => {
      const res = await sut.userInnovationsWithAssignedRecipients(scenario.users.sebastiaoDeletedInnovator.id);
      expect(res).toHaveLength(0);
    });
  });

  describe('actionInfoWithOwner suite', () => {
    it('Should get action info without organisationUnit for Assessment Team', async () => {
      const dbInnovation = scenario.users.johnInnovator.innovations.johnInnovation;
      const dbAction = dbInnovation.actions.actionByPaul;

      const actionInfo = await sut.actionInfoWithOwner(dbAction.id);

      expect(actionInfo).toMatchObject({
        id: dbAction.id,
        displayId: dbAction.displayId,
        status: dbAction.status,
        owner: DTOsHelper.getRecipientUser(scenario.users.paulNeedsAssessor, 'assessmentRole')
      });
      expect(actionInfo.organisationUnit).toBeUndefined();
    });

    it('Should get action info with organisationUnit for supporting organisation', async () => {
      const dbInnovation = scenario.users.johnInnovator.innovations.johnInnovation;
      const dbAction = dbInnovation.actions.actionByAlice;

      const actionInfo = await sut.actionInfoWithOwner(dbAction.id);

      expect(actionInfo).toMatchObject({
        id: dbAction.id,
        displayId: dbAction.displayId,
        status: dbAction.status,
        owner: DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor, 'qaRole'),
        organisationUnit: {
          id: scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.id,
          name: scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.name,
          acronym:
            scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.acronym
        }
      });
    });

    it('Should fail to get non-existent action info', async () => {
      await expect(() => sut.actionInfoWithOwner(randUuid())).rejects.toThrowError(
        new NotFoundError(InnovationErrorsEnum.INNOVATION_ACTION_NOT_FOUND)
      );
    });
  });

  describe('threadInfo suite', () => {
    const thread = scenario.users.johnInnovator.innovations.johnInnovation.threads.threadByAliceQA;
    it('Returns the thread info including author', async () => {
      const threadInfo = await sut.threadInfo(thread.id);
      expect(threadInfo).toMatchObject({
        id: thread.id,
        subject: thread.subject,
        author: DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor, 'qaRole')
      });
    });

    it('Throws error not found if thread not found', async () => {
      await expect(() => sut.threadInfo(randUuid())).rejects.toThrowError(
        new NotFoundError(InnovationErrorsEnum.INNOVATION_THREAD_NOT_FOUND)
      );
    });

    it('Returns recipient inactive if author is inactive', async () => {
      await em.update(UserEntity, { id: scenario.users.aliceQualifyingAccessor.id }, { status: UserStatusEnum.LOCKED });
      const threadInfo = await sut.threadInfo(thread.id, em);
      expect(threadInfo).toMatchObject({
        id: thread.id,
        subject: thread.subject,
        author: { ...DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor, 'qaRole'), isActive: false }
      });
    });

    it('Returns recipient inactive if author role is inactive', async () => {
      await em.update(
        UserRoleEntity,
        { id: scenario.users.aliceQualifyingAccessor.roles.qaRole.id },
        { isActive: false }
      );
      const threadInfo = await sut.threadInfo(thread.id, em);
      expect(threadInfo).toMatchObject({
        id: thread.id,
        subject: thread.subject,
        author: { ...DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor, 'qaRole'), isActive: false }
      });
    });

    it("Doesn't return author if author is deleted", async () => {
      await em.update(
        UserEntity,
        { id: scenario.users.aliceQualifyingAccessor.id },
        { status: UserStatusEnum.DELETED }
      );
      const threadInfo = await sut.threadInfo(thread.id, em);
      expect(threadInfo).toMatchObject({
        id: thread.id,
        subject: thread.subject
      });
      expect(threadInfo.author).toBeUndefined();
    });
  });

  describe('threadIntervenientRecipients suite', () => {
    const thread = scenario.users.johnInnovator.innovations.johnInnovation.threads.threadByAliceQA;
    // Mock domain innovation service threadIntervenients and default reply
    const mock = jest.spyOn(DomainInnovationsService.prototype, 'threadIntervenients').mockResolvedValue([
      {
        id: scenario.users.johnInnovator.id,
        identityId: scenario.users.johnInnovator.identityId,
        name: scenario.users.johnInnovator.name,
        locked: false,
        isOwner: true,
        userRole: {
          id: scenario.users.johnInnovator.roles.innovatorRole.id,
          role: scenario.users.johnInnovator.roles.innovatorRole.role
        },
        organisationUnit: null
      },
      {
        id: scenario.users.paulNeedsAssessor.id,
        identityId: scenario.users.paulNeedsAssessor.identityId,
        name: scenario.users.paulNeedsAssessor.name,
        locked: false,
        isOwner: true,
        userRole: {
          id: scenario.users.paulNeedsAssessor.roles.assessmentRole.id,
          role: scenario.users.paulNeedsAssessor.roles.assessmentRole.role
        },
        organisationUnit: null
      },
      {
        id: scenario.users.aliceQualifyingAccessor.id,
        identityId: scenario.users.aliceQualifyingAccessor.identityId,
        name: scenario.users.aliceQualifyingAccessor.name,
        locked: false,
        isOwner: true,
        userRole: {
          id: scenario.users.aliceQualifyingAccessor.roles.qaRole.id,
          role: scenario.users.aliceQualifyingAccessor.roles.qaRole.role
        },
        organisationUnit: null
      }
    ]);

    afterEach(() => {
      // clear statistics
      mock.mockReset();
    });

    afterAll(() => {
      mock.mockRestore();
    });

    it('Fetches thread intervenients from domain services and maps to recipients type', async () => {
      const res = await sut.threadIntervenientRecipients(thread.id);

      expect(mock).toHaveBeenCalledTimes(1);
      expect(mock).toHaveBeenCalledWith(thread.id, false);
      expect(res).toMatchObject([
        DTOsHelper.getRecipientUser(scenario.users.johnInnovator, 'innovatorRole'),
        DTOsHelper.getRecipientUser(scenario.users.paulNeedsAssessor, 'assessmentRole'),
        DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor, 'qaRole')
      ]);
    });

    it('Throws an error if thread not found', async () => {
      mock.mockRejectedValueOnce(new NotFoundError(InnovationErrorsEnum.INNOVATION_THREAD_NOT_FOUND));

      await expect(sut.threadIntervenientRecipients(thread.id)).rejects.toThrowError(
        new NotFoundError(InnovationErrorsEnum.INNOVATION_THREAD_NOT_FOUND)
      );
    });
  });

  describe('innovationTransferInfoWithOwner suite', () => {
    it('Returns the innovation transfer with owner and email', async () => {
      const transfer = scenario.users.adamInnovator.innovations.adamInnovation.transfer;
      const res = await sut.innovationTransferInfoWithOwner(transfer.id);
      expect(res).toMatchObject({
        id: transfer.id,
        status: transfer.status,
        email: transfer.email,
        ownerId: scenario.users.adamInnovator.id
      });
    });

    it('Throws an error if transfer not found', async () => {
      await expect(() => sut.innovationTransferInfoWithOwner(randUuid())).rejects.toThrowError(
        new NotFoundError(InnovationErrorsEnum.INNOVATION_TRANSFER_NOT_FOUND)
      );
    });
  });

  describe('innovationCollaborationInfo suite', () => {
    it('Returns the innovation collaboration info for an external collaborator', async () => {
      const collaboration =
        scenario.users.johnInnovator.innovations.johnInnovation.collaborators.elisaPendingCollaborator;
      const res = await sut.innovationCollaborationInfo(collaboration.id);
      expect(res).toMatchObject({
        collaboratorId: collaboration.id,
        status: collaboration.status,
        email: collaboration.email,
        userId: null
      });
    });

    it('Returns the innovation collaboration info for a collaborator', async () => {
      const collaboration = scenario.users.johnInnovator.innovations.johnInnovation.collaborators.janeCollaborator;
      const res = await sut.innovationCollaborationInfo(collaboration.id);
      expect(res).toMatchObject({
        collaboratorId: collaboration.id,
        status: collaboration.status,
        email: collaboration.email,
        userId: scenario.users.janeInnovator.id
      });
    });

    it('Throws an error if collaboration not found', async () => {
      await expect(() => sut.innovationCollaborationInfo(randUuid())).rejects.toThrowError(
        new NotFoundError(InnovationErrorsEnum.INNOVATION_COLLABORATOR_NOT_FOUND)
      );
    });
  });

  describe('getInnovationActiveCollaborators suite', () => {
    it('Should only get active collaborators', async () => {
      const innovation = scenario.users.johnInnovator.innovations.johnInnovation;

      const collaborators = await sut.getInnovationActiveCollaborators(innovation.id);

      expect(collaborators).toHaveLength(1);
      expect(collaborators[0]).toEqual(scenario.users.janeInnovator.id);
    });

    it('Should get an empty array for a non-existent innovation', async () => {
      const collaborators = await sut.getInnovationActiveCollaborators(randUuid());

      expect(collaborators).toHaveLength(0);
    });
  });

  describe('needsAssessmentUsers suite', () => {
    //const needsAssessmentUsers = [scenario.users.paulNeedsAssessor, scenario.users.seanNeedsAssessor];
    it('Should get a list of needs assessment recipients', async () => {
      const res = await sut.needsAssessmentUsers();
      expect(res).toHaveLength(2);
      expect(res).toMatchObject([
        DTOsHelper.getRecipientUser(scenario.users.paulNeedsAssessor, 'assessmentRole'),
        DTOsHelper.getRecipientUser(scenario.users.seanNeedsAssessor, 'assessmentRole')
      ]);
    });

    it('Should ignore locked needs assessment recipients (default)', async () => {
      await em.update(UserEntity, { id: scenario.users.paulNeedsAssessor.id }, { status: UserStatusEnum.LOCKED });
      const res = await sut.needsAssessmentUsers(undefined, em);
      expect(res).toHaveLength(1);
      expect(res).toMatchObject([DTOsHelper.getRecipientUser(scenario.users.seanNeedsAssessor, 'assessmentRole')]);
    });

    it('Should include locked needs assessment recipients if includeLocked', async () => {
      await em.update(UserEntity, { id: scenario.users.paulNeedsAssessor.id }, { status: UserStatusEnum.LOCKED });
      const res = await sut.needsAssessmentUsers(true, em);
      expect(res).toHaveLength(2);
      expect(res).toMatchObject([
        { ...DTOsHelper.getRecipientUser(scenario.users.paulNeedsAssessor, 'assessmentRole'), isActive: false },
        DTOsHelper.getRecipientUser(scenario.users.seanNeedsAssessor, 'assessmentRole')
      ]);
    });
  });

  /*
  describe('getUsersRecipients suite', () => {
    it('Should get a recipient when passed a valid user', async () => {
      const recipient = await sut.getUsersRecipient(
        scenario.users.johnInnovator.id,
        ServiceRoleEnum.INNOVATOR,
        undefined,
        em
      );

      expect(recipient).toMatchObject(DTOsHelper.getRecipientUser(scenario.users.johnInnovator, 'innovatorRole'));
    });

    it('Should get multiple recipients when passed an array of userIds', async () => {
      const recipients = await sut.getUsersRecipient(
        [scenario.users.johnInnovator.id, scenario.users.adamInnovator.id],
        ServiceRoleEnum.INNOVATOR,
        undefined,
        em
      );

      expect(recipients).toHaveLength(2);
      expect(recipients[0]).toMatchObject(DTOsHelper.getRecipientUser(scenario.users.johnInnovator, 'innovatorRole'));
      expect(recipients[1]).toMatchObject(DTOsHelper.getRecipientUser(scenario.users.adamInnovator, 'innovatorRole'));
    });

    it('Should return null when passed a non existent role for a single user', async () => {
      const recipient = await sut.getUsersRecipient(
        scenario.users.johnInnovator.id,
        ServiceRoleEnum.ACCESSOR,
        undefined,
        em
      );

      expect(recipient).toBeNull();
    });

    it('It should return empty array when passed a non existent role for all users', async () => {
      const recipients = await sut.getUsersRecipient(
        [scenario.users.johnInnovator.id, scenario.users.adamInnovator.id],
        ServiceRoleEnum.ACCESSOR,
        undefined,
        em
      );

      expect(recipients).toHaveLength(0);
    });

    it('It should return empty array when passed an empty array of userIds', async () => {
      const recipients = await sut.getUsersRecipient([], ServiceRoleEnum.ACCESSOR, undefined, em);

      expect(recipients).toHaveLength(0);
    });
  });


  

  
  */
});
