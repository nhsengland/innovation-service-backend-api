import { TestsHelper } from '@admin/shared/tests';

import { TermsOfUseEntity } from '@admin/shared/entities';
import { TermsOfUseTypeEnum } from '@admin/shared/enums';
import { NotFoundError } from '@admin/shared/errors';
import { AdminErrorsEnum } from '@admin/shared/errors/errors.enums';
import { DTOsHelper } from '@admin/shared/tests/helpers/dtos.helper';
import { randPastDate, randText, randUuid } from '@ngneat/falso';
import type { EntityManager } from 'typeorm';
import { container } from '../_config';
import SYMBOLS from './symbols';
import type { TermsOfUseService } from './terms-of-use.service';

describe('Admin / _services / terms-of-use service suite', () => {
  let sut: TermsOfUseService;

  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  let em: EntityManager;

  beforeAll(async () => {
    sut = container.get<TermsOfUseService>(SYMBOLS.TermsOfUseService);

    await testsHelper.init();
  });

  beforeEach(async () => {
    em = await testsHelper.getQueryRunnerEntityManager();
  });

  afterEach(async () => {
    await testsHelper.releaseQueryRunnerEntityManager();
  });

  describe('createTermsOfUse', () => {
    it('should create terms of use', async () => {
      const result = await sut.createTermsOfUse(
        DTOsHelper.getUserRequestContext(scenario.users.allMighty),
        {
          name: randText({ charCount: 10 }),
          touType: TermsOfUseTypeEnum.INNOVATOR,
          summary: randText({ charCount: 30 }),
          releasedAt: randPastDate()
        },
        em
      );

      expect(result.id).toBeDefined();
    });
  });

  describe('updateTermsOfUse', () => {
    it('should update the terms of use', async () => {
      const tou = await em.getRepository(TermsOfUseEntity).save({
        name: randText({ charCount: 10 }),
        touType: TermsOfUseTypeEnum.SUPPORT_ORGANISATION,
        summary: randText({ charCount: 30 }),
        createdBy: scenario.users.allMighty.id,
        updatedBy: scenario.users.allMighty.id,
        releasedAt: null
      });

      const updatedTouData = {
        name: randText({ charCount: 10 }),
        touType: TermsOfUseTypeEnum.INNOVATOR,
        summary: randText({ charCount: 30 }),
        releasedAt: randPastDate()
      };
      const result = await sut.updateTermsOfUse(
        DTOsHelper.getUserRequestContext(scenario.users.allMighty),
        updatedTouData,
        tou.id,
        em
      );

      expect(result.id).toBeDefined();

      const dbTou = await em
        .createQueryBuilder(TermsOfUseEntity, 'tou')
        .where('tou.id = :touId', { touId: tou.id })
        .getOne();

      expect(dbTou?.name).toBe(updatedTouData.name);
      expect(dbTou?.touType).toBe(updatedTouData.touType);
      expect(dbTou?.summary).toBe(updatedTouData.summary);
      expect(dbTou?.releasedAt).toStrictEqual(new Date(updatedTouData.releasedAt));
    });
  });

  describe('getTermsOfUseList', () => {
    it('should list all terms of use', async () => {
      const releasedTermsOfUse = await em.getRepository(TermsOfUseEntity).save({
        name: randText({ charCount: 10 }),
        touType: TermsOfUseTypeEnum.SUPPORT_ORGANISATION,
        summary: randText({ charCount: 30 }),
        createdBy: scenario.users.allMighty.id,
        updatedBy: scenario.users.allMighty.id,
        releasedAt: randPastDate()
      });
      const unreleasedTermsOfUse = await em.getRepository(TermsOfUseEntity).save({
        name: randText({ charCount: 10 }),
        touType: TermsOfUseTypeEnum.INNOVATOR,
        summary: randText({ charCount: 30 }),
        createdBy: scenario.users.allMighty.id,
        updatedBy: scenario.users.allMighty.id,
        releasedAt: null
      });

      const result = await sut.getTermsOfUseList({ take: 10, skip: 0, order: { createdAt: 'ASC' } }, em);

      expect(result.count).toBe(2);
      expect(result.data).toMatchObject(
        expect.arrayContaining([
          {
            id: releasedTermsOfUse.id,
            name: releasedTermsOfUse.name,
            touType: releasedTermsOfUse.touType,
            summary: releasedTermsOfUse.summary,
            releasedAt: releasedTermsOfUse.releasedAt,
            createdAt: releasedTermsOfUse.createdAt
          },
          {
            id: unreleasedTermsOfUse.id,
            name: unreleasedTermsOfUse.name,
            touType: unreleasedTermsOfUse.touType,
            summary: unreleasedTermsOfUse.summary,
            releasedAt: unreleasedTermsOfUse.releasedAt,
            createdAt: unreleasedTermsOfUse.createdAt
          }
        ])
      );
    });

    it('should order the terms of user by createdAt DESC', async () => {
      const releasedTermsOfUse = await em.getRepository(TermsOfUseEntity).save({
        name: randText({ charCount: 10 }),
        touType: TermsOfUseTypeEnum.SUPPORT_ORGANISATION,
        summary: randText({ charCount: 30 }),
        createdBy: scenario.users.allMighty.id,
        updatedBy: scenario.users.allMighty.id,
        releasedAt: randPastDate()
      });
      const unreleasedTermsOfUse = await em.getRepository(TermsOfUseEntity).save({
        name: randText({ charCount: 10 }),
        touType: TermsOfUseTypeEnum.INNOVATOR,
        summary: randText({ charCount: 30 }),
        createdBy: scenario.users.allMighty.id,
        updatedBy: scenario.users.allMighty.id,
        releasedAt: null
      });

      const result = await sut.getTermsOfUseList({ take: 10, skip: 0, order: { createdAt: 'ASC' } }, em);

      expect(result.count).toBe(2);
      expect(result.data.map(tou => tou.createdAt.toISOString())).toMatchObject(
        [releasedTermsOfUse.createdAt.toISOString(), unreleasedTermsOfUse.createdAt.toISOString()].sort()
      );
    });
  });

  describe('getTermsOfUse', () => {
    it('should get the specified terms of use info', async () => {
      const tou = await em.getRepository(TermsOfUseEntity).save({
        name: randText({ charCount: 10 }),
        touType: TermsOfUseTypeEnum.SUPPORT_ORGANISATION,
        summary: randText({ charCount: 30 }),
        createdBy: scenario.users.allMighty.id,
        updatedBy: scenario.users.allMighty.id,
        releasedAt: randPastDate()
      });

      const result = await sut.getTermsOfUse(tou.id, em);

      expect(result).toMatchObject({
        id: tou.id,
        name: tou.name,
        touType: tou.touType,
        summary: tou.summary,
        releasedAt: tou.releasedAt,
        createdAt: tou.createdAt
      });
    });

    it(`should throw an error if the terms of use don't exist`, async () => {
      await expect(() => sut.getTermsOfUse(randUuid(), em)).rejects.toThrow(
        new NotFoundError(AdminErrorsEnum.ADMIN_TERMS_OF_USE_NOT_FOUND)
      );
    });
  });
});
