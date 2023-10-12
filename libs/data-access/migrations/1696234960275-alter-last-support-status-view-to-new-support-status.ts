import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterLastSupportStatusViewToNewSupportStatus1696234960275 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`

        CREATE OR ALTER VIEW [dbo].[last_support_status_view_entity]
        AS
        SELECT
          a.valid_to statusChangedAt,
          b.innovation_id innovationId,
          b.status currentStatus,
          o.id organisationId,
          o.name organisationName,
          o.acronym organisationAcronym,
          ou.id organisationUnitId,
          ou.name organisationUnitName,
          ou.acronym organisationUnitAcronym
        FROM
          (
            SELECT id, max(valid_to) valid_to
            FROM innovation_support
            FOR SYSTEM_TIME ALL
            WHERE STATUS = 'ENGAGING' and valid_to < '12/31/9999'
            GROUP BY id
          ) A
        INNER JOIN innovation_support B on A.id = b.id
        INNER JOIN organisation_unit OU on OU.id = b.organisation_unit_id
        INNER JOIN organisation O on O.id = OU.organisation_id
        INNER JOIN innovation I on I.id = B.innovation_id
        LEFT JOIN (
          SELECT COUNT(1) cnt, innovation_id
          FROM innovation_support ss
          WHERE ss.status in ('ENGAGING', 'WAITING')
          GROUP BY ss.innovation_id
        ) C ON B.innovation_id = C.innovation_id
        WHERE
          I.status = 'IN_PROGRESS'
          AND B.status IN ('CLOSED', 'UNSUITABLE')
          AND DATEDIFF(DAY, B.updated_at, GETDATE()) > 7
          AND C.cnt IS NULL;

        `);
  }

  public async down(): Promise<void> {}
}
