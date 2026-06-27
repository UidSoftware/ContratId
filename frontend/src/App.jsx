import { Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute.jsx';
import Layout from './components/Layout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ContratosPage from './pages/ContratosPage.jsx';
import NovoContratoPage from './pages/NovoContratoPage.jsx';
import ContratoDetalhePage from './pages/ContratoDetalhePage.jsx';
import ModelosPage from './pages/ModelosPage.jsx';
import NovoModeloPage from './pages/NovoModeloPage.jsx';
import OrcamentosPage from './pages/OrcamentosPage.jsx';
import OrcamentoFormPage from './pages/OrcamentoFormPage.jsx';
import OrcamentoDetalhePage from './pages/OrcamentoDetalhePage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/contratid/login" element={<LoginPage />} />

      <Route
        path="/contratid/*"
        element={
          <PrivateRoute>
            <Layout>
              <Routes>
                <Route index element={<DashboardPage />} />
                <Route path="orcamentos" element={<OrcamentosPage />} />
                <Route path="orcamentos/novo" element={<OrcamentoFormPage />} />
                <Route path="orcamentos/:id" element={<OrcamentoDetalhePage />} />
                <Route path="orcamentos/:id/editar" element={<OrcamentoFormPage />} />
                <Route path="contratos" element={<ContratosPage />} />
                <Route path="contratos/novo" element={<NovoContratoPage />} />
                <Route path="contratos/:id" element={<ContratoDetalhePage />} />
                <Route path="modelos" element={<ModelosPage />} />
                <Route path="modelos/novo" element={<NovoModeloPage />} />
                <Route path="modelos/:id/editar" element={<NovoModeloPage />} />
              </Routes>
            </Layout>
          </PrivateRoute>
        }
      />

      <Route path="/" element={<Navigate to="/contratid/" replace />} />
      <Route path="*" element={<Navigate to="/contratid/" replace />} />
    </Routes>
  );
}
