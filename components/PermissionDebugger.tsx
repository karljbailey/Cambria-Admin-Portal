'use client';

import { useState, useEffect } from 'react';

interface PermissionDebuggerProps {
  userId?: string;
  clientCode?: string;
}

export default function PermissionDebugger({ userId, clientCode }: PermissionDebuggerProps) {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const checkPermissions = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/debug/permissions?userId=${userId}${clientCode ? `&clientCode=${clientCode}` : ''}`);
      const data = await response.json();
      setDebugInfo(data);
      setMessage(data.success ? 'Permissions checked successfully' : data.error);
    } catch (error) {
      setMessage('Error checking permissions');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const addTestPermission = async () => {
    if (!userId || !clientCode) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/debug/permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          clientCode,
          clientName: `${clientCode} Client`,
          permissionType: 'read'
        })
      });
      
      const data = await response.json();
      setMessage(data.success ? 'Permission added successfully' : data.error);
      
      if (data.success) {
        // Refresh debug info
        await checkPermissions();
      }
    } catch (error) {
      setMessage('Error adding permission');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      checkPermissions();
    }
  }, [userId, clientCode]);

  if (!userId) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
        <h3 className="text-lg font-medium text-yellow-800 mb-2">Permission Debugger</h3>
        <p className="text-yellow-700">No user ID provided for debugging</p>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <h3 className="text-lg font-medium text-blue-800 mb-2">Permission Debugger</h3>
      
      <div className="space-y-2 mb-4">
        <p className="text-sm text-blue-700">
          <strong>User ID:</strong> {userId}
        </p>
        {clientCode && (
          <p className="text-sm text-blue-700">
            <strong>Client Code:</strong> {clientCode}
          </p>
        )}
      </div>

      <div className="flex space-x-2 mb-4">
        <button
          onClick={checkPermissions}
          disabled={loading}
          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Check Permissions'}
        </button>
        
        {clientCode && (
          <button
            onClick={addTestPermission}
            disabled={loading}
            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add Test Permission'}
          </button>
        )}
      </div>

      {message && (
        <div className={`p-2 rounded text-sm ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {message}
        </div>
      )}

      {debugInfo && (
        <div className="mt-4">
          <h4 className="font-medium text-blue-800 mb-2">Debug Information:</h4>
          <div className="bg-white border rounded p-3 text-sm">
            <pre className="whitespace-pre-wrap text-xs">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

