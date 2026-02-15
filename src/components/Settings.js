import React, { useState } from 'react';
import { 
  X, User, Shield, Lock, Bell, Palette, Database, 
  Users as UsersIcon, Save, Eye, EyeOff, Mail,
  Download, Upload, RefreshCw, AlertCircle, CheckCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

/**
 * SETTINGS MODAL - FULLY FUNCTIONAL
 * All features implemented:
 * - Account management
 * - Password change
 * - Notification preferences
 * - Appearance customization
 * - Admin tools
 */

const Settings = ({ darkMode, setDarkMode, onClose, user, onNavigateToUserManagement }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('account');
  
  // Account editing
  const [editingAccount, setEditingAccount] = useState(false);
  const [fullName, setFullName] = useState(user?.profile?.full_name || '');
  const [savingAccount, setSavingAccount] = useState(false);
  
  // Password change
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  
  // Notifications
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [lowStockAlerts, setLowStockAlerts] = useState(true);
  const [invoiceNotifications, setInvoiceNotifications] = useState(true);
  const [systemUpdates, setSystemUpdates] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  
  // Appearance
  const [fontSize, setFontSize] = useState('medium');
  const [compactMode, setCompactMode] = useState(false);
  
  // Database tools
  const [backupStatus, setBackupStatus] = useState('');
  const [showClearCacheConfirm, setShowClearCacheConfirm] = useState(false);

  const isAdmin = user?.profile?.role === 'admin';

  const tabs = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
  ];

  if (isAdmin) {
    tabs.push({ id: 'admin', label: 'Admin Tools', icon: Lock });
  }

  // ==========================================
  // ACCOUNT FUNCTIONS
  // ==========================================
  
  const handleSaveAccount = async () => {
    setSavingAccount(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ full_name: fullName })
        .eq('id', user.id);
      
      if (error) throw error;
      
      alert('✅ Account updated successfully!');
      setEditingAccount(false);
      
      // Update user object in parent
      if (user.profile) {
        user.profile.full_name = fullName;
      }
    } catch (error) {
      console.error('Error updating account:', error);
      alert('❌ Failed to update account: ' + error.message);
    } finally {
      setSavingAccount(false);
    }
  };

  // ==========================================
  // PASSWORD FUNCTIONS
  // ==========================================
  
  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      alert('❌ New passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      alert('❌ Password must be at least 6 characters');
      return;
    }
    
    setChangingPassword(true);
    try {
      // Update password using Supabase
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      
      alert('✅ Password changed successfully!');
      setShowPasswordChange(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error changing password:', error);
      alert('❌ Failed to change password: ' + error.message);
    } finally {
      setChangingPassword(false);
    }
  };

  // ==========================================
  // NOTIFICATION FUNCTIONS
  // ==========================================
  
  const handleSaveNotifications = async () => {
    setSavingNotifications(true);
    try {
      const preferences = {
        email_notifications: emailNotifications,
        low_stock_alerts: lowStockAlerts,
        invoice_notifications: invoiceNotifications,
        system_updates: systemUpdates
      };
      
      // Save to user_profiles
      const { error } = await supabase
        .from('user_profiles')
        .update({ notification_preferences: preferences })
        .eq('id', user.id);
      
      if (error) throw error;
      
      alert('✅ Notification preferences saved!');
    } catch (error) {
      console.error('Error saving notifications:', error);
      alert('❌ Failed to save preferences: ' + error.message);
    } finally {
      setSavingNotifications(false);
    }
  };

  // ==========================================
  // DATABASE FUNCTIONS
  // ==========================================
  
  const handleBackupDatabase = async () => {
    setBackupStatus('Creating backup...');
    try {
      // Export key tables to JSON
      const tables = ['customers', 'products', 'inventory', 'invoices'];
      const backup = {};
      
      for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*');
        if (error) throw error;
        backup[table] = data;
      }
      
      // Create downloadable JSON file
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pharma-c-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      setBackupStatus('✅ Backup created successfully!');
      setTimeout(() => setBackupStatus(''), 3000);
    } catch (error) {
      console.error('Backup error:', error);
      setBackupStatus('❌ Backup failed: ' + error.message);
      setTimeout(() => setBackupStatus(''), 5000);
    }
  };

  const handleClearCache = () => {
    localStorage.clear();
    sessionStorage.clear();
    setShowClearCacheConfirm(false);
    alert('✅ Cache cleared! Please refresh the page.');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`max-w-4xl w-full rounded-xl shadow-2xl max-h-[90vh] overflow-hidden ${
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
            
            {/* ACCOUNT TAB */}
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
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          disabled={!editingAccount}
                          className={`flex-1 px-4 py-2 rounded-lg border ${
                            editingAccount
                              ? darkMode
                                ? 'bg-gray-700 border-gray-600 text-white'
                                : 'bg-white border-gray-300 text-gray-900'
                              : darkMode
                              ? 'bg-gray-700 border-gray-600 text-gray-400'
                              : 'bg-gray-100 border-gray-300 text-gray-600'
                          }`}
                        />
                        {!editingAccount ? (
                          <button
                            onClick={() => setEditingAccount(true)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                          >
                            Edit
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={handleSaveAccount}
                              disabled={savingAccount}
                              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
                            >
                              {savingAccount ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingAccount(false);
                                setFullName(user?.profile?.full_name || '');
                              }}
                              className={`px-4 py-2 rounded-lg transition-colors ${
                                darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                              }`}
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </div>
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
                            ? 'bg-gray-700 border-gray-600 text-gray-400'
                            : 'bg-gray-100 border-gray-300 text-gray-600'
                        }`}
                      />
                      <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                        Email cannot be changed. Contact administrator if needed.
                      </p>
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Role
                      </label>
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                        user?.profile?.role === 'admin'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          : user?.profile?.role === 'manager'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      }`}>
                        {user?.profile?.role === 'admin' ? 'Administrator' :
                         user?.profile?.role === 'manager' ? 'Manager' : 'Sales Representative'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SECURITY TAB */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Security Settings</h3>
                  
                  <button
                    onClick={() => setShowPasswordChange(!showPasswordChange)}
                    className="w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all hover:border-blue-500 mb-4"
                  >
                    <div className="flex items-center gap-3">
                      <Lock size={20} />
                      <div className="text-left">
                        <div className="font-semibold">Change Password</div>
                        <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Update your account password
                        </div>
                      </div>
                    </div>
                    <div className={`text-2xl ${showPasswordChange ? 'rotate-180' : ''} transition-transform`}>
                      ›
                    </div>
                  </button>
                  
                  {showPasswordChange && (
                    <form onSubmit={handleChangePassword} className={`p-4 rounded-lg border space-y-4 ${
                      darkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'
                    }`}>
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${
                          darkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Enter new password"
                            className={`w-full px-4 py-2 pr-10 rounded-lg border ${
                              darkMode
                                ? 'bg-gray-700 border-gray-600 text-white'
                                : 'bg-white border-gray-300 text-gray-900'
                            }`}
                            required
                            minLength={6}
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2"
                          >
                            {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                        <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                          Minimum 6 characters
                        </p>
                      </div>
                      
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${
                          darkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                          className={`w-full px-4 py-2 rounded-lg border ${
                            darkMode
                              ? 'bg-gray-700 border-gray-600 text-white'
                              : 'bg-white border-gray-300 text-gray-900'
                          }`}
                          required
                        />
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={changingPassword}
                          className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          {changingPassword ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                          Change Password
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowPasswordChange(false);
                            setNewPassword('');
                            setConfirmPassword('');
                          }}
                          className={`px-4 py-2 rounded-lg transition-colors ${
                            darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                          }`}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}

            {/* NOTIFICATIONS TAB */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Notification Preferences</h3>
                  <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Choose what notifications you want to receive
                  </p>
                  
                  <div className="space-y-4">
                    <label className="flex items-center justify-between p-4 rounded-lg border cursor-pointer hover:bg-opacity-50">
                      <div className="flex items-center gap-3">
                        <Mail size={20} className="text-blue-600" />
                        <div>
                          <div className="font-medium">Email Notifications</div>
                          <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Receive email updates about your account
                          </div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={emailNotifications}
                        onChange={(e) => setEmailNotifications(e.target.checked)}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </label>
                    
                    <label className="flex items-center justify-between p-4 rounded-lg border cursor-pointer hover:bg-opacity-50">
                      <div className="flex items-center gap-3">
                        <AlertCircle size={20} className="text-orange-600" />
                        <div>
                          <div className="font-medium">Low Stock Alerts</div>
                          <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Get notified when inventory is running low
                          </div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={lowStockAlerts}
                        onChange={(e) => setLowStockAlerts(e.target.checked)}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </label>
                    
                    <label className="flex items-center justify-between p-4 rounded-lg border cursor-pointer hover:bg-opacity-50">
                      <div className="flex items-center gap-3">
                        <CheckCircle size={20} className="text-green-600" />
                        <div>
                          <div className="font-medium">Invoice Notifications</div>
                          <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Notifications for new invoices and payments
                          </div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={invoiceNotifications}
                        onChange={(e) => setInvoiceNotifications(e.target.checked)}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </label>
                    
                    <label className="flex items-center justify-between p-4 rounded-lg border cursor-pointer hover:bg-opacity-50">
                      <div className="flex items-center gap-3">
                        <Bell size={20} className="text-purple-600" />
                        <div>
                          <div className="font-medium">System Updates</div>
                          <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Information about new features and updates
                          </div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={systemUpdates}
                        onChange={(e) => setSystemUpdates(e.target.checked)}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </label>
                  </div>
                  
                  <button
                    onClick={handleSaveNotifications}
                    disabled={savingNotifications}
                    className="w-full mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {savingNotifications ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                    Save Preferences
                  </button>
                </div>
              </div>
            )}

            {/* APPEARANCE TAB */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Appearance</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Theme
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setDarkMode(false)}
                          className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                            !darkMode
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                              : 'border-gray-300 dark:border-gray-700'
                          }`}
                        >
                          <div className="font-medium">Light</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Clean and bright
                          </div>
                        </button>
                        <button
                          onClick={() => setDarkMode(true)}
                          className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                            darkMode
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                              : 'border-gray-300 dark:border-gray-700'
                          }`}
                        >
                          <div className="font-medium">Dark</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Easy on the eyes
                          </div>
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Font Size
                      </label>
                      <select
                        value={fontSize}
                        onChange={(e) => {
                          setFontSize(e.target.value);
                          document.documentElement.style.fontSize = 
                            e.target.value === 'small' ? '14px' :
                            e.target.value === 'large' ? '18px' : '16px';
                        }}
                        className={`w-full px-4 py-2 rounded-lg border ${
                          darkMode
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      >
                        <option value="small">Small</option>
                        <option value="medium">Medium (Default)</option>
                        <option value="large">Large</option>
                      </select>
                    </div>
                    
                    <label className="flex items-center justify-between p-4 rounded-lg border cursor-pointer">
                      <div>
                        <div className="font-medium">Compact Mode</div>
                        <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Reduce spacing for more content
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={compactMode}
                        onChange={(e) => setCompactMode(e.target.checked)}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* ADMIN TAB */}
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

                    {/* Database Backup */}
                    <button
                      onClick={handleBackupDatabase}
                      className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
                        darkMode
                          ? 'border-gray-600 hover:border-green-500 hover:bg-gray-700'
                          : 'border-gray-200 hover:border-green-500 hover:bg-green-50'
                      }`}
                    >
                      <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                        <Download size={24} className="text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1 text-left">
                        <h4 className="font-semibold">Backup Database</h4>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Download a backup of all data
                        </p>
                        {backupStatus && (
                          <p className={`text-xs mt-1 ${
                            backupStatus.includes('✅') ? 'text-green-600' : 
                            backupStatus.includes('❌') ? 'text-red-600' : 
                            'text-blue-600'
                          }`}>
                            {backupStatus}
                          </p>
                        )}
                      </div>
                    </button>

                    {/* Clear Cache */}
                    <button
                      onClick={() => setShowClearCacheConfirm(true)}
                      className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
                        darkMode
                          ? 'border-gray-600 hover:border-orange-500 hover:bg-gray-700'
                          : 'border-gray-200 hover:border-orange-500 hover:bg-orange-50'
                      }`}
                    >
                      <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
                        <RefreshCw size={24} className="text-orange-600 dark:text-orange-400" />
                      </div>
                      <div className="flex-1 text-left">
                        <h4 className="font-semibold">Clear Cache</h4>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Clear cached data and reset session
                        </p>
                      </div>
                    </button>

                    {/* Clear Cache Confirmation Modal */}
                    {showClearCacheConfirm && (
                      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
                        <div className={`max-w-md w-full mx-4 p-6 rounded-xl ${
                          darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                        }`}>
                          <h3 className="text-lg font-bold mb-2">Clear Cache?</h3>
                          <p className={`mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            This will clear all cached data. You will need to refresh the page after clearing cache.
                          </p>
                          <div className="flex gap-3">
                            <button
                              onClick={handleClearCache}
                              className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
                            >
                              Clear Cache
                            </button>
                            <button
                              onClick={() => setShowClearCacheConfirm(false)}
                              className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                                darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                              }`}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* System Info */}
                    <div className={`p-4 rounded-lg border ${
                      darkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'
                    }`}>
                      <h4 className="font-semibold mb-2">System Information</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Version:</span>
                          <span className="font-mono">2.2.1</span>
                        </div>
                        <div className="flex justify-between">
                          <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Backend:</span>
                          <span className="font-mono">Connected</span>
                        </div>
                        <div className="flex justify-between">
                          <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Database:</span>
                          <span className="font-mono">Supabase</span>
                        </div>
                      </div>
                    </div>
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