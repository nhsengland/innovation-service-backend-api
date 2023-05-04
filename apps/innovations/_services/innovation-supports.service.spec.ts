import { TestDataType, TestsHelper } from '@innovations/shared/tests/tests.helper';
import { container } from '../_config';

import {
  InnovationEntity,
  InnovationSupportEntity,
  InnovationThreadEntity,
  InnovationThreadMessageEntity,
} from '@innovations/shared/entities';
import { InnovationSupportStatusEnum } from '@innovations/shared/enums';
import {
  InnovationErrorsEnum,
  NotFoundError,
  OrganisationErrorsEnum,
  UnprocessableEntityError,
} from '@innovations/shared/errors';
import {
  DomainInnovationsService,
  DomainUsersService,
  NotifierService,
} from '@innovations/shared/services';
import { randText, randUuid } from '@ngneat/falso';
import { cloneDeep } from 'lodash';
import type { EntityManager } from 'typeorm';
import type { InnovationSupportsService } from './innovation-supports.service';
import { InnovationThreadsService } from './innovation-threads.service';
import SYMBOLS from './symbols';

describe('Innovation supports service test suite', () => {
  let sut: InnovationSupportsService;
  let testData: TestDataType;
  let em: EntityManager;

  beforeAll(async () => {
    await TestsHelper.init();
    sut = container.get<InnovationSupportsService>(SYMBOLS.InnovationSupportsService);
    testData = TestsHelper.sampleData;
  });

  beforeEach(async () => {
    em = await TestsHelper.getQueryRunnerEntityManager();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await TestsHelper.releaseQueryRunnerEntityManager(em);
  });

  describe('getInnovationSupportsList', () => {
    beforeEach(() => {
      jest.spyOn(DomainUsersService.prototype, 'getUsersList').mockResolvedValue([
        {
          id: testData.baseUsers.accessor.id,
          displayName: 'accessor name',
          isActive: true,
        },
      ] as any);
    });

    it('should list the innovation supports', async () => {
      const innovationSupports = await sut.getInnovationSupportsList(
        testData.innovation.id,
        { fields: [] },
        em
      );

      const dbSupports = await em
        .createQueryBuilder(InnovationSupportEntity, 'support')
        .leftJoinAndSelect('support.organisationUnit', 'orgUnit')
        .leftJoinAndSelect('orgUnit.organisation', 'org')
        .where('support.id IN (:...supportIds)', {
          supportIds: innovationSupports.map((iS) => iS.id),
        })
        .getMany();

      expect(innovationSupports).toStrictEqual(
        dbSupports.map((support) => ({
          id: support.id,
          status: support.status,
          organisation: {
            id: support.organisationUnit.organisation.id,
            name: support.organisationUnit.organisation.name,
            acronym: support.organisationUnit.organisation.acronym,
            unit: {
              id: support.organisationUnit.id,
              name: support.organisationUnit.name,
              acronym: support.organisationUnit.acronym,
            },
          },
        }))
      );
    });

    it('should list the innovation supports with engaging accessors', async () => {
      const innovationSupports = await sut.getInnovationSupportsList(
        testData.innovation.id,
        { fields: ['engagingAccessors'] },
        em
      );

      const dbSupports = await em
        .createQueryBuilder(InnovationSupportEntity, 'support')
        .leftJoinAndSelect('support.organisationUnit', 'orgUnit')
        .leftJoinAndSelect('orgUnit.organisation', 'org')
        .where('support.id IN (:...supportIds)', {
          supportIds: innovationSupports.map((iS) => iS.id),
        })
        .getMany();

      expect(innovationSupports).toStrictEqual(
        dbSupports.map((support) => ({
          id: support.id,
          status: support.status,
          organisation: {
            id: support.organisationUnit.organisation.id,
            name: support.organisationUnit.organisation.name,
            acronym: support.organisationUnit.organisation.acronym,
            unit: {
              id: support.organisationUnit.id,
              name: support.organisationUnit.name,
              acronym: support.organisationUnit.acronym,
            },
          },
          engagingAccessors: [
            {
              id: testData.baseUsers.accessor.id,
              organisationUnitUserId: testData.organisationUnitUsers.accessor.id,
              name: 'accessor name',
            },
          ],
        }))
      );
    });

    it('should not list the innovation supports if the innovation does not exist', async () => {
      let err: NotFoundError | null = null;

      try {
        await sut.getInnovationSupportsList(randUuid(), { fields: [] }, em);
      } catch (error) {
        err = error as NotFoundError;
      }

      expect(err).toBeDefined();
      expect(err?.name).toBe(InnovationErrorsEnum.INNOVATION_NOT_FOUND);
    });
  });

  describe('getInnovationSupportInfo', () => {
    beforeEach(() => {
      jest.spyOn(DomainUsersService.prototype, 'getUsersList').mockResolvedValue([
        {
          id: testData.baseUsers.accessor.id,
          displayName: 'accessor name',
          isActive: true,
        },
      ] as any);
    });

    it('should get innovation support info', async () => {
      const support = await sut.getInnovationSupportInfo(
        testData.innovation.innovationSupports[0]!.id,
        em
      );

      expect(support).toStrictEqual({
        id: testData.innovation.innovationSupports[0]?.id,
        status: testData.innovation.innovationSupports[0]?.status,
        engagingAccessors: [
          {
            id: testData.baseUsers.accessor.id,
            organisationUnitUserId: testData.organisationUnitUsers.accessor.id,
            name: 'accessor name',
          },
        ],
      });
    });

    it('should not get innovation support info if it does not exist', async () => {
      let err: NotFoundError | null = null;

      try {
        await sut.getInnovationSupportInfo(randUuid(), em);
      } catch (error) {
        err = error as NotFoundError;
      }

      expect(err).toBeDefined();
      expect(err?.name).toBe(InnovationErrorsEnum.INNOVATION_SUPPORT_NOT_FOUND);
    });
  });

  describe('createInnovationSupport', () => {
    let innovationWithoutSupports: InnovationEntity;

    beforeEach(async () => {
      innovationWithoutSupports = await TestsHelper.TestDataBuilder.createInnovation()
        .setOwner(testData.baseUsers.innovator)
        .withAssessments(testData.baseUsers.assessmentUser)
        .build(em);
    });

    it('should create an innovation support', async () => {
      jest.spyOn(DomainInnovationsService.prototype, 'addActivityLog').mockResolvedValue();
      jest
        .spyOn(DomainInnovationsService.prototype, 'addSupportLog')
        .mockResolvedValue({ id: randUuid() });
      jest.spyOn(NotifierService.prototype, 'send').mockResolvedValue(true);

      const support = await sut.createInnovationSupport(
        testData.baseUsers.accessor,
        testData.domainContexts.accessor,
        innovationWithoutSupports.id,
        {
          status: InnovationSupportStatusEnum.ENGAGING,
          message: randText(),
          accessors: [
            {
              id: testData.baseUsers.accessor.id,
              organisationUnitUserId: testData.organisationUnitUsers.accessor.id,
            },
          ],
        },
        em
      );

      const thread = InnovationThreadEntity.new({
        innovation: innovationWithoutSupports,
        author: testData.baseUsers.accessor,
      });

      jest.spyOn(InnovationThreadsService.prototype, 'createThreadOrMessage').mockResolvedValue({
        thread,
        message: InnovationThreadMessageEntity.new({ thread, author: thread.author }),
      });

      const dbSupportIds = (
        await em
          .createQueryBuilder(InnovationSupportEntity, 'support')
          .innerJoin('support.innovation', 'innovation')
          .where('innovation.id = :innovationId', { innovationId: innovationWithoutSupports.id })
          .getMany()
      ).map((s) => s.id);

      expect(dbSupportIds).toContain(support.id);
    });

    it('should not create innovation support without organisation unit in domain context', async () => {
      let err: UnprocessableEntityError | null = null;

      try {
        await sut.createInnovationSupport(
          testData.baseUsers.accessor,
          testData.domainContexts.assessmentUser,
          innovationWithoutSupports.id,
          {
            status: InnovationSupportStatusEnum.ENGAGING,
            message: randText(),
            accessors: [
              {
                id: testData.baseUsers.accessor.id,
                organisationUnitUserId: testData.organisationUnitUsers.accessor.id,
              },
            ],
          },
          em
        );
      } catch (error) {
        err = error as UnprocessableEntityError;
      }

      expect(err).toBeDefined();
      expect(err?.name).toBe(
        InnovationErrorsEnum.INNOVATION_SUPPORT_WITH_UNPROCESSABLE_ORGANISATION_UNIT
      );
    });

    it('should not create innovation support with invalid organisation unit in domain context', async () => {
      let err: NotFoundError | null = null;

      const context = cloneDeep(testData.domainContexts.accessor);
      context.organisation.organisationUnit.id = randUuid();

      try {
        await sut.createInnovationSupport(
          testData.baseUsers.accessor,
          context,
          innovationWithoutSupports.id,
          {
            status: InnovationSupportStatusEnum.ENGAGING,
            message: randText(),
            accessors: [
              {
                id: testData.baseUsers.accessor.id,
                organisationUnitUserId: testData.organisationUnitUsers.accessor.id,
              },
            ],
          },
          em
        );
      } catch (error) {
        err = error as NotFoundError;
      }

      expect(err).toBeDefined();
      expect(err?.name).toBe(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND);
    });

    it('should not create innovation support if there is already one with the same organisation unit', async () => {
      let err: UnprocessableEntityError | null = null;

      try {
        await sut.createInnovationSupport(
          testData.baseUsers.accessor,
          testData.domainContexts.accessor,
          testData.innovation.id,
          {
            status: InnovationSupportStatusEnum.ENGAGING,
            message: randText(),
            accessors: [
              {
                id: testData.baseUsers.accessor.id,
                organisationUnitUserId: testData.organisationUnitUsers.accessor.id,
              },
            ],
          },
          em
        );
      } catch (error) {
        err = error as UnprocessableEntityError;
      }

      expect(err).toBeDefined();
      expect(err?.name).toBe(InnovationErrorsEnum.INNOVATION_SUPPORT_ALREADY_EXISTS);
    });
  });

  describe('updateInnovationSupport', () => {
    it('should update the innovation support', async () => {
      jest.spyOn(DomainInnovationsService.prototype, 'addActivityLog').mockResolvedValue();
      jest
        .spyOn(DomainInnovationsService.prototype, 'addSupportLog')
        .mockResolvedValue({ id: randUuid() });
      jest.spyOn(NotifierService.prototype, 'send').mockResolvedValue(true);

      const thread = InnovationThreadEntity.new({
        innovation: testData.innovation,
        author: testData.baseUsers.accessor,
      });
      jest.spyOn(InnovationThreadsService.prototype, 'createThreadOrMessage').mockResolvedValue({
        thread,
        message: InnovationThreadMessageEntity.new({ thread, author: thread.author }),
      });

      const updatedSupport = await sut.updateInnovationSupport(
        testData.baseUsers.accessor,
        testData.domainContexts.accessor,
        testData.innovation.id,
        testData.innovation.innovationSupports[0]!.id,
        { status: InnovationSupportStatusEnum.COMPLETE, message: randText() },
        em
      );

      const dbSupport = await em
        .createQueryBuilder(InnovationSupportEntity, 'support')
        .where('support.id = :supportId', { supportId: updatedSupport.id })
        .getOne();

      if (!dbSupport) {
        throw new Error('Could not find support');
      }

      expect(updatedSupport.id).toBe(testData.innovation.innovationSupports[0]!.id);
      expect(dbSupport.status).toBe(InnovationSupportStatusEnum.COMPLETE);
    });

    it('should not update the innovation support if it does not exsit', async () => {
      let err: NotFoundError | null = null;

      try {
        await sut.updateInnovationSupport(
          testData.baseUsers.accessor,
          testData.domainContexts.accessor,
          testData.innovation.id,
          randUuid(),
          { status: InnovationSupportStatusEnum.COMPLETE, message: randText() },
          em
        );
      } catch (error) {
        err = error as NotFoundError;
      }

      expect(err).toBeDefined();
      expect(err?.name).toBe(InnovationErrorsEnum.INNOVATION_SUPPORT_NOT_FOUND);
    });
  });
});
