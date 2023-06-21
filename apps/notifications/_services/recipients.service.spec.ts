/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { randUuid } from '@ngneat/falso';
import { InnovationEntity, InnovationSupportEntity, UserEntity } from '@notifications/shared/entities';
import { InnovationCollaboratorStatusEnum, InnovationSupportStatusEnum } from '@notifications/shared/enums';
import { InnovationErrorsEnum, NotFoundError } from '@notifications/shared/errors';
import { CompleteScenarioType, TestsHelper } from '@notifications/shared/tests';
import { InnovationSupportBuilder } from '@notifications/shared/tests/builders/innovation-support.builder';
import { DTOsHelper } from '@notifications/shared/tests/helpers/dtos.helper';
import type { EntityManager } from 'typeorm';
import { container } from '../_config';
import type { RecipientsService } from './recipients.service';
import { SYMBOLS } from './symbols';

describe('Notifications / _services / recipients service suite', () => {
  let sut: RecipientsService;

  let testsHelper: TestsHelper;
  let scenario: CompleteScenarioType;

  let em: EntityManager;

  beforeAll(async () => {
    sut = container.get<RecipientsService>(SYMBOLS.RecipientsService);
    testsHelper = await new TestsHelper().init();
    scenario = testsHelper.getCompleteScenario();
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
    it('should return a list of innovation collaborators', async () => {
      const collaborators = await sut['getInnovationCollaborators'](
        scenario.users.johnInnovator.innovations.johnInnovation.id
      );

      expect(collaborators).toHaveLength(2);
      expect(collaborators).toMatchObject([
        {
          email: scenario.users.janeInnovator.email,
          status: InnovationCollaboratorStatusEnum.ACTIVE,
          userId: scenario.users.janeInnovator.id
        },
        {
          email: scenario.users.johnInnovator.innovations.johnInnovation.collaborators.elisaPendingCollaborator.email,
          status: InnovationCollaboratorStatusEnum.PENDING,
          userId: undefined
        }
      ]);
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

      expect(collaborators).toHaveLength(2);
      expect(collaborators).toMatchObject([
        {
          email: scenario.users.janeInnovator.email,
          status: InnovationCollaboratorStatusEnum.ACTIVE,
          userId: scenario.users.janeInnovator.id
        },
        {
          email: scenario.users.johnInnovator.innovations.johnInnovation.collaborators.elisaPendingCollaborator.email,
          status: InnovationCollaboratorStatusEnum.PENDING,
          userId: undefined
        }
      ]);
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

      expect(collaborators).toHaveLength(2);
      expect(collaborators).toMatchObject([
        {
          email: scenario.users.janeInnovator.email,
          status: InnovationCollaboratorStatusEnum.ACTIVE,
          userId: scenario.users.janeInnovator.id
        },
        {
          email: scenario.users.johnInnovator.innovations.johnInnovation.collaborators.elisaPendingCollaborator.email,
          status: InnovationCollaboratorStatusEnum.PENDING,
          userId: undefined
        }
      ]);
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
      await em.delete(InnovationSupportEntity, {
        innovation: scenario.users.johnInnovator.innovations.johnInnovation.id
      });
      const res = await sut.innovationAssignedRecipients(
        scenario.users.johnInnovator.innovations.johnInnovation.id,
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


  describe('actionInfoWithOwner suite', () => {
    it('Should get action info', async () => {
      const dbInnovation = scenario.users.johnInnovator.innovations.johnInnovation;
      const dbAction = dbInnovation.actions.actionByAlice;

      const actionInfo = await sut.actionInfoWithOwner(dbAction.id);

      expect(actionInfo).toMatchObject({
        id: dbAction.id,
        displayId: dbAction.displayId,
        status: dbAction.status,
        owner: DTOsHelper.getRecipientUser(scenario.users.aliceQualifyingAccessor, 'qaRole')
      });
    });

    it('Should fail to get non-existent action info', async () => {
      await expect(() => sut.actionInfoWithOwner(randUuid())).rejects.toThrowError(
        new NotFoundError(InnovationErrorsEnum.INNOVATION_ACTION_NOT_FOUND)
      );
    });
  });

  describe('getInnovationActiveCollaborators suite', () => {
    it('Should get collaborators', async () => {
      const dbInnovation = scenario.users.johnInnovator.innovations.johnInnovation;

      const collaborators = await sut.getInnovationActiveCollaborators(dbInnovation.id);

      expect(collaborators).toHaveLength(1);
      expect(collaborators[0]).toEqual(scenario.users.janeInnovator.id);
    });

    it('Should get an empty array for a non-existent innovation', async () => {
      const collaborators = await sut.getInnovationActiveCollaborators(randUuid());

      expect(collaborators).toHaveLength(0);
    });
  });
  */
});
