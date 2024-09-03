import { TestsHelper } from '@admin/shared/tests';

import { container } from '../_config';
import SYMBOLS from './symbols';
import type { AnnouncementsService } from './announcements.service';
import { AnnouncementEntity, AnnouncementUserEntity } from '@admin/shared/entities';
import { randFutureDate, randPastDate, randText, randUuid } from '@ngneat/falso';
import { AnnouncementStatusEnum, AnnouncementTypeEnum, ServiceRoleEnum } from '@admin/shared/enums';
import { AnnouncementErrorsEnum, BadRequestError, NotFoundError, UnprocessableEntityError } from '@admin/shared/errors';
import { DTOsHelper } from '@admin/shared/tests/helpers/dtos.helper';
import type { EntityManager } from 'typeorm';
import { ConflictError } from '@notifications/shared/errors';

describe('Admin / _services / announcements service suite', () => {
  let sut: AnnouncementsService;

  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  let em: EntityManager;

  beforeAll(async () => {
    sut = container.get<AnnouncementsService>(SYMBOLS.AnnouncementsService);

    await testsHelper.init();
  });

  beforeEach(async () => {
    em = await testsHelper.getQueryRunnerEntityManager();
  });

  afterEach(async () => {
    await testsHelper.releaseQueryRunnerEntityManager();
  });

  describe('getAnnouncementsList', () => {
    it('should get the list of announcements', async () => {
      const result = await sut.getAnnouncementsList({ take: 10, skip: 0, order: {} }, em);

      const qaAnnouncement = scenario.announcements.announcementForQAs;
      const specificInnovationAnnouncement = scenario.announcements.announcementForSpecificInnovations;

      expect(result).toMatchObject({
        count: 2,
        data: [
          {
            id: specificInnovationAnnouncement.id,
            title: specificInnovationAnnouncement.title,
            userRoles: specificInnovationAnnouncement.userRoles,
            params: specificInnovationAnnouncement.params,
            startsAt: new Date(specificInnovationAnnouncement.startsAt),
            expiresAt: specificInnovationAnnouncement.expiresAt
              ? new Date(specificInnovationAnnouncement.expiresAt)
              : undefined,
            status: specificInnovationAnnouncement.status
          },
          {
            id: qaAnnouncement.id,
            title: qaAnnouncement.title,
            userRoles: qaAnnouncement.userRoles,
            params: qaAnnouncement.params,
            startsAt: new Date(qaAnnouncement.startsAt),
            expiresAt: qaAnnouncement.expiresAt ? new Date(qaAnnouncement.expiresAt) : undefined,
            status: qaAnnouncement.status
          },
        ]
      });
    });
  });

  describe('getAnnouncementInfo', () => {
    it('should get the announcement info', async () => {
      const announcement = scenario.announcements.announcementForQAs;
      const result = await sut.getAnnouncementInfo(announcement.id, em);

      expect(result).toMatchObject({
        id: announcement.id,
        title: announcement.title,
        userRoles: announcement.userRoles,
        params: announcement.params,
        startsAt: new Date(announcement.startsAt),
        ...(announcement.expiresAt && { expiresAt: new Date(announcement.expiresAt) }),
        status: announcement.status,
        type: announcement.type
      });
    });

    it(`should throw an error if the announcement doesn't exist`, async () => {
      await expect(() => sut.getAnnouncementInfo(randUuid())).rejects.toThrow(
        new NotFoundError(AnnouncementErrorsEnum.ANNOUNCEMENT_NOT_FOUND)
      );
    });
  });

  describe('createAnnouncement', () => {
    it('should create an announcement', async () => {
      const announcementParams = {
        title: randText({ charCount: 10 }),
        userRoles: [ServiceRoleEnum.INNOVATOR],
        params: { content: randText() },
        startsAt: randFutureDate(),
        type: AnnouncementTypeEnum.LOG_IN
      };

      const result = await sut.createAnnouncement(
        DTOsHelper.getUserRequestContext(scenario.users.allMighty),
        announcementParams,
        undefined,
        em
      );

      expect(result.id).toBeDefined();
    });

    it('should exclude specified users from the announcement', async () => {
      const announcementParams = {
        title: randText({ charCount: 10 }),
        userRoles: [ServiceRoleEnum.QUALIFYING_ACCESSOR],
        params: { content: randText() },
        startsAt: new Date(),
        type: AnnouncementTypeEnum.LOG_IN
      };

      const result = await sut.createAnnouncement(
        DTOsHelper.getUserRequestContext(scenario.users.allMighty),
        announcementParams,
        { usersToExclude: [scenario.users.aliceQualifyingAccessor.id] },
        em
      );

      const dbAnnouncementUser = await em
        .createQueryBuilder(AnnouncementUserEntity, 'au')
        .where('au.announcement_id = :announcementId', { announcementId: result.id })
        .andWhere('au.user_id = :userId', { userId: scenario.users.aliceQualifyingAccessor.id })
        .getOne();

      expect(result).toBeDefined();
      expect(dbAnnouncementUser?.readAt).toBeTruthy();
    });

    it('should throw an error if no target roles are speficifed', async () => {
      const announcementParams = {
        title: randText({ charCount: 10 }),
        userRoles: [],
        params: { content: randText() },
        startsAt: randFutureDate(),
        type: AnnouncementTypeEnum.LOG_IN
      };

      await expect(() =>
        sut.createAnnouncement(
          DTOsHelper.getUserRequestContext(scenario.users.allMighty),
          announcementParams,
          undefined,
          em
        )
      ).rejects.toThrow(new BadRequestError(AnnouncementErrorsEnum.ANNOUNCEMENT_NO_TARGET_ROLES));
    });
  });

  describe('updateAnnouncement', () => {
    it('should update an announcement', async () => {
      const announcement = await em.getRepository(AnnouncementEntity).save({
        title: randText({ charCount: 10 }),
        userRoles: [ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR],
        params: { content: randText() },
        startsAt: randFutureDate(),
        expiresAt: null,
        type: AnnouncementTypeEnum.LOG_IN
      });

      const updatedAnnouncementParams = {
        title: randText({ charCount: 10 }),
        userRoles: [ServiceRoleEnum.INNOVATOR],
        params: { content: randText() },
        startsAt: randFutureDate(),
        type: AnnouncementTypeEnum.LOG_IN
      };

      await sut.updateAnnouncement(
        DTOsHelper.getUserRequestContext(scenario.users.allMighty),
        announcement.id,
        updatedAnnouncementParams,
        em
      );

      const dbAnnouncement = await em
        .createQueryBuilder(AnnouncementEntity, 'announcement')
        .where('announcement.id = :announcementId', { announcementId: announcement.id })
        .getOne();

      expect(dbAnnouncement?.title).toBe(updatedAnnouncementParams.title);
      expect(dbAnnouncement?.userRoles).toMatchObject([ServiceRoleEnum.INNOVATOR]);
      expect(dbAnnouncement?.startsAt).toStrictEqual(new Date(updatedAnnouncementParams.startsAt));
    });

    it('should throw an error if the announcement is in DONE status', async () => {
      const announcement = await em.getRepository(AnnouncementEntity).save({
        title: randText({ charCount: 10 }),
        userRoles: [ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR],
        params: { content: randText() },
        startsAt: randPastDate(),
        expiresAt: randPastDate()
      });

      const updatedAnnouncementParams = {
        title: randText({ charCount: 10 })
      };

      await expect(() =>
        sut.updateAnnouncement(
          DTOsHelper.getUserRequestContext(scenario.users.allMighty),
          announcement.id,
          updatedAnnouncementParams,
          em
        )
      ).rejects.toThrow(
        new UnprocessableEntityError(AnnouncementErrorsEnum.ANNOUNCEMENT_CANT_BE_UPDATED_IN_DONE_STATUS)
      );
    });

    it('should throw an error if the announcement is in SCHEDULEDED status and new expiration date is before activation date', async () => {
      const announcement = await em.getRepository(AnnouncementEntity).save({
        title: randText({ charCount: 10 }),
        userRoles: [ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR],
        params: { content: randText() },
        startsAt: randFutureDate(),
        expiresAt: null
      });

      const updatedAnnouncementParams = {
        expiresAt: randPastDate()
      };

      await expect(() =>
        sut.updateAnnouncement(
          DTOsHelper.getUserRequestContext(scenario.users.allMighty),
          announcement.id,
          updatedAnnouncementParams,
          em
        )
      ).rejects.toThrow(
        new UnprocessableEntityError(AnnouncementErrorsEnum.ANNOUNCEMENT_INVALID_PAYLOAD_FOR_THE_CUR_STATUS)
      );
    });

    it('should throw an error if the announcement is in ACTIVE status and arguments other than expiration date are passed', async () => {
      const announcement = await em.getRepository(AnnouncementEntity).save({
        title: randText({ charCount: 10 }),
        userRoles: [ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR],
        params: { content: randText() },
        startsAt: randPastDate(),
        expiresAt: null
      });

      const updatedAnnouncementParams = {
        title: randText({ charCount: 10 })
      };

      await expect(() =>
        sut.updateAnnouncement(
          DTOsHelper.getUserRequestContext(scenario.users.allMighty),
          announcement.id,
          updatedAnnouncementParams,
          em
        )
      ).rejects.toThrow(
        new UnprocessableEntityError(AnnouncementErrorsEnum.ANNOUNCEMENT_INVALID_PAYLOAD_FOR_THE_CUR_STATUS)
      );
    });

    it('should throw an error if the announcement is in ACTIVE status and new expiration date is before activation date', async () => {
      const announcement = await em.getRepository(AnnouncementEntity).save({
        title: randText({ charCount: 10 }),
        userRoles: [ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR],
        params: { content: randText() },
        startsAt: randPastDate(),
        expiresAt: null
      });

      const updatedAnnouncementParams = {
        expiresAt: new Date(announcement.startsAt.getDate() - 2)
      };

      await expect(() =>
        sut.updateAnnouncement(
          DTOsHelper.getUserRequestContext(scenario.users.allMighty),
          announcement.id,
          updatedAnnouncementParams,
          em
        )
      ).rejects.toThrow(
        new UnprocessableEntityError(AnnouncementErrorsEnum.ANNOUNCEMENT_INVALID_PAYLOAD_FOR_THE_CUR_STATUS)
      );
    });

    it(`should throw an error if the announcement doesn't exist`, async () => {
      await expect(() =>
        sut.updateAnnouncement(DTOsHelper.getUserRequestContext(scenario.users.allMighty), randUuid(), {}, em)
      ).rejects.toThrow(new NotFoundError(AnnouncementErrorsEnum.ANNOUNCEMENT_NOT_FOUND));
    });
  });

  // TODO: Add a test to check if announcement_users that didn't read are deleted.
  describe('deleteAnnouncement', () => {
    const adminContext = DTOsHelper.getUserRequestContext(scenario.users.allMighty);
    it('should delete an announcement', async () => {
      const announcement = await em.getRepository(AnnouncementEntity).save({
        title: randText({ charCount: 10 }),
        userRoles: [ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR],
        params: { content: randText() },
        startsAt: randPastDate(),
        expiresAt: null
      });

      await sut.deleteAnnouncement(adminContext, announcement.id, em);

      const dbAnnouncement = await em
        .createQueryBuilder(AnnouncementEntity, 'announcement')
        .where('announcement.id = :announcementId', { announcementId: announcement.id })
        .getOneOrFail();

      expect(dbAnnouncement.status).toBe(AnnouncementStatusEnum.DELETED);
    });

    it('should throw an error if the announcement is in DONE status', async () => {
      const announcement = await em.getRepository(AnnouncementEntity).save({
        title: randText({ charCount: 10 }),
        userRoles: [ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR],
        params: { content: randText() },
        startsAt: randPastDate(),
        expiresAt: randPastDate(),
        status: AnnouncementStatusEnum.DONE
      });

      await expect(() => sut.deleteAnnouncement(adminContext, announcement.id, em)).rejects.toThrow(
        new ConflictError(AnnouncementErrorsEnum.ANNOUNCEMENT_INVALID_UPDATE_STATUS)
      );
    });

    it(`should throw an error if the announcement doesn't exist`, async () => {
      await expect(() => sut.deleteAnnouncement(adminContext, randUuid(), em)).rejects.toThrow(
        new NotFoundError(AnnouncementErrorsEnum.ANNOUNCEMENT_NOT_FOUND)
      );
    });
  });
});
