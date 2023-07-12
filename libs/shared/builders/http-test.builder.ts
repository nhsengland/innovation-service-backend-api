import type { Context, HttpMethod, HttpRequest, Logger } from '@azure/functions';
import { randUserName, randUuid } from '@ngneat/falso';

import type { CustomContextType, DomainContextType } from '../types';

export class HttpTestBuilder {
  private request: HttpRequest = {
    url: '',
    method: 'GET',
    headers: {},
    body: {},
    params: {},
    query: {},
    rawBody: '',
    user: {
      id: randUuid(),
      type: 'AppService',
      username: randUserName(),
      identityProvider: 'AzureAD',
      claimsPrincipalData: {}
    }
  } as HttpRequest;

  private context: CustomContextType;

  private logger: Logger = {
    info: (..._args: any[]) => {
    },
    warn: (..._args: any[]) => {
    },
    error: (..._args: any[]) => {
    },
    verbose: (..._args: any[]) => {
    }
  } as unknown as Logger;

  public setContext(): HttpTestBuilder {
    const context = {
      auth: {
        user: {
          identityId: randUuid(),
          name: randUserName()
        },
        context: {}
      },
      log: this.logger,
      done: () => {},
      res: {},
      bindings: {},
      bindingData: {
        invocationId: randUuid()
      },
      executionContext: {
        invocationId: randUuid(),
        functionName: randUserName(),
        functionDirectory: randUserName(),
        traceContext: {
          traceparent: randUuid(),
          tracestate: randUuid()
        },
        retryContext: {
          retryCount: 0,
          retryReason: '',
          errorDetails: '',
          maxRetryCount: 0
        }
      },
      bindingDefinitions: [],
      invocationId: randUuid(),
      traceContext: {
        traceparent: randUuid(),
        tracestate: randUuid(),
        attributes: {}
      }
    };

    this.context = context as CustomContextType;
    return this;
  }

  public setUrl(url: string): HttpTestBuilder {
    this.request.url = url;
    return this;
  }

  public setMethod(method: HttpMethod): HttpTestBuilder {
    this.request.method = method;
    return this;
  }

  public setHeaders(headers: { [key: string]: string }): HttpTestBuilder {
    this.request.headers = headers;
    return this;
  }

  public setBody(body: { [key: string]: string }): HttpTestBuilder {
    this.request.body = body;
    return this;
  }

  public setParams(params: { [key: string]: string }): HttpTestBuilder {
    this.request.params = params;
    return this;
  }

  public setAuth(domainContext: DomainContextType): HttpTestBuilder {
    this.context.auth = {
      user: {
        identityId: domainContext.identityId,
        name: randUserName(), // is not used
        roleId: domainContext.currentRole.id
      }
    };
    return this;
  }

  public async invoke<T = any>(func: (context: Context, ...args: any[]) => void | Promise<any>): Promise<T> {
    await func(this.context, this.request);
    return this.context.res as T;
  }
}
