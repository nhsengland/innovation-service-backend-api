import type { DataSource, EntityManager } from 'typeorm';

import { container } from '../config/inversify.config';

import { ServiceRoleEnum } from '../enums';
import type { SQLConnectionService } from '../services/storage/sql-connection.service';
import SHARED_SYMBOLS from '../services/symbols';
import type { DomainContextType } from '../types';
import type { TestUserType } from './builders/user.builder';
import { CompleteScenarioBuilder, CompleteScenarioType } from './scenarios/complete-scenario.builder';

export class TestsHelper {
  private sqlConnection: DataSource;
  private em: EntityManager;

  private completeScenarioData: CompleteScenarioType;

  constructor() {
    // This is set in jest.setup.ts and is used to share data between tests)
    // Comment this if not using global setup / teardown
    this.completeScenarioData = (global as any).completeScenarioData;
  }

  async init(): Promise<this> {
    this.sqlConnection = container.get<SQLConnectionService>(SHARED_SYMBOLS.SQLConnectionService).getConnection();

    while (!this.sqlConnection.isInitialized) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return this;
  }

  async cleanUp(): Promise<void> {
    const query = this.sqlConnection.createQueryRunner();
    await query.query(`
      IF OBJECTPROPERTY(OBJECT_ID('EmpSalary'), 'TableTemporalType') = 2 ALTER TABLE EmpSalary SET (SYSTEM_VERSIONING = OFF)
      EXEC sp_MSForEachTable 'IF OBJECTPROPERTY(OBJECT_ID(''?''), ''TableTemporalType'') = 2 ALTER TABLE ? SET (SYSTEM_VERSIONING = OFF)';
      EXEC sp_MSForEachTable "ALTER TABLE ? NOCHECK CONSTRAINT all"
      EXEC sp_MSForEachTable "SET QUOTED_IDENTIFIER ON; DELETE FROM ?"
      EXEC sp_MSForEachTable "ALTER TABLE ? WITH CHECK CHECK CONSTRAINT all"
      EXEC sp_MSForEachTable 'IF OBJECTPROPERTY(OBJECT_ID(''?''), ''TableTemporalType'') = 2 ALTER TABLE ? SET (SYSTEM_VERSIONING = ON)';
    `);
  }

  async createCompleteScenario(): Promise<CompleteScenarioType> {
    this.completeScenarioData = await new CompleteScenarioBuilder(this.sqlConnection).createScenario();
    return this.completeScenarioData;
  }
  getCompleteScenario(): CompleteScenarioType {
    return this.completeScenarioData;
  }

  getUserContext(user: TestUserType, userRole?: ServiceRoleEnum): DomainContextType {
    if (!userRole) {
      if (user.roles.length === 1) {
        userRole = user.roles[0]?.role;
      } else {
        throw new Error('TestsHelper::getUserContext: User with more than 1 role, needs userRole parameter defined.');
      }
    }

    const role = user.roles.find(r => r.role === userRole);
    if (!role) {
      throw new Error('TestsHelper::getUserContext: User role not found.');
    }

    if (role.role === ServiceRoleEnum.INNOVATOR) {
      if (!role.organisation) {
        throw new Error('Invalid role found.');
      }
      return {
        id: user.id,
        identityId: user.identityId,
        organisation: { id: role.organisation.id, name: role.organisation.name, acronym: null },
        currentRole: { id: role.id, role: role.role }
      };
    }

    if (role.role === ServiceRoleEnum.ACCESSOR || role.role === ServiceRoleEnum.QUALIFYING_ACCESSOR) {
      if (!role.organisation || !role.organisationUnit) {
        throw new Error('Invalid role found.');
      }
      return {
        id: user.id,
        identityId: user.identityId,
        organisation: {
          id: role.organisation.id,
          name: role.organisation.name,
          acronym: null,
          organisationUnit: { id: role.organisationUnit.id, name: role.organisationUnit.name, acronym: '' }
        },
        currentRole: { id: role.id, role: role.role }
      };
    }

    if (role.role === ServiceRoleEnum.ADMIN) {
      return {
        id: user.id,
        identityId: user.identityId,
        currentRole: { id: role.id, role: role.role }
      };
    }

    if (role.role === ServiceRoleEnum.ASSESSMENT) {
      return {
        id: user.id,
        identityId: user.identityId,
        currentRole: { id: role.id, role: role.role }
      };
    }

    throw new Error('TestsHelper::getUserContext: Unexpected error, no role found.');
  }

  /**
   * A new query runner is required for each test suite in order to support concurrent tests since
   * the query runner is a real database connection and doesn't use the connection pooling. This causes
   * concurrency issues when running transactions.
   *
   * More information in: https://typeorm.biunav.com/en/connection.html#what-is-connection
   *
   * Currently there's still issues with query runner and multiple paralel tests, run with --runInBand
   *
   * @returns entity manager to be used in the tests with a transaction started.
   */
  async getQueryRunnerEntityManager(): Promise<EntityManager> {
    this.em = this.sqlConnection.createQueryRunner().manager;
    await this.em.queryRunner?.startTransaction();
    return this.em;
  }

  /**
   * Rollback and releases queryRunner so that the connection can be reused.
   * @param em entity manager whose query runner is going to be released
   */
  async releaseQueryRunnerEntityManager(): Promise<void> {
    await this.em.queryRunner?.rollbackTransaction();
    await this.em.queryRunner?.release();
  }
}
