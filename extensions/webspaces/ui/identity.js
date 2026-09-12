export const colorMap = Object.freeze({
  blue: "#3478f6",
  cyan: "#1c8a8d",
  turquoise: "#1c8a8d",
  gray: "#6f7887",
  toolbar: "#6f7887",
  green: "#2f9e63",
  yellow: "#d9a35f",
  orange: "#c57a25",
  red: "#c63b32",
  pink: "#b95b8b",
  purple: "#7657f6",
  violet: "#6849df"
});

const builtinColor = Object.freeze({
  goreecloud: "blue",
  google: "red",
  microsoft: "purple",
  meta: "cyan"
});

const builtinGlyph = Object.freeze({
  goreecloud: "G",
  google: "G",
  microsoft: "M",
  meta: "∞"
});

const iconGlyph = Object.freeze({
  circle: "●",
  fingerprint: "◎",
  briefcase: "▣",
  dollar: "$",
  cart: "⌑",
  vacation: "✦",
  gift: "◆",
  food: "◒",
  pet: "◇",
  tree: "⌁",
  chill: "❄",
  fence: "⌗",
  fruit: "◉"
});

const iconLabel = Object.freeze({
  circle: "Circle",
  fingerprint: "Fingerprint",
  briefcase: "Briefcase",
  dollar: "Finance",
  cart: "Shopping",
  vacation: "Travel",
  gift: "Gift",
  food: "Food",
  pet: "Pet",
  tree: "Nature",
  chill: "Chill",
  fence: "Fence",
  fruit: "Fruit"
});

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
