import azureFunction from '.';

import { AzureHttpTriggerBuilder, TestsHelper } from '@innovations/shared/tests';
import type { ErrorResponseType } from '@innovations/shared/types';
import { IRExportService } from '@innovations/shared/services/storage/ir-export.service';

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

const mock = jest.spyOn(IRExportService.prototype, 'generateDocx').mockResolvedValue(Buffer.from('mock docx content'));

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-innovation-docx-export', () => {
  describe('200', () => {
    it.each([
      ['Admin', 200, scenario.users.allMighty],
      ['QA', 200, scenario.users.aliceQualifyingAccessor],
      ['Accessor', 200, scenario.users.ingridAccessor],
      ['NA', 200, scenario.users.paulNeedsAssessor],
      ['Innovator', 200, scenario.users.johnInnovator]
    ])('should return %i when user is %s', async (_role: string, status: number, user: any) => {
      const result = await new AzureHttpTriggerBuilder().setAuth(user).call<string>(azureFunction);

      expect(result.status).toBe(status);
      if (status === 200) {
        expect(result.body).toBe('bW9jayBkb2N4IGNvbnRlbnQ=');
        expect(result.headers).toMatchObject({
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Encoding': 'base64'
        });
        expect(mock).toHaveBeenCalled();
      }
    });

    it('should return valid base64 content', async () => {
      const mockBuffer = Buffer.from('test docx content for base64 encoding');
      mock.mockResolvedValueOnce(mockBuffer);

      const result = await new AzureHttpTriggerBuilder().setAuth(scenario.users.allMighty).call<string>(azureFunction);

      expect(result.body).toBe(mockBuffer.toString('base64'));
      expect(result.status).toBe(200);
    });

    it('should handle large buffer content correctly', async () => {
      const largeBuffer = Buffer.alloc(1024 * 1024, 'x'); // 1MB buffer
      mock.mockResolvedValueOnce(largeBuffer);

      const result = await new AzureHttpTriggerBuilder().setAuth(scenario.users.allMighty).call<string>(azureFunction);

      expect(result.status).toBe(200);
      expect(result.body).toBe(largeBuffer.toString('base64'));
      expect(result.body.length).toBeGreaterThan(1000000); // Base64 encoded should be larger
    });

    it('should handle empty buffer content', async () => {
      const emptyBuffer = Buffer.alloc(0);
      mock.mockResolvedValueOnce(emptyBuffer);

      const result = await new AzureHttpTriggerBuilder().setAuth(scenario.users.allMighty).call<string>(azureFunction);

      expect(result.status).toBe(200);
      expect(result.body).toBe('');
    });
  });

  describe('Access', () => {
    it.each([
      ['Admin', scenario.users.allMighty],
      ['QA', scenario.users.aliceQualifyingAccessor],
      ['A', scenario.users.ingridAccessor],
      ['NA', scenario.users.paulNeedsAssessor],
      ['Innovator', scenario.users.johnInnovator]
    ])('access with user %s should be granted', async (_role: string, user: any) => {
      const result = await new AzureHttpTriggerBuilder().setAuth(user).call<string>(azureFunction);

      expect(result.status).toBe(200);
    });
  });

  describe('500', () => {
    it('should return 500 when service throws an error', async () => {
      mock.mockRejectedValueOnce(new Error('Service error'));

      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.allMighty)
        .call<ErrorResponseType>(azureFunction);

      expect(result.status).toBe(500);
      expect(result.body.error).toBe('ERR.1000');
      expect(result.body.message).toBe('Unknown error.');
      expect(mock).toHaveBeenCalledTimes(1);
    });

    it('should handle service returning null buffer', async () => {
      mock.mockResolvedValueOnce(null as any);

      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.allMighty)
        .call<ErrorResponseType>(azureFunction);

      expect(result.status).toBe(500);
      expect(result.body.error).toBe('ERR.1000');
      expect(result.body.message).toBe('Unknown error.');
      expect(mock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Service Integration', () => {
    it('should call IRExportService.generateDocx without parameters', async () => {
      await new AzureHttpTriggerBuilder().setAuth(scenario.users.allMighty).call<string>(azureFunction);

      expect(mock).toHaveBeenCalledTimes(1);
      expect(mock).toHaveBeenCalledWith(); // No parameters expected
    });

    it('should return correct content type headers', async () => {
      const result = await new AzureHttpTriggerBuilder().setAuth(scenario.users.allMighty).call<string>(azureFunction);

      expect(result.status).toBe(200);
      expect(result.headers).toMatchObject({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Encoding': 'base64'
      });
    });

    it('should work for all authorized user types', async () => {
      const users = [
        scenario.users.allMighty,
        scenario.users.aliceQualifyingAccessor,
        scenario.users.ingridAccessor,
        scenario.users.paulNeedsAssessor,
        scenario.users.johnInnovator
      ];

      for (const user of users) {
        const result = await new AzureHttpTriggerBuilder().setAuth(user).call<string>(azureFunction);

        expect(result.status).toBe(200);
        expect(typeof result.body).toBe('string');
        expect(result.body).toBe('bW9jayBkb2N4IGNvbnRlbnQ=');
      }

      expect(mock).toHaveBeenCalledTimes(users.length);
    });
  });

  describe('Response Format', () => {
    it('should return base64 string directly as response body', async () => {
      const testContent = 'This is test DOCX content';
      const testBuffer = Buffer.from(testContent);
      mock.mockResolvedValueOnce(testBuffer);

      const result = await new AzureHttpTriggerBuilder().setAuth(scenario.users.allMighty).call<string>(azureFunction);

      expect(result.status).toBe(200);
      expect(typeof result.body).toBe('string');
      expect(result.body).toBe(testBuffer.toString('base64'));

      // Verify we can decode it back
      const decodedContent = Buffer.from(result.body, 'base64').toString();
      expect(decodedContent).toBe(testContent);
    });

    it('should handle binary content properly', async () => {
      const binaryBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // ZIP header (DOCX is ZIP-based)
      mock.mockResolvedValueOnce(binaryBuffer);

      const result = await new AzureHttpTriggerBuilder().setAuth(scenario.users.allMighty).call<string>(azureFunction);

      expect(result.status).toBe(200);
      expect(result.body).toBe(binaryBuffer.toString('base64'));

      // Verify binary data integrity
      const decodedBuffer = Buffer.from(result.body, 'base64');
      expect(decodedBuffer).toEqual(binaryBuffer);
    });
  });
});
