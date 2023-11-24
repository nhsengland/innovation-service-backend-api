import { DocumentsStatisticsHandler } from './documents-statistics.handler';

import { InnovationFileContextTypeEnum, ServiceRoleEnum } from '@innovations/shared/enums';
import { TestsHelper } from '@innovations/shared/tests';
import { DTOsHelper } from '@innovations/shared/tests/helpers/dtos.helper';
import { randAbbreviation, randUuid } from '@ngneat/falso';
import { StatisticsService } from '../../_services/statistics.service';

describe('Documents Statistics Handler Suite', () => {
  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  beforeAll(async () => {
    await testsHelper.init();
  });

  const expectedStatistics: Awaited<ReturnType<StatisticsService['getDocumentsStatistics']>> = {
    uploadedByRoles: [{ role: ServiceRoleEnum.ACCESSOR, count: 1 }],
    uploadedByUnits: [{ id: randUuid(), unit: randAbbreviation(), count: 10 }],
    locations: [{ location: InnovationFileContextTypeEnum.INNOVATION_EVIDENCE, count: 2 }]
  };
  const mockDocumentStatistics = jest
    .spyOn(StatisticsService.prototype, 'getDocumentsStatistics')
    .mockResolvedValue(expectedStatistics);

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('run', () => {
    it('should return the document statistics', async () => {
      const innovationId = randUuid();
      const handler = new DocumentsStatisticsHandler(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        { innovationId }
      );
      const res = await handler.run();
      expect(res).toStrictEqual(expectedStatistics);
      expect(mockDocumentStatistics).toBeCalledTimes(1);
      expect(mockDocumentStatistics).toHaveBeenCalledWith(innovationId);
    });
  });
});
