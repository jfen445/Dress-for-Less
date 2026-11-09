import { type SchemaTypeDefinition } from "sanity";
import dress from "../common/schemas/dress";
import faq from "../common/schemas/faq";
import bookingCutoff from "../common/schemas/bookingCutoff";

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [dress, faq, bookingCutoff],
};
