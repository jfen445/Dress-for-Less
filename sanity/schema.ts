import { type SchemaTypeDefinition } from "sanity";
import author from "../schemas/author";
import profile from "../schemas/profiles";
import dress from "../schemas/dress";

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [dress],
};
