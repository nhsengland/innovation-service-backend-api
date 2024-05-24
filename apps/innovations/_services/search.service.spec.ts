import { DomainInnovationsService, ElasticSearchService, NotifierService } from '@innovations/shared/services';
import { TestsHelper } from '@innovations/shared/tests';
import { container } from '../_config';
import type { SearchService } from './search.service';
import SYMBOLS from './symbols';

describe('Innovations / _services / search suite', () => {
  let sut: SearchService;

  // let em: EntityManager;

  const testsHelper = new TestsHelper();
  const scenario = testsHelper.getCompleteScenario();

  const activityLogSpy = jest.spyOn(DomainInnovationsService.prototype, 'addActivityLog');
  const supportLogSpy = jest.spyOn(DomainInnovationsService.prototype, 'addSupportLog');
  const notifierSendSpy = jest.spyOn(NotifierService.prototype, 'send').mockResolvedValue(true);

  beforeAll(async () => {
    sut = container.get<SearchService>(SYMBOLS.SearchService);
    await testsHelper.init();
    console.log(scenario);
  });

  // beforeEach(async () => {
  //   em = await testsHelper.getQueryRunnerEntityManager();
  // });

  afterEach(async () => {
    activityLogSpy.mockClear();
    supportLogSpy.mockClear();
    notifierSendSpy.mockClear();
  });

  describe('ingestAllDocuments', () => {
    const getEsDocumentsSpy = jest.spyOn(DomainInnovationsService.prototype, 'getESDocumentsInformation');
    const bulkInsertSpy = jest.spyOn(ElasticSearchService.prototype, 'bulkInsert');

    afterEach(()=> {
      getEsDocumentsSpy.mockClear();
      bulkInsertSpy.mockClear();
    })

    it('should ingest all documents to the index', async () => {
      await sut.ingestAllDocuments();
      expect(getEsDocumentsSpy).toHaveBeenCalledTimes(1);
      expect(bulkInsertSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe.skip('upsertDocument', () => {
    it('should upsert document from a given innovation', async () => {});
  });
});
