# dsh-session-switch

> DSH 桌面版的 Ctrl+Tab：在「当前会话」和「上一个会话」之间来回切。

[English](README.en.md) | 中文

![icon](icon.svg)

## 它做什么

在 DSH 桌面版里按 **Ctrl+Tab**，在最近看过的两个会话之间来回切换：

```
对话 A  --Ctrl+Tab-->  对话 B  --Ctrl+Tab-->  对话 A  --Ctrl+Tab-->  对话 B ……
```

和浏览器切标签页的手感一样：只在这两个之间打转，不会一路翻回更早的第三个、第四个会话。

- **第一次按**回到你刚才那个会话；再按又切回来，如此往复。
- **手动点开别的会话**后规则照旧：按一下就回到你刚才所在的那个。
- **上一个会话被归档或已不存在**时，退回到「最近更新过的会话」。
- **刚刷新页面**还不知道「上一个」是谁，第一次按回到最近更新过的会话。
- **停在空白「新会话」页**按一下，也是回到最近更新过的会话（空白页不参与记忆）。

## 安装

插件市场或直接装本地目录：

```powershell
plugin_manager install_bundle --target D:\GithubRepository\dsh-session-switch
```

装完热更新即可生效，不用重启。卸载：

```powershell
plugin_manager remove_bundle --target dsh-session-switch
```

## 适配范围

| 环境 | 结果 |
|---|---|
| 桌面版 Windows | Ctrl+Tab 默认生效，可在「设置 → 快捷键」里改绑 |
| 桌面版 macOS | 没有默认绑定：⌘+Tab 被系统应用切换器吃掉，应用收不到；可在快捷键设置里改绑别的组合 |
| 桌面版 Linux | 没有默认绑定：Tab 在 Linux 的保留键判定里被拦；可在快捷键设置里改绑别的组合 |
| 浏览器 Web 版 | 没有默认绑定：Tab 是浏览器保留键，快捷键服务会拒绝；命令仍在快捷键列表里，可自行改绑 |

## 怎么实现的

1. 往官方快捷键服务注册一条命令 `dsh-session-switch.previous`，桌面 Windows 默认 `{ code: 'Tab', modifiers: ['primary'] }`。
2. 订阅会话列表，盯住「主视图 retain 了谁」；主视图换人时，把老的那个记成「上一个会话」。
3. 触发时调 `ctx.uiWorkspace.openSession(id)` —— 和点侧边栏那一行走同一条导航路径，草稿、右侧面板、历史加载都由宿主自己管。

不自己监听 `keydown`：桌面版的键盘先在 Electron 主进程里过一遍，只有登记进官方命令目录的组合才会被送进页面。

## 文件

| 文件 | 作用 |
|---|---|
| `client.js` | 浏览器半区：注册命令、记「上一个会话」、执行切换 |
| `index.js` | 宿主半区，空壳（不需要服务、路由或落盘） |
| `cordis.patch.yml` | 插入一条插件行 |
| `locale/*.json` | 插件列表里的标题与说明 |
| `icon.svg` | 插件图标 |

## 兼容性

`engines.dsh` 声明为 `>=0.2.1-rc.2 <0.3.0`，开发和验证都基于 v0.2.1-rc.3。

## License

[MIT](LICENSE)
