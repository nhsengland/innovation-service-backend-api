import { randUuid } from '@ngneat/falso';
import { WEEK_IN_DAYS } from '@notifications/shared/constants';
import {
  ActivityLogEntity,
  InnovationEntity,
  InnovationSupportEntity,
  InnovationSupportLogEntity,
  NotificationPreferenceEntity,
  OrganisationUnitEntity,
  UserEntity,
  UserRoleEntity
} from '@notifications/shared/entities';
import {
  ActivityEnum,
  ActivityTypeEnum,
  InnovationCollaboratorStatusEnum,
  InnovationStatusEnum,
  InnovationSupportStatusEnum,
  NotificationPreferenceEnum,
  ServiceRoleEnum,
  UserStatusEnum
} from '@notifications/shared/enums';
import {
  GenericErrorsEnum,
  InnovationErrorsEnum,
  NotFoundError,
  OrganisationErrorsEnum,
  UnprocessableEntityError
} from '@notifications/shared/errors';
import { DomainInnovationsService } from '@notifications/shared/services';
import { TestsHelper } from '@notifications/shared/tests';
import { InnovationSupportBuilder } from '@notifications/shared/tests/builders/innovation-support.builder';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import type { Role2PreferencesType } from '@notifications/shared/types';
import { In, type EntityManager } from 'typeorm';
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
    jest.clearAllMocks();
  });

  describe('getUsersIdentityInfo', () => {
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

  describe('innovationInfo', () => {
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
      await expect(() => sut.innovationInfo(randUuid())).rejects.toThrow(
        new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND)
      );
    });

    it('Should throw error if innovation is deleted', async () => {
      const dbInnovation = scenario.users.johnInnovator.innovations.johnInnovation;
      await em.getRepository(InnovationEntity).softRemove({ id: dbInnovation.id });

      await expect(() => sut.innovationInfo(dbInnovation.id, false, em)).rejects.toThrow(
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

  describe('innovationInfo', () => {
    const innovations = [
      scenario.users.johnInnovator.innovations.johnInnovation,
      scenario.users.adamInnovator.innovations.adamInnovation
    ];

    it('Should get innovations info', async () => {
      const innovationsMap = await sut.getInnovationsInfo(innovations.map(i => i.id));
      expect(innovationsMap).toMatchObject(new Map(innovations.map(i => [i.id, { name: i.name, ownerId: i.ownerId }])));
    });

    it('Should return deleted innovations if withDeleted', async () => {
      const dbInnovation = scenario.users.johnInnovator.innovations.johnInnovation;
      await em.getRepository(InnovationEntity).softRemove({ id: dbInnovation.id });

      const innovationsMap = await sut.getInnovationsInfo(
        innovations.map(i => i.id),
        true,
        em
      );

      expect(innovationsMap).toMatchObject(new Map(innovations.map(i => [i.id, { name: i.name, ownerId: i.ownerId }])));
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

  describe('getUserCollaborations', () => {
    it('should return the collaborations of a user', async () => {
      const collaborators = await sut.getUserCollaborations(scenario.users.janeInnovator.email);
      expect(collaborators).toMatchObject([
        {
          collaborationId: scenario.users.johnInnovator.innovations.johnInnovation.collaborators.janeCollaborator.id,
          status: scenario.users.johnInnovator.innovations.johnInnovation.collaborators.janeCollaborator.status,
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id,
          innovationName: scenario.users.johnInnovator.innovations.johnInnovation.name
        },
        {
          collaborationId:
            scenario.users.johnInnovator.innovations.johnInnovationArchived.collaborators.janeCollaborator.id,
          status: scenario.users.johnInnovator.innovations.johnInnovationArchived.collaborators.janeCollaborator.status,
          innovationId: scenario.users.johnInnovator.innovations.johnInnovationArchived.id,
          innovationName: scenario.users.johnInnovator.innovations.johnInnovationArchived.name
        }
      ]);
    });
  });

  describe('innovationSharedOrganisationsWithUnits', () => {
    it('Should return not found if innovation not found', async () => {
      await expect(() => sut.innovationSharedOrganisationsWithUnits(randUuid())).rejects.toThrow(
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

  describe('innovationAssignedRecipients', () => {
    it('Returns a list of recipients for the innovation', async () => {
      const res = await sut.innovationAssignedRecipients(
        scenario.users.johnInnovator.innovations.johnInnovation.id,
        {},
        em
      );
      expect(res).toHaveLength(3);
      expect(res).toMatchObject([
        DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor, 'qaRole'),
        DTOsHelper.getRecipientUser(scenario.users.jamieMadroxAccessor, 'healthAccessorRole'),
        DTOsHelper.getRecipientUser(scenario.users.samAccessor, 'accessorRole')
      ]);
    });

    it('Returns multiple roles if the same user support in multiple contexts', async () => {
      // Add madrox as an accessor for adam innovation in another unit
      await new InnovationSupportBuilder(em)
        .setStatus(InnovationSupportStatusEnum.ENGAGING)
        .setInnovation(scenario.users.adamInnovator.innovations.adamInnovation.id)
        .setOrganisationUnit(scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.id)
        .setAccessors([scenario.users.jamieMadroxAccessor])
        .save();

      const res = await sut.innovationAssignedRecipients(
        scenario.users.adamInnovator.innovations.adamInnovation.id,
        {},
        em
      );
      expect(res).toHaveLength(3);
      expect(res).toMatchObject([
        DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor),
        DTOsHelper.getRecipientUser(scenario.users.jamieMadroxAccessor, 'healthAccessorRole'),
        DTOsHelper.getRecipientUser(scenario.users.jamieMadroxAccessor, 'aiRole')
      ]);
    });

    it('Returns empty array if no recipients found', async () => {
      const res = await sut.innovationAssignedRecipients(
        scenario.users.ottoOctaviusInnovator.innovations.brainComputerInterfaceInnovation.id,
        {},
        em
      );
      expect(res).toHaveLength(0);
    });

    it('Checks if user is active', async () => {
      await testsHelper.deactivateUser(scenario.users.samAccessor.id, em);
      const res = await sut.innovationAssignedRecipients(
        scenario.users.johnInnovator.innovations.johnInnovation.id,
        {},
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
        {},
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
        {},
        em
      );
      expect(res).toHaveLength(2);
      expect(res).toMatchObject([
        DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor, 'qaRole'),
        DTOsHelper.getRecipientUser(scenario.users.jamieMadroxAccessor, 'healthAccessorRole')
      ]);
    });

    it('Returns a list of recipients for the innovation filtered by unitId', async () => {
      const res = await sut.innovationAssignedRecipients(
        scenario.users.johnInnovator.innovations.johnInnovation.id,
        { unitId: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id },
        em
      );
      expect(res).toHaveLength(2);
      expect(res).toMatchObject([
        DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor, 'qaRole'),
        DTOsHelper.getRecipientUser(scenario.users.jamieMadroxAccessor, 'healthAccessorRole')
      ]);
    });
  });

  describe('userInnovationsWithAssignedRecipients', () => {
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

  describe('taskInfoWithOwner', () => {
    it('Should get task info for Assessment Team', async () => {
      const dbInnovation = scenario.users.johnInnovator.innovations.johnInnovation;
      const dbTask = dbInnovation.tasks.taskByPaul;

      const taskInfo = await sut.taskInfoWithOwner(dbTask.id);

      expect(taskInfo).toMatchObject({
        id: dbTask.id,
        displayId: dbTask.displayId,
        status: dbTask.status,
        owner: DTOsHelper.getRecipientUser(scenario.users.paulNeedsAssessor, 'assessmentRole')
      });
    });

    it('Should get task info for supporting organisation', async () => {
      const dbInnovation = scenario.users.johnInnovator.innovations.johnInnovation;
      const dbTask = dbInnovation.tasks.taskByAlice;

      const taskInfo = await sut.taskInfoWithOwner(dbTask.id);

      expect(taskInfo).toMatchObject({
        id: dbTask.id,
        displayId: dbTask.displayId,
        status: dbTask.status,
        owner: DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor, 'qaRole')
      });
    });

    it('Should fail to get non-existent task info', async () => {
      await expect(() => sut.taskInfoWithOwner(randUuid())).rejects.toThrow(
        new NotFoundError(InnovationErrorsEnum.INNOVATION_TASK_NOT_FOUND)
      );
    });
  });

  describe('threadInfo', () => {
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
      await expect(() => sut.threadInfo(randUuid())).rejects.toThrow(
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

  describe('threadFollowerRecipients', () => {
    const thread = scenario.users.johnInnovator.innovations.johnInnovation.threads.threadByAliceQA;
    // Mock domain innovation service threadFollowers and default reply
    const mock = jest.spyOn(DomainInnovationsService.prototype, 'threadFollowers').mockResolvedValue([
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
        organisationUnit: {
          id: scenario.users.aliceQualifyingAccessor.roles.qaRole.organisationUnit!.id,
          name: scenario.users.aliceQualifyingAccessor.roles.qaRole.organisationUnit!.name,
          acronym: scenario.users.aliceQualifyingAccessor.roles.qaRole.organisationUnit!.acronym
        }
      }
    ]);

    afterAll(() => {
      mock.mockRestore();
    });

    it('Fetches thread intervenients from domain services and maps to recipients type', async () => {
      const res = await sut.threadFollowerRecipients(thread.id);

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

      await expect(sut.threadFollowerRecipients(thread.id)).rejects.toThrow(
        new NotFoundError(InnovationErrorsEnum.INNOVATION_THREAD_NOT_FOUND)
      );
    });
  });

  describe('innovationTransferInfoWithOwner', () => {
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
      await expect(() => sut.innovationTransferInfoWithOwner(randUuid())).rejects.toThrow(
        new NotFoundError(InnovationErrorsEnum.INNOVATION_TRANSFER_NOT_FOUND)
      );
    });
  });

  describe('innovationCollaborationInfo', () => {
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
      await expect(() => sut.innovationCollaborationInfo(randUuid())).rejects.toThrow(
        new NotFoundError(InnovationErrorsEnum.INNOVATION_COLLABORATOR_NOT_FOUND)
      );
    });
  });

  describe('getInnovationActiveOwnerAndCollaborators', () => {
    it('Should get active owner and collaborators', async () => {
      const innovation = scenario.users.johnInnovator.innovations.johnInnovation;

      const innovators = await sut.getInnovationActiveOwnerAndCollaborators(innovation.id);

      expect(innovators).toHaveLength(2);
      expect(innovators).toMatchObject([scenario.users.johnInnovator.id, scenario.users.janeInnovator.id]);
    });
  });

  describe('getInnovationActiveCollaborators', () => {
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

  describe('needsAssessmentUsers', () => {
    //const needsAssessmentUsers = [scenario.users.paulNeedsAssessor, scenario.users.seanNeedsAssessor];
    it('Should get a list of needs assessment recipients', async () => {
      const res = await sut.needsAssessmentUsers(undefined);
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

  describe('getInnovationSupports', () => {
    it('should return the supports information for the innovation', async () => {
      const innovation = scenario.users.johnInnovator.innovations.johnInnovation;

      const supports = await sut.getInnovationSupports(innovation.id);

      expect(supports).toEqual([
        {
          id: innovation.supports.supportByHealthOrgUnit.id,
          status: innovation.supports.supportByHealthOrgUnit.status,
          unitId: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id
        },
        {
          id: innovation.supports.supportByHealthOrgAiUnit.id,
          status: innovation.supports.supportByHealthOrgAiUnit.status,
          unitId: scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.id
        },
        {
          id: innovation.supports.supportByMedTechOrgUnit.id,
          status: innovation.supports.supportByMedTechOrgUnit.status,
          unitId: scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.id
        }
      ]);
    });
  });

  describe('organisationUnitInfo', () => {
    it('returns the organisation unit with organisation info', async () => {
      const res = await sut.organisationUnitInfo(scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id);
      expect(res).toMatchObject({
        organisation: {
          id: scenario.organisations.healthOrg.id,
          name: scenario.organisations.healthOrg.name,
          acronym: scenario.organisations.healthOrg.acronym
        },
        organisationUnit: {
          id: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id,
          name: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.name,
          acronym: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.acronym
        }
      });
    });

    it('throws an error if organisation unit not found', async () => {
      await expect(sut.organisationUnitInfo(randUuid())).rejects.toThrow(
        new NotFoundError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND)
      );
    });
  });

  describe('organisationUnitsQualifyingAccessors', () => {
    it('returns accessors from one organisation unit', async () => {
      const res = await sut.organisationUnitsQualifyingAccessors([
        scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id
      ]);

      expect(res).toHaveLength(1);
      expect(res).toMatchObject([DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor, 'qaRole')]);
    });

    it('returns accessors from multiple organisation units', async () => {
      const res = await sut.organisationUnitsQualifyingAccessors([
        scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id,
        scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.id
      ]);

      expect(res).toMatchObject([
        DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor, 'qaRole'),
        DTOsHelper.getRecipientUser(scenario.users.sarahQualifyingAccessor, 'qaRole'),
        DTOsHelper.getRecipientUser(scenario.users.bartQualifyingAccessor, 'qaRole')
      ]);
    });

    it('returns empty array if no organisation units provided', async () => {
      const res = await sut.organisationUnitsQualifyingAccessors([]);
      expect(res).toHaveLength(0);
    });

    it('returns empty array if no organisation units found', async () => {
      const res = await sut.organisationUnitsQualifyingAccessors([randUuid(), randUuid()]);
      expect(res).toHaveLength(0);
    });

    it('filters out inactive organisations', async () => {
      await em
        .getRepository(OrganisationUnitEntity)
        .update(
          { id: scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.id },
          { inactivatedAt: new Date() }
        );

      const res = await sut.organisationUnitsQualifyingAccessors(
        [
          scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id,
          scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.id
        ],
        undefined,
        em
      );

      expect(res).toMatchObject([DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor, 'qaRole')]);
    });

    it('filters locked users by default', async () => {
      await em.update(
        UserRoleEntity,
        { id: scenario.users.aliceQualifyingAccessor.roles.qaRole.id },
        { isActive: false }
      );

      const res = await sut.organisationUnitsQualifyingAccessors(
        [scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id],
        undefined,
        em
      );

      expect(res).toHaveLength(0);
    });

    it('includes locked users if includeLocked', async () => {
      await em.update(
        UserRoleEntity,
        { id: scenario.users.aliceQualifyingAccessor.roles.qaRole.id },
        { isActive: false }
      );

      const res = await sut.organisationUnitsQualifyingAccessors(
        [scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id],
        true,
        em
      );

      expect(res).toHaveLength(1);
      expect(res).toMatchObject([
        { ...DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor, 'qaRole'), isActive: false }
      ]);
    });
  });

  describe('incompleteInnovations', () => {
    it.each([
      ["doesn't return", '0 days', 0, 0],
      ['returns', '30 days', 30, 1],
      ['returns', '60 days', 60, 1],
      ["doesn't return", '31 days', 31, 0],
      ["doesn't return", '45 days', 45, 0]
    ])('%s incomplete innovation records if innovation incomplete for %s', async (_result, _ndays, days, resLength) => {
      const innovationDate = new Date();
      innovationDate.setDate(innovationDate.getDate() - days - 1);

      // Set innovation to created and the date to n+1 days ago (raw query because we require updating createdAt)
      await em.query('UPDATE innovation SET status = @0, created_at = @1 WHERE id = @2', [
        InnovationStatusEnum.CREATED,
        innovationDate,
        scenario.users.johnInnovator.innovations.johnInnovation.id
      ]);

      const res = await sut.incompleteInnovations(em);
      expect(res).toHaveLength(resLength);
    });
  });

  describe('idleInnovations', () => {
    it('returns empty array of idle innovations if there are no innovations', async () => {
      const res = await sut.innovationsWithoutSupportForNDays([30], em);
      expect(res).toHaveLength(0);
    });

    it.skip('returns innovations if there are idle innovations', async () => {
      // having trouble with this test since it depends on history table
    });

    it('throws error if array is empty', async () => {
      await expect(sut.innovationsWithoutSupportForNDays([], em)).rejects.toThrow(
        new UnprocessableEntityError(GenericErrorsEnum.INVALID_PAYLOAD)
      );
    });
  });

  describe('idleSupports', () => {
    it('returns empty array of idle innovations if there are no innovations', async () => {
      const res = await sut.idleSupports(30, [InnovationSupportStatusEnum.ENGAGING], 30, em);
      expect(res).toHaveLength(0);
    });

    it('returns innovations if last given support was 6 weeks ago', async () => {
      const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
      const support = innovation.supports.supportByHealthOrgUnit;
      const dateSixWeeksAgo = new Date(Date.now() - 6 * WEEK_IN_DAYS * 24 * 60 * 60 * 1000);
      await em.update(InnovationSupportEntity, { id: support.id }, { updatedAt: dateSixWeeksAgo });
      await em.delete(InnovationSupportLogEntity, {
        innovation: { id: innovation.id },
        organisationUnit: { id: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id }
      });
      const res = await sut.idleSupports(6 * WEEK_IN_DAYS, [InnovationSupportStatusEnum.ENGAGING], 0, em);
      expect(res).toHaveLength(1);
    });

    it('returns innovations if last status was updated 30 days ago', async () => {
      const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
      const support = innovation.supports.supportByHealthOrgUnit;
      const date30DaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      await em.update(InnovationSupportEntity, { id: support.id }, { updatedAt: date30DaysAgo });
      // there's no activity log await em.delete(ActivityLogEntity, { innovation: { id: innovation.id } });
      await em.delete(InnovationSupportLogEntity, {
        innovation: { id: innovation.id },
        organisationUnit: { id: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id }
      });
      const res = await sut.idleSupports(30, [InnovationSupportStatusEnum.ENGAGING], 30, em);
      expect(res).toHaveLength(1);
    });

    it('returns innovations if last task was created 30 days ago', async () => {
      const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
      const support = innovation.supports.supportByHealthOrgUnit;
      const date30DaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const date31DaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
      await em.update(InnovationSupportEntity, { id: support.id }, { updatedAt: date31DaysAgo });
      await em.insert(ActivityLogEntity, {
        innovation: { id: innovation.id },
        type: ActivityTypeEnum.TASKS,
        activity: ActivityEnum.TASK_CREATION,
        userRole: { id: scenario.users.aliceQualifyingAccessor.roles.qaRole.id },
        createdAt: date30DaysAgo,
        updatedAt: date30DaysAgo
      });
      await em.delete(InnovationSupportLogEntity, {
        innovation: { id: innovation.id },
        organisationUnit: { id: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id }
      });
      const res = await sut.idleSupports(30, [InnovationSupportStatusEnum.ENGAGING], 30, em);
      expect(res).toHaveLength(1);
    });

    it('returns innovations if last message was created 30 days ago', async () => {
      const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
      const support = innovation.supports.supportByHealthOrgUnit;
      const date30DaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const date31DaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
      await em.update(InnovationSupportEntity, { id: support.id }, { updatedAt: date31DaysAgo });
      await em.insert(ActivityLogEntity, {
        innovation: { id: innovation.id },
        type: ActivityTypeEnum.THREADS,
        activity: ActivityEnum.THREAD_CREATION,
        userRole: { id: scenario.users.aliceQualifyingAccessor.roles.qaRole.id },
        createdAt: date30DaysAgo,
        updatedAt: date30DaysAgo
      });
      await em.delete(InnovationSupportLogEntity, {
        innovation: { id: innovation.id },
        organisationUnit: { id: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id }
      });
      const res = await sut.idleSupports(30, [InnovationSupportStatusEnum.ENGAGING], 30, em);
      expect(res).toHaveLength(1);
    });

    it('returns innovations if last support log was updated 30 days ago', async () => {
      const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
      const support = innovation.supports.supportByHealthOrgUnit;
      const date30DaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const date31DaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
      await em.update(InnovationSupportEntity, { id: support.id }, { updatedAt: date31DaysAgo });
      // No activity logs await em.delete(ActivityLogEntity, { innovation: { id: innovation.id } });

      // needs to be raw query because we need to update createdAt
      await em.query(
        'UPDATE innovation_support_log SET created_at = @0, updated_at = @0 WHERE innovation_id = @1 and organisation_unit_id = @2',
        [date30DaysAgo, innovation.id, scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id]
      );

      const res = await sut.idleSupports(30, [InnovationSupportStatusEnum.ENGAGING], 30, em);
      expect(res).toHaveLength(1);
    });

    it('returns innovations if last given support was 6 weeks ago (waiting)', async () => {
      const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
      const support = innovation.supports.supportByHealthOrgAiUnit;
      const dateSixWeeksAgo = new Date(Date.now() - 6 * WEEK_IN_DAYS * 24 * 60 * 60 * 1000);
      await em.update(InnovationSupportEntity, { id: support.id }, { updatedAt: dateSixWeeksAgo });
      const res = await sut.idleSupports(6 * WEEK_IN_DAYS, [InnovationSupportStatusEnum.WAITING], 0, em);
      expect(res).toHaveLength(1);
      expect(res[0]?.supportStatus).toBe(InnovationSupportStatusEnum.WAITING);
    });

    it('returns innovations if last given support was 6 weeks ago (waiting and engaging)', async () => {
      const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
      const waitingSupport = innovation.supports.supportByHealthOrgAiUnit;
      const engagingSupport = innovation.supports.supportByHealthOrgUnit;

      const dateSixWeeksAgo = new Date(Date.now() - 6 * WEEK_IN_DAYS * 24 * 60 * 60 * 1000);
      await em.update(
        InnovationSupportEntity,
        { id: In([waitingSupport.id, engagingSupport.id]) },
        { updatedAt: dateSixWeeksAgo }
      );
      await em.delete(InnovationSupportLogEntity, {
        innovation: { id: innovation.id },
        organisationUnit: { id: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id }
      });

      const res = await sut.idleSupports(
        6 * WEEK_IN_DAYS,
        [InnovationSupportStatusEnum.WAITING, InnovationSupportStatusEnum.ENGAGING],
        0,
        em
      );

      expect(res).toHaveLength(2);
      expect(res[0]?.supportStatus).toBe(InnovationSupportStatusEnum.ENGAGING);
      expect(res[1]?.supportStatus).toBe(InnovationSupportStatusEnum.WAITING);
    });

    it('returns empty array of idle innovations if support status is passed', async () => {
      const res = await sut.idleSupports(30, [], 0, em);
      expect(res).toHaveLength(0);
    });
  });

  describe('idleWaitingSupports', () => {
    it('returns empty array of idle supports if there are no innovations', async () => {
      const res = await sut.idleWaitingSupports(30, 0, em);
      expect(res).toHaveLength(0);
    });

    it('returns innovations if waiting and last updated 30 days ago', async () => {
      const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
      const support = innovation.supports.supportByHealthOrgUnit;
      const date30DaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      await em.update(
        InnovationSupportEntity,
        { id: support.id },
        { updatedAt: date30DaysAgo, status: InnovationSupportStatusEnum.WAITING }
      );
      const res = await sut.idleWaitingSupports(30, 0, em);
      expect(res).toMatchObject([
        {
          supportId: support.id,
          innovationId: innovation.id,
          unitId: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id
        }
      ]);
    });

    it('returns innovations if waiting and last updated 60 days ago with repeat interval', async () => {
      const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
      const support = innovation.supports.supportByHealthOrgUnit;
      const date60DaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      await em.update(
        InnovationSupportEntity,
        { id: support.id },
        { updatedAt: date60DaysAgo, status: InnovationSupportStatusEnum.WAITING }
      );
      const res = await sut.idleWaitingSupports(30, 30, em);
      expect(res).toMatchObject([
        {
          supportId: support.id,
          innovationId: innovation.id,
          unitId: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id
        }
      ]);
    });
  });

  describe('getExportRequestInfo', () => {
    const request = scenario.users.johnInnovator.innovations.johnInnovation.exportRequests.requestByAlice;

    it('returns a export request with info', async () => {
      await expect(sut.getExportRequestInfo(request.id)).resolves.toMatchObject({
        status: request.status,
        requestReason: request.requestReason,
        rejectReason: request.rejectReason,
        createdBy: {
          id: scenario.users.aliceQualifyingAccessor.id,
          unitId: scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.id,
          unitName: scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit.name
        }
      });
    });

    it('throws an error if export request not found', async () => {
      await expect(sut.getExportRequestInfo(randUuid())).rejects.toThrow(
        new NotFoundError(InnovationErrorsEnum.INNOVATION_EXPORT_REQUEST_NOT_FOUND)
      );
    });
  });

  describe('getUsersRecipients', () => {
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

    it('Should return multiple recipients when passed an array of userIds and roles', async () => {
      const recipients = await sut.getUsersRecipient(
        [scenario.users.aliceQualifyingAccessor.id, scenario.users.ingridAccessor.id],
        [ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR]
      );

      expect(recipients).toHaveLength(2);
      expect(recipients[0]).toMatchObject(
        DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor, 'qaRole')
      );
      expect(recipients[1]).toMatchObject(DTOsHelper.getRecipientUser(scenario.users.ingridAccessor, 'accessorRole'));
    });

    it('Should filter by organisation', async () => {
      const recipients = await sut.getUsersRecipient(
        [scenario.users.aliceQualifyingAccessor.id, scenario.users.samAccessor.id],
        [ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR],
        { organisation: scenario.organisations.healthOrg.id }
      );

      expect(recipients).toHaveLength(1);
      expect(recipients[0]).toMatchObject(
        DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor, 'qaRole')
      );
    });

    it('Should filter by organisation unit', async () => {
      const recipients = await sut.getUsersRecipient(
        [scenario.users.jamieMadroxAccessor.id],
        [ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR],
        { organisationUnit: scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.id }
      );

      expect(recipients).toHaveLength(1);
      expect(recipients[0]).toMatchObject(DTOsHelper.getRecipientUser(scenario.users.jamieMadroxAccessor, 'aiRole'));
    });

    it('Should include deleted if withDeleted', async () => {
      const recipients = await sut.getUsersRecipient(
        scenario.users.sebastiaoDeletedInnovator.id,
        ServiceRoleEnum.INNOVATOR,
        { withDeleted: true }
      );
      expect(recipients).toMatchObject(
        DTOsHelper.getRecipientUser(scenario.users.sebastiaoDeletedInnovator, 'innovatorRole')
      );
    });

    it("Shouldn't include deleted if not withDeleted (default)", async () => {
      const recipients = await sut.getUsersRecipient(
        scenario.users.sebastiaoDeletedInnovator.id,
        ServiceRoleEnum.INNOVATOR
      );
      expect(recipients).toBeNull();
    });

    it('Should return null when passed a non existent role for a single user', async () => {
      const recipient = await sut.getUsersRecipient(scenario.users.johnInnovator.id, ServiceRoleEnum.ACCESSOR);

      expect(recipient).toBeNull();
    });

    it('Should return null when passed undefined userId', async () => {
      const recipient = await sut.getUsersRecipient(undefined, ServiceRoleEnum.ACCESSOR);

      expect(recipient).toBeNull();
    });

    it('Should return empty array when passed a non existent role for all users', async () => {
      const recipients = await sut.getUsersRecipient(
        [scenario.users.johnInnovator.id, scenario.users.adamInnovator.id],
        ServiceRoleEnum.ACCESSOR
      );

      expect(recipients).toHaveLength(0);
    });

    it('Should return empty array when passed an empty array of userIds', async () => {
      const recipients = await sut.getUsersRecipient([], ServiceRoleEnum.ACCESSOR);

      expect(recipients).toHaveLength(0);
    });
  });

  describe('getRole', () => {
    // This is a private function, other tests are ensured by getUsersRecipient
    it('Should return empty array if no filters provided', async () => {
      const res = await sut['getRole']({});
      expect(res).toHaveLength(0);
    });
  });

  describe('identityId2UserId', () => {
    it('Should return the userId for a valid identityId', async () => {
      expect(await sut.identityId2UserId(scenario.users.johnInnovator.identityId)).toBe(
        scenario.users.johnInnovator.id
      );
    });

    it('Should return null for a non-existent identityId', async () => {
      expect(await sut.identityId2UserId(randUuid())).toBeNull();
    });
  });

  describe('userId2IdentityId', () => {
    it('Should return the identityId for a valid userId', async () => {
      expect(await sut.userId2IdentityId(scenario.users.johnInnovator.id)).toBe(
        scenario.users.johnInnovator.identityId
      );
    });

    it('Should return null for a non-existent userId', async () => {
      expect(await sut.userId2IdentityId(randUuid())).toBeNull();
    });
  });

  describe('usersIds2IdentityIds', () => {
    it('Should return an array with the identity ids of the given user ids', async () => {
      const users = [scenario.users.johnInnovator, scenario.users.aliceQualifyingAccessor];
      expect(await sut.usersIds2IdentityIds(users.map(u => u.id))).toMatchObject(
        new Map(users.map(u => [u.id, u.identityId]))
      );
    });

    it('Should return empty array when no valid user ids are sent', async () => {
      expect(await sut.usersIds2IdentityIds([randUuid()])).toMatchObject(new Map());
    });

    it('Should return empty array when an empty array is sent', async () => {
      expect(await sut.usersIds2IdentityIds([randUuid()])).toMatchObject(new Map());
    });
  });

  describe('usersBagToRecipients', () => {
    it('Should return an array of recipients from a users bag of same type', async () => {
      const res = await sut.usersBagToRecipients([
        { id: scenario.users.johnInnovator.id, userType: ServiceRoleEnum.INNOVATOR },
        { id: scenario.users.adamInnovator.id, userType: ServiceRoleEnum.INNOVATOR }
      ]);

      expect(res).toHaveLength(2);
      expect(res).toMatchObject([
        DTOsHelper.getRecipientUser(scenario.users.johnInnovator, 'innovatorRole'),
        DTOsHelper.getRecipientUser(scenario.users.adamInnovator, 'innovatorRole')
      ]);
    });

    it('Should return an array of recipients from a users bag of different types', async () => {
      const res = await sut.usersBagToRecipients([
        { id: scenario.users.johnInnovator.id, userType: ServiceRoleEnum.INNOVATOR },
        { id: scenario.users.adamInnovator.id, userType: ServiceRoleEnum.INNOVATOR },
        {
          id: scenario.users.aliceQualifyingAccessor.id,
          userType: ServiceRoleEnum.QUALIFYING_ACCESSOR,
          organisationUnit: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id
        }
      ]);

      expect(res).toHaveLength(3);
      expect(res).toMatchObject([
        DTOsHelper.getRecipientUser(scenario.users.johnInnovator, 'innovatorRole'),
        DTOsHelper.getRecipientUser(scenario.users.adamInnovator, 'innovatorRole'),
        DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor, 'qaRole')
      ]);
    });

    it('Should minimize calls by grouping users by type', async () => {
      const mock = jest.spyOn(sut, 'getUsersRecipient');
      const res = await sut.usersBagToRecipients([
        { id: scenario.users.johnInnovator.id, userType: ServiceRoleEnum.INNOVATOR },
        { id: scenario.users.adamInnovator.id, userType: ServiceRoleEnum.INNOVATOR },
        {
          id: scenario.users.aliceQualifyingAccessor.id,
          userType: ServiceRoleEnum.QUALIFYING_ACCESSOR,
          organisationUnit: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id
        },
        {
          id: scenario.users.bartQualifyingAccessor.id,
          userType: scenario.users.bartQualifyingAccessor.roles.qaRole.role,
          organisationUnit: scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.id
        },
        {
          id: scenario.users.sarahQualifyingAccessor.id,
          userType: scenario.users.sarahQualifyingAccessor.roles.qaRole.role,
          organisationUnit: scenario.organisations.healthOrg.organisationUnits.healthOrgAiUnit.id
        },
        {
          id: scenario.users.samAccessor.id,
          userType: scenario.users.samAccessor.roles.accessorRole.role,
          organisationUnit: scenario.users.samAccessor.organisations.medTechOrg.organisationUnits.medTechOrgUnit.id
        },
        {
          id: scenario.users.scottQualifyingAccessor.id,
          userType: scenario.users.scottQualifyingAccessor.roles.qaRole.role,
          organisationUnit:
            scenario.users.scottQualifyingAccessor.organisations.medTechOrg.organisationUnits.medTechOrgUnit.id
        }
      ]);

      expect(res).toHaveLength(7);
      // 2 innovators, 1 qa from healthOrgUnit, 2 qa from healthOrgAiUnit, 1 a from metTechOrgUnit, 1 qa from medTechOrgUnit
      expect(mock).toHaveBeenCalledTimes(5);
      mock.mockRestore();
    });
  });

  describe('getEmailPreference', () => {
    const johnPreferences: Role2PreferencesType<ServiceRoleEnum.INNOVATOR> = {
      DOCUMENTS: NotificationPreferenceEnum.YES,
      TASK: NotificationPreferenceEnum.YES,
      MESSAGES: NotificationPreferenceEnum.YES,
      AUTOMATIC: NotificationPreferenceEnum.NO,
      SUPPORT: NotificationPreferenceEnum.NO,
      USER_RESEARCH_SURVEYS: NotificationPreferenceEnum.NO,
      ANNOUNCEMENTS: NotificationPreferenceEnum.YES
    };
    const adamPreferences: Role2PreferencesType<ServiceRoleEnum.INNOVATOR> = {
      DOCUMENTS: NotificationPreferenceEnum.YES,
      TASK: NotificationPreferenceEnum.NO,
      MESSAGES: NotificationPreferenceEnum.YES,
      AUTOMATIC: NotificationPreferenceEnum.NO,
      SUPPORT: NotificationPreferenceEnum.NO,
      USER_RESEARCH_SURVEYS: NotificationPreferenceEnum.NO,
      ANNOUNCEMENTS: NotificationPreferenceEnum.YES
    };

    // This is too specific to include in the scenario, don't think it will be used elsewhere
    beforeEach(async () => {
      await em.getRepository(NotificationPreferenceEntity).save([
        {
          userRoleId: scenario.users.johnInnovator.roles.innovatorRole.id,
          preferences: johnPreferences,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: scenario.users.johnInnovator.roles.innovatorRole.id,
          updatedBy: scenario.users.johnInnovator.roles.innovatorRole.id
        },
        {
          userRoleId: scenario.users.adamInnovator.roles.innovatorRole.id,
          preferences: adamPreferences,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: scenario.users.adamInnovator.roles.innovatorRole.id,
          updatedBy: scenario.users.adamInnovator.roles.innovatorRole.id
        }
      ]);
    });

    it('Should return the email preference for a valid role', async () => {
      const res = await sut.getEmailPreferences([scenario.users.johnInnovator.roles.innovatorRole.id], em);
      expect(res.size).toBe(1);
      expect(res.get(scenario.users.johnInnovator.roles.innovatorRole.id)).toMatchObject(johnPreferences);
    });

    it('Should return the email preference for multiple roles', async () => {
      const res = await sut.getEmailPreferences(
        [scenario.users.johnInnovator.roles.innovatorRole.id, scenario.users.adamInnovator.roles.innovatorRole.id],
        em
      );
      expect(res.size).toBe(2);
      expect(res.get(scenario.users.johnInnovator.roles.innovatorRole.id)).toEqual(johnPreferences);
      expect(res.get(scenario.users.adamInnovator.roles.innovatorRole.id)).toEqual(adamPreferences);
    });

    it('Should only return the preferences if they are defined', async () => {
      const res = await sut.getEmailPreferences(
        [scenario.users.jamieMadroxAccessor.roles.aiRole.id, scenario.users.adamInnovator.roles.innovatorRole.id],
        em
      );
      expect(res.size).toBe(1);
      expect(res.get(scenario.users.jamieMadroxAccessor.roles.aiRole.id)).toBeUndefined();
    });

    it('Should return empty map if no roles provided', async () => {
      const res = await sut.getEmailPreferences([]);
      expect(res.size).toBe(0);
    });
  });

  describe('announcementUsers', () => {
    it('Should get a list of announcement recipients', async () => {
      const res = await sut.getAnnouncementUsers(scenario.announcements.announcementForQAs.id, em);
      expect(res).toHaveLength(2);
      expect(res).toContainEqual(scenario.users.aliceQualifyingAccessor.id);
      expect(res).toContainEqual(scenario.users.bartQualifyingAccessor.id);
    });

    it('Should get a list of announcement recipients with specific innovations', async () => {
      const res = await sut.getAnnouncementUsersWithInnovationsNames(
        scenario.announcements.announcementForSpecificInnovations.id,
        em
      );
      expect(res).toMatchObject(
        new Map([
          [scenario.users.johnInnovator.id, [scenario.users.johnInnovator.innovations.johnInnovation.name]],
          [scenario.users.adamInnovator.id, [scenario.users.adamInnovator.innovations.adamInnovation.name]]
        ])
      );
    });
  });
});
