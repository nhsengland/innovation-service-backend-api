import type { ObjectSchema } from 'joi';
import j2s from 'joi-to-swagger';
import type { OpenAPIV3 } from 'openapi-types';


export class SwaggerHelper {

  /**
   * convert joi schema for a path or query into the swagger parameter objects
   * @param data object with path and/or query joi schemas
   * @returns swagger parameter objects
   */
  static paramJ2S = (data: { path?: ObjectSchema, query?: ObjectSchema }): OpenAPIV3.ParameterObject[] => {

    const res: OpenAPIV3.ParameterObject[] = [];

    Object.keys(data).forEach(type => {
      const swagger = j2s(data[type as keyof Parameters<typeof SwaggerHelper.paramJ2S>[0]] as ObjectSchema).swagger;
      Object.entries(swagger['properties']).forEach(([property, schema]) => {
        res.push({
          name: property,
          in: type,
          required: swagger['required']?.includes(property) || false,
          schema: schema as OpenAPIV3.SchemaObject
        })
      });
    });

    return res;

  }

  /**
   * convert joi schema for a body into a swagger schema
   * @param data the joi schema
   * @param description the description of the body to be added to swagger
   * @param required if it's required or not (default true)
   * @returns swagger schema
   */
  static bodyJ2S = (data: ObjectSchema, options?: { description?: string, required?: boolean }): OpenAPIV3.RequestBodyObject => {

    const swaggerSchema = j2s(data).swagger;

    return {
      ...options?.description && { description: options?.description },
      required: options?.required ?? true,
      content: {
        'application/json': {
          schema: swaggerSchema,
        }
      }
    };

  }

}
