import type { Context, HttpMethod, HttpRequest, Logger } from '@azure/functions';
import { randUserName, randUuid } from '@ngneat/falso';

import type { AppResponse, CustomContextType, DomainContextType } from '../../types';

export class AzureHttpTriggerBuilder {
  // static mockContext(): Context {
  //   const logger: Logger = ((..._args: any[]) => {}) as Logger;
  //   logger.error = (..._args: any[]) => {};
  //   logger.warn = (..._args: any[]) => {};
  //   logger.info = (..._args: any[]) => {};
  //   logger.verbose = (..._args: any[]) => {};

  //   return {
  //     log: logger,
  //     done: () => {},
  //     res: {},
  //     bindings: {},
  //     bindingData: { invocationId: randUuid() },
  //     executionContext: {
  //       invocationId: randUuid(),
  //       functionName: randUserName(),
  //       functionDirectory: randUserName(),
  //       retryContext: { retryCount: 0, maxRetryCount: 0 }
  //     },
  //     bindingDefinitions: [],
  //     invocationId: randUuid(),
  //     traceContext: { traceparent: randUuid(), tracestate: randUuid(), attributes: {} }
  //   };
  // }

  private logger: Logger;
  private context: CustomContextType;
  private request: HttpRequest = {
    url: '',
    method: null,
    headers: {},
    rawBody: {},
    body: {},
    params: {},
    query: {},
    user: null,
    // user: {
    //   id: randUuid(),
    //   type: 'AppService',
    //   username: randUserName(),
    //   identityProvider: 'AzureAD',
    //   claimsPrincipalData: {}
    // },
    parseFormBody: () => {
      throw new Error('Function not implemented.');
    }
  };

  constructor() {
    this.logger = ((..._args: any[]): void => {}) as Logger;
    this.logger.error = (..._args: any[]) => {};
    this.logger.warn = (..._args: any[]) => {};
    this.logger.info = (..._args: any[]) => {};
    this.logger.verbose = (..._args: any[]) => {};

    this.context = {
      auth: { user: { identityId: randUuid(), name: randUserName() } },
      invocationId: randUuid(),
      log: this.logger,
      done: () => {},
      res: {},
      bindings: {},
      bindingData: { invocationId: randUuid() },
      executionContext: {
        invocationId: randUuid(),
        functionName: randUserName(),
        functionDirectory: randUserName(),
        retryContext: { retryCount: 0, maxRetryCount: 0 }
      },
      bindingDefinitions: [],
      traceContext: {
        traceparent: null,
        tracestate: null,
        attributes: null
      }
    };
  }

  public setUrl(url: string): this {
    this.request.url = url;
    return this;
  }

  public setMethod(method: HttpMethod): this {
    this.request.method = method;
    return this;
  }

  public setHeaders(headers: { [key: string]: string }): this {
    this.request.headers = headers;
    return this;
  }

  public setBody(body: { [key: string]: string }): this {
    this.request.body = body;
    return this;
  }

  public setParams(params: { [key: string]: string }): this {
    this.request.params = params;
    return this;
  }

  public setAuth(domainContext: DomainContextType): this {
    this.context.auth = {
      user: {
        identityId: domainContext.identityId,
        name: randUserName(), // is not used
        roleId: domainContext.currentRole.id
      }
    };
    return this;
  }

  public async call<T>(func: (context: Context, ...args: any[]) => Promise<void>): Promise<AppResponse<T>> {
    await func(this.context, this.request);
    return this.context.res as AppResponse<T>;
  }

}

export class AzureQueueTriggerBuilder {

  private logger: Logger;
  private context: CustomContextType;
  private request: { data: Record<string, unknown> } = { data: {} };

  constructor() {
    this.logger = ((..._args: any[]): void => {}) as Logger;
    this.logger.error = (..._args: any[]) => {};
    this.logger.warn = (..._args: any[]) => {};
    this.logger.info = (..._args: any[]) => {};
    this.logger.verbose = (..._args: any[]) => {};

    this.context = {
      auth: { user: { identityId: randUuid(), name: randUserName() } },
      invocationId: randUuid(),
      log: this.logger,
      done: () => {},
      res: {},
      bindings: {},
      bindingData: { invocationId: randUuid() },
      executionContext: {
        invocationId: randUuid(),
        functionName: randUserName(),
        functionDirectory: randUserName(),
        retryContext: { retryCount: 0, maxRetryCount: 0 }
      },
      bindingDefinitions: [],
      traceContext: {
        traceparent: null,
        tracestate: null,
        attributes: null
      }
    };
  }

  public setRequestData(data: Record<string, unknown>): this {
    this.request.data = data;
    return this;
  }

  public async call<T>(func: (context: Context, ...args: any[]) => Promise<void>): Promise<T> {
    await func(this.context, this.request);
    return this.context.res as T;
  }

}
