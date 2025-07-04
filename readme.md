# 🎵 TuneSwap

**Seamlessly convert Spotify links to Apple Music with one click.**

A Chrome extension that automatically intercepts Spotify links and opens them in Apple Music, making music platform switching effortless.

![TuneSwap Logo](./tuneswap.svg)

## ✨ Features

- **🔄 Automatic Link Conversion**: Clicks on Spotify links are automatically redirected to Apple Music search
- **🖱️ Context Menu Integration**: Right-click any Spotify link to convert it instantly
- **⚙️ Smart Country Detection**: Automatically uses your region's Apple Music storefront
- **📊 Usage Statistics**: Track how many links you've converted
- **🎯 Intelligent Matching**: Uses multiple methods to extract song metadata for accurate searches

### 🛠️ Customizable Settings
- Enable or disable the extension
- Choose to open links in new tabs
- Select your preferred country/region
- Toggle notifications
- View detailed conversion statistics

## 🚀 How It Works

TuneSwap uses advanced techniques to provide seamless music platform conversion:

1. **Link Detection**: Content script detects clicks on Spotify links across any webpage
2. **Metadata Extraction**: Uses Spotify's oEmbed API and web scraping to get song details
3. **Smart Search Generation**: Creates optimized Apple Music search URLs with extracted metadata
4. **Regional Optimization**: Automatically uses the correct Apple Music storefront for your region

### 🔧 Technical Implementation

The extension consists of:
- **Content Script** (`content.js`): Handles link interception and metadata extraction
- **Background Service Worker** (`background.js`): Manages settings, context menus, and statistics
- **Popup Interface** (`popup.html` + `popup.js`): Provides user controls and statistics
- **Manifest** (`manifest.json`): Defines extension permissions and components

## 📦 Installation

### From Source (Developer Mode)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/tuneswap.git
   cd tuneswap
   ```

2. **Open Chrome Extensions**:
   - Navigate to `chrome://extensions`
   - Enable **"Developer mode"** (top-right toggle)

3. **Load the extension**:
   - Click **"Load unpacked"**
   - Select the cloned directory

4. **Start using TuneSwap**! 🎉

### From Chrome Web Store (Coming Soon)
TuneSwap will be available on the Chrome Web Store soon for easy one-click installation.

## 🎯 Usage

### Automatic Conversion
1. Browse any website with Spotify links (Twitter, Reddit, blogs, etc.)
2. Click any Spotify link
3. TuneSwap automatically opens the corresponding Apple Music search
4. Find your music instantly! 🎵

### Manual Conversion
- Right-click any Spotify link
- Select "Convert to Apple Music" from context menu
- Apple Music opens with optimized search results

### Settings & Statistics
- Click the TuneSwap icon in Chrome toolbar
- View your conversion statistics
- Adjust settings for optimal experience
- Test the conversion functionality

## 🌍 Supported Content Types

TuneSwap handles all Spotify content types:

- **🎵 Tracks**: `https://open.spotify.com/track/[ID]`
- **💿 Albums**: `https://open.spotify.com/album/[ID]`
- **👨‍🎤 Artists**: `https://open.spotify.com/artist/[ID]`
- **📱 Playlists**: `https://open.spotify.com/playlist/[ID]`

## 🗂️ Project Structure

```
tuneswap/
├── manifest.json          # Extension configuration
├── background.js          # Service worker (background tasks)
├── content.js            # Content script (link interception)
├── popup.html           # Popup interface
├── popup.js             # Popup functionality
├── diagnostic.js        # Debug utilities
├── index.html          # Demo page
├── tuneswap.svg        # Logo
├── icons/              # Extension icons
└── README.md           # This file
```

## ⚠️ Current Limitations

- **Search-Based Results**: Redirects to Apple Music search (not direct links) for maximum compatibility
- **No Account Integration**: Doesn't connect to your Apple Music account (yet!)
- **Region Dependent**: Results quality varies by Apple Music region availability
- **Metadata Dependent**: Accuracy depends on Spotify's available metadata

## 🚀 Roadmap & Future Features

### 🎯 Short Term
- [ ] Chrome Web Store publication
- [ ] Support for more regions/countries
- [ ] Improved metadata extraction
- [ ] Enhanced UI/UX

### 🔮 Long Term
- [ ] **Apple Music API Integration**: Direct links instead of searches
- [ ] **Account Authentication**: Add songs directly to your Apple Music library
- [ ] **Multi-Platform Support**: YouTube Music, Tidal, Amazon Music, Deezer
- [ ] **Playlist Sync**: Full playlist conversion and syncing
- [ ] **Browser Extensions**: Firefox, Safari, Edge support
- [ ] **Mobile Apps**: iOS and Android companions
- [ ] **Web App**: Standalone web version

### 💎 Premium Features (Planned)
- Unlimited conversions
- Advanced analytics
- Batch conversion
- Cross-device sync
- Priority support

## 🛟 Troubleshooting

### Extension Not Working?
1. Check that TuneSwap is enabled in `chrome://extensions`
2. Verify the extension has necessary permissions
3. Try refreshing the webpage
4. Check console for error messages (F12 → Console)

### Links Not Converting?
1. Ensure the link is a valid Spotify URL
2. Check your internet connection
3. Verify your selected country in TuneSwap settings
4. Try the "Test Conversion" button in the popup

### Need More Help?
- Open an issue on GitHub
- Check the diagnostic tools in the extension
- Contact support at hello@tuneswap.xyz

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **🐛 Report Bugs**: Open an issue with detailed steps to reproduce
2. **💡 Suggest Features**: Share your ideas for new functionality
3. **🔧 Submit PRs**: Help improve the codebase
4. **📖 Improve Docs**: Help make the documentation better
5. **🌟 Spread the Word**: Share TuneSwap with other music lovers!

### Development Setup
```bash
git clone https://github.com/yourusername/tuneswap.git
cd tuneswap
# Load in Chrome as unpacked extension
# Make changes and reload extension to test
```

## 📄 License

**MIT License**

Copyright (c) 2025 Carlos Vidal

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

---

<div align="center">

**Made with ❤️ for music lovers everywhere**

[🌐 Website](https://tuneswap.xyz) • [🐛 Issues](https://github.com/yourusername/tuneswap/issues) • [💬 Discussions](https://github.com/yourusername/tuneswap/discussions)

</div>