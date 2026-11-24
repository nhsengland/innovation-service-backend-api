import 'reflect-metadata';
import { DomainUsersService } from './domain-users.service';
import { RecipientsService } from '../../../../apps/notifications/_services/recipients.service';
import { ServiceRoleEnum, UserStatusEnum } from '../../enums';
import type { UserEntity } from '../../entities/user/user.entity';

jest.mock('../../../../apps/notifications/_config', () => ({ container: {} }));

describe('SQL identifier limits', () => {
  const ids = Array.from({ length: 2201 }, (_, i) => `user-${i}`);

  function manager(rows: (ids: string[]) => unknown[]): { em: any; batches: string[][]; queries: any[] } {
    const batches: string[][] = [];
    const queries: any[] = [];
    const em = {
      createQueryBuilder: jest.fn(() => {
        let identifiers: string[] = [];
        const query: any = {};
        for (const method of ['select', 'innerJoin', 'leftJoin', 'where', 'andWhere']) {
          query[method] = jest.fn((_sql: string, params?: Record<string, unknown>) => {
            const values = params?.['userIds'] ?? params?.['identityIds'];
            if (Array.isArray(values)) identifiers = values;
            return query;
          });
        }
        query.getMany = jest.fn(async () => {
          batches.push(identifiers);
          if (identifiers.length > 2100) throw new Error('SQL Server: too many parameters');
          return rows(identifiers);
        });
        queries.push(query);
        return query;
      })
    };
    return { em: em as any, batches, queries };
  }

  it.each(['userIds', 'identityIds'] as const)('chunks and deduplicates %s before one identity lookup', async key => {
    const sqlUser = (id: string): Pick<UserEntity, 'id' | 'identityId' | 'status' | 'serviceRoles' | 'jobTitle'> => ({
      id,
      identityId: id,
      status: UserStatusEnum.ACTIVE,
      serviceRoles: [],
      jobTitle: null
    });
    const { em, batches, queries } = manager(batch => batch.map(sqlUser));
    const identities = {
      getUsersMap: jest.fn(
        async (values: string[]) =>
          new Map(
            values.map(id => [
              id,
              {
                displayName: id,
                email: `${id}@example.test`,
                mobilePhone: null,
                lastLoginAt: null
              }
            ])
          )
      )
    };
    const service = new DomainUsersService(identities as any, {} as any, {} as any);
    const result = await service.getUsersMap({ [key]: [...ids, ids[0]!] } as any, em);
    expect(batches.map(batch => batch.length)).toEqual([1000, 1000, 201]);
    expect(result.size).toBe(2201);
    expect(identities.getUsersMap).toHaveBeenCalledTimes(1);
    expect(identities.getUsersMap).toHaveBeenCalledWith(ids);
    for (const query of queries) {
      expect(query.innerJoin).toHaveBeenCalledWith('users.serviceRoles', 'roles');
      expect(query.where).toHaveBeenCalledWith('users.status <> :userDeleted', { userDeleted: UserStatusEnum.DELETED });
    }
  });

  it('keeps all recipient roles and applies filters to every chunk', async () => {
    const { em, batches, queries } = manager(batch =>
      batch.flatMap(id =>
        ['a', 'b'].map(role => ({
          id: `${id}-${role}`,
          role: ServiceRoleEnum.INNOVATOR,
          isActive: true,
          user: { id, identityId: id, status: UserStatusEnum.ACTIVE, lockedAt: null, jobTitle: null }
        }))
      )
    );
    const service = new RecipientsService({} as any, {} as any);
    const result = await service.getUsersRecipient(
      [...ids, ids[0]!],
      ServiceRoleEnum.INNOVATOR,
      {
        organisation: 'org',
        organisationUnit: 'unit'
      },
      em
    );
    expect(batches.map(batch => batch.length)).toEqual([1000, 1000, 201]);
    expect(result).toHaveLength(4402);
    expect(new Set(result.map(row => row.roleId)).size).toBe(4402);
    for (const query of queries) {
      expect(query.andWhere).toHaveBeenCalledWith('userRole.role IN (:...roles)', {
        roles: [ServiceRoleEnum.INNOVATOR]
      });
      expect(query.andWhere).toHaveBeenCalledWith('userRole.organisation_id IN (:...organisations)', {
        organisations: ['org']
      });
      expect(query.andWhere).toHaveBeenCalledWith('userRole.organisation_unit_id IN (:...organisationUnits)', {
        organisationUnits: ['unit']
      });
      expect(query.andWhere).toHaveBeenCalledWith('user.status <> :userDeleted', {
        userDeleted: UserStatusEnum.DELETED
      });
    }
  });

  it('preserves empty input and userIds precedence', async () => {
    const { em, batches } = manager(() => []);
    const identities = { getUsersMap: jest.fn(async () => new Map()) };
    const service = new DomainUsersService(identities as any, {} as any, {} as any);
    expect((await service.getUsersMap({ userIds: [] }, em)).size).toBe(0);
    expect(em.createQueryBuilder).not.toHaveBeenCalled();
    await (service as any).getUsersList({ userIds: ['sql-user'], identityIds: ['identity-user'] }, em);
    expect(batches).toEqual([['sql-user']]);
    expect(
      await new RecipientsService({} as any, {} as any).getUsersRecipient([], ServiceRoleEnum.INNOVATOR, undefined, em)
    ).toEqual([]);
    expect(em.createQueryBuilder).toHaveBeenCalledTimes(1);
  });

  it('merges repeated SQL users once, keeping the first result', async () => {
    let index = 0;
    const { em } = manager(() => [
      {
        id: 'same-user',
        identityId: `identity-${index++}`,
        status: UserStatusEnum.ACTIVE,
        serviceRoles: [],
        jobTitle: null
      }
    ]);
    const identities = { getUsersMap: jest.fn(async () => new Map()) };
    const service = new DomainUsersService(identities as any, {} as any, {} as any);
    const result = await service.getUsersMap({ userIds: ids }, em);
    expect(result.size).toBe(1);
    expect(result.get('same-user')?.identityId).toBe('identity-0');
    expect(identities.getUsersMap).toHaveBeenCalledWith(['identity-0']);
  });
});
