<div align="center">

<img src="docs/icon128.png" width="88" alt="MarkNest logo">

# ✨ MarkNest ✨

**A local-first Chrome extension for cleaning up, reorganizing, and comparing browser bookmarks.**

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)
[![Chrome](https://img.shields.io/badge/Chrome-Extension-6c86c9)](https://www.google.com/chrome/)

English · [简体中文](README.zh-CN.md)

</div>

MarkNest started with a messy browser migration: nested folders, duplicate bookmarks, old links, and useful pages scattered across browsers. It brings those tasks into one visual workspace while keeping bookmark data on your device.

## Screenshots

### See the whole collection and reorganize folders

![MarkNest organizer](docs/images/screenshots/en/organizer.png)

### Compare an exported bookmark file with Chrome

![MarkNest cross-browser comparison](docs/images/screenshots/en/compare.png)

## What it does

- Add the current page or edit an existing bookmark in the popup, with a custom title and a searchable folder picker.
- Browse and search all Chrome bookmarks with their real folder hierarchy and favicons.
- Find duplicate URLs and bookmarks that have not been opened for a year.
- Select, move, delete, export, and undo in batches.
- Create, reorder, nest, expand, and collapse bookmark folders.
- Check broken links only after the user explicitly grants site access.
- Import a standard bookmark HTML file for local cross-browser comparison, then selectively add missing items to Chrome.

MarkNest has no AI classification, accounts, ads, or analytics SDKs.

## Install from GitHub

1. Click **Code → Download ZIP** and unzip the repository.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Click **Load unpacked** and choose the `extension` folder inside the unzipped `MarkNest` folder (it contains `manifest.json`).

## Privacy and permissions

Bookmark organization, import comparison, and export are processed locally. MarkNest does not send bookmarks, browsing history, or imported files to the developer or third-party servers.

| Permission | Why it is needed |
| --- | --- |
| `bookmarks` | Read and update the bookmark tree after user actions. |
| `storage` | Save interface settings, link-check results, and undo snapshots locally. |
| `downloads` | Export selected bookmarks as a standard HTML file. |
| `favicon` | Display local Chrome favicon resources in the interface. |
| `activeTab` | Read the current page title and URL when you open the extension to add a bookmark. |
| Optional website access | Requested only when the user starts a broken-link check. |

[Read the privacy policy](https://tinxixii.github.io/MarkNest/privacy/) · [Report an issue](https://github.com/tinxixii/MarkNest/issues)

## Development

MarkNest is a Manifest V3 extension built with plain HTML, CSS, and JavaScript. It has no package manager, build step, remote code, or runtime dependency.

```text
MarkNest/
├── extension/            # the extension itself (load this folder unpacked)
│   ├── manifest.json
│   ├── popup.html
│   ├── index.html
│   ├── scripts/
│   ├── styles/
│   ├── assets/
│   └── _locales/
└── docs/                 # GitHub Pages site
```

Run the regression tests with Node.js 20 or newer (no install step):

```sh
node --test tests/*.test.cjs
```

After editing the source, use **Reload** on `chrome://extensions` and reopen the extension.

## License and brand

The source code is licensed under [GNU GPL v3.0](LICENSE). Modified versions distributed under the GPL must remain open source under the same license.

The **MarkNest** name, logo, and extension icons are not granted for modified products. Forks are welcome, but public modified releases should use a different name and visual identity. See [TRADEMARKS.md](TRADEMARKS.md).

If MarkNest is useful to you, a ⭐ helps more people find it.
