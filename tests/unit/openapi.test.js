import "../helpers/env.js";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { openapiSpec } from "../../src/docs/openapi.js";

const HTTP_METHODS = ["get", "post", "put", "patch", "delete"];

function collectOperations(spec) {
  const operations = [];

  for (const [path, pathItem] of Object.entries(spec.paths)) {
    for (const method of HTTP_METHODS) {
      if (pathItem[method]) {
        operations.push({ path, method, operation: pathItem[method] });
      }
    }
  }

  return operations;
}

const operations = collectOperations(openapiSpec);

describe("OpenAPI description", () => {
  it("documents all 37 API operations", () => {
    assert.equal(operations.length, 37);
  });

  it("uses unique operation IDs", () => {
    const ids = operations.map(({ operation }) => operation.operationId);
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(ids.every(Boolean), "every operation needs an operationId");
  });

  it("only uses declared tags and declares no Catalog tag", () => {
    const declaredTags = openapiSpec.tags.map((tag) => tag.name);

    assert.ok(!declaredTags.includes("Catalog"));
    for (const { path, method, operation } of operations) {
      assert.ok(
        operation.tags?.length,
        `${method.toUpperCase()} ${path} is missing a tag`
      );
      for (const tag of operation.tags) {
        assert.ok(
          declaredTags.includes(tag),
          `${method.toUpperCase()} ${path} uses undeclared tag "${tag}"`
        );
      }
    }
  });

  it("summarizes and describes every operation", () => {
    for (const { path, method, operation } of operations) {
      const label = `${method.toUpperCase()} ${path}`;
      assert.ok(operation.summary, `${label} is missing a summary`);
      assert.ok(operation.description, `${label} is missing a description`);
    }
  });

  it("documents a success and an error response for every operation", () => {
    for (const { path, method, operation } of operations) {
      const label = `${method.toUpperCase()} ${path}`;
      const statuses = Object.keys(operation.responses ?? {});

      assert.ok(
        statuses.some((status) => status.startsWith("2")),
        `${label} is missing a 2XX response`
      );
      assert.ok(
        statuses.some((status) => status.startsWith("4")),
        `${label} is missing a 4XX response`
      );
    }
  });

  it("includes example requests and success responses", () => {
    for (const { path, method, operation } of operations) {
      const label = `${method.toUpperCase()} ${path}`;

      if (operation.requestBody) {
        const examples =
          operation.requestBody.content?.["application/json"]?.examples;
        assert.ok(examples, `${label} is missing request examples`);
      }

      const success = Object.entries(operation.responses).find(([status]) =>
        status.startsWith("2")
      );
      const examples = success?.[1]?.content?.["application/json"]?.examples;
      assert.ok(examples, `${label} is missing success response examples`);
    }
  });
});
