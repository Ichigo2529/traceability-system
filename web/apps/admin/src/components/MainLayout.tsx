import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Users, Smartphone, Settings, LogOut, Box, CheckCircle, Tags, History } from 'lucide-react';
import { cn } from '../lib/utils';

export default function MainLayout() {
  const { user, logout } = useAuth();

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/users', label: 'Users & Roles', icon: Users },
    { to: '/devices', label: 'Devices', icon: Smartphone },
    { to: '/machines', label: 'Machines', icon: Settings },
    { to: '/models', label: 'Models & Config', icon: Box },
    { to: '/labels', label: 'Label Templates', icon: Tags },
    { to: '/validator', label: 'Readiness', icon: CheckCircle },
    { to: '/audit-logs', label: 'Audit Logs', icon: History },
  ];

  return (
    <div className="flex h-screen bg-[#EDF2FA]">
      <aside className="w-64 bg-[#0A1F4D] text-white flex flex-col">
        <div className="p-4 border-b border-[#234079]">
          <h1 className="text-xl font-bold text-[#D8E2FA]">
            Traceability<span className="text-white text-sm block">Admin Console</span>
          </h1>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
                  isActive ? 'bg-[#1134A6] text-white' : 'text-[#C3D2F7] hover:bg-[#0D2A63] hover:text-white'
                )
              }
            >
              <item.icon size={20} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-[#234079]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-[#1134A6] flex items-center justify-center font-bold">
              {user?.display_name?.[0] || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{user?.display_name}</p>
              <p className="text-xs text-[#9FB4EE] truncate">{user?.roles?.join(', ')}</p>
            </div>
          </div>
          <button onClick={logout} className="flex items-center gap-2 text-[#9FB4EE] hover:text-white w-full">
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">Admin Console</h2>
          <div className="text-sm text-gray-500">v1.0.0</div>
        </header>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
