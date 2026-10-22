import type { MigrationInterface, QueryRunner } from 'typeorm';

const OLD_ENGAGING = `
            SELECT DISTINCT s.innovation_id
            FROM innovation_support s
            INNER JOIN innovations i ON i.id = s.innovation_id AND i.current_major_assessment_id = s.major_assessment_id
            WHERE s.deleted_at IS NULL AND s.status IN ('ENGAGING', 'WAITING')
        `;
const NEW_ENGAGING = `
            SELECT DISTINCT s.innovation_id
            FROM innovation_support s
            INNER JOIN innovations i ON i.id = s.innovation_id
            WHERE s.deleted_at IS NULL AND s.status IN ('ENGAGING', 'WAITING')
        `;
const OLD_CLOSED = `
            SELECT s.innovation_id, MAX(s.finished_at) as finished_at
            FROM innovation_support s
            INNER JOIN innovations i ON i.id = s.innovation_id AND i.current_major_assessment_id = s.major_assessment_id AND i.status='IN_PROGRESS'
            WHERE s.deleted_at IS NULL AND s.status IN ('CLOSED', 'UNSUITABLE')
            GROUP by s.innovation_id
        `;
const NEW_CLOSED = `
            SELECT s.innovation_id, MAX(s.finished_at) as finished_at
            FROM innovation_support s
            INNER JOIN innovations i ON i.id = s.innovation_id AND i.status='IN_PROGRESS'
            INNER JOIN innovation_assessment current_major ON current_major.id = i.current_major_assessment_id
            WHERE s.deleted_at IS NULL AND s.status IN ('CLOSED', 'UNSUITABLE')
                AND s.finished_at >= current_major.finished_at
            GROUP by s.innovation_id
        `;

/** Preserve each environment's deployment baseline and the rest of the live view. */
export class CountSupportAcrossAssessments1792368000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.alter(queryRunner, false);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.alter(queryRunner, true);
  }

  private async alter(queryRunner: QueryRunner, rollback: boolean): Promise<void> {
    // SQL Server's runner pins a physical pooled connection only inside a transaction.
    if (!queryRunner.isTransactionActive) {
      throw new Error('Cannot alter grouped status view: active transaction is required.');
    }
    const [module] = await queryRunner.query(`
      SELECT definition, uses_ansi_nulls, uses_quoted_identifier
      FROM sys.sql_modules
      WHERE object_id = OBJECT_ID(N'dbo.innovation_grouped_status_view_entity', N'V')
    `);
    if (!module?.definition) {
      throw new Error('Cannot alter grouped status view: readable live definition is required.');
    }
    const definition: string = module.definition;
    const ctes = /(,\s*engaging\s+AS\s*\()([\s\S]*?)(\),\s*closed\s+AS\s*\()([\s\S]*?)(\)\s*SELECT\b)/gi;
    const matches = [...definition.matchAll(ctes)];
    const normalize = (sql: string): string => sql.replace(/\s+/g, '').toLowerCase();
    const [match] = matches;
    if (matches.length !== 1 || !match) {
      throw new Error('Cannot alter grouped status view: unexpected engaging/closed CTE shape.');
    }
    const isOld = normalize(match[2]!) === normalize(OLD_ENGAGING) && normalize(match[4]!) === normalize(OLD_CLOSED);
    const isNew = normalize(match[2]!) === normalize(NEW_ENGAGING) && normalize(match[4]!) === normalize(NEW_CLOSED);
    if (!isOld && !isNew) {
      throw new Error('Cannot alter grouped status view: engaging/closed CTE definition has drifted.');
    }
    const header =
      /^\s*(?:CREATE(?:\s+OR\s+ALTER)?|ALTER)\s+VIEW\s+\[?dbo\]?\s*\.\s*\[?innovation_grouped_status_view_entity\]?\s+AS\b/i;
    if (!header.test(definition)) {
      throw new Error('Cannot alter grouped status view: unexpected view header.');
    }
    if (rollback ? isOld : isNew) return;
    const altered = definition.replace(
      ctes,
      (_all, engaging, _oldEngaging, closed, _oldClosed, select) =>
        engaging + (rollback ? OLD_ENGAGING : NEW_ENGAGING) + closed + (rollback ? OLD_CLOSED : NEW_CLOSED) + select
    );
    // ALTER VIEW must be the first statement in its batch; use this same runner/session
    // so SQL Server records the original module SET options on both up and down.
    await queryRunner.query(
      `SET ANSI_NULLS ${module.uses_ansi_nulls ? 'ON' : 'OFF'}; SET QUOTED_IDENTIFIER ${module.uses_quoted_identifier ? 'ON' : 'OFF'};`
    );
    await queryRunner.query(altered.replace(/^(\s*)(?:CREATE(?:\s+OR\s+ALTER)?|ALTER)\s+VIEW/i, '$1ALTER VIEW'));
  }
}
