'use client';

import { useState, useEffect } from 'react';

interface ClientPermission {
  clientCode: string;
  clientName: string;
  permissionType: 'read' | 'write' | 'admin';
  grantedBy: string;
  grantedAt: Date;
  expiresAt?: Date;
}

interface Client {
  folderId: string;
  clientCode: string;
  clientName: string;
  fullName: string;
  acosGoal?: string;
  tacosGoal?: string;
  active: boolean;
}

interface ClientPermissionsManagerProps {
  userId: string;
  userName: string;
  currentAdminUserId: string;
  onClose: () => void;
}

export default function ClientPermissionsManager({ userId, userName, currentAdminUserId, onClose }: ClientPermissionsManagerProps) {
  const [clientPermissions, setClientPermissions] = useState<ClientPermission[]>([]);
  const [availableClients, setAvailableClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddPermission, setShowAddPermission] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [selectedPermissionType, setSelectedPermissionType] = useState<'read' | 'write' | 'admin'>('read');
  const [formLoading, setFormLoading] = useState(false);

  const permissionTypeOptions = [
    { value: 'read', label: 'Read Access' },
    { value: 'write', label: 'Write Access' },
    { value: 'admin', label: 'Admin Access' }
  ];

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch user's current client permissions
      const permissionsResponse = await fetch(`/api/permissions/client?userId=${userId}`);
      const permissionsData = await permissionsResponse.json();
      
      if (permissionsData.success) {
        setClientPermissions(permissionsData.permissions || []);
      }

      // Fetch available clients - use admin user ID and permission management flag to get all clients
      const clientsResponse = await fetch(`/api/clients?userId=${currentAdminUserId}&forPermissionManagement=true`);
      const clientsData = await clientsResponse.json();
      
      if (clientsResponse.ok) {
        setAvailableClients(clientsData.clients || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPermission = async () => {
    if (!selectedClient) return;

    const client = availableClients.find(c => c.clientCode === selectedClient);
    if (!client) return;

    try {
      setFormLoading(true);
      
      const response = await fetch('/api/permissions/client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          clientCode: selectedClient,
          clientName: client.clientName,
          permissionType: selectedPermissionType,
          grantedBy: 'admin@cambria.com' // This should come from current user
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Refresh permissions
        await fetchData();
        setShowAddPermission(false);
        setSelectedClient('');
        setSelectedPermissionType('read');
      } else {
        alert(data.error || 'Failed to add permission');
      }
    } catch (error) {
      console.error('Error adding permission:', error);
      alert('Failed to add permission');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdatePermission = async (clientCode: string, newPermissionType: 'read' | 'write' | 'admin') => {
    try {
      const response = await fetch('/api/permissions/client', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          clientCode,
          permissionType: newPermissionType
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Refresh permissions
        await fetchData();
      } else {
        alert(data.error || 'Failed to update permission');
      }
    } catch (error) {
      console.error('Error updating permission:', error);
      alert('Failed to update permission');
    }
  };

  const handleRemovePermission = async (clientCode: string) => {
    if (!confirm('Are you sure you want to remove this permission?')) return;

    try {
      const response = await fetch(`/api/permissions/client?userId=${userId}&clientCode=${clientCode}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (data.success) {
        // Refresh permissions
        await fetchData();
      } else {
        alert(data.error || 'Failed to remove permission');
      }
    } catch (error) {
      console.error('Error removing permission:', error);
      alert('Failed to remove permission');
    }
  };

  const getPermissionTypeColor = (type: string) => {
    switch (type) {
      case 'admin': return 'bg-red-100 text-red-800 border-red-200';
      case 'write': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'read': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-96 shadow-xl rounded-lg bg-white">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-4/5 max-w-4xl shadow-xl rounded-lg bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Client Permissions for {userName}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Add Permission Section */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-medium text-gray-700">Add New Permission</h4>
            <button
              onClick={() => setShowAddPermission(!showAddPermission)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
            >
              {showAddPermission ? 'Cancel' : 'Add Permission'}
            </button>
          </div>

          {showAddPermission && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                <select
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a client</option>
                  {availableClients
                    .filter(client => !clientPermissions.some(p => p.clientCode === client.clientCode))
                    .map(client => (
                      <option key={client.clientCode} value={client.clientCode}>
                        {client.clientName} ({client.clientCode})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Permission Type</label>
                <select
                  value={selectedPermissionType}
                  onChange={(e) => setSelectedPermissionType(e.target.value as 'read' | 'write' | 'admin')}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  {permissionTypeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleAddPermission}
                  disabled={!selectedClient || formLoading}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md transition-colors duration-200"
                >
                  {formLoading ? 'Adding...' : 'Add Permission'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Current Permissions */}
        <div className="mb-4">
          <h4 className="text-md font-medium text-gray-700 mb-3">Current Permissions</h4>
          
          {clientPermissions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>No client permissions assigned</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Permission Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Granted By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Granted At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {clientPermissions.map((permission) => (
                    <tr key={permission.clientCode}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{permission.clientName}</div>
                          <div className="text-sm text-gray-500">{permission.clientCode}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={permission.permissionType}
                          onChange={(e) => handleUpdatePermission(permission.clientCode, e.target.value as 'read' | 'write' | 'admin')}
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getPermissionTypeColor(permission.permissionType)}`}
                        >
                          {permissionTypeOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {permission.grantedBy}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(permission.grantedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleRemovePermission(permission.clientCode)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Close Button */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md transition-colors duration-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

