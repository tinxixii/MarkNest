<div align="center">

<img src="docs/icon128.png" width="88" alt="MarkNest Logo">

# ✨ MarkNest ✨

**本地优先的 Chrome 收藏整理、分类与跨浏览器比对工具。**

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)
[![Chrome](https://img.shields.io/badge/Chrome-Extension-6c86c9)](https://www.google.com/chrome/)

[English](README.md) · 简体中文

</div>

MarkNest 源于一次真实的浏览器迁移：文件夹层层嵌套、重复收藏很多、旧链接失效，有价值的页面又散落在不同浏览器里。它把这些事情集中到一个直观的整理界面中，同时让收藏数据留在本机。

## 界面预览

### 查看收藏全貌，直接整理文件夹

![MarkNest 深度整理界面](docs/images/screenshots/zh-CN/organizer.png)

### 与其他浏览器导出的书签文件比对

![MarkNest 跨浏览器书签比对](docs/images/screenshots/zh-CN/compare.png)

## 核心功能

- 在弹窗中添加当前页面或编辑已有收藏，保存前可修改名称并搜索、选择文件夹。
- 按真实文件夹层级查看和搜索 Chrome 收藏，并展示网站图标。
- 查找重复网址和一年未打开的收藏。
- 批量选择、移动、删除、导出，并支持撤销最近操作。
- 新建、拖拽排序、调整层级、折叠和展开收藏文件夹。
- 仅在用户主动授权后检查失效链接。
- 导入标准书签 HTML 文件，在本地进行跨浏览器比对，并选择性补充 Chrome 中缺少的收藏。

MarkNest 不包含 AI 分类、账号、广告或分析 SDK。

## 从 GitHub 安装

1. 点击 **Code → Download ZIP**，然后解压仓库。
2. 在 Chrome 打开 `chrome://extensions`。
3. 开启右上角的 **开发者模式**。
4. 点击 **加载已解压的扩展程序**，选择解压后 `MarkNest` 文件夹里的 `extension` 文件夹（即包含 `manifest.json` 的目录）。

## 隐私与权限

收藏整理、导入比对和导出均在本地完成。MarkNest 不会把收藏、浏览记录或导入文件发送给开发者或第三方服务器。

| 权限 | 用途 |
| --- | --- |
| `bookmarks` | 在用户操作后读取和更新收藏树。 |
| `storage` | 在本地保存界面设置、链接检查结果和撤销快照。 |
| `downloads` | 将选中的收藏导出为标准 HTML 文件。 |
| `favicon` | 在界面中显示 Chrome 本地保存的网站图标。 |
| `activeTab` | 打开扩展添加收藏时，读取当前页面的标题和网址。 |
| 可选网站访问权限 | 仅在用户主动运行失效链接检查时申请。 |

[查看隐私政策](https://tinxixii.github.io/MarkNest/privacy/) · [反馈问题](https://github.com/tinxixii/MarkNest/issues)

## 开发说明

MarkNest 是一个 Manifest V3 扩展，使用原生 HTML、CSS 和 JavaScript 实现，没有包管理器、构建步骤、远程代码或运行时依赖。

```text
MarkNest/
├── extension/            # 扩展本体（加载此文件夹即可）
│   ├── manifest.json
│   ├── popup.html
│   ├── index.html
│   ├── scripts/
│   ├── styles/
│   ├── assets/
│   └── _locales/
└── docs/                 # GitHub Pages 站点
```

使用 Node.js 20 或更高版本运行回归测试，无需安装依赖：

```sh
node --test tests/*.test.cjs
```

修改源代码后，在 `chrome://extensions` 点击扩展卡片上的“重新加载”，再重新打开插件即可。

## 开源许可与品牌

源代码按照 [GNU GPL v3.0](LICENSE) 开源。基于它公开发布的修改版本，需要继续使用 GPL 并公开对应源代码。

**MarkNest** 名称、Logo 和扩展图标不随代码授权给修改版产品使用。欢迎 Fork，但公开发布修改版时应更换名称和视觉标识，避免被误认为官方版本。详见 [TRADEMARKS.md](TRADEMARKS.md)。

如果 MarkNest 对你有帮助，欢迎点一个 ⭐。
