import { type SchemaTypeDefinition } from "sanity";
import author from "../schemas/author";
import profile from "../schemas/profiles";

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [author, profile],
};
