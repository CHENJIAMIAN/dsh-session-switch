/**
 * 「会话快速切换」—— 宿主半区。
 *
 * 能力全在浏览器里（往官方快捷键服务登记一条 Ctrl+Tab 命令，切换时走
 * ctx.uiWorkspace.openSession）。宿主侧不需要服务、路由或落盘，所以这里只做
 * 一个空壳：让 cordis.patch.yml 里那一行有东西可挂，并把包名报给加载器。
 */

/** 插件名（诊断日志里显示）。 */
export const name = 'dsh-session-switch'

/** 与 package.json 对齐。 */
export const VERSION = '1.0.0'

/**
 * 插件入口。宿主侧没有要做的事。
 * @param ctx - Cordis 上下文。
 */
export function apply(ctx) {
  ctx.logger?.('dsh-session-switch')?.info?.('[dsh-session-switch] 宿主半为空壳，命令在浏览器半区')
}
