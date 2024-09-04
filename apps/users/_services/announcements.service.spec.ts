import { container } from '../_config';

import { TestsHelper } from '@users/shared/tests';
import SYMBOLS from './symbols';
import type { EntityManager } from 'typeorm';
import type { AnnouncementsService } from './announcements.service';
import { AnnouncementUserEntity } from '@users/shared/entities';
import { randUuid } from '@ngneat/falso';
import { DTOsHelper } from '@users/shared/tests/helpers/dtos.helper';
import { AnnouncementErrorsEnum, NotFoundError } from '@users/shared/errors';
import { AnnouncementTypeEnum } from '@users/shared/enums';

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
    const johnInnovator = scenario.users.johnInnovator;
    const announcement = scenario.announcements.announcementForSpecificInnovations;
    const announcementReturn = {
      id: announcement.id,
      title: announcement.title,
      params: announcement.params,
      startsAt: new Date(announcement.startsAt),
      ...(announcement.expiresAt && { expiresAt: new Date(announcement.expiresAt) })
    };

    it('should list all announcements for the given roleId with affected innovations', async () => {
      const result = await sut.getUserRoleAnnouncements(johnInnovator.id, {}, em);
      expect(result).toMatchObject([
        {
          ...announcementReturn,
          innovations: [johnInnovator.innovations.johnInnovation.name]
        }
      ]);
    });

    it('should list only the announcements of type LOGIN for a given roleId', async () => {
      const result = await sut.getUserRoleAnnouncements(johnInnovator.id, { type: [AnnouncementTypeEnum.LOG_IN]}, em);
      expect(result).toHaveLength(0);
    });

    it('should only get the announcements for a given innovation', async () => {
      const result = await sut.getUserRoleAnnouncements(
        johnInnovator.id,
        { innovationId: johnInnovator.innovations.johnInnovation.id },
        em
      );
      expect(result).toMatchObject([announcementReturn]);
    });

    it('should return an empty array when there are no announcements for the given innovation', async () => {
      const result = await sut.getUserRoleAnnouncements(
        johnInnovator.id,
        { innovationId: johnInnovator.innovations.johnInnovationEmpty.id },
        em
      );
      expect(result).toHaveLength(0);
    });

    it('should return an empty array when there are no announcements for the given user', async () => {
      const result = await sut.getUserRoleAnnouncements(scenario.users.tristanInnovator.id, {}, em);
      expect(result).toHaveLength(0);
    });
  });

  describe('readUserAnnouncement', () => {
    it('should read the announcement', async () => {
      // create announcement
      const announcement = scenario.announcements.announcementForQAs;

      await sut.readUserAnnouncement(
        DTOsHelper.getUserRequestContext(scenario.users.bartQualifyingAccessor),
        announcement.id,
        undefined,
        em
      );

      const dbAnnouncementUser = await em
        .createQueryBuilder(AnnouncementUserEntity, 'au')
        .select(['au.readAt'])
        .where('au.announcement_id = :announcementId', { announcementId: announcement.id })
        .andWhere('au.user_id = :userId', { userId: scenario.users.bartQualifyingAccessor.id })
        .getOne();

      expect(dbAnnouncementUser?.readAt).toBeTruthy();
    });

    it('should read an announcement specific to an innovation', async () => {
      const announcement = scenario.announcements.announcementForSpecificInnovations;
      const johnInnovation = scenario.users.johnInnovator.innovations.johnInnovation;
      const adamInnovation = scenario.users.adamInnovator.innovations.adamInnovation;

      await sut.readUserAnnouncement(
        DTOsHelper.getUserRequestContext(scenario.users.johnInnovator),
        announcement.id,
        johnInnovation.id,
        em
      );

      const dbAnnouncementUsers = await em
        .createQueryBuilder(AnnouncementUserEntity, 'au')
        .select(['au.id', 'au.readAt', 'innovation.id'])
        .innerJoin('au.innovation', 'innovation')
        .where('au.announcement_id = :announcementId', { announcementId: announcement.id })
        .getMany();

      expect(dbAnnouncementUsers.map(u => ({ readAt: u.readAt, innovationId: u.innovation!.id }))).toStrictEqual([
        { readAt: expect.any(Date), innovationId: johnInnovation.id },
        { readAt: null, innovationId: adamInnovation.id }
      ]);
    });

    it(`should throw an error if the announcement doesn't exist`, async () => {
      await expect(() =>
        sut.readUserAnnouncement(
          DTOsHelper.getUserRequestContext(scenario.users.adamInnovator),
          randUuid(),
          undefined,
          em
        )
      ).rejects.toThrow(new NotFoundError(AnnouncementErrorsEnum.ANNOUNCEMENT_NOT_FOUND));
    });
  });
});
