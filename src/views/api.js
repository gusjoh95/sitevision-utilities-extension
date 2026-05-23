export async function getActiveTab() {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  return tab;
}


export async function setProfiling(bool) {
  const tab = await getActiveTab();

  if (!tab?.id) return;

  const origin = new URL(tab.url).origin;
  await fetch(`${origin}/?profiling=${bool}`, {
    credentials: "include"
  });
}