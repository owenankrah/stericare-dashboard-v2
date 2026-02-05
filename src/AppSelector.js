import React from 'react';
import { BarChart3, Package, Users, LogOut, Settings, Sun, Moon } from 'lucide-react';

const AppSelector = ({ user, onLogout, onSelectApp, darkMode, setDarkMode }) => {
  // ==========================================
  // AVAILABLE APPS CONFIGURATION
  // ==========================================
  // Add new apps here as they're developed
  // Each app should have: id, name, description, icon, color, status
  // Status: 'active' | 'coming-soon' | 'beta'
  // ==========================================
  
  const apps = [
    {
      id: 'dashboard',
      name: 'Analytics Dashboard',
      description: 'Sales & profitability analytics with commission tracking',
      icon: BarChart3,
      color: 'blue',
      status: 'active',
      gradient: 'from-blue-500 to-blue-600'
    },
    {
      id: 'sales-invoicing',
      name: 'Sales & Invoicing',
      description: 'Sales entry, invoice generation, and transaction management',
      icon: Package,
      color: 'green',
      status: 'active',
      gradient: 'from-green-500 to-green-600'
    },
    {
      id: 'crm',
      name: 'Customer CRM',
      description: 'Customer relationship management and contact database',
      icon: Users,
      color: 'orange',
      status: 'active',
      gradient: 'from-orange-500 to-orange-600'
    },
    {
      id: 'user-management',
      name: 'User Management',
      description: 'Create and manage user accounts (Admin only)',
      icon: Users,
      color: 'red',
      status: 'active',
      gradient: 'from-red-500 to-red-600',
      adminOnly: true // Only show to admin users
    },
    {
      id: 'inventory',
      name: 'Inventory Management',
      description: 'Stock tracking, reorder alerts, and warehouse management',
      icon: Package,
      color: 'purple',
      status: 'active',
      gradient: 'from-purple-500 to-purple-600'
    }
  ];
  
  // Filter apps based on user role
  const visibleApps = apps.filter(app => {
    if (app.adminOnly) {
      return user?.profile?.role === 'admin';
    }
    return true;
  });

  const handleAppClick = (app) => {
    if (app.status === 'active') {
      // ==========================================
      // APP ROUTING LOGIC
      // ==========================================
      // Current: Callback to parent component
      // Future: React Router navigation
      // 
      // REACT ROUTER IMPLEMENTATION (when ready):
      // import { useNavigate } from 'react-router-dom';
      // const navigate = useNavigate();
      // navigate(`/apps/${app.id}`);
      // 
      // OR with Supabase for app access control:
      // 
      // const { data: hasAccess } = await supabase
      //   .from('user_app_access')
      //   .select('*')
      //   .eq('user_id', user.id)
      //   .eq('app_id', app.id)
      //   .single();
      // 
      // if (hasAccess) {
      //   navigate(`/apps/${app.id}`);
      // } else {
      //   alert('You don\'t have access to this app');
      // }
      // ==========================================
      
      onSelectApp(app.id);
    } else {
      alert(`${app.name} is coming soon!`);
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      {/* Header */}
      <header className={`border-b ${darkMode ? 'border-gray-800 bg-gray-800' : 'border-gray-200 bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                SteriCare Portal
              </h1>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Welcome back, {user.name || user.email}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <button
                onClick={() => alert('Settings coming soon!')}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                <Settings size={20} />
              </button>
              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
              >
                <LogOut size={18} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <div className="mb-12">
          <h2 className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Select an Application
          </h2>
          <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Choose from the available apps to get started
          </p>
        </div>

        {/* Apps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6">
          {visibleApps.map((app) => {
            const Icon = app.icon;
            const isActive = app.status === 'active';
            
            return (
              <div
                key={app.id}
                onClick={() => handleAppClick(app)}
                className={`
                  relative overflow-hidden rounded-2xl transition-all duration-300 
                  ${isActive ? 'cursor-pointer transform hover:scale-105 hover:shadow-2xl' : 'cursor-not-allowed opacity-60'}
                  ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}
                  shadow-lg
                `}
              >
                {/* Gradient Background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${app.gradient} opacity-10`}></div>
                
                {/* Status Badge */}
                {app.status !== 'active' && (
                  <div className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-500 text-yellow-900">
                    Coming Soon
                  </div>
                )}
                
                {app.status === 'beta' && (
                  <div className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500 text-white">
                    Beta
                  </div>
                )}

                {/* Content */}
                <div className="relative p-6">
                  {/* Icon */}
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-xl mb-4 bg-gradient-to-br ${app.gradient}`}>
                    <Icon size={32} className="text-white" />
                  </div>

                  {/* Title */}
                  <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {app.name}
                  </h3>

                  {/* Description */}
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {app.description}
                  </p>

                  {/* Action Hint */}
                  {isActive && (
                    <div className={`mt-4 text-sm font-medium ${
                      app.color === 'blue' ? 'text-blue-600' :
                      app.color === 'green' ? 'text-green-600' :
                      app.color === 'purple' ? 'text-purple-600' :
                      'text-orange-600'
                    }`}>
                      Click to open →
                    </div>
                  )}
                </div>

                {/* Hover Effect Overlay */}
                {isActive && (
                  <div className={`absolute inset-0 bg-gradient-to-br ${app.gradient} opacity-0 hover:opacity-5 transition-opacity duration-300`}></div>
                )}
              </div>
            );
          })}
        </div>

        {/* Info Section */}
        <div className={`mt-12 p-6 rounded-xl ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <h3 className={`text-lg font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            About the SteriCare Portal
          </h3>
          <p className={`mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            This integrated platform helps you manage all aspects of your medical products business:
          </p>
          <ul className={`space-y-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">✓</span>
              <span><strong>Analytics Dashboard:</strong> Track sales, profitability, and team performance</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">◇</span>
              <span><strong>Sales Recorder:</strong> Quick entry for daily transactions (Coming Soon)</span>
            </li>
            <li className="flex items-start">
              <span className="text-purple-500 mr-2">◇</span>
              <span><strong>Inventory Management:</strong> Real-time stock tracking and alerts (Coming Soon)</span>
            </li>
            <li className="flex items-start">
              <span className="text-orange-500 mr-2">◇</span>
              <span><strong>Customer CRM:</strong> Manage relationships and customer data (Coming Soon)</span>
            </li>
          </ul>
        </div>

        {/* Quick Stats (if needed) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className={`p-6 rounded-xl ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <div className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              1
            </div>
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Active Application
            </div>
          </div>
          <div className={`p-6 rounded-xl ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <div className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              3
            </div>
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Coming Soon
            </div>
          </div>
          <div className={`p-6 rounded-xl ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <div className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              More
            </div>
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Apps in Development
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className={`mt-12 border-t ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className={`text-center text-sm ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>
            © 2026 SteriCare Medical Products. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default AppSelector;
