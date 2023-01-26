
import type { Context, HttpMethod, HttpRequest, Logger } from '@azure/functions';
import { randUserName, randUuid } from '@ngneat/falso';
import { UserTypeEnum } from '../enums';
import type { CustomContextType } from '../types';


export class HttpTestBuilder {
  
  private request: HttpRequest = {
    url: '',
    method: 'GET',
    headers: {},
    body: {},
    params: {},
    query: {},
    rawBody: '',
    user: { id: randUuid(), type: 'AppService', username: randUserName(), identityProvider: 'AzureAD', claimsPrincipalData: {}},
  } as HttpRequest;

  private context: CustomContextType;

  private logger: Logger = {
    info: (...args: any[]) => { console.info(...args); },
    warn: (...args: any[]) => { console.warn(...args); },
    error: (...args: any[]) => { console.error(...args); },
    verbose: (...args: any[]) => { console.log(...args); },
  } as unknown as Logger;

  
  public setContext(): HttpTestBuilder {
    const context = {
      auth: {
        user: {
          identityId: randUuid(),
          name: randUserName(),
        },
        context: {
          userType: UserTypeEnum.INNOVATOR
        }
      },
      log: this.logger,
      done: () => {},
      res: {},
      bindings: {},
      bindingData: {
        invocationId: randUuid(),
      },
      executionContext: {
        invocationId: randUuid(),
        functionName: randUserName(),
        functionDirectory: randUserName(),
        traceContext: {
          traceparent: randUuid(),
          tracestate: randUuid(),
        },
        retryContext: {
          retryCount: 0,
          retryReason: '',
          errorDetails: '',
          maxRetryCount: 0,
        },
      },
      bindingDefinitions: [],
      invocationId: randUuid(),
      traceContext: {
        traceparent: randUuid(),
        tracestate: randUuid(),
        attributes: {},
      },
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

  public setAuth(user: { identityId: string, name: string }, context: CustomContextType['auth']['context']): HttpTestBuilder {
    this.context.auth = { user, context };
    return this;
  }

  public async invoke<T = any>(func: (context: Context, ...args: any[])=> (void | Promise<any>)): Promise<T> {
    await func(this.context, this.request);
    return this.context.res as T;
  }

}