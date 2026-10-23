import type { EntityManager } from 'typeorm';
import { ServiceRoleEnum, StrategicRoleEnum } from '@admin/shared/enums';
import { UsersService } from './users.service';

describe('Strategic roles list by unit', () => {
  const organisation = { id: 'org', name: 'Network' };
  const london = { id: 'london', name: 'London' };
  const manchester = { id: 'manchester', name: 'Manchester' };
  type Membership = {
    organisationId: string;
    organisationUnit: typeof london | null;
    role: ServiceRoleEnum;
    isActive: boolean;
  };
  const role = (unit: typeof london | null, overrides: Partial<Membership> = {}): Membership => ({
    organisationId: organisation.id,
    organisationUnit: unit,
    role: ServiceRoleEnum.ACCESSOR,
    isActive: true,
    ...overrides
  });

  async function list(records: unknown[]): ReturnType<UsersService['getStrategicRolesList']> {
    const query: Record<string, jest.Mock> = {};
    for (const method of ['innerJoinAndSelect', 'leftJoinAndSelect', 'andWhere']) {
      query[method] = jest.fn().mockReturnValue(query);
    }
    query['getMany'] = jest.fn().mockResolvedValue(records);
    const em = { createQueryBuilder: jest.fn().mockReturnValue(query) } as unknown as EntityManager;
    const sut = Object.create(UsersService.prototype);
    sut.domainService = {
      users: {
        getUsersMap: jest.fn().mockResolvedValue({
          getDisplayName: (id: string) => id,
          get: (id: string) => ({ email: `${id}@test.com` })
        })
      }
    };
    return sut.getStrategicRolesList(em);
  }

  it('keeps champions and sponsors in their own units, sorted by unit name', async () => {
    const result = await list([
      {
        organisation,
        strategicRole: StrategicRoleEnum.CHAMPION,
        user: { identityId: 'champion', serviceRoles: [role(manchester), role(london), role(london)] }
      },
      {
        organisation,
        strategicRole: StrategicRoleEnum.SENIOR_SPONSOR,
        user: { identityId: 'sponsor', serviceRoles: [role(london)] }
      }
    ]);
    expect(result).toEqual([
      {
        organisation,
        organisationUnit: london,
        champions: [{ name: 'champion', email: 'champion@test.com' }],
        seniorSponsors: [{ name: 'sponsor', email: 'sponsor@test.com' }]
      },
      {
        organisation,
        organisationUnit: manchester,
        champions: [{ name: 'champion', email: 'champion@test.com' }],
        seniorSponsors: []
      }
    ]);
  });

  it('excludes inactive, unrelated and non-accessor memberships', async () => {
    const result = await list([
      {
        organisation,
        strategicRole: StrategicRoleEnum.CHAMPION,
        user: {
          identityId: 'champion',
          serviceRoles: [
            role(london, { isActive: false }),
            role(manchester, { organisationId: 'other' }),
            role(null),
            role(london, { role: ServiceRoleEnum.ADMIN })
          ]
        }
      }
    ]);
    expect(result).toEqual([]);
  });

  it('includes qualifying accessors and preserves units named after their organisation', async () => {
    const unit = { id: 'network-unit', name: organisation.name };
    const result = await list([
      {
        organisation,
        strategicRole: StrategicRoleEnum.SENIOR_SPONSOR,
        user: {
          identityId: 'sponsor',
          serviceRoles: [role(unit, { role: ServiceRoleEnum.QUALIFYING_ACCESSOR })]
        }
      }
    ]);
    expect(result).toEqual([
      {
        organisation,
        organisationUnit: unit,
        champions: [],
        seniorSponsors: [{ name: 'sponsor', email: 'sponsor@test.com' }]
      }
    ]);
  });

  it('returns no rows when no strategic roles exist', async () => {
    expect(await list([])).toEqual([]);
  });
});
