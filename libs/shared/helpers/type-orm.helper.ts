// import { Connection, EntityTarget } from 'typeorm';
import type { SelectQueryBuilder } from 'typeorm';

export class TypeORMHelper {
  //   static getEntityColumnList(connection: Connection, entity: EntityTarget<any>): string[] {

  //     return connection.getMetadata(entity).ownColumns.map(c => c.propertyName);

  //   }

  //   static getEntityRelationColumnsList(connection: Connection, entity: EntityTarget<any>): string[] {

  //     return connection.getMetadata(entity).ownRelations.map(c => c.propertyName)

  //   }

  static addLastSupportGivenAtSubquery(query: SelectQueryBuilder<any>, organisationUnitID: string): void {
    // Subquery for latest message
    const lastMsgSubquery = query
      .subQuery()
      .select('TOP 1 m.created_at', 'last_activity')
      .from('innovation_thread_message', 'm')
      .innerJoin('innovation_thread', 't', `m.innovation_thread_id = t.id AND t.innovation_id = innovation.id`)
      .where('m.deleted_at IS NULL')
      .andWhere('m.author_organisation_unit_id = :organisationUnitID', { organisationUnitID })
      .orderBy('m.created_at', 'DESC');

    // Subquery for latest support log
    const lastSupportSubquery = query
      .subQuery()
      .select('TOP 1 sl.created_at', 'last_activity')
      .from('innovation_support_log', 'sl')
      .where(`sl.innovation_id = innovation.id`)
      .andWhere('sl.deleted_at IS NULL')
      .andWhere('(sl.organisation_unit_id = :organisationUnitID)', { organisationUnitID })
      .orderBy('sl.created_at', 'DESC');

    // Combine them using derived table and MAX
    query
      .addSelect(subQuery => {
        return subQuery
          .select('MAX(x.last_activity)', 'lastSupportGivenAt')
          .from(`(${lastMsgSubquery.getQuery()} UNION ALL ${lastSupportSubquery.getQuery()})`, 'x');
      }, 'lastSupportGivenAt')
      .setParameter('organisationUnitID', organisationUnitID);
  }
}
