import type { RenderNode } from "@a2ui-platform/renderer-core";
import {
  appendFieldMessage,
  appendResults,
  booleanProp,
  classes,
  createElement,
  fieldChrome,
  numberProp,
  stringProp,
  textValue,
  toOptions,
  visualClasses,
  fieldClasses,
  applyStyle,
} from "./helpers";
import type {
  DomBasicComponent,
  DomBasicComponentInput,
  DomRenderResult,
} from "./types";

function renderSlot(input: DomBasicComponentInput): DomRenderResult[] {
  return input.slots.default?.() ?? [];
}

function layoutComponent(block: string, tagName = "div"): DomBasicComponent {
  return (input) => {
    const props = input.props;
    const root = createElement(tagName as "div", {
      className: classes([
        block,
        props.divider ? `${block}--divider-${props.divider}` : undefined,
        stringProp(props, "distribution")
          ? `${block}--distribution-${stringProp(props, "distribution")}`
          : undefined,
        stringProp(props, "alignment")
          ? `${block}--alignment-${stringProp(props, "alignment")}`
          : undefined,
        stringProp(props, "role")
          ? `${block}--role-${stringProp(props, "role")}`
          : undefined,
        stringProp(props, "density")
          ? `${block}--density-${stringProp(props, "density")}`
          : undefined,
        stringProp(props, "variant")
          ? `${block}--variant-${stringProp(props, "variant")}`
          : undefined,
        stringProp(props, "size")
          ? `${block}--size-${stringProp(props, "size")}`
          : undefined,
        stringProp(props, "tone")
          ? `${block}--tone-${stringProp(props, "tone")}`
          : undefined,
        stringProp(props, "preset")
          ? `${block}--preset-${stringProp(props, "preset")}`
          : undefined,
      ]),
      style: {
        ...(props.style && typeof props.style === "object" ? props.style : {}),
        ...(stringProp(props, "gap") ? { gap: stringProp(props, "gap") } : {}),
        ...(props.wrap !== undefined
          ? { flexWrap: booleanProp(props, "wrap") ? "wrap" : "nowrap" }
          : {}),
        ...(stringProp(props, "distribution")
          ? {
              justifyContent: String(props.distribution).replace(
                /[A-Z]/g,
                (c) => `-${c.toLowerCase()}`,
              ),
            }
          : {}),
        ...(stringProp(props, "alignment")
          ? {
              alignItems:
                props.alignment === "start" || props.alignment === "end"
                  ? `flex-${props.alignment}`
                  : props.alignment,
            }
          : {}),
      },
    });
    return { node: root, cleanup: appendResults(root, renderSlot(input)) };
  };
}

const Text: DomBasicComponent = ({ props }) => {
  const usageHint = stringProp(props, "usageHint") ?? "body";
  const tag = /^h[1-5]$/.test(usageHint) ? usageHint : "p";
  const style =
    numberProp(props, "maxLines") !== undefined
      ? {
          ...(props.style && typeof props.style === "object"
            ? props.style
            : {}),
          display: "-webkit-box",
          WebkitLineClamp: numberProp(props, "maxLines"),
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }
      : props.style;
  return {
    node: createElement(tag as "p", {
      className: classes([
        `a2ui-text-${usageHint}`,
        stringProp(props, "decoration")
          ? `a2ui-text--decoration-${stringProp(props, "decoration")}`
          : undefined,
        stringProp(props, "emphasis")
          ? `a2ui-text--emphasis-${stringProp(props, "emphasis")}`
          : undefined,
        stringProp(props, "role")
          ? `a2ui-text--role-${stringProp(props, "role")}`
          : undefined,
        stringProp(props, "variant")
          ? `a2ui-text--variant-${stringProp(props, "variant")}`
          : undefined,
        stringProp(props, "size")
          ? `a2ui-text--size-${stringProp(props, "size")}`
          : undefined,
        stringProp(props, "tone")
          ? `a2ui-text--tone-${stringProp(props, "tone")}`
          : undefined,
        stringProp(props, "preset")
          ? `a2ui-text--preset-${stringProp(props, "preset")}`
          : undefined,
        booleanProp(props, "truncate") ? "a2ui-text--truncate" : undefined,
      ]),
      style,
      text: props.text,
    }),
  };
};

const Button: DomBasicComponent = (input) => {
  const props = input.props;
  const button = createElement("button", {
    className: classes([
      "a2ui-button",
      booleanProp(props, "fullWidth") ? "a2ui-button--full-width" : undefined,
      stringProp(props, "iconPosition") === "only" ||
      stringProp(props, "shape") === "circle"
        ? "a2ui-button--icon-only"
        : undefined,
      stringProp(props, "intent")
        ? `a2ui-button--intent-${stringProp(props, "intent")}`
        : undefined,
      stringProp(props, "shape")
        ? `a2ui-button--shape-${stringProp(props, "shape")}`
        : undefined,
      stringProp(props, "importance")
        ? `a2ui-button--importance-${stringProp(props, "importance")}`
        : undefined,
      stringProp(props, "variant")
        ? `a2ui-button--variant-${stringProp(props, "variant")}`
        : undefined,
      stringProp(props, "size")
        ? `a2ui-button--size-${stringProp(props, "size")}`
        : undefined,
      stringProp(props, "tone")
        ? `a2ui-button--tone-${stringProp(props, "tone")}`
        : undefined,
      stringProp(props, "preset")
        ? `a2ui-button--preset-${stringProp(props, "preset")}`
        : undefined,
    ]),
    style: props.style,
  });
  button.disabled =
    booleanProp(props, "disabled") || booleanProp(props, "loading");
  button.type = "button";
  if (booleanProp(props, "loading")) {
    button.appendChild(
      createElement("span", { className: "a2ui-button-icon", text: "..." }),
    );
  }
  const icon = props.icon;
  if (icon && stringProp(props, "iconPosition") !== "right") {
    button.appendChild(
      createElement("span", { className: "a2ui-button-icon", text: icon }),
    );
  }
  const children = renderSlot(input);
  const cleanup = appendResults(button, children);
  if (children.length === 0)
    button.append(document.createTextNode(textValue(props.label)));
  if (icon && stringProp(props, "iconPosition") === "right") {
    button.appendChild(
      createElement("span", { className: "a2ui-button-icon", text: icon }),
    );
  }
  const onClick = () => {
    if (!button.disabled) input.emit("click");
  };
  button.addEventListener("click", onClick);
  return {
    node: button,
    cleanup: () => {
      button.removeEventListener("click", onClick);
      cleanup?.();
    },
  };
};

const TextField: DomBasicComponent = ({ props, emit }) => {
  const root = fieldChrome(
    "label",
    props,
    classes([
      "a2ui-textfield",
      stringProp(props, "validationState")
        ? `a2ui-field--validation-${stringProp(props, "validationState")}`
        : undefined,
      stringProp(props, "density")
        ? `a2ui-field--density-${stringProp(props, "density")}`
        : undefined,
      stringProp(props, "variant")
        ? `a2ui-textfield--variant-${stringProp(props, "variant")}`
        : undefined,
      stringProp(props, "size")
        ? `a2ui-textfield--size-${stringProp(props, "size")}`
        : undefined,
      stringProp(props, "tone")
        ? `a2ui-textfield--tone-${stringProp(props, "tone")}`
        : undefined,
      stringProp(props, "preset")
        ? `a2ui-textfield--preset-${stringProp(props, "preset")}`
        : undefined,
    ]),
  );
  const control = createElement("span", {
    className: "a2ui-textfield-control",
  });
  const prefix = stringProp(props, "prefix");
  const suffix = stringProp(props, "suffix");
  if (prefix)
    control.appendChild(
      createElement("span", { className: "a2ui-field-affix", text: prefix }),
    );
  const isTextarea =
    stringProp(props, "usageHint") === "longText" ||
    Boolean(props.rows || props.minRows);
  const input = document.createElement(isTextarea ? "textarea" : "input") as
    HTMLInputElement | HTMLTextAreaElement;
  input.className = "a2ui-textfield-input";
  input.value = textValue(props.modelValue);
  input.placeholder = stringProp(props, "placeholder") ?? "";
  input.disabled = booleanProp(props, "disabled");
  input.readOnly = booleanProp(props, "readonly");
  input.required = booleanProp(props, "required");
  input.dataset.a2uiFocus = "primary";
  if (!isTextarea) {
    (input as HTMLInputElement).type =
      stringProp(props, "usageHint") === "number"
        ? "number"
        : stringProp(props, "usageHint") === "obscured"
          ? "password"
          : "text";
    const inputMode = stringProp(props, "inputMode");
    if (inputMode) (input as HTMLInputElement).inputMode = inputMode;
  }
  const rows = numberProp(props, "rows") ?? numberProp(props, "minRows");
  if (isTextarea && rows) (input as HTMLTextAreaElement).rows = rows;
  const name = stringProp(props, "name");
  if (name) input.setAttribute("name", name);
  // Do not rebuild the focused input during an IME composition session.
  let composing = false;
  const onInput = () => {
    if (!composing) emit("update:modelValue", input.value);
  };
  const onCompositionStart = () => {
    composing = true;
  };
  const onCompositionEnd = () => {
    composing = false;
    onInput();
  };
  input.addEventListener("compositionstart", onCompositionStart);
  input.addEventListener("compositionend", onCompositionEnd);
  input.addEventListener("input", onInput);
  control.appendChild(input);
  if (suffix)
    control.appendChild(
      createElement("span", { className: "a2ui-field-affix", text: suffix }),
    );
  root.appendChild(control);
  appendFieldMessage(root, props);
  return {
    node: root,
    cleanup: () => {
      input.removeEventListener("input", onInput);
      input.removeEventListener("compositionstart", onCompositionStart);
      input.removeEventListener("compositionend", onCompositionEnd);
    },
  };
};

const CheckBox: DomBasicComponent = ({ props, emit }) => {
  const root = createElement("div", {
    className: fieldClasses("a2ui-checkbox-field", props, "a2ui-checkbox"),
    style: props.style,
  });
  const label = createElement("label", {
    className: classes([
      "a2ui-checkbox",
      stringProp(props, "labelPosition")
        ? `a2ui-checkbox--label-${stringProp(props, "labelPosition")}`
        : undefined,
      stringProp(props, "validationState")
        ? `a2ui-field--validation-${stringProp(props, "validationState")}`
        : undefined,
      stringProp(props, "variant")
        ? `a2ui-checkbox--variant-${stringProp(props, "variant")}`
        : undefined,
    ]),
    style: props.style,
  });
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = props.modelValue === true;
  input.disabled = booleanProp(props, "disabled");
  input.required = booleanProp(props, "required");
  input.name = stringProp(props, "name") ?? "";
  input.dataset.a2uiFocus = "primary";
  const onChange = () => emit("update:modelValue", input.checked);
  input.addEventListener("change", onChange);
  label.appendChild(input);
  const labelText = createElement("span", {
    className: "a2ui-checkbox-label",
    text: props.label,
  });
  if (props.labelPosition === "left") label.prepend(labelText);
  else label.appendChild(labelText);
  root.appendChild(label);
  if (props.description)
    root.appendChild(
      createElement("span", {
        className: "a2ui-field-description",
        text: props.description,
      }),
    );
  appendFieldMessage(root, props);
  return {
    node: root,
    cleanup: () => input.removeEventListener("change", onChange),
  };
};

const ChoicePicker: DomBasicComponent = ({ props, emit }) => {
  const root = fieldChrome(
    "label",
    props,
    classes([
      "a2ui-choicepicker-field",
      fieldClasses("a2ui-choicepicker-field", props, "a2ui-choicepicker"),
      stringProp(props, "mode")
        ? `a2ui-choicepicker-field--mode-${stringProp(props, "mode")}`
        : undefined,
      stringProp(props, "validationState")
        ? `a2ui-field--validation-${stringProp(props, "validationState")}`
        : undefined,
    ]),
  );
  root
    .querySelector(".a2ui-choicepicker-field-label")
    ?.classList.replace(
      "a2ui-choicepicker-field-label",
      "a2ui-choicepicker-label",
    );
  const options = toOptions(props.options);
  if (props.mode && props.mode !== "select") {
    const row = createElement("span", {
      className: "a2ui-choicepicker-options",
    });
    const cleanups: Array<() => void> = [];
    for (const item of options) {
      const button = createElement("button", {
        className: classes([
          "a2ui-choicepicker-option",
          item.value === props.modelValue
            ? "a2ui-choicepicker-option--selected"
            : undefined,
        ]),
        text: item.label,
      });
      button.type = "button";
      button.disabled =
        booleanProp(props, "disabled") || item.disabled === true;
      button.dataset.a2uiFocus = `option:${typeof item.value}:${item.value}`;
      const onClick = () => {
        if (!button.disabled) emit("update:modelValue", item.value);
      };
      button.addEventListener("click", onClick);
      cleanups.push(() => button.removeEventListener("click", onClick));
      row.appendChild(button);
    }
    root.appendChild(row);
    appendFieldMessage(root, props);
    return { node: root, cleanup: () => cleanups.forEach((fn) => fn()) };
  }
  const select = document.createElement("select");
  select.className = "a2ui-choicepicker";
  select.required = booleanProp(props, "required");
  select.name = stringProp(props, "name") ?? "";
  select.disabled = booleanProp(props, "disabled");
  select.dataset.a2uiFocus = "primary";
  const placeholder = stringProp(props, "placeholder");
  if (placeholder) {
    const option = document.createElement("option");
    option.value = "";
    option.disabled = true;
    option.textContent = placeholder;
    select.appendChild(option);
  }
  for (const item of options) {
    const option = document.createElement("option");
    option.value = String(item.value);
    option.textContent = item.label;
    option.disabled = item.disabled === true;
    select.appendChild(option);
  }
  select.value = textValue(props.modelValue);
  const onChange = () =>
    emit(
      "update:modelValue",
      options.find((item) => String(item.value) === select.value)?.value ??
        select.value,
    );
  select.addEventListener("change", onChange);
  root.appendChild(select);
  appendFieldMessage(root, props);
  return {
    node: root,
    cleanup: () => select.removeEventListener("change", onChange),
  };
};

const Slider: DomBasicComponent = ({ props, emit }) => {
  const root = fieldChrome(
    "label",
    props,
    classes([
      "a2ui-slider",
      visualClasses("a2ui-slider", props),
      stringProp(props, "validationState")
        ? `a2ui-field--validation-${stringProp(props, "validationState")}`
        : undefined,
      stringProp(props, "density")
        ? `a2ui-field--density-${stringProp(props, "density")}`
        : undefined,
    ]),
  );
  const row = createElement("span", { className: "a2ui-slider-control" });
  const input = document.createElement("input");
  input.type = "range";
  input.required = booleanProp(props, "required");
  input.className = "a2ui-slider-input";
  input.name = stringProp(props, "name") ?? "";
  input.min = String(numberProp(props, "min") ?? 0);
  input.max = String(numberProp(props, "max") ?? 100);
  input.step = String(numberProp(props, "step") ?? 1);
  input.value = textValue(props.modelValue ?? input.min);
  input.disabled = booleanProp(props, "disabled");
  input.dataset.a2uiFocus = "primary";
  const value = createElement("span", {
    className: "a2ui-slider-value",
    text: `${textValue(props.valuePrefix)}${input.value}${textValue(props.valueSuffix)}`,
  });
  const onInput = () => {
    value.textContent = `${textValue(props.valuePrefix)}${input.value}${textValue(props.valueSuffix)}`;
    emit("update:modelValue", Number(input.value));
  };
  input.addEventListener("input", onInput);
  row.appendChild(input);
  if (props.showValue !== false && stringProp(props, "valueDisplay") !== "none")
    row.appendChild(value);
  root.appendChild(row);
  appendFieldMessage(root, props);
  return {
    node: root,
    cleanup: () => input.removeEventListener("input", onInput),
  };
};

const DateTimeInput: DomBasicComponent = ({ props, emit }) => {
  const root = fieldChrome(
    "label",
    props,
    fieldClasses("a2ui-datetimeinput", props),
  );
  const input = document.createElement("input");
  input.className = "a2ui-datetimeinput-input";
  const hint = stringProp(props, "usageHint");
  input.type =
    hint === "time" ? "time" : hint === "datetime" ? "datetime-local" : "date";
  input.readOnly = booleanProp(props, "readonly");
  input.name = stringProp(props, "name") ?? "";
  input.value = textValue(props.modelValue);
  input.placeholder = stringProp(props, "placeholder") ?? "";
  input.disabled = booleanProp(props, "disabled");
  input.required = booleanProp(props, "required");
  input.dataset.a2uiFocus = "primary";
  const onInput = () => emit("update:modelValue", input.value);
  input.addEventListener("input", onInput);
  root.appendChild(input);
  appendFieldMessage(root, props);
  return {
    node: root,
    cleanup: () => input.removeEventListener("input", onInput),
  };
};

const List: DomBasicComponent = (input) => {
  const props = input.props;
  const list = createElement("ul", {
    className: classes([
      "a2ui-list",
      visualClasses("a2ui-list", props),
      stringProp(props, "direction")
        ? `a2ui-list--direction-${stringProp(props, "direction")}`
        : undefined,
      stringProp(props, "marker")
        ? `a2ui-list--marker-${stringProp(props, "marker")}`
        : undefined,
      stringProp(props, "itemRole")
        ? `a2ui-list--item-role-${stringProp(props, "itemRole")}`
        : undefined,
      stringProp(props, "selection")
        ? `a2ui-list--selection-${stringProp(props, "selection")}`
        : undefined,
      booleanProp(props, "dividers") || booleanProp(props, "divided")
        ? "a2ui-list--dividers"
        : undefined,
      booleanProp(props, "loading") ? "a2ui-list--loading" : undefined,
    ]),
    style: {
      ...(props.style && typeof props.style === "object" ? props.style : {}),
      ...(stringProp(props, "gap") ? { gap: stringProp(props, "gap") } : {}),
      ...(stringProp(props, "direction") === "horizontal"
        ? { flexDirection: "row" }
        : {}),
      ...(props.wrap !== undefined
        ? { flexWrap: booleanProp(props, "wrap") ? "wrap" : "nowrap" }
        : {}),
      ...(stringProp(props, "marker") === "none"
        ? { listStyle: "none", paddingLeft: 0 }
        : {}),
    },
  });
  if (booleanProp(props, "loading")) {
    list.appendChild(
      createElement("li", { className: "a2ui-list-status", text: "加载中..." }),
    );
    return { node: list };
  }
  const children = renderSlot(input);
  if (children.length === 0 && stringProp(props, "emptyText")) {
    list.appendChild(
      createElement("li", {
        className: "a2ui-list-status",
        text: props.emptyText,
      }),
    );
    return { node: list };
  }
  const cleanups: Array<() => void> = [];
  for (const child of children) {
    const item = document.createElement("li");
    item.appendChild(child.node);
    list.appendChild(item);
    if (child.cleanup) cleanups.push(child.cleanup);
  }
  return {
    node: list,
    cleanup: cleanups.length
      ? () => cleanups.forEach((cleanup) => cleanup())
      : undefined,
  };
};

const Tabs: DomBasicComponent = (input) => {
  const props = input.props;
  const items = Array.isArray(props.items)
    ? (props.items as Array<Record<string, unknown>>)
    : [];
  const keys = items.map((item, index) =>
    typeof item.key === "string" ? item.key : `tab-${index}`,
  );
  let activeKey = textValue(
    props.modelValue ??
      input.state.get("activeKey", props.defaultValue ?? keys[0] ?? ""),
  );
  if (!keys.includes(activeKey)) activeKey = keys[0] || "";
  input.state.set("activeKey", activeKey);
  const root = createElement("div", {
    className: classes([
      "a2ui-tabs",
      stringProp(props, "align")
        ? `a2ui-tabs--align-${stringProp(props, "align")}`
        : undefined,
      booleanProp(props, "fullWidth") ? "a2ui-tabs--full-width" : undefined,
      stringProp(props, "variant")
        ? `a2ui-tabs--variant-${stringProp(props, "variant")}`
        : undefined,
      stringProp(props, "size")
        ? `a2ui-tabs--size-${stringProp(props, "size")}`
        : undefined,
      stringProp(props, "tone")
        ? `a2ui-tabs--tone-${stringProp(props, "tone")}`
        : undefined,
      stringProp(props, "preset")
        ? `a2ui-tabs--preset-${stringProp(props, "preset")}`
        : undefined,
    ]),
    style: props.style,
  });
  const header = createElement("div", { className: "a2ui-tabs-header" });
  const cleanups: Array<() => void> = [];
  items.forEach((item, index) => {
    const key = keys[index] ?? "";
    const button = createElement("button", {
      className: classes([
        "a2ui-tabs-tab",
        key === activeKey ? "a2ui-tabs-tab--active" : undefined,
      ]),
      text: item.title ?? key,
    });
    button.disabled = item.disabled === true;
    button.type = "button";
    button.dataset.a2uiFocus = `tab:${key}`;
    const onClick = () => {
      if (button.disabled) return;
      input.state.set("activeKey", key);
      input.emit("update:modelValue", key);
      input.emit("__requestRender");
    };
    button.addEventListener("click", onClick);
    cleanups.push(() => button.removeEventListener("click", onClick));
    header.appendChild(button);
  });
  const content = createElement("div", { className: "a2ui-tabs-content" });
  const panels = Array.isArray(input.slots.panels) ? input.slots.panels : [];
  const panel = panels.find((item) => item.key === activeKey) ?? panels[0];
  if (panel) {
    const cleanup = appendResults(content, input.renderChildren(panel.nodes));
    if (cleanup) cleanups.push(cleanup);
  }
  root.append(header, content);
  return {
    node: root,
    cleanup: cleanups.length
      ? () => cleanups.forEach((cleanup) => cleanup())
      : undefined,
  };
};

const Card: DomBasicComponent = (input) => {
  const props = input.props;
  const root = createElement("article", {
    className: classes([
      "a2ui-card",
      props.clickable ? "a2ui-card--clickable" : undefined,
      stringProp(props, "role")
        ? `a2ui-card--role-${stringProp(props, "role")}`
        : undefined,
      stringProp(props, "density")
        ? `a2ui-card--density-${stringProp(props, "density")}`
        : undefined,
      props.selected === true ? "a2ui-card--selected" : undefined,
      stringProp(props, "variant")
        ? `a2ui-card--variant-${stringProp(props, "variant")}`
        : undefined,
      stringProp(props, "size")
        ? `a2ui-card--size-${stringProp(props, "size")}`
        : undefined,
      stringProp(props, "tone")
        ? `a2ui-card--tone-${stringProp(props, "tone")}`
        : undefined,
      stringProp(props, "preset")
        ? `a2ui-card--preset-${stringProp(props, "preset")}`
        : undefined,
    ]),
    style: props.style,
  });
  const mediaCleanup = appendResults(root, input.slots.media?.() ?? []);
  if (props.header || props.title || props.subtitle) {
    const header = createElement("header", { className: "a2ui-card-header" });
    if (props.header || props.title)
      header.appendChild(
        createElement("div", {
          className: "a2ui-card-title",
          text: props.header || props.title,
        }),
      );
    if (props.subtitle)
      header.appendChild(
        createElement("div", {
          className: "a2ui-card-subtitle",
          text: props.subtitle,
        }),
      );
    root.appendChild(header);
  }
  const contentCleanup = appendResults(root, renderSlot(input));
  if (props.footer)
    root.appendChild(
      createElement("footer", {
        className: "a2ui-card-footer",
        text: props.footer,
      }),
    );
  return {
    node: root,
    cleanup: () => {
      mediaCleanup?.();
      contentCleanup?.();
    },
  };
};

const Image: DomBasicComponent = ({ props, state, emit }) => {
  const root = createElement("figure", {
    className: "a2ui-image-frame",
  });
  const imageClass = classes([
    "a2ui-image",
    visualClasses("a2ui-image", props),
    props.shape ? `a2ui-image--shape-${props.shape}` : undefined,
    props.role ? `a2ui-image--role-${props.role}` : undefined,
  ]);
  const imageStyle = {
    ...(props.style && typeof props.style === "object" ? props.style : {}),
    ...(props.fit ? { objectFit: props.fit } : {}),
    ...(stringProp(props, "aspectRatio")
      ? { aspectRatio: String(props.aspectRatio).replace(":", " / ") }
      : {}),
  };
  const url = stringProp(props, "url") ?? stringProp(props, "src");
  if (state.get("src", undefined) !== url) {
    state.set("src", url);
    state.set("hasLoadError", false);
  }
  let cleanup: (() => void) | undefined;
  if (!url || state.get("hasLoadError", false)) {
    root.appendChild(
      createElement("div", {
        className: "a2ui-image-fallback",
        style: imageStyle,
        text: props.fallbackText ?? props.alt ?? "图片不可用",
      }),
    );
  } else {
    const image = createElement("img", {
      className: imageClass,
      style: imageStyle,
    });
    image.src = url;
    image.alt = textValue(props.alt);
    if (props.loading === "lazy" || props.loading === "eager")
      image.loading = props.loading;
    const onError = () => {
      state.set("hasLoadError", true);
      emit("__requestRender");
    };
    image.addEventListener("error", onError);
    cleanup = () => image.removeEventListener("error", onError);
    root.appendChild(image);
  }
  if (props.caption)
    root.appendChild(
      createElement("figcaption", {
        className: "a2ui-image-caption",
        text: props.caption,
      }),
    );
  return { node: root, cleanup };
};

const Icon: DomBasicComponent = ({ props }) => {
  const name = stringProp(props, "name") ?? stringProp(props, "icon") ?? "";
  const fallback: Record<string, string> = {
    play_arrow: "▶",
    pause: "⏸",
    skip_next: "⏭",
    skip_previous: "⏮",
    favorite_border: "♡",
    favorite: "♥",
    check: "✓",
    close: "×",
    search: "⌕",
  };
  return {
    node: createElement("span", {
      className: classes([
        "a2ui-icon",
        visualClasses("a2ui-icon", props),
        stringProp(props, "semantic")
          ? `a2ui-icon--semantic-${stringProp(props, "semantic")}`
          : undefined,
        stringProp(props, "status")
          ? `a2ui-icon--status-${stringProp(props, "status")}`
          : undefined,
      ]),
      style: props.style,
      text: fallback[name] ?? name,
      attrs:
        props.semantic === "decorative"
          ? { "aria-hidden": "true" }
          : { "aria-label": stringProp(props, "label") || name },
    }),
  };
};

const Divider: DomBasicComponent = ({ props }) => {
  const root = createElement(props.label ? "div" : "hr", {
    className: classes([
      "a2ui-divider",
      visualClasses("a2ui-divider", props),
      stringProp(props, "orientation")
        ? `a2ui-divider--${stringProp(props, "orientation")}`
        : undefined,
      stringProp(props, "spacing")
        ? `a2ui-divider--spacing-${stringProp(props, "spacing")}`
        : undefined,
    ]),
    style: props.style,
  });
  if (props.color) root.style.borderColor = String(props.color);
  if (props.thickness) root.style.borderTopWidth = `${props.thickness}px`;
  if (typeof props.spacing === "number")
    root.style.margin = `${props.spacing}px 0`;
  if (props.label)
    root.appendChild(createElement("span", { text: props.label }));
  return { node: root };
};

const Spacer: DomBasicComponent = ({ props }) => {
  const sizes: Record<string, string> = {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "32px",
  };
  const size =
    sizes[String(props.size ?? "md")] ?? String(props.size ?? "16px");
  const root = createElement("div", {
    className: classes([
      "a2ui-spacer",
      visualClasses("a2ui-spacer", props),
      stringProp(props, "axis")
        ? `a2ui-spacer--axis-${stringProp(props, "axis")}`
        : undefined,
      stringProp(props, "size")
        ? `a2ui-spacer--size-${stringProp(props, "size")}`
        : undefined,
      booleanProp(props, "flex") ? "a2ui-spacer--flex" : undefined,
    ]),
    style: props.style,
    attrs: { "aria-hidden": "true" },
  });
  applyStyle(
    root,
    props.flex
      ? { flex: "1 1 auto" }
      : props.axis === "horizontal"
        ? { width: size, minWidth: size, height: "1px" }
        : { height: size, minHeight: size, width: "1px" },
  );
  return { node: root };
};

const Video: DomBasicComponent = ({ props }) => {
  const video = document.createElement("video");
  video.className = classes([
    "a2ui-video",
    visualClasses("a2ui-video", props),
    props.density ? `a2ui-video--density-${props.density}` : undefined,
  ]);
  applyStyle(video, props.style);
  if (stringProp(props, "aspectRatio"))
    video.style.aspectRatio = String(props.aspectRatio).replace(":", " / ");
  video.src = stringProp(props, "url") ?? stringProp(props, "src") ?? "";
  video.poster = stringProp(props, "poster") ?? "";
  video.controls = props.controls !== false;
  video.autoplay = booleanProp(props, "autoplay");
  video.loop = booleanProp(props, "loop");
  video.muted = booleanProp(props, "muted");
  if (stringProp(props, "fit"))
    video.style.objectFit = stringProp(props, "fit")!;
  return { node: video };
};

const AudioPlayer: DomBasicComponent = ({ props }) => {
  const audio = document.createElement("audio");
  audio.className = classes([
    "a2ui-audio",
    visualClasses("a2ui-audio", props),
    stringProp(props, "density")
      ? `a2ui-audio--density-${stringProp(props, "density")}`
      : undefined,
  ]);
  audio.src = stringProp(props, "url") ?? stringProp(props, "src") ?? "";
  applyStyle(audio, props.style);
  audio.controls = props.controls !== false;
  audio.autoplay = booleanProp(props, "autoplay");
  audio.loop = booleanProp(props, "loop");
  audio.muted = booleanProp(props, "muted");
  return { node: audio };
};

const Container: DomBasicComponent = (input) => {
  const { props } = input;
  const root = createElement("div", {
    className: classes([
      "a2ui-container",
      visualClasses("a2ui-container", props),
      ...["width", "padding", "align"].map((key) =>
        stringProp(props, key)
          ? `a2ui-container--${key}-${props[key]}`
          : undefined,
      ),
    ]),
    style: props.style,
  });
  return { node: root, cleanup: appendResults(root, renderSlot(input)) };
};
const Row = layoutComponent("a2ui-row", "div");
const Column = layoutComponent("a2ui-column", "div");
const Grid: DomBasicComponent = (input) => {
  const { props } = input;
  const root = createElement("div", {
    className: classes([
      "a2ui-grid",
      visualClasses("a2ui-grid", props),
      props.density ? `a2ui-grid--density-${props.density}` : undefined,
    ]),
    style: props.style,
  });
  root.style.gridTemplateColumns =
    props.columns === "auto" || props.columns === undefined
      ? `repeat(auto-fit, minmax(${stringProp(props, "minItemWidth") || "220px"}, 1fr))`
      : `repeat(${Number(props.columns) || 1}, minmax(0, 1fr))`;
  if (stringProp(props, "gap")) root.style.gap = String(props.gap);
  return { node: root, cleanup: appendResults(root, renderSlot(input)) };
};

export const basicDomComponents = new Map<string, DomBasicComponent>([
  ["Text", Text],
  ["Image", Image],
  ["Icon", Icon],
  ["Video", Video],
  ["AudioPlayer", AudioPlayer],
  ["Divider", Divider],
  ["Row", Row],
  ["Column", Column],
  ["Grid", Grid],
  ["Container", Container],
  ["Spacer", Spacer],
  ["List", List],
  ["Card", Card],
  ["Tabs", Tabs],
  ["Button", Button],
  ["TextField", TextField],
  ["CheckBox", CheckBox],
  ["ChoicePicker", ChoicePicker],
  ["Slider", Slider],
  ["DateTimeInput", DateTimeInput],
]);

export type { DomBasicComponent, DomBasicComponentInput, DomRenderResult };
export type { RenderNode };
