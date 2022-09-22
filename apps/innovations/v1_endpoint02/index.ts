

export function index(context: any, req: any): void {
  const versionKey = 'Version';
  const version = process.env[versionKey];

  context.log(
    `insultHttpTrigger2222 (${version}) processed a request. RequestUri=${req.originalUrl}`
  );
  context.log(`Request Headers = ${JSON.stringify(req.headers)}`);
  context.log(`Request Body = ${JSON.stringify(req.body)}`);

  context.res = {
    body: { some: 'value' },
  };
  context.done();
}
