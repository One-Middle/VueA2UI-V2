import { describe, expect, it } from "vitest";
import type { A2UIServerMessage } from "@a2ui-platform/shared";
import { validateA2UI } from "../validate-a2ui.js";

const catalogId = "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json";

describe("validateA2UI catalog properties", () => {
  it("rejects Card.children because Card only supports child/title", () => {
    const messages: A2UIServerMessage[] = [
      {
        version: "v0.9",
        createSurface: {
          surfaceId: "main",
          catalogId,
        },
      },
      {
        version: "v0.9",
        updateComponents: {
          surfaceId: "main",
          components: [
            {
              id: "root",
              component: "Column",
              children: ["card"],
            },
            {
              id: "card",
              component: "Card",
              children: ["title"],
            },
            {
              id: "title",
              component: "Text",
              text: "周一",
            },
          ],
        },
      },
    ];

    const result = validateA2UI({
      messages,
      catalogId,
      currentSnapshot: null,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "CATALOG_PROPERTY",
          path: expect.stringContaining("/children"),
        }),
      ]),
    );
  });
});
