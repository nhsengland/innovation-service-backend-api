import { mapOpenApi3_1 as openApi } from "@aaronpowell/azure-functions-nodejs-openapi";
import type { AzureFunction, HttpRequest } from "@azure/functions";

import { JwtDecoder } from "@innovations/shared/decorators";
import { JoiHelper, ResponseHelper } from "@innovations/shared/helpers";
import { AuthorizationServiceSymbol, type AuthorizationServiceType } from "@innovations/shared/services";
import type { CustomContextType } from "@innovations/shared/types";
import { container } from "../_config";
import { InnovationActionServiceSymbol, type InnovationActionServiceType } from "../_services/interfaces";
import { BodySchema, ParamsSchema, type BodyType, type ParamsType } from "./validation.schemas";

class V1UpdateInnovationAction {

  @JwtDecoder()
  static async httpTrigger(context: CustomContextType, request: HttpRequest): Promise<void> {

    const authorizationService = container.get<AuthorizationServiceType>(AuthorizationServiceSymbol);
    const innovationActionService = container.get<InnovationActionServiceType>(InnovationActionServiceSymbol);

    try {

      const body = JoiHelper.Validate<BodyType>(BodySchema, request.body);
      const params = JoiHelper.Validate<ParamsType>(ParamsSchema, request.params);

      const auth = await authorizationService.validate(context.auth.user.identityId)
        .setInnovation(params.innovationId)
        .checkInnovation()
        .checkAccessorType()
        .verify();

      const requestUser = auth.getUserInfo();

      const result = await innovationActionService.updateInnovationAction(
        requestUser,
        params.actionId,
        params.innovationId,
        body
      );
      context.res = ResponseHelper.Ok(result);
      return;

    } catch (error) {
      context.res = ResponseHelper.Error(context, error);
      return;
    }
  }
}

export default openApi(V1UpdateInnovationAction.httpTrigger as AzureFunction, "/v1/{innovationId}/actions/{actionId}", {
  put: {
    description: "Update an innovation action.",
    operationId: "v1-innovation-action-update",
    parameters: [
      {
        name: "innovationId",
        in: "path",
        description: "The innovation id.",
        required: true,
        schema: {
          type: "string",
        },
      },
      {
        name: "actionId",
        in: "path",
        description: "The innovation action id.",
        required: true,
        schema: {
          type: "string",
        },
      },
    ],
    requestBody: {
      description: "The innovation action data.",
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "The name of the action.",
              },
              description: {
                type: "string",
                description: "The description of the action.",
              },
              status: {
                type: "string",
                description: "The status of the action.",
              },
              assignee: {
                type: "string",
                description: "The assignee of the action.",
              },
              dueDate: {
                type: "string",
                description: "The due date of the action.",
              },
              comment: {
                type: "string",
                description: "The comment of the action.",
              },
            },
          },
        },
      },
    },
    responses: {
      "200": {
        description: "The innovation action has been updated.",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  description: "The innovation action id.",
                },
                name: {
                  type: "string",
                  description: "The name of the action.",
                },
                description: {
                  type: "string",
                  description: "The description of the action.",
                },
                status: {
                  type: "string",
                  description: "The status of the action.",
                },
                assignee: {
                  type: "string",
                  description: "The assignee of the action.",
                },
                dueDate: {
                  type: "string",
                  description: "The due date of the action.",
                },
                comment: {
                  type: "string",
                  description: "The comment of the action.",
                },
                createdAt: {
                  type: "string",
                  description: "The date when the action was created.",
                },
                updatedAt: {
                  type: "string",
                  description: "The date when the action was updated.",
                },
              },
            },
          },
        },
      },
      "400": {
        description: "The innovation action data is invalid.",
      },
      "401": {
        description: "The user is not authorized to update the innovation action.",
      },
      "404": {
        description: "The innovation action does not exist.",
      },
      "500": {
        description: "An error occurred while updating the innovation action.",
      },
    },
  },
});
