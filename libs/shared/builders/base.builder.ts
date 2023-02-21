import type { EntityManager } from 'typeorm';


export class BaseBuilder {

  private entityManager: EntityManager;

  constructor(entityManager: EntityManager) {
    this.entityManager = entityManager;
  }

  getEntityManager() {
    return this.entityManager;
  }

}
