/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { container } from '../_config';

import { randAbbreviation, randFullName, randPhoneNumber, randText, randUuid } from '@ngneat/falso';
import {
  InnovationCollaboratorEntity,
  TermsOfUseEntity,
  TermsOfUseUserEntity,
  UserEntity,
  UserPreferenceEntity,
  InnovationEntity,
  UserRoleEntity,
  NotificationUserEntity
} from '@users/shared/entities';
import {
  InnovationCollaboratorStatusEnum,
  InnovationStatusEnum,
  NotifierTypeEnum,
  PhoneUserPreferenceEnum,
  ServiceRoleEnum,
  TermsOfUseTypeEnum,
  UserStatusEnum
} from '@users/shared/enums';
import { UnprocessableEntityError, UserErrorsEnum } from '@users/shared/errors';
import { IdentityProviderService, NotifierService } from '@users/shared/services';
import { TestsHelper } from '@users/shared/tests';
import { EntityManager } from 'typeorm';
import SYMBOLS from './symbols';
import { UsersService } from './users.service';
import { DTOsHelper } from '@users/shared/tests/helpers/dtos.helper';
import { InnovationCollaboratorBuilder } from '@users/shared/tests/builders/innovation-collaborator.builder';
import { NotificationBuilder } from '@users/shared/tests/builders/notification.builder';

describe('Users / _services / users service suite', () => {
  let sut: UsersService;

  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  const notifierSendSpy = jest.spyOn(NotifierService.prototype, 'send');

  let em: EntityManager;

  beforeAll(async () => {
    sut = container.get<UsersService>(SYMBOLS.UsersService);
    await testsHelper.init();
  });

  beforeEach(async () => {
    em = await testsHelper.getQueryRunnerEntityManager();
  });

  afterEach(async () => {
    await testsHelper.releaseQueryRunnerEntityManager();
    notifierSendSpy.mockReset();
  });

  describe('getUserPendingInnovationTranfers', () => {
    it('should get all the pending innovation transfers to the user', async () => {
      const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
      const otherInnovation = scenario.users.adamInnovator.innovations.adamInnovation;

      const result = await sut.getUserPendingInnovationTransfers(innovation.transfer.email, em);

      expect(result).toMatchObject([
        {
          id: innovation.transfer.id,
          innovation: {
            id: innovation.id,
            name: innovation.name
          }
        },
        {
          id: otherInnovation.transfer.id,
          innovation: {
            id: otherInnovation.id,
            name: otherInnovation.name
          }
        }
      ]);
    });

    it('should return an empty array is there are no pending transfers', async () => {
      const result = await sut.getUserPendingInnovationTransfers(scenario.users.johnInnovator.email, em);

      expect(result).toMatchObject([]);
    });
  });

  describe('createUserInnovator', () => {
    it('should create a innovator user', async () => {
      const result = await sut.createUserInnovator({ identityId: randUuid() }, em);

      expect(result.id).toBeDefined();
    });

    it('should accept the most recent terms of use', async () => {
      //create terms of use
      const termsOfUse = {
        name: randText({ charCount: 10 }),
        touType: TermsOfUseTypeEnum.INNOVATOR,
        summary: randText({ charCount: 20 }),
        releasedAt: new Date()
      };

      const savedTermsOfUse = await em.getRepository(TermsOfUseEntity).save(termsOfUse);

      const result = await sut.createUserInnovator({ identityId: randUuid() }, em);

      const dbTermsOfUseUser = await em
        .createQueryBuilder(TermsOfUseUserEntity, 'tou_user')
        .innerJoin('tou_user.user', 'user')
        .innerJoin('tou_user.termsOfUse', 'tou')
        .where('user.id = :userId', { userId: result.id })
        .andWhere('tou.id = :touId', { touId: savedTermsOfUse.id })
        .getOne();

      expect(dbTermsOfUseUser?.acceptedAt).toBeTruthy();
    });

    it('should send a notification', async () => {
      await sut.createUserInnovator({ identityId: randUuid() }, em);

      expect(notifierSendSpy).toHaveBeenCalledWith(expect.anything(), NotifierTypeEnum.ACCOUNT_CREATION, {});
    });

    it('should throw an error if the user already exists', async () => {
      await expect(() =>
        sut.createUserInnovator({ identityId: scenario.users.adamInnovator.identityId })
      ).rejects.toThrowError(new UnprocessableEntityError(UserErrorsEnum.USER_ALREADY_EXISTS));
    });
  });

  describe('updateUserInfo', () => {
    const newName = randFullName();
    const newPhoneNumber = randPhoneNumber();

    const identityServiceSpy = jest.spyOn(IdentityProviderService.prototype, 'updateUser');
    const userPreferencesSpy = jest.spyOn(UsersService.prototype, 'upsertUserPreferences');

    it.each([
      [ServiceRoleEnum.ACCESSOR, scenario.users.samAccessor],
      [ServiceRoleEnum.QUALIFYING_ACCESSOR, scenario.users.bartQualifyingAccessor],
      [ServiceRoleEnum.ASSESSMENT, scenario.users.seanNeedsAssessor],
      [ServiceRoleEnum.ADMIN, scenario.users.allMighty]
    ])('should update %s identity info', async (userType, user) => {
      const result = await sut.updateUserInfo({ id: user.id, identityId: user.identityId }, userType, {
        displayName: newName,
        mobilePhone: newPhoneNumber
      });

      expect(result).toMatchObject({ id: user.id });
      expect(identityServiceSpy).toHaveBeenCalledWith(user.identityId, {
        displayName: newName,
        mobilePhone: newPhoneNumber
      });
    });

    it.each([
      [ServiceRoleEnum.ACCESSOR, scenario.users.samAccessor],
      [ServiceRoleEnum.QUALIFYING_ACCESSOR, scenario.users.bartQualifyingAccessor],
      [ServiceRoleEnum.ASSESSMENT, scenario.users.seanNeedsAssessor],
      [ServiceRoleEnum.ADMIN, scenario.users.allMighty]
    ])('should not update %s non-identity info', async (userType, user) => {
      await sut.updateUserInfo({ id: user.id, identityId: user.identityId }, userType, {
        displayName: newName,
        mobilePhone: newPhoneNumber,
        contactByPhone: true
      });

      expect(userPreferencesSpy).toHaveBeenCalledTimes(0);
    });

    it('should update INNOVATOR entire info', async () => {
      const user = scenario.users.adamInnovator;
      const newData = {
        displayName: newName,
        contactByEmail: true,
        contactByPhone: true,
        contactByPhoneTimeframe: PhoneUserPreferenceEnum.AFTERNOON,
        contactDetails: randText({ charCount: 10 }),
        mobilePhone: newPhoneNumber,
        organisation: {
          id: user.roles.innovatorRole.organisation!.id,
          isShadow: true,
          name: randAbbreviation(),
          size: randText(),
          description: randText({ charCount: 20 }),
          registrationNumber: randText()
        }
      };

      const result = await sut.updateUserInfo(
        { id: user.id, identityId: user.identityId, firstTimeSignInAt: new Date() },
        user.roles.innovatorRole.role,
        newData
      );

      expect(result).toMatchObject({ id: user.id });
      expect(identityServiceSpy).toHaveBeenCalledWith(user.identityId, {
        displayName: newName,
        mobilePhone: newPhoneNumber
      });
      expect(userPreferencesSpy).toHaveBeenCalledWith(
        user.id,
        {
          contactByPhone: newData.contactByPhone,
          contactByEmail: newData.contactByEmail,
          contactByPhoneTimeframe: newData.contactByPhoneTimeframe,
          contactDetails: newData.contactDetails
        },
        expect.any(EntityManager)
      );
    });
  });

  describe('getUsersList', () => {
    it.each([
      ServiceRoleEnum.ACCESSOR,
      ServiceRoleEnum.ADMIN,
      ServiceRoleEnum.ASSESSMENT,
      ServiceRoleEnum.INNOVATOR,
      ServiceRoleEnum.QUALIFYING_ACCESSOR
    ])('Should get a list of all %s users', async userType => {
      const result = await sut.getUserList({ userTypes: [userType] }, [], {
        take: 10,
        skip: 0,
        order: { createdAt: 'ASC' }
      });

      const filteredResult = result.data.filter(user => user.roles.findIndex(r => r.role === userType) > -1);

      expect(filteredResult).toHaveLength(result.data.length);
    });

    it('should list users with their emails', async () => {
      const result = await sut.getUserList({ userTypes: [ServiceRoleEnum.INNOVATOR] }, ['email'], {
        take: 10,
        skip: 0,
        order: { createdAt: 'ASC' }
      });

      result.data.forEach(user => {
        expect(user).toHaveProperty('email');
      });
    });

    it('should list only active users if onlyActive is true', async () => {
      //delete a user
      await em
        .getRepository(UserEntity)
        .update({ id: scenario.users.adamInnovator.id }, { status: UserStatusEnum.DELETED });

      const result = await sut.getUserList(
        { userTypes: [ServiceRoleEnum.INNOVATOR], onlyActive: true },
        [],
        {
          take: 10,
          skip: 0,
          order: { createdAt: 'ASC' }
        },
        em
      );

      expect(result.data.map(user => user.id)).not.toContain(scenario.users.adamInnovator.id);
    });

    it('should list all users of a given organisation unit', async () => {
      const organisationUnit = scenario.organisations.healthOrg.organisationUnits.healthOrgUnit;

      const result = await sut.getUserList(
        {
          userTypes: [ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR],
          organisationUnitId: organisationUnit.id
        },
        [],
        {
          take: 10,
          skip: 0,
          order: { createdAt: 'ASC' }
        }
      );

      expect(result.count).toBe(3);
      expect(result.data.map(user => user.id).sort()).toMatchObject(
        [
          scenario.users.aliceQualifyingAccessor.id,
          scenario.users.ingridAccessor.id,
          scenario.users.jamieMadroxAccessor.id
        ].sort()
      );
    });

    //skipping because the response does not have the createdAt property which makes
    // this a very difficult and somewhat poinless test
    it.skip('should order the users by ascending date of createdAt', async () => {});

    it.skip('should order the users by descending date of createdAt', async () => {});
  });

  describe('upsertUserPreferences', () => {
    it('should update existing user preferences', async () => {
      // create user preferences
      const preferences = {
        user: {
          id: scenario.users.adamInnovator.id
        },
        contactByPhone: true,
        contactByEmail: true,
        contactByPhoneTimeframe: PhoneUserPreferenceEnum.AFTERNOON,
        contactDetails: randText({ charCount: 10 }),
        createdBy: scenario.users.adamInnovator.id,
        updatedBy: scenario.users.adamInnovator.id
      };

      await em.save(UserPreferenceEntity, preferences);

      const updatedPreferences = {
        user: {
          id: scenario.users.adamInnovator.id
        },
        contactByPhone: false,
        contactByEmail: false,
        contactByPhoneTimeframe: PhoneUserPreferenceEnum.DAILY,
        contactDetails: randText({ charCount: 10 }),
        createdBy: scenario.users.adamInnovator.id,
        updatedBy: scenario.users.adamInnovator.id
      };

      await sut.upsertUserPreferences(
        scenario.users.adamInnovator.id,
        {
          contactByPhone: updatedPreferences.contactByPhone,
          contactByEmail: updatedPreferences.contactByEmail,
          contactByPhoneTimeframe: updatedPreferences.contactByPhoneTimeframe,
          contactDetails: updatedPreferences.contactDetails
        },
        em
      );

      const dbPreferences = await em
        .createQueryBuilder(UserPreferenceEntity, 'preference')
        .innerJoin('preference.user', 'user')
        .where('user.id = :userId', { userId: scenario.users.adamInnovator.id })
        .getOne();

      expect(dbPreferences?.contactByEmail).toBe(updatedPreferences.contactByEmail);
      expect(dbPreferences?.contactByPhone).toBe(updatedPreferences.contactByPhone);
      expect(dbPreferences?.contactByPhoneTimeframe).toBe(updatedPreferences.contactByPhoneTimeframe);
      expect(dbPreferences?.contactDetails).toBe(updatedPreferences.contactDetails);
    });

    it('should insert user preferences', async () => {
      const preferences = {
        user: {
          id: scenario.users.johnInnovator.id
        },
        contactByPhone: false,
        contactByEmail: false,
        contactByPhoneTimeframe: PhoneUserPreferenceEnum.DAILY,
        contactDetails: randText({ charCount: 10 }),
        createdBy: scenario.users.johnInnovator.id,
        updatedBy: scenario.users.johnInnovator.id
      };

      await sut.upsertUserPreferences(
        scenario.users.johnInnovator.id,
        {
          contactByPhone: preferences.contactByPhone,
          contactByEmail: preferences.contactByEmail,
          contactByPhoneTimeframe: preferences.contactByPhoneTimeframe,
          contactDetails: preferences.contactDetails
        },
        em
      );

      const dbPreferences = await em
        .createQueryBuilder(UserPreferenceEntity, 'preference')
        .innerJoin('preference.user', 'user')
        .where('user.id = :userId', { userId: scenario.users.johnInnovator.id })
        .getOne();

      expect(dbPreferences?.contactByEmail).toBe(preferences.contactByEmail);
      expect(dbPreferences?.contactByPhone).toBe(preferences.contactByPhone);
      expect(dbPreferences?.contactByPhoneTimeframe).toBe(preferences.contactByPhoneTimeframe);
      expect(dbPreferences?.contactDetails).toBe(preferences.contactDetails);
    });
  });

  describe('getCollaborationsInvitesList', () => {
    it.each([
      InnovationCollaboratorStatusEnum.ACTIVE,
      InnovationCollaboratorStatusEnum.CANCELLED,
      InnovationCollaboratorStatusEnum.DECLINED,
      InnovationCollaboratorStatusEnum.LEFT,
      InnovationCollaboratorStatusEnum.PENDING,
      InnovationCollaboratorStatusEnum.REMOVED
    ])('should get the collaboration invites in status %s', async status => {
      // prepare collaboration status in DB
      const collaborator = scenario.users.johnInnovator.innovations.johnInnovation.collaborators.adamCollaborator;
      await em.getRepository(InnovationCollaboratorEntity).update({ id: collaborator.id }, { status: status });

      const result = await sut.getCollaborationsInvitesList(scenario.users.adamInnovator.email, status, em);

      expect(result).toMatchObject([
        {
          id: collaborator.id,
          invitedAt: new Date(collaborator.invitedAt),
          innovation: {
            id: scenario.users.johnInnovator.innovations.johnInnovation.id,
            name: scenario.users.johnInnovator.innovations.johnInnovation.name
          }
        }
      ]);
    });

    it('should return an empty array if there are no collaboration invites', async () => {
      const result = await sut.getCollaborationsInvitesList(
        scenario.users.aliceQualifyingAccessor.email,
        InnovationCollaboratorStatusEnum.ACTIVE,
        em
      );

      expect(result).toHaveLength(0);
    });
  });

  describe('deleteUser()', () => {
    const johnInnovator = scenario.users.johnInnovator;
    const janeInnovator = scenario.users.janeInnovator;
    const reason = randText();

    it('should remove the user as the owner of innovations with pending transfers and send notification', async () => {
      const innoWithTransfer = johnInnovator.innovations.johnInnovation;
      const innoWithoutTransferEmpty = johnInnovator.innovations.johnInnovationEmpty;
      const innoWithoutTransferArchive = johnInnovator.innovations.johnInnovationArchived;
      await sut.deleteUser(DTOsHelper.getUserRequestContext(johnInnovator), { reason }, em);

      const dbInnovation = await em
        .createQueryBuilder(InnovationEntity, 'innovation')
        .select(['innovation.id', 'innovation.status', 'owner.id', 'innovation.expires_at'])
        .leftJoin('innovation.owner', 'owner')
        .where('innovation.id = :innovationId', { innovationId: innoWithTransfer.id })
        .getOneOrFail();

      expect(dbInnovation.id).toBe(innoWithTransfer.id);
      expect(dbInnovation.status).toBe(innoWithTransfer.status);
      expect(dbInnovation.expires_at).toBeDefined();
      expect(dbInnovation.owner).toBeNull();
      expect(notifierSendSpy).toHaveBeenCalledWith(expect.anything(), NotifierTypeEnum.ACCOUNT_DELETION, {
        innovations: [
          { id: innoWithTransfer.id, transferExpireDate: expect.anything() },
          { id: innoWithoutTransferEmpty.id, affectedUsers: [] },
          {
            id: innoWithoutTransferArchive.id,
            affectedUsers: [
              {
                userId: scenario.users.janeInnovator.id,
                userType: scenario.users.janeInnovator.roles.innovatorRole.role
              }
            ]
          }
        ]
      });
    });

    it('should remove all collaborations from user', async () => {
      await sut.deleteUser(DTOsHelper.getUserRequestContext(janeInnovator), { reason }, em);

      const activeOrPendingCollaborations = await em
        .createQueryBuilder(InnovationCollaboratorEntity, 'collaborator')
        .where('collaborator.user_id = :userId', { userId: scenario.users.janeInnovator.id })
        .andWhere('collaborator.status IN (:...status)', {
          status: [InnovationCollaboratorStatusEnum.ACTIVE, InnovationCollaboratorStatusEnum.PENDING]
        })
        .getCount();

      expect(activeOrPendingCollaborations).toBe(0);
    });

    describe('when innovations without pending transfers', () => {
      it('should archive all innovations without pending transfers', async () => {
        const innoWithoutTransfer = johnInnovator.innovations.johnInnovationEmpty;
        await sut.deleteUser(DTOsHelper.getUserRequestContext(johnInnovator), { reason }, em);

        const dbInnovation = await em
          .createQueryBuilder(InnovationEntity, 'innovation')
          .select(['innovation.id', 'innovation.status', 'innovation.expires_at'])
          .where('innovation.id = :innovationId', { innovationId: innoWithoutTransfer.id })
          .getOneOrFail();

        expect(dbInnovation.id).toBe(innoWithoutTransfer.id);
        expect(dbInnovation.status).toBe(InnovationStatusEnum.ARCHIVED);
        expect(dbInnovation.expires_at).toBeNull();
      });

      it('should remove active and pending collaborators', async () => {
        const innoWithoutTransfer = johnInnovator.innovations.johnInnovationEmpty;
        await new InnovationCollaboratorBuilder(em)
          .setUser(johnInnovator.id)
          .setEmail(janeInnovator.email)
          .setInnovation(innoWithoutTransfer.id)
          .save();

        await sut.deleteUser(DTOsHelper.getUserRequestContext(johnInnovator), { reason }, em);

        const activeOrPendingCollaborators = await em
          .createQueryBuilder(InnovationCollaboratorEntity, 'collaborator')
          .where('collaborator.innovation_id = :innovationId', { innovationId: innoWithoutTransfer.id })
          .andWhere('collaborator.status IN (:...status)', {
            status: [InnovationCollaboratorStatusEnum.ACTIVE, InnovationCollaboratorStatusEnum.PENDING]
          })
          .getCount();

        expect(activeOrPendingCollaborators).toBe(0);
      });

      it('should clear unread notifications', async () => {
        const innoWithoutTransfer = johnInnovator.innovations.johnInnovationEmpty;
        const notification = await new NotificationBuilder(em)
          .addNotificationUser(johnInnovator)
          .setInnovation(innoWithoutTransfer.id)
          .setContext('SUPPORT', 'ST02_SUPPORT_STATUS_TO_OTHER', randUuid())
          .save();

        await sut.deleteUser(DTOsHelper.getUserRequestContext(johnInnovator), { reason }, em);

        const dbNotification = await em
          .createQueryBuilder(NotificationUserEntity, 'userNotification')
          .select(['userNotification.id', 'userNotification.deletedAt'])
          .withDeleted()
          .where('userNotification.notification_id = :notificationId', { notificationId: notification.id })
          .getOneOrFail();

        expect(dbNotification.deletedAt).toBeDefined();
      });
    });

    it('should delete the user and associated roles', async () => {
      await sut.deleteUser(DTOsHelper.getUserRequestContext(johnInnovator), { reason }, em);

      const user = await em
        .createQueryBuilder(UserEntity, 'user')
        .select(['user.id', 'user.status', 'user.deleteReason'])
        .where('user.id = :userId', { userId: johnInnovator.id })
        .getOneOrFail();

      const nActiveRoles = await em
        .createQueryBuilder(UserRoleEntity, 'role')
        .where('role.user_id = :userId', { userId: johnInnovator.id })
        .andWhere('role.isActive = :active', { active: true })
        .getCount();

      expect(user.id).toBe(johnInnovator.id);
      expect(user.status).toBe(UserStatusEnum.DELETED);
      expect(user.deleteReason).toBe(reason);
      expect(nActiveRoles).toBe(0);
    });
  });
});
