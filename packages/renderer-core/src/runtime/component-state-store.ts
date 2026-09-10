import type { ComponentAddress } from "../render/render-node";

export interface ComponentState {
  get<T>(field: string, fallback: T): T;
  set<T>(field: string, value: T): void;
  delete(field: string): void;
}

export class ComponentStateStore {
  private readonly values = new Map<string, Map<string, unknown>>();

  stateFor(address: ComponentAddress): ComponentState {
    const key = `${address.surfaceId}::${address.componentId}::${address.basePath}`;
    if (!this.values.has(key)) this.values.set(key, new Map());
    const values = this.values.get(key)!;
    return {
      get<T>(field: string, fallback: T): T {
        return values.has(field) ? (values.get(field) as T) : fallback;
      },
      set<T>(field: string, value: T): void {
        values.set(field, value);
      },
      delete(field: string): void {
        values.delete(field);
      },
    };
  }

  clear(): void {
    this.values.clear();
  }
}
