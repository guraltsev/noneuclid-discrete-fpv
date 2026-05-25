import { worldCatalog } from "../authoring/worldCatalog";

export function renderWorldPicker(container: HTMLElement, selectedWorldId: string): void {
  const picker = document.createElement("select");
  picker.ariaLabel = "World";
  picker.title = "World";
  picker.className = "geometry-picker";

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

  container.append(picker);
}
