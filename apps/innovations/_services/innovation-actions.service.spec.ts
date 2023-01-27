/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { TestDataType, TestsHelper } from '@innovations/shared/tests/tests.helper';
import { container } from '../_config';

import { InnovationSectionEnum, NotificationContextTypeEnum } from '@innovations/shared/enums';
import type { UnprocessableEntityError } from '@innovations/shared/errors';
import { DomainInnovationsService, NOSQLConnectionService, NotifierService } from '@innovations/shared/services';
import { CacheService } from '@innovations/shared/services/storage/cache.service';
import { randNumber, randText, randUuid } from '@ngneat/falso';
import { cloneDeep } from 'lodash';
import type { EntityManager } from 'typeorm';
import { InnovationActionsServiceSymbol, InnovationActionsServiceType } from './interfaces';

describe('Innovation Actions Suite', () => {

  let sut: InnovationActionsServiceType;

  let testData: TestDataType;
  let em: EntityManager;

  beforeAll(async () => {

    jest.spyOn(NOSQLConnectionService.prototype, 'init').mockResolvedValue();
    jest.spyOn(CacheService.prototype, 'init').mockReturnThis();

    sut = container.get<InnovationActionsServiceType>(InnovationActionsServiceSymbol);
    await TestsHelper.init();
    testData = TestsHelper.sampleData;
  });

  beforeEach(async () => {
    em = await TestsHelper.getQueryRunnerEntityManager();
  });

  afterEach(async () => {
    await TestsHelper.releaseQueryRunnerEntityManager(em);
  });

  it('should create an action', async () => {
    // arrange
    
    const accessor = testData.baseUsers.accessor;

    jest.spyOn(DomainInnovationsService.prototype, 'addActivityLog').mockResolvedValue();
    jest.spyOn(NotifierService.prototype, 'send').mockResolvedValue(true);

    const action = await sut.createAction(
      { id: accessor.id, identityId: accessor.identityId, type: accessor.type },
      testData.domainContexts.accessor,
      testData.innovation.id,
      {
        description: randText(),
        section: Object.values(InnovationSectionEnum)[randNumber({min: 0, max: Object.values(InnovationSectionEnum).length - 1})]!
      },
      em
    );

    // assert
    expect(action.id).toBeDefined();
  });

  it('should not create an action if organisation unit is not supporting innovation', async () => {
    // arrange
    const accessor = testData.baseUsers.accessor;
    const context = cloneDeep(testData.domainContexts.accessor);
    context.organisation!.organisationUnit!.id = randUuid();

    jest.spyOn(DomainInnovationsService.prototype, 'addActivityLog').mockResolvedValue();
    jest.spyOn(NotifierService.prototype, 'send').mockResolvedValue(true);

    // act
    let err: UnprocessableEntityError | null = null;
    try {
      await sut.createAction(
        { id: accessor.id, identityId: accessor.identityId, type: accessor.type },
        context,
        testData.innovation.id,
        {
          description: randText(),
          section: Object.values(InnovationSectionEnum)[randNumber({min: 0, max: Object.values(InnovationSectionEnum).length - 1})]!,
        },
        em
      );
    } catch (error) {
      err = error as UnprocessableEntityError;
    }
 
    // assert
    expect(err).toBeDefined();
    expect(err?.name).toBe('I.0040');
  });

  it('should list all actions as an innovator for his innovation', async () => {

    const innovator = testData.baseUsers.innovator;

    const actions = await sut.getActionsList(
      { id: innovator.id, type: innovator.type },
      { innovationId: testData.innovation.id, fields: [ ] },
      { order: { createdAt: 'DESC' }, skip: 0, take: 10 },
      testData.domainContexts.innovator,
      em
    );

    expect(actions).toBeDefined();
  });

  it('should list all actions as an innovator for his innovation with unread notifications', async () => {

    const innovator = testData.baseUsers.innovator;
    const randomSection = await testData.innovation.sections;
    const randomSupport = testData.innovation.innovationSupports;
    
    const action = await TestsHelper.TestDataBuilder.createAction(randomSection[0]!,randomSupport[0]!).build(em);
    
    jest.spyOn(DomainInnovationsService.prototype, 'getUnreadNotifications').mockResolvedValue([
      {
        
          id: randUuid(),
          contextType: NotificationContextTypeEnum.ACTION,
          contextId: action.id,
          params: randText(),
      }
    ]);
    
    const actions = await sut.getActionsList(
      { id: innovator.id, type: innovator.type },
      { innovationId: testData.innovation.id, fields: ['notifications'] },
      { order: { createdAt: 'DESC' }, skip: 0, take: 10 },
      testData.domainContexts.innovator,
      em
    );
    
    const actual = actions.data.find(a => a.id === action.id);

    expect(actual).toBeDefined();
    expect(actual?.notifications).toBe(1);
  });
});