# Spotify to Apple Music Converter

A Chrome extension that automatically intercepts Spotify links and opens them in Apple Music.

## Features

*   **Automatic Link Interception:** Clicks on Spotify links are automatically redirected to a search on Apple Music.
*   **Context Menu Integration:** Right-click on any Spotify link to convert it to an Apple Music link.
*   **Customizable Settings:**
    *   Enable or disable the extension.
    *   Choose to open links in a new tab.
    *   Enable or disable notifications.
    *   Set your country for accurate Apple Music storefronts.
*   **Statistics Tracking:** Keep track of how many links you have converted.

## How it Works

The extension uses a content script (`content.js`) to detect clicks on Spotify links on any webpage. When a link is clicked, it prevents the default action and instead:
1.  Extracts the type of content (track, album, artist, playlist) and its ID from the Spotify URL.
2.  Fetches metadata from Spotify's oEmbed endpoint or by scraping the embed page to get details like the title and artist.
3.  Constructs a search URL for the Apple Music website, using the extracted metadata.
4.  Opens the Apple Music search page in a new tab.

The extension also includes a popup (`popup.html` and `popup.js`) that allows you to view statistics, change settings, and test the conversion functionality. The background script (`background.js`) manages the extension's state, settings, and the context menu.

## Installation

1.  Clone or download this repository to your local machine.
2.  Open Google Chrome and navigate to `chrome://extensions`.
3.  Enable **"Developer mode"** using the toggle switch in the top-right corner.
4.  Click the **"Load unpacked"** button and select the directory where you cloned or downloaded the repository.

## Usage

Once installed, the extension will be active and automatically convert Spotify links. You can click on the extension icon in the Chrome toolbar to access the popup, view stats, and configure settings to your preference.

## Files

*   `manifest.json`: The manifest file for the Chrome extension, defining permissions and components.
*   `background.js`: The service worker. Handles background tasks such as creating the context menu, managing storage, and handling extension-wide events.
*   `content.js`: The content script injected into web pages. It intercepts clicks on Spotify links and initiates the conversion process.
*   `popup.html`: The HTML structure for the extension's popup.
*   `popup.js`: The JavaScript that powers the popup, handling user interaction, settings, and displaying stats.
*   `icons/`: Directory containing the extension's icons in various sizes.

---

## Limitations

*   **Relies on Scraping/oEmbed:** The method for fetching metadata is dependent on Spotify's web page structure and oEmbed API. If Spotify makes changes to these, the extension's core functionality may break until it is updated.
*   **Search-Based Conversion:** The extension redirects to an Apple Music *search page*, not directly to the corresponding item. While the search is tailored to be as accurate as possible, it may not always lead to the correct result, especially for songs with generic titles or many remixes.
*   **No Direct Library Integration:** This extension does not connect to your Apple Music account. It cannot add songs to your library or playlists directly.

## Future Improvements

*   **Apple Music API Integration:** Utilize the official Apple Music API to find the exact corresponding track, album, or artist, providing a much more accurate conversion instead of a simple search.
*   **OAuth for Apple Music:** Allow users to authenticate with their Apple Music account to enable features like "Add to Library" or "Add to Playlist" directly from the extension.
*   **Podcast Support:** Extend functionality to also convert Spotify podcast and episode links.
*   **Improved UI/UX:** Enhance the popup with a more detailed history of converted links and a more advanced settings page.
*   **Smarter Country Detection:** Implement a more reliable method for detecting the user's country to ensure results from the correct Apple Music storefront.

## License

This project is licensed under the MIT License.

**MIT License**

Copyright (c) 2025

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.