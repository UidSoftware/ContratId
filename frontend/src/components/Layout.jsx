import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  BookTemplate,
  LogOut,
  Menu,
  X,
  FileSignature,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore.js';

const navItems = [
  { to: '/contratid/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/contratid/contratos', label: 'Contratos', icon: FileText },
  { to: '/contratid/modelos', label: 'Modelos', icon: BookTemplate },
];

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/contratid/login', { replace: true });
  };

  const NavLinks = ({ onClick }) => (
    <nav className="flex-1 space-y-1 px-3 py-4">
      {navItems.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onClick}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'bg-white/20 text-white'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`
          }
        >
          <Icon className="h-5 w-5 flex-shrink-0" />
          {label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-dark flex flex-col transform transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <FileSignature className="h-7 w-7 text-white" />
            <span className="text-white font-bold text-lg tracking-tight">ContratId</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white/70 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <NavLinks onClick={() => setSidebarOpen(false)} />

        {/* User section */}
        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
              {user?.first_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : 'Usuário'}
              </p>
              <p className="text-white/50 text-xs truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top header */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="lg:hidden flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-primary" />
            <span className="font-bold text-gray-900">ContratId</span>
          </div>
          <div className="hidden lg:flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-primary" />
            <span className="font-bold text-gray-900 text-lg">ContratId</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="hidden sm:inline">
              {user?.first_name || user?.email || 'Usuário'}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
