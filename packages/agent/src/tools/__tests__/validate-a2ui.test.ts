import { describe, expect, it } from "vitest";
import type { A2UIServerMessage } from "@a2ui-platform/shared";
import {
  getCatalogComponentNames,
  getCatalogComponents,
} from "../catalog-schema.js";
import { validateA2UI } from "../validate-a2ui.js";

const catalogId =
  "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json";

describe("validateA2UI catalog properties", () => {
  it("does not expose Modal in the prompt-visible Basic Catalog", () => {
    expect(getCatalogComponentNames()).not.toContain("Modal");
    expect(
      getCatalogComponents().map((component) => component.component),
    ).not.toContain("Modal");
  });

  it("rejects Modal because it is not in the new official Basic Catalog", () => {
    const result = validateA2UI({
      messages: [
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
                component: "Modal",
                child: "content",
              },
              {
                id: "content",
                component: "Text",
                text: "内容",
              },
            ],
          },
        },
      ] as unknown as A2UIServerMessage[],
      catalogId,
      currentSnapshot: null,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "UNKNOWN_COMPONENT",
        }),
      ]),
    );
  });

  it("rejects removed createSurface theme and sendDataModel fields", () => {
    const messages = [
      {
        version: "v0.9",
        createSurface: {
          surfaceId: "main",
          catalogId,
          theme: { primaryColor: "#2563eb" },
          sendDataModel: true,
        },
      },
    ] as unknown as A2UIServerMessage[];

    const result = validateA2UI({
      messages,
      catalogId,
      currentSnapshot: null,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "A2UI_STRUCTURE",
        }),
      ]),
    );
  });

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

  it("accepts semantic component fields and layout components", () => {
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
              component: "Container",
              child: "grid",
              width: "content",
              padding: "md",
              align: "center",
            },
            {
              id: "grid",
              component: "Grid",
              children: ["card", "spacer"],
              columns: "auto",
              minItemWidth: "180px",
              density: "compact",
            },
            {
              id: "card",
              component: "Card",
              child: "price",
              header: "原价",
              subtitle: "促销前价格",
              role: "metric",
              density: "compact",
              selected: true,
            },
            {
              id: "price",
              component: "Text",
              text: "¥199",
              role: "previousPrice",
              emphasis: "muted",
              decoration: "lineThrough",
              style: { flex: 1, overflow: "hidden" },
            },
            {
              id: "spacer",
              component: "Spacer",
              size: "sm",
              axis: "vertical",
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

    expect(result.valid, JSON.stringify(result.errors, null, 2)).toBe(true);
  });

  it("does not treat harmless script variable fragments like one = as unsafe content", () => {
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
            { id: "root", component: "Column", children: ["button"] },
            {
              id: "button",
              component: "Button",
              label: "计算",
              action: {
                script: {
                  code: "const one = 1; actions.emit('done', { one });",
                  deps: [],
                },
              },
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

    expect(result.errors).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "UNSAFE_CONTENT" }),
      ]),
    );
  });

  it("rejects browser event property names and html event attributes", () => {
    const propertyResult = validateA2UI({
      messages: [
        {
          version: "v0.9",
          createSurface: { surfaceId: "main", catalogId },
        },
        {
          version: "v0.9",
          updateComponents: {
            surfaceId: "main",
            components: [
              { id: "root", component: "Column", children: ["button"] },
              {
                id: "button",
                component: "Button",
                label: "保存",
                onClick: "submit",
                action: { event: { name: "submit" } },
              },
            ],
          },
        },
      ] as unknown as A2UIServerMessage[],
      catalogId,
      currentSnapshot: null,
    });

    expect(propertyResult.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "UNSAFE_CONTENT" }),
      ]),
    );

    const htmlResult = validateA2UI({
      messages: [
        {
          version: "v0.9",
          createSurface: { surfaceId: "main", catalogId },
        },
        {
          version: "v0.9",
          updateComponents: {
            surfaceId: "main",
            components: [
              {
                id: "root",
                component: "Text",
                text: '<button onclick="x()">x</button>',
              },
            ],
          },
        },
      ],
      catalogId,
      currentSnapshot: null,
    });

    expect(htmlResult.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "UNSAFE_CONTENT" }),
      ]),
    );
  });
});
