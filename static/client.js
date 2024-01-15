const ANSI_COLOR_CODES = {
  0: "reset",
  1: "bold",
  2: "faint",
  3: "italic",
  4: "underline",
  5: "blink",
  // 22: "reset",
  // 23: "reset",
  // 24: "reset",
  // 25: "reset",
  // 26: "reset",
  // 27: "reset",
  // 28: "reset",
  // 29: "reset",
  30: "black",
  31: "red",
  32: "green",
  33: "yellow",
  34: "blue",
  35: "magenta",
  36: "cyan",
  37: "white",
  // 39: "reset",
  // 49: "reset",
  // 50: "reset",
};

function getStylesFromCode(code) {
  const result = [];
  for (const c of code.split(";")) {
    if (ANSI_COLOR_CODES[c]) result.push(ANSI_COLOR_CODES[c]);
  }
  return result;
}

function printTextEl(element, text) {
  let el = element;
  if (text.length > 0) {
    const char = text.charAt(0);

    // deno-lint-ignore no-control-regex
    const escapeRegex = /^\x1b\[([\d;]*)m/;
    const match = text.match(escapeRegex);

    if (match) {
      const code = match[1];
      const code_styles = getStylesFromCode(code);
      if (code_styles.indexOf('reset') === -1) {
        const e = document.createElement("span");
        for (const s of getStylesFromCode(code)) {
          e.classList.add(s);
        }
        element.appendChild(e);
        el = e;
      } else {
        el = element.parentElement;
      }
      printTextEl(el, text.substr(match[0].length));
    } else {
      element.innerHTML += (char === "\n") ? "<br>" : char;
      setTimeout(() => printTextEl(el, text.substr(1)), 0);
    }
  }
}
