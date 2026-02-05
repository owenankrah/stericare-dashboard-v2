import React, { useState, useEffect } from 'react';
import Login from './Login';
import AppSelector from './AppSelector';
import AnalyticsDashboard from './AnalyticsDashboard';
import SalesInvoicingModule from './components/SalesInvoicingModule';
import UserManagement from './components/UserManagement';
import CRMModule from './components/CRMModule';
import InventoryManagement from './components/InventoryManagement';
import { supabase } from './lib/supabase';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentApp, setCurrentApp] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
            
          setCurrentUser({ ...session.user, profile });
          setIsAuthenticated(true);
        } else if (event === 'SIGNED_OUT') {
          setIsAuthenticated(false);
          setCurrentUser(null);
          setCurrentApp(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        setCurrentUser({ ...session.user, profile });
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Session error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (user) => {
    setIsAuthenticated(true);
    setCurrentUser(user);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} darkMode={darkMode} setDarkMode={setDarkMode} />;
  }

  if (!currentApp) {
    return (
      <AppSelector
        user={currentUser}
        onLogout={handleLogout}
        onSelectApp={setCurrentApp}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />
    );
  }

  switch (currentApp) {
    case 'dashboard':
      return <AnalyticsDashboard darkMode={darkMode} setDarkMode={setDarkMode} onBack={() => setCurrentApp(null)} />;
    case 'sales-invoicing':
      return <SalesInvoicingModule darkMode={darkMode} setDarkMode={setDarkMode} onBack={() => setCurrentApp(null)} />;
    case 'user-management':
      return <UserManagement darkMode={darkMode} onBack={() => setCurrentApp(null)} />;
    case 'crm':
      return <CRMModule darkMode={darkMode} setDarkMode={setDarkMode} onBack={() => setCurrentApp(null)} />;
    case 'inventory':
      return <InventoryManagement darkMode={darkMode} setDarkMode={setDarkMode} onBack={() => setCurrentApp(null)} />;
    default:
      return <AppSelector user={currentUser} onLogout={handleLogout} onSelectApp={setCurrentApp} darkMode={darkMode} setDarkMode={setDarkMode} />;
  }
}

export default App;
