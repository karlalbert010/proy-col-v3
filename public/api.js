function getApiBase() {
  return localStorage.getItem('coleApiBase') || '';
}

function setApiBase(base) {
  localStorage.setItem('coleApiBase', base.trim());
}

function getToken() {
  return localStorage.getItem('coleToken') || '';
}

function setToken(token) {
  localStorage.setItem('coleToken', token);
}

function clearToken() {
  localStorage.removeItem('coleToken');
}

function parseBody(input) {
  if (!input || !input.trim()) {
    return undefined;
  }

  return JSON.parse(input);
}

async function apiRequest(method, path, body) {
  const base = getApiBase();
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch (_e) {
    payload = { success: false, message: 'Respuesta no JSON.' };
  }

  return { response, payload };
}

function showStatus(elementId, text, ok) {
  const el = document.getElementById(elementId);
  el.className = ok ? 'status ok' : 'status error';
  el.textContent = text;
}

function showResult(elementId, data) {
  const el = document.getElementById(elementId);
  el.textContent = JSON.stringify(data, null, 2);
}

window.coleApi = {
  getApiBase,
  setApiBase,
  getToken,
  setToken,
  clearToken,
  parseBody,
  apiRequest,
  showStatus,
  showResult
};
