import type { Context, HttpRequest } from '@azure/functions';
import { mapOpenApi3_1 as openApi } from '@aaronpowell/azure-functions-nodejs-openapi';

import { TEXTAREA_LENGTH_LIMIT } from '@innovations/shared/constants';


class V1Endpoint01 {

  static async httpTrigger(context: Context, req: HttpRequest) {

    context.log(`Request Headers = ${JSON.stringify(req.headers)}`);
    context.log(`Request Body = ${JSON.stringify(req.body)}`);


    context.res = {
      body: { some: 'value2222', linit: TEXTAREA_LENGTH_LIMIT }
    };
    // context.done();
  }

}

// export default V1Endpoint01.httpTrigger;

export default openApi(V1Endpoint01.httpTrigger, '/game/{gameId}', {
  get: {
    parameters: [
      {
        name: 'gameId',
        in: 'path',
        required: true,
        description: `Gets a game that's being played`,
        schema: {
          type: 'string'
        }
      }
    ],
    responses: {
      200: {
        description: 'Successful operation',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Unique identifier for the game' },
                state: { type: 'string', description: 'The status of the game', enum: ['WaitingForPlayers', 'Started', 'Complete'] }
              }
            }
          }
        }
      },
      404: { description: 'Unable to find a game with that id' }
    }
  }

});
