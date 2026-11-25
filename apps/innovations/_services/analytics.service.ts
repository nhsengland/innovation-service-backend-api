import { injectable } from 'inversify';
import { BaseService } from './base.service';

@injectable()
export class AnalyticsService extends BaseService {
  async updateAnalyticsOrgsInactivityBreach(force = false): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 5000));
    if (force) {
      await this.sqlConnection.query(`
        TRUNCATE TABLE analytics_organisation_inactivity_breach;
      `);
    }

    // return the last date of the analytics_organisation_inactivity_breach table or first support if it doesn't exist
    const sqlLastDate =
      (
        await this.sqlConnection.query(`
      SELECT date FROM job_tracker WHERE job='analytics_organisation_inactivity_breach';
    `)
      )[0] ??
      (
        await this.sqlConnection.query(`
      SELECT TOP 1 CAST(created_at as DATE) as date FROM innovation_support ORDER BY created_at ASC;
    `)
      )[0];

    if (!sqlLastDate) {
      this.logger.log('No data found in analytics_organisation_inactivity_breach or innovation_support');
      return;
    }

    const lastDate = new Date(sqlLastDate.date);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    while (lastDate < yesterday) {
      this.logger.log(`Updating analytics_organisation_inactivity_breach for date ${lastDate.toISOString()}`);
      await this.sqlConnection.transaction(async t => {
        // Recent supports wouldn't require this but this way it's compatible with all
        await t.connection.query(
          `
          WITH engaging AS (
            SELECT id, innovation_id, organisation_unit_id
            FROM innovation_SUPPORT FOR SYSTEM_TIME AS OF @0
            WHERE status='ENGAGING' AND is_most_recent=1
          ), activities AS (
            SELECT e.id, e.innovation_id, MAX(l.created_at) as last_activity FROM activity_log l
            INNER JOIN user_role r ON l.user_role_id = r.id
            INNER JOIN engaging e ON l.innovation_id = e.innovation_id AND e.organisation_unit_id = r.organisation_unit_id
            WHERE l.created_at>=DATEADD(MONTH, -3, @0) AND l.created_at<@0
            GROUP BY e.id, e.innovation_id
          ) INSERT INTO analytics_organisation_inactivity_breach (date, innovation_id, support_id)
          SELECT @0, e.innovation_id, e.id FROM engaging e
          LEFT JOIN activities a ON a.id=e.id
          WHERE a.last_activity IS NULL;

          MERGE job_tracker AS target
          USING (SELECT @0 AS date, 'analytics_organisation_inactivity_breach' AS job) AS source
          ON target.job = source.job
          WHEN MATCHED THEN
            UPDATE SET job = source.job, date = source.date
          WHEN NOT MATCHED THEN
            INSERT (job, date) VALUES (source.job, source.date);
          `,
          [lastDate.toISOString()]
        );
      });
      lastDate.setDate(lastDate.getDate() + 1);
    }
  }
}
