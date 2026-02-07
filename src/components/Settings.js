import React, { useState } from 'react';
import { X, User, Shield, Lock, Bell, Palette, Database, Users as UsersIcon } from 'lucide-react';

/**
 * SETTINGS MODAL
 * System settings and admin tools
 */

const Settings = ({ darkMode, onClose, user, onNavigateToUserManagement }) => {
  const [activeTab, setActiveTab] = useState('account');

  const isAdmin = user?.profile?.role === 'admin';
  const isManager = user?.profile?.role === 'manager';

  const tabs = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
  ];

  // Add admin tools tab for admins only
  if (isAdmin) {
    tabs.push({ id: 'admin', label: 'Admin Tools', icon: Lock });
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`max-w-4xl w-full rounded-xl shadow-2xl ${
        darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
      }`}>
        {/* Header */}
        <div className={`flex justify-between items-center p-6 border-b ${
          darkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <h2 className="text-2xl font-bold">Settings</h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            }`}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex h-[500px]">
          {/* Sidebar */}
          <div className={`w-48 border-r ${
            darkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'
          }`}>
            <div className="p-4 space-y-1">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white'
                        : darkMode
                        ? 'hover:bg-gray-700 text-gray-300'
                        : 'hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    <Icon size={18} />
                    <span className="text-sm font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'account' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Account Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={user?.profile?.full_name || ''}
                        disabled
                        className={`w-full px-4 py-2 rounded-lg border ${
                          darkMode
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'bg-gray-100 border-gray-300 text-gray-900'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Email
                      </label>
                      <input
                        type="email"
                        value={user?.email || ''}
                        disabled
                        className={`w-full px-4 py-2 rounded-lg border ${
                          darkMode
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'bg-gray-100 border-gray-300 text-gray-900'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Role
                      </label>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          user?.profile?.role === 'admin'
                            ? 'bg-red-100 text-red-800'
                            : user?.profile?.role === 'manager'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {user?.profile?.role === 'admin' ? 'Administrator' :
                           user?.profile?.role === 'manager' ? 'Manager' : 'Sales Representative'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Security Settings</h3>
                  <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Password changes and security settings coming soon.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Notification Preferences</h3>
                  <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Email notifications and alerts coming soon.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Appearance</h3>
                  <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Use the theme toggle in the header to switch between light and dark mode.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'admin' && isAdmin && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Admin Tools</h3>
                  
                  <div className="space-y-4">
                    {/* User Management */}
                    <button
                      onClick={() => {
                        onClose();
                        onNavigateToUserManagement();
                      }}
                      className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
                        darkMode
                          ? 'border-gray-600 hover:border-blue-500 hover:bg-gray-700'
                          : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50'
                      }`}
                    >
                      <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                        <UsersIcon size={24} className="text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 text-left">
                        <h4 className="font-semibold">User Management</h4>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Create and manage user accounts
                        </p>
                      </div>
                    </button>

                    {/* Database Tools */}
                    <button
                      onClick={() => alert('Database tools coming soon!')}
                      className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
                        darkMode
                          ? 'border-gray-600 hover:border-purple-500 hover:bg-gray-700'
                          : 'border-gray-200 hover:border-purple-500 hover:bg-purple-50'
                      }`}
                    >
                      <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                        <Database size={24} className="text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="flex-1 text-left">
                        <h4 className="font-semibold">Database Tools</h4>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Backup, restore, and maintenance (Coming Soon)
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={`flex justify-end gap-3 p-6 border-t ${
          darkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <button
            onClick={onClose}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              darkMode
                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
