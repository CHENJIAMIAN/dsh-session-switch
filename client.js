/**
 * 「会话快速切换」—— 浏览器半区。
 *
 * 桌面版按 Ctrl+Tab 在「当前会话」和「上一个会话」之间来回切：
 *   A --Ctrl+Tab--> B --Ctrl+Tab--> A --Ctrl+Tab--> B ……
 * 不管问有多少个会话，都只在最近这两个之间打转，不会一路翻到 C、D。
 *
 * 只做三件事：
 *   1. 往官方快捷键服务（ctx.shortcuts）注册一条命令，默认绑 Ctrl+Tab；
 *   2. 记着「上一个是哪个会话」——主视图换人时把老的那个记下来；
 *   3. 触发时调 ctx.uiWorkspace.openSession(id) —— 和点侧边栏那一下走同一条
 *      导航路径，所以草稿、面板收起、历史加载都交给宿主自己管。
 *
 * 为什么不自己监听 keydown：桌面版的键盘先在 Electron 主进程里过一遍，只有
 * 登记进命令目录的组合才会被拦下来送进页面；自己监听反而收不到。
 */

window.__ModuleLoader__.load({
  id: 'dsh-session-switch',
  factory(require) {
    /** 字典命名空间（和包名一致，方便排查）。 */
    const NS = 'dsh-session-switch'
    /** 命令 id：带插件前缀，避免和将来官方命令撞车时把插件整个带崩。 */
    const COMMAND_ID = 'dsh-session-switch.previous'

    /**
     * 中英文字典。locale 服务要求一次把两种语言都注册齐；
     * 缺 key 时服务会回退到 common 命名空间，最后才显示 key 本身。
     */
    const DICT = {
      zh: {
        'command.label': '切到上一个会话',
        'shortcut.noSession': '当前没有可切换的会话',
        'shortcut.onlyOne': '只有一个会话，来回切不了',
        'shortcut.unavailable': '会话切换服务还没就绪',
      },
      en: {
        'command.label': 'Toggle previous session',
        'shortcut.noSession': 'No session to switch to',
        'shortcut.onlyOne': 'Only one session is open',
        'shortcut.unavailable': 'Session switching is not ready yet',
      },
    }

    /**
     * 取翻译函数。每次现取现绑：语言切换后 label 会被重新调用，缓存会串语言。
     * @param {object} ctx - 浏览器侧 Cordis 上下文。
     * @returns {(key: string) => string} 翻译函数。
     */
    function makeTranslate(ctx) {
      return (key) => {
        let locale
        try {
          locale = ctx.get('locale')
        } catch (error) {
          locale = undefined
        }
        try {
          const translate = locale !== undefined && locale !== null && typeof locale.bind === 'function'
            ? locale.bind(NS)
            : undefined
          if (typeof translate === 'function') {
            const raw = translate(key)
            if (typeof raw === 'string' && raw !== '' && raw !== key) return raw
          }
        } catch (error) {
          /* 服务没挂好就落回内置字典 */
        }
        const id = locale !== undefined && locale !== null && typeof locale.getLocale === 'function'
          ? locale.getLocale()?.id
          : undefined
        const table = id === 'en' ? DICT.en : DICT.zh
        return table[key] ?? DICT.zh[key] ?? key
      }
    }

    /**
     * 会话切换器：记最近两个会话，算出目标并执行导航。
     * @param {object} ctx - 浏览器侧 Cordis 上下文。
     * @returns {{ press: (t: (key: string) => string) => object, track: () => () => void }} 命令解析与订阅。
     */
    function createSwitcher(ctx) {
      /** 主视图当前显示的会话。 */
      let currentId
      /** 上一次主视图显示过的会话 —— Ctrl+Tab 就是回到它。 */
      let previousId
      /** 微任务去重标记。 */
      let scheduled = false

      /** @returns {object|undefined} 客户端的会话列表快照。 */
      const listOf = () => {
        const sessions = ctx.get('sessions')
        if (sessions === undefined || sessions === null) return undefined
        const list = sessions.list
        if (list === undefined || list === null || typeof list.getSnapshot !== 'function') return undefined
        return list.getSnapshot()
      }

      /** @returns {Set<string>} 被归档的会话（服务缺失时为空集合）。 */
      const archivedIds = () => {
        try {
          const workspaces = ctx.get('workspaces')
          const snapshot = workspaces?.list?.getSnapshot?.()
          const archived = snapshot?.archivedSessionIds
          return Array.isArray(archived) ? new Set(archived) : new Set()
        } catch (error) {
          return new Set()
        }
      }

      /**
       * 主视图现在是谁。切换的瞬间新的先被 retain、旧的随后才 release，两个会短暂
       * 同时命中；这时沿用「还在被 retain 的旧值」，等它真的放掉了再认新值 ——
       * 官方 ui-session 也是这么判的，否则会把自己的切换误读成一次用户导航。
       * @returns {string|undefined} 会话 id。
       */
      const readCurrent = () => {
        const list = listOf()
        if (list === undefined) return undefined
        const ids = Array.isArray(list.ids) ? list.ids : []
        const retained = (id) => (list.byId?.[id]?.retainedBy?.mainView ?? 0) > 0
        if (currentId !== undefined && retained(currentId)) return currentId
        return ids.find((id) => retained(id))
      }

      /**
       * 能不能作为切换目标：还活着、没归档、不是空白新会话、不是当前这个。
       * @param {string|undefined} id - 候选会话 id。
       * @param {string|undefined} current - 当前会话 id。
       * @returns {boolean} 是否可用。
       */
      const openable = (id, current) => {
        if (typeof id !== 'string' || id === '') return false
        if (id === current) return false
        const list = listOf()
        const row = list?.byId?.[id]
        if (row === undefined) return false
        if (row.blank === true) return false
        if (archivedIds().has(id)) return false
        return true
      }

      /**
       * 还没记录过「上一个」时（刚刷新页面）的兜底：挑最近更新过的另一个会话。
       * @param {string|undefined} current - 当前会话 id。
       * @returns {string|undefined} 候选会话 id。
       */
      const mostRecentOther = (current) => {
        const list = listOf()
        const ids = Array.isArray(list?.ids) ? list.ids : []
        let best
        let bestAt = Number.NEGATIVE_INFINITY
        for (const id of ids) {
          if (id === current) continue
          if (!openable(id, current)) continue
          const at = list.byId?.[id]?.updatedAt ?? 0
          if (at <= bestAt) continue
          best = id
          bestAt = at
        }
        return best
      }

      /**
       * 读一次主视图，把「换人了」记进 current / previous。
       * 空白新会话页（没有主视图会话）不参与记忆，免得把 previous 冲掉。
       */
      const observe = () => {
        const id = readCurrent()
        if (id === undefined || id === currentId) return
        previousId = currentId
        currentId = id
      }

      /**
       * 算出一次 Ctrl+Tab 要做的事；真正导航放在 run 里，和快捷键服务的约定一致。
       * @param {(key: string) => string} t - 翻译函数。
       * @returns {object} handled / blocked 决议。
       */
      const press = (t) => {
        observe()
        const current = currentId ?? readCurrent()

        // 首选「刚才那个」，它没了/被归档了才退回到最近更新过的会话。
        const target = openable(previousId, current) ? previousId : mostRecentOther(current)
        if (target === undefined) {
          return {
            status: 'blocked',
            reason: t(current === undefined ? 'shortcut.noSession' : 'shortcut.onlyOne'),
          }
        }

        return {
          status: 'handled',
          run: () => navigate(target, t),
        }
      }

      /**
       * 走宿主的导航动作切换会话。
       * @param {string} sessionId - 目标会话。
       * @param {(key: string) => string} t - 翻译函数。
       */
      const navigate = (sessionId, t) => {
        let uiWorkspace
        try {
          uiWorkspace = ctx.get('uiWorkspace')
        } catch (error) {
          uiWorkspace = undefined
        }
        if (uiWorkspace === undefined || uiWorkspace === null || typeof uiWorkspace.openSession !== 'function') {
          console.warn('[dsh-session-switch]', t('shortcut.unavailable'))
          return
        }
        try {
          uiWorkspace.openSession(sessionId)
        } catch (error) {
          console.error('[dsh-session-switch] 切换会话失败：', error)
        }
      }

      /**
       * 订阅会话列表，盯住主视图换人。
       * 一次导航里 retain 新的和 release 旧的会各发一次通知，所以推到微任务里读终态。
       * @returns {() => void} 取消订阅。
       */
      const track = () => {
        observe()
        const sessions = ctx.get('sessions')
        const list = sessions?.list
        if (list === undefined || list === null || typeof list.subscribe !== 'function') return () => {}
        return list.subscribe(() => {
          if (scheduled) return
          scheduled = true
          queueMicrotask(() => {
            scheduled = false
            observe()
          })
        })
      }

      return { press, track }
    }

    return {
      inject: ['shortcuts', 'locale', 'sessions'],

      /**
       * 注册字典、盯住主视图换人、挂上 Ctrl+Tab 命令。
       * @param {object} ctx - 浏览器侧 Cordis 上下文。
       */
      apply(ctx) {
        const t = makeTranslate(ctx)

        const locale = ctx.get('locale')
        if (locale !== undefined && locale !== null && typeof locale.register === 'function') {
          ctx.effect(() => locale.register(NS, DICT), 'session-switch: dictionaries')
        }

        const switcher = createSwitcher(ctx)
        ctx.effect(() => switcher.track(), 'session-switch: current session watcher')

        ctx.effect(() => {
          try {
            return ctx.shortcuts.register({
              id: COMMAND_ID,
              label: () => t('command.label'),
              aliases: ['previous session', 'last session', 'toggle session', '上一个会话', '切回上一个会话'],
              // 只声明 Windows 桌面版：
              //   · Web 里 Tab 是浏览器保留键，快捷键服务会直接拒绝；
              //   · Linux 桌面的保留键判定同样拦 Tab，声明了会让整条注册抛错；
              //   · macOS 的 ⌘+Tab 被系统应用切换器吃掉，应用收不到，留默认也没用。
              defaults: {
                'desktop:windows': { code: 'Tab', modifiers: ['primary'] },
              },
              regions: ['page', 'editable'],
              modals: [],
              resolve: () => switcher.press(t),
            })
          } catch (error) {
            // 注册失败（例如官方以后也占用了 Ctrl+Tab）只丢这一条命令，不拖垮整个插件。
            console.error('[dsh-session-switch] 注册 Ctrl+Tab 失败：', error)
            return () => {}
          }
        }, 'session-switch: Ctrl+Tab')
      },
    }
  },
})
