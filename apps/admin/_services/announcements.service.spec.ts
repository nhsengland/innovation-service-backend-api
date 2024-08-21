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
      const activeAnnouncement = await em.getRepository(AnnouncementEntity).save({
        title: randText({ charCount: 10 }),
        userRoles: [ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR],
        params: { content: randText() },
        startsAt: new Date('01/01/2023'),
        expiresAt: null
      });

      const scheduledAnnouncement = await em.getRepository(AnnouncementEntity).save({
        title: randText({ charCount: 10 }),
        userRoles: [ServiceRoleEnum.INNOVATOR],
        params: { content: randText() },
        startsAt: randFutureDate(),
        expiresAt: null
      });

      const doneAnnouncement = await em.getRepository(AnnouncementEntity).save({
        title: randText({ charCount: 10 }),
        userRoles: [ServiceRoleEnum.INNOVATOR],
        params: { content: randText() },
        startsAt: new Date('01/01/2022'),
        expiresAt: new Date('01/02/2022')
      });

      const announcements = {
        activeAnnouncement: {
          id: activeAnnouncement.id,
          title: activeAnnouncement.title,
          userRoles: activeAnnouncement.userRoles,
          params: activeAnnouncement.params,
          startsAt: activeAnnouncement.startsAt,
          expiresAt: activeAnnouncement.expiresAt,
          status: AnnouncementStatusEnum.ACTIVE
        },
        scheduledAnnouncement: {
          id: scheduledAnnouncement.id,
          title: scheduledAnnouncement.title,
          userRoles: scheduledAnnouncement.userRoles,
          params: scheduledAnnouncement.params,
          startsAt: scheduledAnnouncement.startsAt,
          expiresAt: scheduledAnnouncement.expiresAt,
          status: AnnouncementStatusEnum.SCHEDULED
        },
        doneAnnouncement: {
          id: doneAnnouncement.id,
          title: doneAnnouncement.title,
          userRoles: doneAnnouncement.userRoles,
          params: doneAnnouncement.params,
          startsAt: doneAnnouncement.startsAt,
          expiresAt: doneAnnouncement.expiresAt,
          status: AnnouncementStatusEnum.DONE
        }
      };

      const result = await sut.getAnnouncementsList({ take: 10, skip: 0, order: {} }, em);

      expect(result).toMatchObject({
        count: 3,
        data: [announcements.scheduledAnnouncement, announcements.activeAnnouncement, announcements.doneAnnouncement]
      });
    });
  });

  describe('getAnnouncementInfo', () => {
    it('should get the announcement info', async () => {
      const announcement = await em.getRepository(AnnouncementEntity).save({
        title: randText({ charCount: 10 }),
        userRoles: [ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR],
        params: { content: randText() },
        startsAt: randPastDate(),
        expiresAt: null
      });

      const result = await sut.getAnnouncementInfo(announcement.id, em);

      expect(result).toMatchObject({
        id: announcement.id,
        title: announcement.title,
        userRoles: announcement.userRoles,
        params: announcement.params,
        startsAt: announcement.startsAt,
        expiresAt: announcement.expiresAt,
        status: AnnouncementStatusEnum.ACTIVE
      });
    });

    it(`should throw an error if the announcement doesn't exist`, async () => {
      await expect(() => sut.getAnnouncementInfo(randUuid())).rejects.toThrowError(
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
        userRoles: [ServiceRoleEnum.INNOVATOR],
        params: { content: randText() },
        startsAt: randFutureDate(),
        type: AnnouncementTypeEnum.LOG_IN
      };

      const result = await sut.createAnnouncement(
        DTOsHelper.getUserRequestContext(scenario.users.allMighty),
        announcementParams,
        { usersToExclude: [scenario.users.adamInnovator.id] },
        em
      );

      expect(result.id).toBeDefined();

      const dbAnnouncementUser = await em
        .createQueryBuilder(AnnouncementUserEntity, 'announcement_user')
        .innerJoin('announcement_user.announcement', 'announcement')
        .innerJoin('announcement_user.user', 'user')
        .where('announcement.id = :announcementId', { announcementId: result.id })
        .andWhere('user.id = :userId', { userId: scenario.users.adamInnovator.id })
        .getOne();

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
      ).rejects.toThrowError(new BadRequestError(AnnouncementErrorsEnum.ANNOUNCEMENT_NO_TARGET_ROLES));
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
      ).rejects.toThrowError(
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
      ).rejects.toThrowError(
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
      ).rejects.toThrowError(
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
      ).rejects.toThrowError(
        new UnprocessableEntityError(AnnouncementErrorsEnum.ANNOUNCEMENT_INVALID_PAYLOAD_FOR_THE_CUR_STATUS)
      );
    });

    it(`should throw an error if the announcement doesn't exist`, async () => {
      await expect(() =>
        sut.updateAnnouncement(DTOsHelper.getUserRequestContext(scenario.users.allMighty), randUuid(), {}, em)
      ).rejects.toThrowError(new NotFoundError(AnnouncementErrorsEnum.ANNOUNCEMENT_NOT_FOUND));
    });
  });

  describe('deleteAnnouncement', () => {
    it('should delete an announcement', async () => {
      const announcement = await em.getRepository(AnnouncementEntity).save({
        title: randText({ charCount: 10 }),
        userRoles: [ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR],
        params: { content: randText() },
        startsAt: randPastDate(),
        expiresAt: null
      });

      await sut.deleteAnnouncement(announcement.id, em);

      const dbAnnouncement = await em
        .createQueryBuilder(AnnouncementEntity, 'announcement')
        .where('announcement.id = :announcementId', { announcementId: announcement.id })
        .withDeleted()
        .getOne();

      const dbAnnouncementUsers = await em
        .createQueryBuilder(AnnouncementUserEntity, 'announcement_user')
        .innerJoin('announcement_user.announcement', 'announcement')
        .where('announcement.id = :announcementId', { announcementId: announcement.id })
        .withDeleted()
        .getMany();

      expect(dbAnnouncement?.deletedAt).toBeTruthy();
      dbAnnouncementUsers.forEach(announcementUser => expect(announcementUser.deletedAt).toBeTruthy());
    });

    it('should throw an error if the announcement is in DONE status', async () => {
      const announcement = await em.getRepository(AnnouncementEntity).save({
        title: randText({ charCount: 10 }),
        userRoles: [ServiceRoleEnum.ACCESSOR, ServiceRoleEnum.QUALIFYING_ACCESSOR],
        params: { content: randText() },
        startsAt: randPastDate(),
        expiresAt: randPastDate()
      });

      await expect(() => sut.deleteAnnouncement(announcement.id, em)).rejects.toThrowError(
        new UnprocessableEntityError(AnnouncementErrorsEnum.ANNOUNCEMENT_CANT_BE_DELETED_IN_DONE_STATUS)
      );
    });

    it(`should throw an error if the announcement doesn't exist`, async () => {
      await expect(() => sut.deleteAnnouncement(randUuid(), em)).rejects.toThrowError(
        new NotFoundError(AnnouncementErrorsEnum.ANNOUNCEMENT_NOT_FOUND)
      );
    });
  });
});
