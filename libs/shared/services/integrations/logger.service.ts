import * as appInsights from 'applicationinsights';
import { injectable } from 'inversify';

@injectable()
export class LoggerService {
  private runningLocally = process.env['LOCAL_MODE'] || process.env['NODE_ENV'] === 'test' || false;

  constructor() {
    if (!this.runningLocally) {
      appInsights.setup().setDistributedTracingMode(appInsights.DistributedTracingModes.AI_AND_W3C).start();
    }
  }

  // let client = appInsights.defaultClient;
  // client.trackEvent({name: "my custom event", properties: {customProperty: "custom property value"}});
  // client.trackException({exception: new Error("handled exceptions can be logged with this method")});
  // client.trackMetric({name: "custom metric", value: 3});
  // client.trackTrace({message: "trace message"});
  // client.trackDependency({target:"http://dbname", name:"select customers proc", data:"SELECT * FROM Customers", duration:231, resultCode:0, success: true, dependencyTypeName: "ZSQL"});
  // client.trackRequest({name:"GET /customers", url:"http://myserver/customers", duration:309, resultCode:200, success:true});

  log(message: string, additionalInformation?: any): void {
    if (this.runningLocally) {
      if (process.env['NODE_ENV'] !== 'test') {
        console.log('[LOG]: ', message, additionalInformation);
      }
      return;
    }

    appInsights.defaultClient.trackTrace({
      message,
      severity: appInsights.Contracts.SeverityLevel.Information,
      properties: additionalInformation
    });
  }

  error(message: string, additionalInformation?: any): void {
    if (this.runningLocally) {
      if (process.env['NODE_ENV'] !== 'test') {
        console.error('[ERROR]: ', message, additionalInformation);
      }
      return;
    }

    appInsights.defaultClient.trackTrace({
      message: `[ERROR] ${message}`,
      severity: appInsights.Contracts.SeverityLevel.Error
    });
    if (additionalInformation instanceof Error) {
      appInsights.defaultClient.trackException({
        exception: additionalInformation
      });
    }
  }
}
