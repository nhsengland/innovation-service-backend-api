import azureFunction from '.';

import { AzureHttpTriggerBuilder, TestsHelper } from '@innovations/shared/tests';
import type { TestUserType } from '@innovations/shared/tests/builders/user.builder';
import type { ErrorResponseType } from '@innovations/shared/types';
import { randBinary, randText } from '@ngneat/falso';
import { ExportFileService } from '../_services/export-file-service';
import type { BodyType, ParamsType } from './validation.schemas';

jest.mock('@innovations/shared/decorators', () => ({
  JwtDecoder: jest.fn().mockImplementation(() => (_: any, __: string, descriptor: PropertyDescriptor) => {
    return descriptor;
  }),
  Audit: jest.fn().mockImplementation(() => (_: any, __: string, descriptor: PropertyDescriptor) => {
    return descriptor;
  })
}));

const testsHelper = new TestsHelper();
const scenario = testsHelper.getCompleteScenario();

beforeAll(async () => {
  await testsHelper.init();
});

const pdf = randBinary();
const generatePDFMock = jest.spyOn(ExportFileService.prototype, 'create').mockResolvedValue(pdf);

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-innovation-pdf-export Suite', () => {
  const body = [
    {
      sections: [
        {
          answers: [
            { label: randText(), value: randText() },
            { label: randText(), value: randText() }
          ],
          section: randText()
        }
      ],
      title: randText()
    }
  ];
  describe('200', () => {
    it('should return the pdf', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.johnInnovator)
        .setParams<ParamsType>({
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id
        })
        .setBody<BodyType>(body)
        .call<unknown>(azureFunction);

      expect(result.body).toStrictEqual(pdf);
      expect(generatePDFMock).toHaveBeenCalledTimes(1);
      expect(generatePDFMock).toHaveBeenCalledWith(
        'pdf',
        scenario.users.johnInnovator.innovations.johnInnovation.name,
        body
      );
    });
  });

  describe('Access', () => {
    it.each([
      ['Admin', 403, scenario.users.allMighty],
      ['QA', 200, scenario.users.aliceQualifyingAccessor],
      ['NA', 200, scenario.users.paulNeedsAssessor],
      ['Innovator owner', 200, scenario.users.johnInnovator]
    ])('access with user %s should give %i', async (_role: string, status: number, user: TestUserType) => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(user)
        .setParams<ParamsType>({
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id
        })
        .setBody<BodyType>(body)
        .call<ErrorResponseType>(azureFunction);

      if (status === 200) {
        expect(result.body).toStrictEqual(pdf);
      } else {
        expect(result.status).toBe(status);
      }
    });
  });
});
