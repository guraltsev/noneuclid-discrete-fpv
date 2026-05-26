import { worldCatalog } from "../authoring/worldCatalog";
import {
  debugOptionDefinitions,
  hasDebugOption,
  parseDebugOptions,
  serializeDebugOptions,
  type DebugOptionId,
} from "./debugOptions";

export interface RenderLaunchControlsOptions {
  readonly selectedWorldId: string;
  readonly renderWorldPicker: boolean;
  readonly debugEnabled: boolean;
  readonly debugOptions: readonly DebugOptionId[];
}

export function renderLaunchControls(container: HTMLElement, options: RenderLaunchControlsOptions): void {
  const controls = document.createElement("div");
  controls.className = "launch-controls";

  if (options.renderWorldPicker) {
    controls.append(createWorldPicker(options.selectedWorldId));
  }

  if (options.debugEnabled) {
    controls.append(createDebugButton(options));
  }

  if (controls.childElementCount === 0) {
    return;
  }

  container.append(controls);
}

function createWorldPicker(selectedWorldId: string): HTMLSelectElement {
  const picker = document.createElement("select");
  picker.ariaLabel = "World";
  picker.title = "World";
  picker.className = "launch-control";

  for (const world of worldCatalog) {
    const item = document.createElement("option");
    item.value = world.id;
    item.textContent = world.label;
    item.selected = world.id === selectedWorldId;
    picker.append(item);
  }

  picker.addEventListener("change", () => {
    const url = new URL(window.location.href);
    url.searchParams.set("world", picker.value);
    url.searchParams.set("worldPicker", "1");
    window.location.assign(url);
  });

  return picker;
}

function createDebugButton(options: RenderLaunchControlsOptions): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "launch-control debug-button";
  button.textContent = "Debug";

  const modal = createDebugModal(options);
  document.body.append(modal.dialog);

  button.addEventListener("click", () => {
    modal.syncFromUrl();
    modal.dialog.showModal();
  });

  return button;
}

function createDebugModal(options: RenderLaunchControlsOptions): {
  readonly dialog: HTMLDialogElement;
  syncFromUrl(): void;
} {
  const dialog = document.createElement("dialog");
  dialog.className = "debug-modal";

  const form = document.createElement("form");
  form.method = "dialog";
  form.className = "debug-modal-form";

  const title = document.createElement("h2");
  title.className = "debug-modal-title";
  title.textContent = "Debug Options";
  form.append(title);

  const copy = document.createElement("p");
  copy.className = "debug-modal-copy";
  copy.textContent = "Select which debug systems should be active after reload.";
  form.append(copy);

  const checkboxMap = new Map<DebugOptionId, HTMLInputElement>();

  for (const option of debugOptionDefinitions) {
    const label = document.createElement("label");
    label.className = "debug-option";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = option.id;
    checkbox.checked = hasDebugOption(options.debugOptions, option.id);
    checkboxMap.set(option.id, checkbox);

    const text = document.createElement("span");
    text.className = "debug-option-text";
    text.textContent = option.label;

    const description = document.createElement("span");
    description.className = "debug-option-description";
    description.textContent = option.description;

    label.append(checkbox, text, description);
    form.append(label);
  }

  const actions = document.createElement("div");
  actions.className = "debug-modal-actions";

  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.className = "launch-control debug-button-secondary";
  cancelButton.textContent = "Cancel";
  cancelButton.addEventListener("click", () => dialog.close());

  const applyButton = document.createElement("button");
  applyButton.type = "submit";
  applyButton.className = "launch-control debug-button";
  applyButton.textContent = "Apply";

  actions.append(cancelButton, applyButton);
  form.append(actions);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const url = new URL(window.location.href);
    const selectedOptions = debugOptionDefinitions
      .map((option) => option.id)
      .filter((optionId) => checkboxMap.get(optionId)?.checked);
    const serialized = serializeDebugOptions(selectedOptions);

    url.searchParams.set("debug", "1");

    if (serialized) {
      url.searchParams.set("debugOptions", serialized);
    } else {
      url.searchParams.delete("debugOptions");
    }

    if (options.renderWorldPicker) {
      url.searchParams.set("worldPicker", "1");
    }

    dialog.close();
    window.location.assign(url);
  });

  dialog.append(form);

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });

  return {
    dialog,
    syncFromUrl() {
      const params = new URLSearchParams(window.location.search);
      const selected = new Set(parseDebugOptions(params.get("debugOptions")));

      for (const option of debugOptionDefinitions) {
        const checkbox = checkboxMap.get(option.id);

        if (checkbox) {
          checkbox.checked = selected.has(option.id);
        }
      }
    },
  };
}
