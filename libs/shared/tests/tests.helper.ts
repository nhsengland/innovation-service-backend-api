/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type { DataSource, EntityManager } from 'typeorm';

import { container } from '../config/inversify.config';

import { NotFoundError, UserErrorsEnum } from '../errors';
import { IdentityProviderService } from '../services';
import type { SQLConnectionService } from '../services/storage/sql-connection.service';
import SHARED_SYMBOLS from '../services/symbols';
import type { TestUserType } from './builders/user.builder';
import { DTOsHelper } from './helpers/dtos.helper';
import { CompleteScenarioBuilder, CompleteScenarioType } from './scenarios/complete-scenario.builder';

export class TestsHelper {
  private sqlConnection: DataSource;
  private em: EntityManager;

  protected completeScenarioData: CompleteScenarioType;
  protected identityMap = new Map<string, TestUserType>();
  protected userMap = new Map<string, TestUserType>();

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

    // This is set when we're running the tests and not the global setup / teardown
    if (this.completeScenarioData) {
      this.setupGlobalMocks();
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

  private setupGlobalMocks(): void {
    // Helper maps
    for (const user of Object.values(this.completeScenarioData.users)) {
      this.identityMap.set(user.identityId, user);
      this.userMap.set(user.id, user);
    }

    jest.spyOn(IdentityProviderService.prototype, 'getUserInfo').mockImplementation(async (identityId: string) => {
      const user = this.identityMap.get(identityId);
      if (!user) {
        throw new NotFoundError(UserErrorsEnum.USER_IDENTITY_PROVIDER_NOT_FOUND);
      }
      return DTOsHelper.getIdentityUserInfo(user);
    });
  }
}
