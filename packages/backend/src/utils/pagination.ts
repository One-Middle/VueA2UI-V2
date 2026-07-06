import type { PageResult } from "@a2ui-platform/shared";

export interface PaginationParams {
  limit: number;
  cursor: string | null;
}

/**
 * 从 query string 解析分页参数。
 */
export function parsePagination(query: Record<string, unknown>): PaginationParams {
  const rawLimit = query.limit;
  let limit = 50;
  if (typeof rawLimit === "string") {
    const parsed = Number.parseInt(rawLimit, 10);
    if (!Number.isNaN(parsed) && parsed > 0 && parsed <= 100) {
      limit = parsed;
    }
  }

  const rawCursor = query.cursor;
  const cursor = typeof rawCursor === "string" && rawCursor.length > 0 ? rawCursor : null;

  return { limit, cursor };
}

/**
 * 构建标准分页响应。
 * items 传入 limit+1 条用于判断 hasMore。
 */
export function buildPageResult<T>(
  items: T[],
  total: number,
  limit: number,
  cursorExtractor?: (item: T) => string
): PageResult<T> {
  const hasMore = items.length > limit;
  const page = hasMore ? items.slice(0, limit) : items;

  let nextCursor: string | null = null;
  if (hasMore && page.length > 0) {
    const lastItem = page[page.length - 1]!;
    nextCursor = cursorExtractor ? cursorExtractor(lastItem) : null;
  }

  return {
    items: page,
    pageInfo: {
      nextCursor,
      hasMore,
    },
  };
}
