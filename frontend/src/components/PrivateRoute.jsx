import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore.js';

const SYSTEMD_ORIGIN = 'https://uidsoftware.com.br';

export default function PrivateRoute({ children }) {
  const { accessToken, setAuth, logout } = useAuthStore();
  const [ssoStatus, setSsoStatus] = useState('idle');
  const inIframe = window !== window.top;

  // Em iframe, sempre força SSO — ignora token armazenado (pode ser de sessão anterior)
  const tokenEfetivo = inIframe ? null : accessToken;

  useEffect(() => {
    if (!inIframe) return;

    // Limpa token antigo para evitar redirecionamento para /login dentro do iframe
    if (accessToken) logout();

    setSsoStatus('waiting');

    async function handleMessage(event) {
      if (event.origin !== SYSTEMD_ORIGIN) return;
      if (event.data?.type !== 'SYSTEMD_TOKEN') return;

      try {
        const res = await fetch('/api/auth/sso/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: event.data.token }),
        });
        const data = await res.json();
        if (!res.ok) {
          setSsoStatus(data.error || 'Acesso negado.');
          return;
        }
        setAuth(data.user, data.access, data.refresh);
      } catch {
        setSsoStatus('Erro ao autenticar. Tente recarregar.');
      }
    }

    window.addEventListener('message', handleMessage);
    window.parent.postMessage({ type: 'CONTRATID_READY' }, SYSTEMD_ORIGIN);

    return () => window.removeEventListener('message', handleMessage);
  }, [inIframe]);

  if (tokenEfetivo) return children;

  if (!inIframe) return <Navigate to="/contratid/login" replace />;

  if (typeof ssoStatus === 'string' && ssoStatus !== 'waiting' && ssoStatus !== 'idle') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f0a1e', color: '#f87171', fontFamily: 'sans-serif', fontSize: 14, textAlign: 'center', padding: 24 }}>
        {ssoStatus}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f0a1e', color: '#a78bca', fontFamily: 'sans-serif', fontSize: 14 }}>
      Autenticando...
    </div>
  );
}
