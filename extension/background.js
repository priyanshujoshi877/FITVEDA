/**
 * Jiggle Wiggle — Chrome Extension Background Service Worker
 *
 * When the toolbar button is clicked on a YouTube page,
 * open the web app in a new tab and pass the YouTube URL.
 */

const WEB_APP_URL = "http://localhost:3000";

chrome.action.onClicked.addListener(async (tab) => {
  const url = tab.url || "";

  // Check if current tab is a YouTube page
  if (
    url.includes("youtube.com/watch") ||
    url.includes("youtu.be/") ||
    url.includes("youtube.com/shorts")
  ) {
    // Open the web app with the YouTube URL as a query param
    await chrome.tabs.create({
      url: `${WEB_APP_URL}/?url=${encodeURIComponent(url)}`,
    });
  } else {
    // If not on YouTube, just open the app
    await chrome.tabs.create({
      url: WEB_APP_URL,
    });
  }
});
