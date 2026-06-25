import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore.js';

export default function PrivateRoute({ children }) {
  const { accessToken, setAuth, logout } = useAuthStore();
  const [ssoStatus, setSsoStatus] = useState('idle');
  const inIframe = window !== window.top;

  useEffect(() => {
    if (!inIframe) return;

    // Lê token do hash da URL (#sso=TOKEN)
    const hash = window.location.hash;
    if (!hash.startsWith('#sso=')) {
      setSsoStatus('Erro: nenhum token SSO na URL. Acesse pelo menu Contratos no SystemD.');
      return;
    }

    const token = hash.slice(5);
    window.location.hash = ''; // limpa o hash da URL
    if (accessToken) logout();
    setSsoStatus('waiting');

    fetch('/api/auth/sso/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(res => res.json().then(data => ({ ok: res.ok, status: res.status, data })))
      .then(({ ok, status, data }) => {
        if (!ok) {
          setSsoStatus('Erro SSO ' + status + ': ' + (data.error || JSON.stringify(data)));
          return;
        }
        setAuth(data.user, data.access, data.refresh);
        setSsoStatus('done');
      })
      .catch(e => setSsoStatus('Erro de rede: ' + e.message));
  }, [inIframe]);

  if (!inIframe) {
    return accessToken ? children : <Navigate to="/contratid/login" replace />;
  }

  if (ssoStatus === 'done') return children;

  if (ssoStatus !== 'waiting' && ssoStatus !== 'idle') {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#0f0a1e', fontFamily:'monospace', fontSize:13, padding:24 }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ color:'#f87171', marginBottom:12, fontWeight:'bold', fontSize:15 }}>Erro SSO</div>
          <pre style={{ color:'#fca5a5', whiteSpace:'pre-wrap', wordBreak:'break-all', maxWidth:500 }}>{ssoStatus}</pre>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#0f0a1e', color:'#a78bca', fontFamily:'sans-serif', fontSize:14 }}>
      Autenticando...
    </div>
  );
}
