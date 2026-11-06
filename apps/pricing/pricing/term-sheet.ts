/** Open the term sheet link from the save response. The link expires, so this does not keep a copy. */
export function openTermSheet(url: string) {
  if (url.startsWith("preview:")) {
    openPreview("Term sheet");
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

/** Open the application for the option currently selected. */
export function openApplication(url: string) {
  if (url.startsWith("preview:")) {
    openPreview("Application");
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

function openPreview(title: string) {
  const text = `${title}. This is a local preview, not a commitment to lend.`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head><body style="font-family:system-ui,sans-serif;padding:2rem"><p>${text}</p></body></html>`;
  const url = URL.createObjectURL(new Blob([html], {type: "text/html"}));
  window.open(url, "_blank", "noopener,noreferrer");
}
