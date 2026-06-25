import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileSignature, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../stores/authStore.js';
import api from '../services/api.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login/', { email, password });
      const { access, refresh, usuario: user } = res.data;
      setAuth(user, access, refresh);
      navigate('/contratid/', { replace: true });
    } catch (err) {
      const message =
        err.response?.data?.detail ||
        err.response?.data?.non_field_errors?.[0] ||
        'E-mail ou senha inválidos.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-4">
            <FileSignature className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">ContratId</h1>
          <p className="text-sm text-gray-500 mt-1">Gestão de contratos eletrônicos</p>
        </div>

        {/* Card */}
        <div className="card p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Entrar na sua conta</h2>

          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-5 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="email">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
              />
            </div>

            <div>
              <label className="label" htmlFor="password">
                Senha
              </label>
              <input
                id="password"
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
            >
              {loading ? <LoadingSpinner size="sm" /> : null}
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © {new Date().getFullYear()} Uid Software e Tecnologia LTDA
        </p>
      </div>
    </div>
  );
}
