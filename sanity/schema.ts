import { type SchemaTypeDefinition } from "sanity";
import dress from "../common/schemas/dress";
import faq from "../common/schemas/faq";

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [dress, faq],
};
