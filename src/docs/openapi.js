import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const specPath = fileURLToPath(
  new URL("../../docs/openapi.yaml", import.meta.url)
);

export const openapiSpec = parse(readFileSync(specPath, "utf8"));
