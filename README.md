# dsh-session-switch · 会话快速切换

在 DSH 桌面版里按 **Ctrl+Tab**，在「当前会话」和「上一个会话」之间来回切：

```
对话 A  --Ctrl+Tab-->  对话 B  --Ctrl+Tab-->  对话 A  --Ctrl+Tab-->  对话 B ……
```

只在这两个之间打转，不会一路翻到更早的第三个、第四个会话。

- 手动在侧边栏点开别的会话后，规则照旧：按一下就回到你刚才那个。
- 会话被归档或者已经不存在了，会自动退回到「最近更新过的会话」。
- 刚刷新页面、还不知道「上一个」是谁时，第一次按回到最近更新过的那个会话。
- 停在空白「新会话」页时按一下，也是回到最近更新过的会话。

## 适配范围

| 环境 | 结果 |
|---|---|
| 桌面版 Windows | Ctrl+Tab 生效，默认绑定，可在「设置 → 快捷键」里改 |
| 桌面版 macOS | 没有默认绑定：⌘+Tab 被系统应用切换器吃掉，应用收不到；可在快捷键设置里改绑别的组合 |
| 桌面版 Linux | 没有默认绑定：Tab 在 Linux 的保留键判定里被拦，想用可以自己改绑别的组合 |
| 浏览器里的 Web 版 | 没有默认绑定：Tab 是浏览器保留键，快捷键服务会拒绝；命令仍在列表里，可以自己改绑 |

## 它怎么工作

1. 往官方快捷键服务注册一条命令 `dsh-session-switch.previous`，桌面 Windows 默认 `{ code: 'Tab', modifiers: ['primary'] }`。
2. 订阅会话列表，盯住「主视图 retain 了谁」，主视图换人时把老的那个记成「上一个」。
3. 触发时调 `ctx.uiWorkspace.openSession(id)` —— 和点侧边栏那一行走同一条导航路径，草稿、面板收起、历史加载都由宿主自己管。

不自己监听 `keydown`：桌面版的键盘先在 Electron 主进程里过一遍，只有登记进命令目录的组合才会被送进页面。

## 安装

```powershell
plugin_manager install_bundle --target D:\GithubRepository\dsh-session-switch
```

装完热更新即可生效，不用重启。卸载：

```powershell
plugin_manager remove_bundle --target dsh-session-switch
```

## 文件

| 文件 | 作用 |
|---|---|
| `index.js` | 宿主半区，空壳 |
| `client.js` | 浏览器半区：注册命令、记「上一个会话」、执行切换 |
| `cordis.patch.yml` | 插入一条插件行 |
| `locale/*.json` | 插件列表里的标题与说明 |
| `icon.svg` | 插件图标 |

## License

MIT
