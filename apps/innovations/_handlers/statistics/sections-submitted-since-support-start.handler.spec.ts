import { SectionsSubmittedSinceSupportStartStatisticsHandler } from './sections-submitted-since-support-start.handler';

import { CurrentCatalogTypes } from '@innovations/shared/schemas/innovation-record';
import { TestsHelper } from '@innovations/shared/tests';
import { DTOsHelper } from '@innovations/shared/tests/helpers/dtos.helper';
import { randPastDate, randUuid } from '@ngneat/falso';
import { StatisticsService } from '../../_services/statistics.service';

describe('Sections Submitted Since Support Start Statistics Handler Suite', () => {
  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  beforeAll(async () => {
    await testsHelper.init();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const expected = [
    {
      section: 'INNOVATION_DESCRIPTION' as const,
      updatedAt: randPastDate()
    },
    {
      section: 'INNOVATION_DESCRIPTION' as const,
      updatedAt: randPastDate()
    }
  ];
  const mock = jest
    .spyOn(StatisticsService.prototype, 'getSubmittedSectionsSinceSupportStart')
    .mockResolvedValue(expected);

  describe('run', () => {
    it('should return the statistic', async () => {
      const handler = new SectionsSubmittedSinceSupportStartStatisticsHandler(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        { innovationId: randUuid() }
      );
      const res = await handler.run();
      expect(res).toStrictEqual({
        count: expected.length,
        lastSubmittedSection: expected[0]?.section,
        lastSubmittedAt: expected[0]?.updatedAt,
        total: CurrentCatalogTypes.InnovationSections.length
      });
      expect(mock).toBeCalledTimes(1);
    });

    it('should return the statistic with null values', async () => {
      mock.mockResolvedValueOnce([]);
      const handler = new SectionsSubmittedSinceSupportStartStatisticsHandler(
        DTOsHelper.getUserRequestContext(scenario.users.aliceQualifyingAccessor),
        { innovationId: randUuid() }
      );
      const res = await handler.run();
      expect(res).toStrictEqual({
        count: 0,
        lastSubmittedSection: null,
        lastSubmittedAt: null,
        total: CurrentCatalogTypes.InnovationSections.length
      });
      expect(mock).toBeCalledTimes(1);
    });
  });
});
