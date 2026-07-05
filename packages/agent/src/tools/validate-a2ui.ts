import type { ValidateA2UIInput, ValidateA2UIResult } from "@a2ui-platform/shared";

export function validateA2UI(input: ValidateA2UIInput): ValidateA2UIResult {
  const errors: ValidateA2UIResult["errors"] = [];

  for (const [index, message] of input.messages.entries()) {
    if (message.version !== "v0.9") {
      errors.push({
        code: "INVALID_VERSION",
        path: `/${index}/version`,
        message: "A2UI 消息 version 必须为 v0.9"
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: [],
    normalizedMessages: errors.length === 0 ? input.messages : []
  };
}
