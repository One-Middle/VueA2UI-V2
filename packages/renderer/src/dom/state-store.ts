import type { DomComponentState } from "../ui/dom-basic/types";

export class DomStateStore {
  private readonly values = new Map<string, Map<string, unknown>>();

  stateFor(input: {
    surfaceId: string;
    componentId: string;
    basePath: string;
  }): DomComponentState {
    const key = `${input.surfaceId}::${input.componentId}::${input.basePath}`;
    if (!this.values.has(key)) {
      this.values.set(key, new Map<string, unknown>());
    }
    const state = this.values.get(key)!;
    return {
      get<T>(field: string, fallback: T): T {
        return state.has(field) ? (state.get(field) as T) : fallback;
      },
      set<T>(field: string, value: T): void {
        state.set(field, value);
      },
      delete(field: string): void {
        state.delete(field);
      },
    };
  }

  clear(): void {
    this.values.clear();
  }
}
