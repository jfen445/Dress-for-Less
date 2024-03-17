import { createClient, type ClientConfig } from "@sanity/client";

const config: ClientConfig = {
  projectId: "53nn6ia3",
  dataset: "production",
  apiVersion: "2024-03-16",
  useCdn: false,
};

const client = createClient(config);

export default client;
