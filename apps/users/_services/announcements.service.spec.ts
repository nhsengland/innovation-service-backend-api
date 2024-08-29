import { container } from '../_config';

import { TestsHelper } from '@users/shared/tests';
import SYMBOLS from './symbols';
import type { EntityManager } from 'typeorm';
import type { AnnouncementsService } from './announcements.service';
import { AnnouncementEntity, AnnouncementUserEntity } from '@users/shared/entities';
import { randBetweenDate, randText, randUuid } from '@ngneat/falso';
import { ServiceRoleEnum } from '@users/shared/enums';
import { DTOsHelper } from '@users/shared/tests/helpers/dtos.helper';
import { AnnouncementErrorsEnum, NotFoundError } from '@users/shared/errors';

describe('Users / _services / announcements service suite', () => {
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

  describe('getUserRoleAnnouncements', () => {
    it('should list all announcements for the given roleId', async () => {
      // create announcements
      const announcement = {
        title: randText({ charCount: 10 }),
        userRoles: [ServiceRoleEnum.ACCESSOR],
        startsAt: randBetweenDate({
          from: new Date(scenario.users.samAccessor.createdAt),
          to: new Date()
        }),
        expiresAt: null,
        params: null
      };
      const savedAnnouncement = await em.getRepository(AnnouncementEntity).save(announcement);

      // save other announcement for other role
      await em.getRepository(AnnouncementEntity).save({
        title: randText({ charCount: 10 }),
        userRoles: [ServiceRoleEnum.INNOVATOR],
        startsAt: randBetweenDate({
          from: new Date(scenario.users.samAccessor.createdAt),
          to: new Date()
        }),
        expiresAt: null,
        params: null
      });

      const result = await sut.getUserRoleAnnouncements(scenario.users.samAccessor.roles.accessorRole.id, {}, em);

      expect(result).toMatchObject([
        {
          id: savedAnnouncement.id,
          title: savedAnnouncement.title,
          params: savedAnnouncement.params,
          startsAt: savedAnnouncement.startsAt,
          expiresAt: savedAnnouncement.expiresAt
        }
      ]);
    });

    it('should return an empty array when there are no announcements for the given roleId', async () => {
      const result = await sut.getUserRoleAnnouncements(randUuid(), {}, em);

      expect(result).toHaveLength(0);
    });
  });

  describe('readUserAnnouncement', () => {
    it('should read the announcement', async () => {
      // create announcement
      const announcement = {
        title: randText({ charCount: 10 }),
        userRoles: [ServiceRoleEnum.ACCESSOR],
        startsAt: randBetweenDate({
          from: new Date(scenario.users.samAccessor.createdAt),
          to: new Date()
        }),
        expiresAt: null,
        params: null
      };
      const savedAnnouncement = await em.getRepository(AnnouncementEntity).save(announcement);

      await sut.readUserAnnouncement(
        DTOsHelper.getUserRequestContext(scenario.users.samAccessor),
        savedAnnouncement.id,
        em
      );

      const dbAnnouncementUser = await em
        .createQueryBuilder(AnnouncementUserEntity, 'announcement_user')
        .select(['announcement_user.readAt'])
        .innerJoin('announcement_user.user', 'user')
        .innerJoin('announcement_user.announcement', 'announcement')
        .where('announcement.id = :announcementId', { announcementId: savedAnnouncement.id })
        .andWhere('user.id = :userId', { userId: scenario.users.samAccessor.id })
        .getOne();

      expect(dbAnnouncementUser?.readAt).toBeTruthy();
    });

    it(`should throw an error if the announcement doesn't exist`, async () => {
      await expect(() =>
        sut.readUserAnnouncement(DTOsHelper.getUserRequestContext(scenario.users.adamInnovator), randUuid(), em)
      ).rejects.toThrow(new NotFoundError(AnnouncementErrorsEnum.ANNOUNCEMENT_NOT_FOUND));
    });
  });
});
