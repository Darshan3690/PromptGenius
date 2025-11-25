// background.js
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "enhance-prompt",
    title: "Enhance with AI Prompt Enhancer",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "enhance-prompt" && info.selectionText) {
    // open extension popup with selection prefilled
    chrome.storage.local.set({ lastSelection: info.selectionText }, () => {
      chrome.action.openPopup();
    });
  }
});
