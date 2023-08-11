import { container } from '../_config';

import { TestsHelper } from '@users/shared/tests';
import SYMBOLS from './symbols';
import type { EntityManager } from 'typeorm';
import { ServiceRoleEnum, TermsOfUseTypeEnum } from '@users/shared/enums';
import { BadRequestError, NotFoundError, UnprocessableEntityError, UserErrorsEnum } from '@users/shared/errors';
import type { TermsOfUseService } from './terms-of-use.service';
import { randPastDate, randText } from '@ngneat/falso';
import { TermsOfUseEntity, TermsOfUseUserEntity } from '@users/shared/entities';
import { UserEntity } from '@users/shared/entities';

describe('Users / _services / terms-of-use service suite', () => {
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

  describe('getActiveTermsOfUseInfo', () => {
    it.each([
      [ServiceRoleEnum.ACCESSOR, scenario.users.samAccessor, TermsOfUseTypeEnum.SUPPORT_ORGANISATION],
      [
        ServiceRoleEnum.QUALIFYING_ACCESSOR,
        scenario.users.aliceQualifyingAccessor,
        TermsOfUseTypeEnum.SUPPORT_ORGANISATION
      ],
      [ServiceRoleEnum.ASSESSMENT, scenario.users.paulNeedsAssessor, TermsOfUseTypeEnum.SUPPORT_ORGANISATION],
      [ServiceRoleEnum.INNOVATOR, scenario.users.adamInnovator, TermsOfUseTypeEnum.INNOVATOR]
    ])('should get the active terms of use for the user with %s role', async (userRole, user, touType) => {
      // create terms of use
      const termsOfUse = {
        name: randText({ charCount: 10 }),
        touType: touType,
        summary: randText({ charCount: 20 }),
        releasedAt: randPastDate()
      };

      const savedTermsOfUse = await em.getRepository(TermsOfUseEntity).save(termsOfUse);

      await em.getRepository(TermsOfUseUserEntity).save({
        acceptedAt: randPastDate(),
        user: UserEntity.new({ id: user.id }),
        termsOfUse: TermsOfUseEntity.new({ id: savedTermsOfUse.id })
      });

      const result = await sut.getActiveTermsOfUseInfo({ id: user.id }, userRole, em);

      expect(result).toMatchObject({
        id: savedTermsOfUse.id,
        name: savedTermsOfUse.name,
        summary: savedTermsOfUse.summary,
        releasedAt: new Date(savedTermsOfUse.releasedAt),
        isAccepted: true
      });
    });

    it('should throw an error when the user role is ADMIN', async () => {
      await expect(() =>
        sut.getActiveTermsOfUseInfo({ id: scenario.users.allMighty.id }, ServiceRoleEnum.ADMIN, em)
      ).rejects.toThrowError(new BadRequestError(UserErrorsEnum.USER_TYPE_INVALID));
    });

    it(`should throw an error when the terms of use don't exist`, async () => {
      await expect(() =>
        sut.getActiveTermsOfUseInfo({ id: scenario.users.adamInnovator.id }, ServiceRoleEnum.INNOVATOR, em)
      ).rejects.toThrowError(new NotFoundError(UserErrorsEnum.USER_TERMS_OF_USE_NOT_FOUND));
    });
  });

  describe('acceptActiveTermsOfUse', () => {
    it('should accept the active terms of use for the user', async () => {
      // create terms of use
      const termsOfUse = {
        name: randText({ charCount: 10 }),
        touType: TermsOfUseTypeEnum.INNOVATOR,
        summary: randText({ charCount: 20 }),
        releasedAt: randPastDate()
      };

      await em.getRepository(TermsOfUseEntity).save(termsOfUse);

      const result = await sut.acceptActiveTermsOfUse(
        { id: scenario.users.adamInnovator.id },
        ServiceRoleEnum.INNOVATOR,
        em
      );

      expect(result.id).toBeDefined();
    });

    it(`should throw an error if the terms of use haven't been released yet`, async () => {
      // create terms of use
      const termsOfUse = {
        name: randText({ charCount: 10 }),
        touType: TermsOfUseTypeEnum.INNOVATOR,
        summary: randText({ charCount: 20 }),
        releasedAt: null
      };
      await em.getRepository(TermsOfUseEntity).save(termsOfUse);

      await expect(() =>
        sut.acceptActiveTermsOfUse({ id: scenario.users.adamInnovator.id }, ServiceRoleEnum.INNOVATOR, em)
      ).rejects.toThrowError(new NotFoundError(UserErrorsEnum.USER_TERMS_OF_USE_NOT_FOUND));
    });

    it('should throw an error if the terms of use already been accepted', async () => {
      // create terms of use
      const termsOfUse = {
        name: randText({ charCount: 10 }),
        touType: TermsOfUseTypeEnum.INNOVATOR,
        summary: randText({ charCount: 20 }),
        releasedAt: randPastDate()
      };

      const savedTermsOfUse = await em.getRepository(TermsOfUseEntity).save(termsOfUse);

      await em.getRepository(TermsOfUseUserEntity).save({
        acceptedAt: randPastDate(),
        user: UserEntity.new({ id: scenario.users.adamInnovator.id }),
        termsOfUse: TermsOfUseEntity.new({ id: savedTermsOfUse.id })
      });

      await expect(() =>
        sut.acceptActiveTermsOfUse({ id: scenario.users.adamInnovator.id }, ServiceRoleEnum.INNOVATOR, em)
      ).rejects.toThrowError(
        new UnprocessableEntityError(UserErrorsEnum.USER_TERMS_OF_USE_INVALID, {
          message: 'Already accepted'
        })
      );
    });
  });
});
