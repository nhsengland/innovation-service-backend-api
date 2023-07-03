/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { container } from '../_config';

import { InnovationSupportEntity } from '@innovations/shared/entities';
import { InnovationSupportStatusEnum } from '@innovations/shared/enums';
import {
  InnovationErrorsEnum,
  NotFoundError,
  OrganisationErrorsEnum,
  UnprocessableEntityError
} from '@innovations/shared/errors';
import { DomainInnovationsService, NotifierService } from '@innovations/shared/services';
import { TestsHelper } from '@innovations/shared/tests';
import { DTOsHelper } from '@innovations/shared/tests/helpers/dtos.helper';
import { randText, randUuid } from '@ngneat/falso';
import { cloneDeep } from 'lodash';
import type { EntityManager } from 'typeorm';
import type { InnovationSupportsService } from './innovation-supports.service';
import SYMBOLS from './symbols';

describe('Innovation supports service test suite', () => {
  let sut: InnovationSupportsService;

  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  let em: EntityManager;

  beforeAll(async () => {
    sut = container.get<InnovationSupportsService>(SYMBOLS.InnovationSupportsService);
    await testsHelper.init();

    jest.spyOn(DomainInnovationsService.prototype, 'addActivityLog').mockResolvedValue();
    jest.spyOn(DomainInnovationsService.prototype, 'addSupportLog').mockResolvedValue({ id: randUuid() });
    jest.spyOn(NotifierService.prototype, 'send').mockResolvedValue(true);
  });

  beforeEach(async () => {
    em = await testsHelper.getQueryRunnerEntityManager();
  });

  afterEach(async () => {
    await testsHelper.releaseQueryRunnerEntityManager();
  });

  describe('getInnovationSupportsList', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
    const support1 = innovation.supports.supportByHealthOrgUnit;
    const support2 = innovation.supports.supportByMedTechOrgUnit;

    it('should list the innovation supports', async () => {
      const innovationSupports = await sut.getInnovationSupportsList(innovation.id, { fields: [] }, em);

      expect(innovationSupports).toMatchObject([
        {
          id: support1.id,
          status: support1.status,
          organisation: {
            id: scenario.organisations.healthOrg.id,
            name: scenario.organisations.healthOrg.name,
            acronym: scenario.organisations.healthOrg.acronym,
            unit: {
              id: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id,
              name: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.name,
              acronym: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.acronym
            }
          }
        },
        {
          id: support2.id,
          status: support2.status,
          organisation: {
            id: scenario.organisations.medTechOrg.id,
            name: scenario.organisations.medTechOrg.name,
            acronym: scenario.organisations.medTechOrg.acronym,
            unit: {
              id: scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.id,
              name: scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.name,
              acronym: scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.acronym
            }
          }
        }
      ]);
    });

    it('should list the innovation supports with engaging accessors', async () => {
      const innovationSupports = await sut.getInnovationSupportsList(
        innovation.id,
        { fields: ['engagingAccessors'] },
        em
      );

      expect(innovationSupports).toMatchObject([
        {
          id: support1.id,
          status: support1.status,
          organisation: {
            id: scenario.organisations.healthOrg.id,
            name: scenario.organisations.healthOrg.name,
            acronym: scenario.organisations.healthOrg.acronym,
            unit: {
              id: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.id,
              name: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.name,
              acronym: scenario.organisations.healthOrg.organisationUnits.healthOrgUnit.acronym
            }
          },
          engagingAccessors: [
            {
              id: scenario.users.aliceQualifyingAccessor.id,
              organisationUnitUserId:
                scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit
                  .organisationUnitUser.id,
              name: scenario.users.aliceQualifyingAccessor.name
            },
            {
              id: scenario.users.jamieMadroxAccessor.id,
              organisationUnitUserId:
                scenario.users.jamieMadroxAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit
                  .organisationUnitUser.id,
              name: scenario.users.jamieMadroxAccessor.name
            }
          ]
        },
        {
          id: support2.id,
          status: support2.status,
          organisation: {
            id: scenario.organisations.medTechOrg.id,
            name: scenario.organisations.medTechOrg.name,
            acronym: scenario.organisations.medTechOrg.acronym,
            unit: {
              id: scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.id,
              name: scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.name,
              acronym: scenario.organisations.medTechOrg.organisationUnits.medTechOrgUnit.acronym
            }
          },
          engagingAccessors: [
            {
              id: scenario.users.samAccessor.id,
              organisationUnitUserId:
                scenario.users.samAccessor.organisations.medTechOrg.organisationUnits.medTechOrgUnit
                  .organisationUnitUser.id,
              name: scenario.users.samAccessor.name
            }
          ]
        }
      ]);
    });

    it('should not list the innovation supports if the innovation does not exist', async () => {
      await expect(sut.getInnovationSupportsList(randUuid(), { fields: [] }, em)).rejects.toThrowError(
        new NotFoundError(InnovationErrorsEnum.INNOVATION_NOT_FOUND)
      );
    });
  });

  describe('getInnovationSupportInfo', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
    it('should get innovation support info', async () => {
      const support = innovation.supports.supportByMedTechOrgUnit;
      const res = await sut.getInnovationSupportInfo(support.id, em);

      expect(res).toStrictEqual({
        id: support.id,
        status: support.status,
        engagingAccessors: [
          {
            id: scenario.users.samAccessor.id,
            organisationUnitUserId:
              scenario.users.samAccessor.organisations.medTechOrg.organisationUnits.medTechOrgUnit.organisationUnitUser
                .id,
            name: scenario.users.samAccessor.name
          }
        ]
      });
    });

    it('should not get innovation support info if it does not exist', async () => {
      await expect(sut.getInnovationSupportInfo(randUuid(), em)).rejects.toThrowError(
        new NotFoundError(InnovationErrorsEnum.INNOVATION_SUPPORT_NOT_FOUND)
      );
    });
  });

  describe('createInnovationSupport', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;

    it('should create an innovation support', async () => {
      const support = await sut.createInnovationSupport(
        DTOsHelper.getUserRequestContext(scenario.users.jamieMadroxAccessor, 'aiRole'),
        innovation.id,
        {
          status: InnovationSupportStatusEnum.ENGAGING,
          message: randText(),
          accessors: [
            {
              id: scenario.users.jamieMadroxAccessor.id,
              organisationUnitUserId:
                scenario.users.jamieMadroxAccessor.organisations.healthOrg.organisationUnits.healthOrgAiUnit
                  .organisationUnitUser.id
            }
          ]
        },
        em
      );

      // Todo this needs to check the support is created correctly and all other services are called correctly.
      // this applies to the other mocks also, this was previously in the method but was actually doing nothing so
      // commented out for now.
      /*jest.spyOn(InnovationThreadsService.prototype, 'createThreadOrMessage').mockResolvedValue({
        thread,
        message: InnovationThreadMessageEntity.new({ thread, author: thread.author })
      });*/

      const dbSupportIds = (
        await em
          .createQueryBuilder(InnovationSupportEntity, 'support')
          .innerJoin('support.innovation', 'innovation')
          .where('innovation.id = :innovationId', { innovationId: innovation.id })
          .getMany()
      ).map(s => s.id);

      expect(dbSupportIds).toContain(support.id);
    });

    it('should not create innovation support if current role missing organisation unit', async () => {
      const context = DTOsHelper.getUserRequestContext(scenario.users.jamieMadroxAccessor, 'aiRole');
      delete context.organisation?.organisationUnit;
      await expect(() =>
        sut.createInnovationSupport(context, innovation.id, {
          status: InnovationSupportStatusEnum.ENGAGING,
          message: randText(),
          accessors: [
            {
              id: scenario.users.jamieMadroxAccessor.id,
              organisationUnitUserId:
                scenario.users.jamieMadroxAccessor.organisations.healthOrg.organisationUnits.healthOrgAiUnit
                  .organisationUnitUser.id
            }
          ]
        })
      ).rejects.toThrowError(
        new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SUPPORT_WITH_UNPROCESSABLE_ORGANISATION_UNIT)
      );
    });

    it('should not create innovation support with invalid organisation unit in domain context', async () => {
      const user = cloneDeep(scenario.users.jamieMadroxAccessor);
      user.roles.aiRole.organisationUnit!.id = randUuid();
      await expect(() =>
        sut.createInnovationSupport(DTOsHelper.getUserRequestContext(user, 'aiRole'), innovation.id, {
          status: InnovationSupportStatusEnum.ENGAGING,
          message: randText(),
          accessors: [
            {
              id: scenario.users.jamieMadroxAccessor.id,
              organisationUnitUserId:
                scenario.users.jamieMadroxAccessor.organisations.healthOrg.organisationUnits.healthOrgAiUnit
                  .organisationUnitUser.id
            }
          ]
        })
      ).rejects.toThrowError(new NotFoundError(OrganisationErrorsEnum.ORGANISATION_UNIT_NOT_FOUND));
    });

    it('should not create innovation support if there is already one with the same organisation unit', async () => {
      await expect(() =>
        sut.createInnovationSupport(
          DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
          innovation.id,
          {
            status: InnovationSupportStatusEnum.ENGAGING,
            message: randText(),
            accessors: [
              {
                id: scenario.users.aliceQualifyingAccessor.id,
                organisationUnitUserId:
                  scenario.users.aliceQualifyingAccessor.organisations.healthOrg.organisationUnits.healthOrgUnit
                    .organisationUnitUser.id
              }
            ]
          }
        )
      ).rejects.toThrowError(new UnprocessableEntityError(InnovationErrorsEnum.INNOVATION_SUPPORT_ALREADY_EXISTS));
    });
  });

  describe('updateInnovationSupport', () => {
    const innovation = scenario.users.johnInnovator.innovations.johnInnovation;
    it('should update the innovation support', async () => {
      /* See above comment
      const thread = InnovationThreadEntity.new({
        innovation: testData.innovation,
        author: testData.baseUsers.accessor
      });
      jest.spyOn(InnovationThreadsService.prototype, 'createThreadOrMessage').mockResolvedValue({
        thread,
        message: InnovationThreadMessageEntity.new({ thread, author: thread.author })
      });
      */
      const support = innovation.supports.supportByHealthOrgUnit;

      const updatedSupport = await sut.updateInnovationSupport(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        innovation.id,
        support.id,
        { status: InnovationSupportStatusEnum.COMPLETE, message: randText() },
        em
      );

      const dbSupport = await em
        .createQueryBuilder(InnovationSupportEntity, 'support')
        .where('support.id = :supportId', { supportId: updatedSupport.id })
        .getOneOrFail();

      expect(updatedSupport.id).toBe(support.id);
      expect(dbSupport.status).toBe(InnovationSupportStatusEnum.COMPLETE);
    });

    it('should not update the innovation support if it does not exsit', async () => {
      await expect(() =>
        sut.updateInnovationSupport(
          DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
          innovation.id,
          randUuid(),
          { status: InnovationSupportStatusEnum.COMPLETE, message: randText() }
        )
      ).rejects.toThrowError(new NotFoundError(InnovationErrorsEnum.INNOVATION_SUPPORT_NOT_FOUND));
    });
  });
});
