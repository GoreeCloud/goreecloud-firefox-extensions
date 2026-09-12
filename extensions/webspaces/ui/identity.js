export const colorMap = Object.freeze({
  blue: "#3478f6",
  cyan: "#1a8fb8",
  gray: "#6b7280",
  green: "#2f9e63",
  orange: "#c57a25",
  pink: "#b95b8b",
  purple: "#7657f6",
  red: "#c63b32",
  violet: "#6d5bd0",
  yellow: "#d9a35f",
  turquoise: "#1c8a8d",
  toolbar: "#5b6b82"
});

const builtinColor = Object.freeze({ goreecloud: "blue", google: "red", microsoft: "purple", meta: "turquoise" });
const builtinGlyph = Object.freeze({ goreecloud: "G", google: "G", microsoft: "M", meta: "∞" });
const iconGlyph = Object.freeze({ briefcase: "▣", cart: "⌑", chill: "✧", circle: "●", dollar: "$", fence: "╫", fingerprint: "◎", food: "◒", fruit: "◉", gift: "◆", pet: "◇", tree: "⌁", vacation: "✦" });
const iconLabel = Object.freeze({ briefcase: "Briefcase", cart: "Shopping", chill: "Chill", circle: "Circle", dollar: "Finance", fence: "Boundary", fingerprint: "Fingerprint", food: "Food", fruit: "Fruit", gift: "Gift", pet: "Pet", tree: "Nature", vacation: "Travel" });

export function accentFor(webspace) {
  const key = webspace?.color ?? builtinColor[webspace?.id] ?? "blue";
  return colorMap[key] ?? colorMap.blue;
}

export function glyphFor(webspace) {
  if (!webspace) return "○";
  if (webspace.temporary) return "◌";
  if (builtinGlyph[webspace.id]) return builtinGlyph[webspace.id];
  if (iconGlyph[webspace.icon]) return iconGlyph[webspace.icon];
  const name = webspace.name?.trim() || "W";
  return name.slice(0, 1).toUpperCase();
}

export function iconLabelFor(webspace) {
  if (!webspace) return "Normal Firefox";
  if (webspace.temporary) return "Temporary Webspace";
  if (webspace.builtIn) return "Built-in Webspace";
  return `${iconLabel[webspace.icon] ?? "Custom"} identity`;
}

export function applyAccent(element, webspace) {
  element.style.setProperty("--space-accent", accentFor(webspace));
}
