import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore.js';

const SYSTEMD_ORIGIN = 'https://uidsoftware.com.br';
const SSO_TIMEOUT_MS = 6000;

export default function PrivateRoute({ children }) {
  const { accessToken, setAuth, logout } = useAuthStore();
  const [ssoStatus, setSsoStatus] = useState('idle');
  const inIframe = window !== window.top;
  const tokenEfetivo = inIframe ? null : accessToken;

  useEffect(() => {
    if (!inIframe) return;

    if (accessToken) logout();

    setSsoStatus('waiting');

    const timer = setTimeout(() => {
      setSsoStatus(
        'Timeout: SystemD não enviou o token em 6 segundos.\n' +
        'Parent origin esperado: ' + SYSTEMD_ORIGIN + '\n' +
        'Atual: ' + (window.parent === window ? 'sem pai' : 'tem pai')
      );
    }, SSO_TIMEOUT_MS);

    async function handleMessage(event) {
      if (event.origin !== SYSTEMD_ORIGIN) {
        setSsoStatus('Mensagem recebida de origem inesperada: ' + event.origin);
        return;
      }
      if (event.data?.type !== 'SYSTEMD_TOKEN') return;

      clearTimeout(timer);

      if (!event.data.token) {
        setSsoStatus('Token recebido do SystemD está vazio/nulo.');
        return;
      }

      try {
        const res = await fetch('/api/auth/sso/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: event.data.token }),
        });
        const data = await res.json();
        if (!res.ok) {
          setSsoStatus('Erro SSO (' + res.status + '): ' + (data.error || JSON.stringify(data)));
          return;
        }
        setAuth(data.user, data.access, data.refresh);
      } catch (e) {
        setSsoStatus('Erro de rede ao chamar /api/auth/sso/: ' + e.message);
      }
    }

    window.addEventListener('message', handleMessage);
    window.parent.postMessage({ type: 'CONTRATID_READY' }, SYSTEMD_ORIGIN);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('message', handleMessage);
    };
  }, [inIframe]);

  if (tokenEfetivo) return children;
  if (!inIframe) return <Navigate to="/contratid/login" replace />;

  if (ssoStatus !== 'waiting' && ssoStatus !== 'idle') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f0a1e', fontFamily: 'monospace', fontSize: 13, textAlign: 'center', padding: 24 }}>
        <div>
          <div style={{ color: '#f87171', marginBottom: 12, fontWeight: 'bold' }}>Erro de autenticação SSO</div>
          <pre style={{ color: '#fca5a5', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxWidth: 500 }}>{ssoStatus}</pre>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f0a1e', color: '#a78bca', fontFamily: 'sans-serif', fontSize: 14 }}>
      Autenticando...
    </div>
  );
}
