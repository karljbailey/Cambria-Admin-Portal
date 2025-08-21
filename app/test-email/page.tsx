'use client';

import { useState, useEffect } from 'react';

export default function TestEmailPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [configStatus, setConfigStatus] = useState<string>('');

  useEffect(() => {
    checkEmailConfig();
  }, []);

  const checkEmailConfig = async () => {
    try {
      const response = await fetch('/api/test-email');
      const data = await response.json();
      
      if (response.ok) {
        setConfigStatus(data.configValid ? '✅ Valid' : '❌ Invalid');
      } else {
        setConfigStatus('❌ Error checking config');
      }
    } catch (error) {
      setConfigStatus('❌ Error checking config');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(data.message);
      } else {
        setError(data.error || 'Failed to send test email');
      }
    } catch (error) {
      console.error('Test email error:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Email Test</h1>
          <h2 className="mt-6 text-xl font-semibold text-gray-900">Test Email Configuration</h2>
          <p className="mt-2 text-sm text-gray-600">
            Verify your email configuration and send test emails.
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Configuration Status</h3>
            <p className="text-sm text-gray-600">
              Email Config: <span className="font-mono">{configStatus}</span>
            </p>
            <button
              onClick={checkEmailConfig}
              className="mt-2 text-sm text-blue-600 hover:text-blue-500"
            >
              Refresh Status
            </button>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <p className="text-sm text-green-800">{success}</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Test Email Address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter email to send test to"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Send Test Email'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Environment Variables</span>
              </div>
            </div>
            <div className="mt-4 text-xs text-gray-600 space-y-1">
              <p><strong>SMTP_HOST:</strong> {process.env.NEXT_PUBLIC_SMTP_HOST || 'smtp.gmail.com'}</p>
              <p><strong>SMTP_PORT:</strong> {process.env.NEXT_PUBLIC_SMTP_PORT || '587'}</p>
              <p><strong>SMTP_USER:</strong> {process.env.NEXT_PUBLIC_SMTP_USER ? 'Set' : 'Not set'}</p>
              <p><strong>SMTP_PASS:</strong> {process.env.NEXT_PUBLIC_SMTP_PASS ? 'Set' : 'Not set'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
