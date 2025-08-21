'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import EnhancedNavigation from '@/components/EnhancedNavigation';

interface Settings {
  theme: 'light' | 'dark' | 'auto';
  notifications: {
    email: boolean;
    browser: boolean;
    audit: boolean;
  };
  display: {
    itemsPerPage: number;
    showInactiveClients: boolean;
    autoRefresh: boolean;
  };
  integrations: {
    googleSheets: boolean;
    firebase: boolean;
    emailService: boolean;
  };
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [settings, setSettings] = useState<Settings>({
    theme: 'auto',
    notifications: {
      email: true,
      browser: true,
      audit: true,
    },
    display: {
      itemsPerPage: 20,
      showInactiveClients: true,
      autoRefresh: false,
    },
    integrations: {
      googleSheets: true,
      firebase: true,
      emailService: true,
    },
  });

  useEffect(() => {
    checkAuth();
    loadSettings();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/session');
      const data = await response.json();
      
      if (data.authenticated) {
        setUser(data.user);
      } else {
        router.push('/login');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      router.push('/login');
    } finally {
      setAuthLoading(false);
    }
  };

  const loadSettings = () => {
    const savedSettings = localStorage.getItem('cambria-settings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      localStorage.setItem('cambria-settings', JSON.stringify(settings));
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setLoading(false);
    }
  };

  const resetSettings = () => {
    const defaultSettings: Settings = {
      theme: 'auto',
      notifications: {
        email: true,
        browser: true,
        audit: true,
      },
      display: {
        itemsPerPage: 20,
        showInactiveClients: true,
        autoRefresh: false,
      },
      integrations: {
        googleSheets: true,
        firebase: true,
        emailService: true,
      },
    };
    setSettings(defaultSettings);
    localStorage.removeItem('cambria-settings');
    setMessage({ type: 'success', text: 'Settings reset to defaults' });
    setTimeout(() => setMessage(null), 3000);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Navigation */}
      <EnhancedNavigation user={user} currentPage="settings" />

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {message && (
          <div className={`mb-6 p-4 rounded-md ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        <div className="space-y-8">
          {/* Theme Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Appearance</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Theme
                </label>
                <select
                  value={settings.theme}
                  onChange={(e) => setSettings({ ...settings, theme: e.target.value as 'light' | 'dark' | 'auto' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="auto">Auto (System)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Notifications</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Email Notifications</label>
                  <p className="text-sm text-gray-500">Receive notifications via email</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifications.email}
                  onChange={(e) => setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, email: e.target.checked }
                  })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Browser Notifications</label>
                  <p className="text-sm text-gray-500">Show browser notifications</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifications.browser}
                  onChange={(e) => setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, browser: e.target.checked }
                  })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Audit Logging</label>
                  <p className="text-sm text-gray-500">Log user actions for security</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifications.audit}
                  onChange={(e) => setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, audit: e.target.checked }
                  })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
            </div>
          </div>

          {/* Display Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Display</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Items per page
                </label>
                <select
                  value={settings.display.itemsPerPage}
                  onChange={(e) => setSettings({
                    ...settings,
                    display: { ...settings.display, itemsPerPage: parseInt(e.target.value) }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Show Inactive Clients</label>
                  <p className="text-sm text-gray-500">Display inactive clients in the list</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.display.showInactiveClients}
                  onChange={(e) => setSettings({
                    ...settings,
                    display: { ...settings.display, showInactiveClients: e.target.checked }
                  })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Auto Refresh</label>
                  <p className="text-sm text-gray-500">Automatically refresh data every 5 minutes</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.display.autoRefresh}
                  onChange={(e) => setSettings({
                    ...settings,
                    display: { ...settings.display, autoRefresh: e.target.checked }
                  })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
            </div>
          </div>

          {/* Integration Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Integrations</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Google Sheets</label>
                  <p className="text-sm text-gray-500">Connect to Google Sheets for data management</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.integrations.googleSheets}
                  onChange={(e) => setSettings({
                    ...settings,
                    integrations: { ...settings.integrations, googleSheets: e.target.checked }
                  })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Firebase</label>
                  <p className="text-sm text-gray-500">Use Firebase for authentication and data storage</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.integrations.firebase}
                  onChange={(e) => setSettings({
                    ...settings,
                    integrations: { ...settings.integrations, firebase: e.target.checked }
                  })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Email Service</label>
                  <p className="text-sm text-gray-500">Enable email notifications and password reset</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.integrations.emailService}
                  onChange={(e) => setSettings({
                    ...settings,
                    integrations: { ...settings.integrations, emailService: e.target.checked }
                  })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center">
            <button
              onClick={resetSettings}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Reset to Defaults
            </button>
            <button
              onClick={saveSettings}
              disabled={loading}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
