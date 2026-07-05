export const A2UI_VERSION = "v0.9" as const;

export type A2UIVersion = typeof A2UI_VERSION;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };

export interface A2UIBaseMessage {
  version: A2UIVersion;
}

export interface CreateSurfacePayload {
  surfaceId: string;
  catalogId: string;
  theme?: JsonObject;
  sendDataModel?: boolean;
}

export interface UpdateComponentsPayload {
  surfaceId: string;
  components: A2UIComponent[];
}

export interface UpdateDataModelPayload {
  surfaceId: string;
  path?: string;
  value?: JsonValue;
}

export interface DeleteSurfacePayload {
  surfaceId: string;
}

export type A2UIServerMessage =
  | (A2UIBaseMessage & { createSurface: CreateSurfacePayload })
  | (A2UIBaseMessage & { updateComponents: UpdateComponentsPayload })
  | (A2UIBaseMessage & { updateDataModel: UpdateDataModelPayload })
  | (A2UIBaseMessage & { deleteSurface: DeleteSurfacePayload });

export type A2UIComponent = {
  id: string;
  component: string;
  [property: string]: JsonValue | undefined;
};

export interface A2UIActionPayload {
  name: string;
  surfaceId: string;
  sourceComponentId: string;
  timestamp: string;
  context: JsonObject;
}

export interface A2UIErrorPayload {
  code: string;
  surfaceId: string;
  path?: string;
  message: string;
  [property: string]: JsonValue | undefined;
}

export type A2UIClientMessage =
  | (A2UIBaseMessage & { action: A2UIActionPayload })
  | (A2UIBaseMessage & { error: A2UIErrorPayload });

export interface SurfaceSnapshotData {
  version: A2UIVersion;
  surfaces: Record<string, SurfaceState>;
}

export interface SurfaceState {
  surfaceId: string;
  catalogId: string;
  theme?: JsonObject;
  sendDataModel?: boolean;
  components: Record<string, A2UIComponent>;
  dataModel: JsonValue;
}
