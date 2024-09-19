import type {
  Connection,
  EntitySchema,
  MigrationInterface,
  ObjectType,
  QueryRunner,
  Repository
} from 'typeorm';
import {
  getConnection
} from 'typeorm';

export abstract class BaseSeed implements MigrationInterface {
  public abstract name: string;

  public abstract up(queryRunner: QueryRunner): Promise<any>;

  public abstract down(queryRunner: QueryRunner): Promise<any>;

  protected getConnection(): Connection {
    return getConnection('seeds');
  }

  protected getRepository<T>(target: ObjectType<T> | EntitySchema<T> | string): Repository<T> {
    return this.getConnection().getRepository(target);
  }
}
