import { getActiveTab } from "./api/getActiveTab.js";

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type !== "INIT") return;

  disableProfiling();
});

// async function disableProfiling() {
//   const tab = await getActiveTab();

//   if (!tab?.id) return;

//   await chrome.scripting.executeScript({
//     target: { tabId: tab.id },
//     func: () => {
//       console.log("🔥 från tab context");
//     }
//   });
//   await chrome.scripting.executeScript({
//     target: { tabId: tab.id },
//     func: async () => {
//       await fetch("/?profiling=true", {
//         credentials: "include"
//       });
//     }
//   });
// }

async function setProfiling(bool) {
  const tab = await getActiveTab();

  if (!tab?.id) return;

  const origin = new URL(tab.url).origin;
  await fetch(`${origin}/?profiling=${bool}`, {
    credentials: "include"
  });
} 