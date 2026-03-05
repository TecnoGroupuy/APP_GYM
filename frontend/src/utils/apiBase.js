const rawApiBaseUrl = String(process.env.REACT_APP_API_URL || '').trim();
const trimmedApiBaseUrl = rawApiBaseUrl.replace(/\/+$/, '');

const withApiSuffix = trimmedApiBaseUrl
  ? (/\/api$/i.test(trimmedApiBaseUrl) ? trimmedApiBaseUrl : `${trimmedApiBaseUrl}/api`)
  : '/api';

export const API_BASE_URL = withApiSuffix;
