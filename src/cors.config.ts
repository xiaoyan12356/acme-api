/**
 * cors.config.ts · G2-GAP-CORS-1 修复
 *
 * 用 WEB_ORIGIN 环境变量控制 CORS 白名单：
 *
 *   - WEB_ORIGIN 未设 / 空字符串 → origin: false（CORS 关闭；强制同源；prod 同源部署的安全默认）
 *   - WEB_ORIGIN=http://foo.com     → 单 origin 白名单
 *   - WEB_ORIGIN=foo.com,bar.com    → 多 origin 逗号分隔；NestJS cors 中间件按数组匹配首个命中
 *
 * 不依赖 NODE_ENV：部署形态由 WEB_ORIGIN 控制；prod 不设 env 也是同源安全默认值。
 *
 * 替代 Tester 在 `agent/tester/f4c68ba963ae@dfbd04f` 的 `origin: true` 兜底
 * （`origin: true` 等价于反射任意 Origin，prod 不能用 —— 任意 origin 可携 cookie）。
 */

import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

const ENV_KEY = 'WEB_ORIGIN';

export function buildCorsOptions(): CorsOptions {
  const raw = process.env[ENV_KEY];
  if (typeof raw !== 'string' || raw.trim() === '') {
    // 同源部署 / 未配置：CORS 关闭
    return { origin: false, credentials: true };
  }
  const origins = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (origins.length === 0) {
    return { origin: false, credentials: true };
  }
  return { origin: origins, credentials: true };
}