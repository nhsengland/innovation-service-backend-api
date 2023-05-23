import { injectable } from 'inversify';
import * as https from 'https';
import axios, { AxiosInstance } from 'axios';

@injectable()
export class HttpService {
  private httpRequestInstance: AxiosInstance;

  constructor() {
    this.httpRequestInstance = axios.create({
      timeout: 60000,
      httpsAgent: new https.Agent({ keepAlive: true }),
      headers: { 'Content-Type': 'application/xml' }
    });
  }

  getHttpInstance(): AxiosInstance {
    return this.httpRequestInstance;
  }
}
