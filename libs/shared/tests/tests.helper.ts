/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type { DataSource, EntityManager } from 'typeorm';

import { container } from '../config/inversify.config';

import { InnovationEntity, InnovationSectionEntity, UserEntity, UserRoleEntity } from '../entities';
import { InnovationSectionStatusEnum, UserStatusEnum } from '../enums';
import { NotFoundError, UserErrorsEnum } from '../errors';
import { CurrentCatalogTypes } from '../schemas/innovation-record';
import { IdentityProviderService } from '../services';
import type { SQLConnectionService } from '../services/storage/sql-connection.service';
import SHARED_SYMBOLS from '../services/symbols';
import type { TestUserType } from './builders/user.builder';
import { DTOsHelper } from './helpers/dtos.helper';
import { CompleteScenarioBuilder, CompleteScenarioType } from './scenarios/complete-scenario.builder';

export class TestsHelper {
  private sqlConnection: DataSource;
  private em: EntityManager;

  protected readonly completeScenarioBuilder: CompleteScenarioBuilder = new CompleteScenarioBuilder();

  async init(): Promise<this> {
    this.sqlConnection = container.get<SQLConnectionService>(SHARED_SYMBOLS.SQLConnectionService).getConnection();

    while (!this.sqlConnection.isInitialized) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // This is set when we're running the tests and not the global setup / teardown
    if (this.completeScenarioBuilder.getScenario()) {
      this.setupGlobalMocks();
    }

    return this;
  }

  async cleanUp(): Promise<void> {
    const query = this.sqlConnection.createQueryRunner();
    await query.query(`
      EXEC sp_MSForEachTable 'IF OBJECTPROPERTY(OBJECT_ID(''?''), ''TableTemporalType'') = 2 ALTER TABLE ? SET (SYSTEM_VERSIONING = OFF)';
      EXEC sp_MSForEachTable 'ALTER TABLE ? NOCHECK CONSTRAINT all'
      EXEC sp_MSForEachTable 'SET QUOTED_IDENTIFIER ON; IF OBJECT_ID(''?'') NOT IN (ISNULL(OBJECT_ID(''[dbo].[Migrations]''),0)) DELETE FROM ?'
      EXEC sp_MSForEachTable 'ALTER TABLE ? WITH CHECK CHECK CONSTRAINT all'
      EXEC sp_MSForEachTable @COMMAND1 = 'DECLARE @Original nvarchar(max)
        DECLARE @TableName nvarchar(max)
        DECLARE @SQLString NVARCHAR(max);  
        SET @Original = ''?''
        SET @TableName = REPLACE(''?'',''_history'','''')
        SET @SQLString = ''ALTER TABLE '' + @TableName + '' SET ( SYSTEM_VERSIONING = ON (HISTORY_TABLE = '' +  @Original +'', History_retention_period = 7 YEAR))''
        EXEC sp_executesql @SQLString
      ', @WHEREAND='AND object_name(object_id) LIKE ''%_history%''';
    `);
  }

  async createCompleteScenario(): Promise<CompleteScenarioType> {
    return this.completeScenarioBuilder.createScenario(this.sqlConnection);
  }
  getCompleteScenario(): CompleteScenarioType {
    return this.completeScenarioBuilder.getScenario();
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

  async deactivateUser(userId: string, em: EntityManager): Promise<void> {
    await em.getRepository(UserEntity).update({ id: userId }, { status: UserStatusEnum.LOCKED });
  }

  async deleteUser(userId: string, em: EntityManager): Promise<void> {
    await em.getRepository(UserEntity).update({ id: userId }, { status: UserStatusEnum.DELETED });
  }

  async deactivateUserRole(roleId: string, em: EntityManager): Promise<void> {
    await em.getRepository(UserRoleEntity).update({ id: roleId }, { isActive: false });
  }

  async submitAllInnovationSections(innovationId: string, em: EntityManager): Promise<void> {
    const sections: Partial<InnovationSectionEntity>[] = [];
    for (const sectionEnum of CurrentCatalogTypes.InnovationSections) {
      sections.push({
        status: InnovationSectionStatusEnum.SUBMITTED,
        section: sectionEnum,
        innovation: InnovationEntity.new({ id: innovationId })
      });

      await em.getRepository(InnovationSectionEntity).save(sections);
    }
  }

  private setupGlobalMocks(): void {
    const identityMap = this.completeScenarioBuilder.getIdentityMap();
    const emailMap = this.completeScenarioBuilder.getEmailMap();
    // jest.spyOn(IdentityProviderService.prototype, 'getUserInfo').mockImplementation(async (identityId: string) => {
    //   const user = identityMap.get(identityId);
    //   if (!user) {
    //     throw new NotFoundError(UserErrorsEnum.USER_IDENTITY_PROVIDER_NOT_FOUND);
    //   }
    //   return DTOsHelper.getIdentityUserInfo(user);
    // });

    jest.spyOn(IdentityProviderService.prototype, 'getUsersList').mockImplementation(async (identityIds: string[]) => {
      return identityIds
        .map(identityId => identityMap.get(identityId))
        .filter((x): x is TestUserType => !!x)
        .map(DTOsHelper.getIdentityUserInfo);
    });

    jest.spyOn(IdentityProviderService.prototype, 'getUserInfoByEmail').mockImplementation(async (email: string) => {
      const user = emailMap.get(email);
      if (!user) {
        throw new NotFoundError(UserErrorsEnum.USER_IDENTITY_PROVIDER_NOT_FOUND);
      }
      return { ...DTOsHelper.getIdentityUserInfo(user), phone: null };
    });

    jest.spyOn(IdentityProviderService.prototype, 'updateUser').mockImplementation(async (
    identityId: string,
    _body: { displayName?: string; mobilePhone?: string | null; accountEnabled?: boolean }
    ) => {
      const user = identityMap.get(identityId);
      if (!user) {
        throw new NotFoundError(UserErrorsEnum.USER_IDENTITY_PROVIDER_NOT_FOUND);
      }
    });

    jest.spyOn(IdentityProviderService.prototype, 'deleteUser').mockImplementation(async (
      identityId: string
    ) => {
      const user = identityMap.get(identityId);
      if (!user) {
        throw new NotFoundError(UserErrorsEnum.USER_IDENTITY_PROVIDER_NOT_FOUND);
      }
    });
  }
}
