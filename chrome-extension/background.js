// Hatchet for Fizzy - Background Service Worker
// Manages storage and provides extension APIs

// Initialize storage on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['boardPaths'], (result) => {
    if (!result.boardPaths) {
      chrome.storage.local.set({ boardPaths: {} });
    }
  });
});

// Handle messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_BOARD_PATHS') {
    chrome.storage.local.get(['boardPaths'], (result) => {
      sendResponse({ boardPaths: result.boardPaths || {} });
    });
    return true; // Keep channel open for async response
  }

  if (message.type === 'SET_BOARD_PATH') {
    const { boardId, boardName, path } = message;
    chrome.storage.local.get(['boardPaths'], (result) => {
      const boardPaths = result.boardPaths || {};
      boardPaths[boardId] = { path, boardName };
      chrome.storage.local.set({ boardPaths }, () => {
        sendResponse({ success: true });
      });
    });
    return true;
  }

  if (message.type === 'DELETE_BOARD_PATH') {
    const { boardId } = message;
    chrome.storage.local.get(['boardPaths'], (result) => {
      const boardPaths = result.boardPaths || {};
      delete boardPaths[boardId];
      chrome.storage.local.set({ boardPaths }, () => {
        sendResponse({ success: true });
      });
    });
    return true;
  }

  if (message.type === 'GET_ALL_BOARDS') {
    chrome.storage.local.get(['boardPaths'], (result) => {
      sendResponse({ boardPaths: result.boardPaths || {} });
    });
    return true;
  }
});
