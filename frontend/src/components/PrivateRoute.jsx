import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore.js';

const SYSTEMD_ORIGIN = 'https://uidsoftware.com.br';

export default function PrivateRoute({ children }) {
  const { accessToken, setAuth, logout } = useAuthStore();
  const [ssoStatus, setSsoStatus] = useState('idle'); // idle | waiting | done | <erro>
  const inIframe = window !== window.top;

  useEffect(() => {
    if (!inIframe) return;

    // Limpa token antigo para forçar SSO sempre
    if (accessToken) logout();

    setSsoStatus('waiting');

    const timer = setTimeout(() => {
      setSsoStatus('Timeout: SystemD não enviou o token em 6s.\nOrigem esperada: ' + SYSTEMD_ORIGIN);
    }, 6000);

    async function handleMessage(event) {
      if (event.origin !== SYSTEMD_ORIGIN) {
        setSsoStatus('Origem inesperada recebida: ' + event.origin + '\nEsperada: ' + SYSTEMD_ORIGIN);
        return;
      }
      if (event.data?.type !== 'SYSTEMD_TOKEN') return;

      clearTimeout(timer);

      if (!event.data.token) {
        setSsoStatus('Token recebido do SystemD está vazio.');
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
          setSsoStatus('Erro SSO ' + res.status + ': ' + (data.error || JSON.stringify(data)));
          return;
        }
        setAuth(data.user, data.access, data.refresh);
        setSsoStatus('done');
      } catch (e) {
        setSsoStatus('Erro de rede: ' + e.message);
      }
    }

    window.addEventListener('message', handleMessage);
    window.parent.postMessage({ type: 'CONTRATID_READY' }, SYSTEMD_ORIGIN);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('message', handleMessage);
    };
  }, [inIframe]);

  // Fora do iframe: usa token armazenado normalmente
  if (!inIframe) {
    return accessToken ? children : <Navigate to="/contratid/login" replace />;
  }

  // Dentro do iframe: só mostra filhos após SSO concluído
  if (ssoStatus === 'done') return children;

  if (ssoStatus !== 'waiting' && ssoStatus !== 'idle') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f0a1e', fontFamily: 'monospace', fontSize: 13, padding: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#f87171', marginBottom: 12, fontWeight: 'bold', fontSize: 15 }}>Erro de autenticação SSO</div>
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
