import { DefaultNamingStrategy, Table, NamingStrategyInterface } from 'typeorm';


export class TypeORMCustomStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {

  override foreignKeyName(tableOrName: Table | string, columnNames: string[], referencedTablePath?: string): string {

    tableOrName = typeof tableOrName === 'string' ? tableOrName : tableOrName.name;

    const n = columnNames.reduce((name, column) => `${name}_${column}`, `${referencedTablePath}`);

    return `fk_${tableOrName}_${n}`;
  }

  override primaryKeyName(tableOrName: Table | string, columnNames: string[]): string {

    tableOrName = typeof tableOrName === 'string' ? tableOrName : tableOrName.name;

    const n = columnNames.reduce((name, column) => `${name}_${column}`);

    return `pk_${tableOrName}_${n}`;

  }

  override indexName(tableOrName: Table | string, columns: string[]): string {

    tableOrName = typeof tableOrName === 'string' ? tableOrName : tableOrName.name;

    const n = columns.reduce((name, column) => `${name}_${column}`, `${tableOrName}`);

    return `idx_${n}`;

  }

  override defaultConstraintName(tableOrName: Table | string, columnName: string): string {

    tableOrName = typeof tableOrName === 'string' ? tableOrName : tableOrName.name;

    return `df_${tableOrName}_${columnName}`;

  }

}
