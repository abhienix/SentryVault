/**
 * SOC Command Center service client.
 * All requests use the shared `api` axios instance with Bearer token interceptor.
 */
import api from './api';

const SOC = '/soc';

/** GET /soc/threats — paginated, filterable threat events */
export const getThreatEvents = (params = {}) =>
  api.get(`${SOC}/threats`, { params });

/** GET /soc/blocked-ips — quarantined IPs */
export const getBlockedIPs = (includeInactive = false) =>
  api.get(`${SOC}/blocked-ips`, { params: { include_inactive: includeInactive } });

/** POST /soc/block-ip */
export const blockIP = (ip_address, reason = 'Manually quarantined via SOC Dashboard') =>
  api.post(`${SOC}/block-ip`, { ip_address, reason });

/** POST /soc/unblock-ip */
export const unblockIP = (ip_address) =>
  api.post(`${SOC}/unblock-ip`, { ip_address, reason: '' });

/** GET /soc/waf-alerts */
export const getWafAlerts = (params = {}) =>
  api.get(`${SOC}/waf-alerts`, { params });

/** GET /soc/health-check — public, no auth required */
export const getSystemHealth = () =>
  api.get(`${SOC}/health-check`);

/** GET /soc/banking-kpis */
export const getBankingKPIs = () =>
  api.get(`${SOC}/banking-kpis`);

/**
 * Trigger a demo vulnerability attack and return the HTTP status + body.
 * Relies on DEMO_MODE=true on the backend.
 */
export const triggerDemoAttack = async (attackType) => {
  const attacks = {
    sqli: () => api.get('/demo/sqli', { params: { id: "1' UNION SELECT NULL,NULL,NULL--" } }),
    xss:  () => api.get('/demo/xss',  { params: { msg: '<script>alert(document.cookie)</script>' } }),
    path: () => api.get('/demo/path-traversal', { params: { file: '../../../../etc/passwd' } }),
    brute: () => api.post('/demo/brute-force', { username: 'admin', password: 'wrong' }),
  };
  const fn = attacks[attackType];
  if (!fn) throw new Error(`Unknown attack type: ${attackType}`);
  try {
    const res = await fn();
    return { status: res.status, data: res.data, blocked: false };
  } catch (err) {
    return {
      status: err.response?.status ?? 0,
      data: err.response?.data ?? { error: err.message },
      blocked: err.response?.status === 403,
    };
  }
};
