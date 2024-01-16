import azureFunction from '.';

import {
  InnovationGroupedStatusEnum,
  InnovationStatusEnum,
  InnovationSupportStatusEnum,
  PhoneUserPreferenceEnum
} from '@innovations/shared/enums';
import { AzureHttpTriggerBuilder, TestsHelper } from '@innovations/shared/tests';
import type { TestUserType } from '@innovations/shared/tests/builders/user.builder';
import type { ErrorResponseType } from '@innovations/shared/types';
import {
  randBoolean,
  randCountry,
  randEmail,
  randFullName,
  randNumber,
  randPastDate,
  randPhoneNumber,
  randProductDescription,
  randProductName,
  randUuid
} from '@ngneat/falso';
import { pick } from 'lodash';
import { InnovationsService } from '../_services/innovations.service';
import type { ResponseDTO } from './transformation.dtos';
import type { ParamsType } from './validation.schemas';

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

const expected: Awaited<ReturnType<InnovationsService['getInnovationInfo']>> = {
  id: randUuid(),
  name: randProductName(),
  categories: [],
  createdAt: randPastDate(),
  description: randProductDescription(),
  countryName: randCountry(),
  groupedStatus: InnovationGroupedStatusEnum.AWAITING_NEEDS_ASSESSMENT,
  lastEndSupportAt: randPastDate(),
  otherCategoryDescription: null,
  postCode: null,
  status: InnovationStatusEnum.IN_PROGRESS,
  statusUpdatedAt: randPastDate(),
  submittedAt: randPastDate(),
  version: '1.0',
  collaboratorId: undefined
};
const mock = jest.spyOn(InnovationsService.prototype, 'getInnovationInfo').mockResolvedValue(expected);

afterEach(() => {
  jest.clearAllMocks();
});

describe('v1-innovation-info Suite', () => {
  describe('200', () => {
    it('should return the innovation', async () => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.johnInnovator)
        .setParams<ParamsType>({
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id
        })
        .call<ResponseDTO>(azureFunction);

      expect(result.body).toStrictEqual(expected);
      expect(result.status).toBe(200);
      expect(mock).toHaveBeenCalledTimes(1);
    });

    const expectedWithOwner = {
      ...expected,
      owner: {
        id: randUuid(),
        name: randFullName(),
        contactByEmail: randBoolean(),
        contactByPhone: randBoolean(),
        contactByPhoneTimeframe: PhoneUserPreferenceEnum.AFTERNOON,
        email: randEmail(),
        contactDetails: randPhoneNumber(),
        mobilePhone: randPhoneNumber(),
        isActive: randBoolean(),
        lastLoginAt: randPastDate()
      }
    };

    it('should return owner info if present', async () => {
      mock.mockResolvedValueOnce(expectedWithOwner);
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.johnInnovator)
        .setParams<ParamsType>({
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id
        })
        .call<ResponseDTO>(azureFunction);

      expect(result.body).toStrictEqual({
        ...expectedWithOwner,
        owner: {
          ...pick(expectedWithOwner.owner, ['id', 'name', 'isActive']),
          organisation: undefined
        }
      });
    });

    it('should include owner with contact details for NA', async () => {
      mock.mockResolvedValueOnce(expectedWithOwner);
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.paulNeedsAssessor)
        .setParams<ParamsType>({
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id
        })
        .call<ResponseDTO>(azureFunction);

      expect(result.body).toStrictEqual({
        ...expectedWithOwner,
        owner: {
          ...pick(expectedWithOwner.owner, [
            'id',
            'name',
            'isActive',
            'email',
            'mobilePhone',
            'contactByEmail',
            'contactByPhone',
            'contactByPhoneTimeframe',
            'contactDetails'
          ]),
          organisation: undefined
        }
      });
    });

    it('should include owner with contact details+last login at for admin', async () => {
      mock.mockResolvedValueOnce(expectedWithOwner);
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.allMighty)
        .setParams<ParamsType>({
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id
        })
        .call<ResponseDTO>(azureFunction);

      expect(result.body).toStrictEqual({
        ...expectedWithOwner,
        owner: {
          ...pick(expectedWithOwner.owner, [
            'id',
            'name',
            'isActive',
            'email',
            'mobilePhone',
            'contactByEmail',
            'contactByPhone',
            'contactByPhoneTimeframe',
            'contactDetails',
            'lastLoginAt'
          ]),
          organisation: undefined
        }
      });
    });

    it('should include owner organisations if he has', async () => {
      const organisation = { name: randFullName(), size: null, registrationNumber: null };
      mock.mockResolvedValueOnce({
        ...expectedWithOwner,
        owner: { ...expectedWithOwner.owner, organisation }
      });
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.johnInnovator)
        .setParams<ParamsType>({
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id
        })
        .call<ResponseDTO>(azureFunction);

      expect(result.body).toStrictEqual({
        ...expectedWithOwner,
        owner: {
          ...pick(expectedWithOwner.owner, ['id', 'name', 'isActive']),
          organisation
        }
      });
    });

    it('should test assessments', async () => {
      const expectedWithAssessment = {
        ...expected,
        assessment: {
          id: randUuid(),
          assignedTo: { id: randUuid(), name: randFullName(), userRoleId: randUuid() },
          createdAt: randPastDate(),
          finishedAt: randPastDate(),
          reassessmentCount: randNumber()
        }
      };
      mock.mockResolvedValueOnce(expectedWithAssessment);
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.johnInnovator)
        .setParams<ParamsType>({
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id
        })
        .call<ResponseDTO>(azureFunction);

      expect(result.body).toStrictEqual(expectedWithAssessment);
    });

    it('should test supports', async () => {
      const expectedWithSupport = {
        ...expected,
        supports: [
          {
            id: randUuid(),
            status: InnovationSupportStatusEnum.ENGAGING,
            organisationUnitId: randUuid()
          }
        ]
      };
      mock.mockResolvedValueOnce(expectedWithSupport);
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.johnInnovator)
        .setParams<ParamsType>({
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id
        })
        .call<ResponseDTO>(azureFunction);

      expect(result.body).toStrictEqual(expectedWithSupport);
    });

    it('should return collaborator id', async () => {
      const expectedWithCollaboratorId = {
        ...expected,
        collaboratorId: randUuid()
      };
      mock.mockResolvedValueOnce(expectedWithCollaboratorId);
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(scenario.users.johnInnovator)
        .setParams<ParamsType>({
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id
        })
        .call<ResponseDTO>(azureFunction);

      expect(result.body).toStrictEqual(expectedWithCollaboratorId);
    });
  });

  describe('Access', () => {
    it.each([
      ['Admin', 200, scenario.users.allMighty],
      ['QA', 200, scenario.users.aliceQualifyingAccessor],
      ['NA', 200, scenario.users.paulNeedsAssessor],
      ['Innovator owner', 200, scenario.users.johnInnovator],
      ['Innovator other', 403, scenario.users.ottoOctaviusInnovator]
    ])('access with user %s should give %i', async (_role: string, status: number, user: TestUserType) => {
      const result = await new AzureHttpTriggerBuilder()
        .setAuth(user)
        .setParams<ParamsType>({
          innovationId: scenario.users.johnInnovator.innovations.johnInnovation.id
        })
        .call<ErrorResponseType>(azureFunction);

      expect(result.status).toBe(status);
    });
  });
});
