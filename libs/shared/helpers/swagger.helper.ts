import type { Schema } from 'joi';
import j2s from 'joi-to-swagger';
import type { OpenAPIV3 } from 'openapi-types';

export class SwaggerHelper {
  /**
   * convert joi schema for a path or query into the swagger parameter objects
   * @param data object with path and/or query joi schemas
   * @returns swagger parameter objects
   */
  static paramJ2S = (data: { path?: Schema; query?: Schema }): OpenAPIV3.ParameterObject[] => {
    const res: OpenAPIV3.ParameterObject[] = [];

    Object.keys(data).forEach(type => {
      const swagger = j2s(data[type as keyof Parameters<typeof SwaggerHelper.paramJ2S>[0]]!).swagger;
      if (swagger['properties']) {
        Object.entries(swagger['properties']).forEach(([property, schema]) => {
          res.push({
            name: property,
            in: type,
            required: type === 'path' || swagger['required']?.includes(property) || false,
            schema: schema as OpenAPIV3.SchemaObject
          });
        });
      } else if (swagger['anyOf']) {
        // converting anyOf to list of properties, this is not ideal
        swagger['anyOf'].forEach((schema: OpenAPIV3.SchemaObject) => {
          if (schema.properties) {
            const map = new Map();
            Object.entries(schema.properties).forEach(([property, schema]) => {
              // to simplify the logic, we assume that all properties are optional
              map.set(property, {
                name: property,
                in: type,
                required: false,
                schema: schema
              });
            });
            res.push(...map.values());
          }
        });
      } else {
        // This shouldn't happen, implement other options if needs arrise
        throw new Error(`SwaggerHelper.paramJ2S: swagger schema is not supported`);
      }
    });

    return res;
  };

  /**
   * convert joi schema for a body into a swagger schema
   * @param data the joi schema
   * @param description the description of the body to be added to swagger
   * @param required if it's required or not (default true)
   * @returns swagger schema
   */
  static bodyJ2S = (
    data: Schema,
    options?: { description?: string; required?: boolean }
  ): OpenAPIV3.RequestBodyObject => {
    const swaggerSchema = j2s(data).swagger;

    return {
      ...(options?.description && { description: options?.description }),
      required: options?.required ?? true,
      content: {
        'application/json': {
          schema: swaggerSchema
        }
      }
    };
  };

  /**
   * conver joi schema for response body into a swagger schema
   *
   */
  static responseJ2S = (data: Schema, options: { description: string }): OpenAPIV3.ResponseObject => {
    const swaggerSchema = j2s(data).swagger;

    return {
      description: options.description,
      content: {
        'application/json': {
          schema: swaggerSchema
        }
      }
    };
  };
}
