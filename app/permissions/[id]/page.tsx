'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { auditHelpers } from '@/lib/audit-client';
// import { handleLogout } from '@/lib/auth-utils';
import EnhancedNavigation from '@/components/EnhancedNavigation';
import { formatGrantedAtDate } from '@/lib/date-utils';

interface Permission {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  permissionType: 'read' | 'write';
  resource: string;
  grantedBy: string;
  grantedAt: Date | string;
  expiresAt?: Date | string;
  created_at?: Date | string;
  updated_at?: Date | string;
}

interface PermissionForm {
  userId: string;
  userName: string;
  userEmail: string;
  permissionType: 'read' | 'write';
  resource: string;
}

export default function PermissionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const permissionId = params.id as string;
  
  const [permission, setPermission] = useState<Permission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<PermissionForm>({
    userId: '',
    userName: '',
    userEmail: '',
    permissionType: 'read',
    resource: 'logs'
  });
  const [formLoading, setFormLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  const permissionTypeOptions = [
    { value: 'read', label: 'Read Access' },
    { value: 'write', label: 'Write Access' }
  ];

  const resourceOptions = [
    { value: 'logs', label: 'Logs' },
    { value: 'permissions', label: 'Permissions' },
    { value: 'user', label: 'User' },
    { value: 'client', label: 'Client' }
  ];

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/session');
      const data = await response.json();
      
      if (data.authenticated) {
        setUser(data.user);
        fetchPermission();
      } else {
        router.push('/login');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      router.push('/login');
    }
  };

  const fetchPermission = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/permissions/list?id=${permissionId}`);
      const data = await response.json();
      
      if (data.success && data.permissions.length > 0) {
        const perm = data.permissions[0];
        setPermission(perm);
        setFormData({
          userId: perm.userId,
          userName: perm.userName,
          userEmail: perm.userEmail || '',
          permissionType: perm.permissionType,
          resource: perm.resource
        });
      } else {
        setError('Permission not found');
      }
    } catch (error) {
      console.error('Error fetching permission:', error);
      setError('Failed to load permission');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const response = await fetch('/api/permissions/list', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          id: permissionId,
          grantedBy: user.email,
          grantedAt: new Date().toISOString()
        })
      });

      const data = await response.json();
      
      if (data.success) {
        auditHelpers.permissionsUpdated(formData.userName, permission?.permissionType!, formData.permissionType);
        setEditing(false);
        fetchPermission();
      } else {
        alert(data.error || 'Failed to update permission');
      }
    } catch (error) {
      console.error('Error updating permission:', error);
      alert('Failed to update permission');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this permission? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/permissions/list?id=${permissionId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (data.success) {
        auditHelpers.userDeleted(permission?.userName || 'Unknown user');
        router.push('/permissions');
      } else {
        alert(data.error || 'Failed to delete permission');
      }
    } catch (error) {
      console.error('Error deleting permission:', error);
      alert('Failed to delete permission');
    }
  };

  const getPermissionDescription = (type: string, resource: string) => {
    const descriptions = {
      'read': {
        'logs': 'Can view audit logs and system activity records',
        'permissions': 'Can view user permissions and access levels',
        'user': 'Can view user accounts and basic information',
        'client': 'Can view client information and data'
      },
      'write': {
        'logs': 'Can view and modify audit logs and system activity records',
        'permissions': 'Can view and modify user permissions and access levels',
        'user': 'Can view and modify user accounts and information',
        'client': 'Can view and modify client information and data'
      }
    };
    
    return descriptions[type as keyof typeof descriptions]?.[resource as keyof typeof descriptions.read] || 'Unknown permission';
  };

  const getPermissionTypeColor = (type: string) => {
    switch (type) {
      case 'write': return 'bg-yellow-100 text-yellow-800';
      case 'read': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getResourceColor = (resource: string) => {
    switch (resource) {
      case 'logs': return 'bg-purple-100 text-purple-800';
      case 'permissions': return 'bg-blue-100 text-blue-800';
      case 'user': return 'bg-indigo-100 text-indigo-800';
      case 'client': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error || !permission) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Permission Not Found</h2>
                <p className="text-gray-600 mb-4">{error || 'The requested permission could not be found.'}</p>
                <button
                  onClick={() => router.push('/permissions')}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Back to Permissions
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Navigation */}
      <EnhancedNavigation user={user} currentPage="permissions" />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Breadcrumbs */}
          <nav className="flex mb-6" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-3">
              <li className="inline-flex items-center">
                <button
                  onClick={() => router.push('/permissions')}
                  className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600"
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                  </svg>
                  Permissions
                </button>
              </li>
              <li>
                <div className="flex items-center">
                  <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2">
                    {permission.userName}
                  </span>
                </div>
              </li>
            </ol>
          </nav>

          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              {/* Header with Actions */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Permission Details</h2>
                <div className="flex items-center space-x-3">
                  {!editing && (
                    <>
                      <button
                        onClick={() => setEditing(true)}
                        className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                      <button
                        onClick={handleDelete}
                        className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 hover:border-red-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>

              {editing ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">User Name</label>
                      <input
                        type="text"
                        value={formData.userName}
                        onChange={(e) => setFormData({...formData, userName: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">User Email</label>
                      <input
                        type="email"
                        value={formData.userEmail}
                        onChange={(e) => setFormData({...formData, userEmail: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Permission Type</label>
                      <select
                        value={formData.permissionType}
                        onChange={(e) => setFormData({...formData, permissionType: e.target.value as 'read' | 'write'})}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        {permissionTypeOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Resource</label>
                      <select
                        value={formData.resource}
                        onChange={(e) => setFormData({...formData, resource: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        {resourceOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={formLoading}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
                    >
                      {formLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-6">
                  {/* Permission Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">User Information</h3>
                      <dl className="space-y-3">
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Name</dt>
                          <dd className="text-sm text-gray-900">{permission.userName}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Email</dt>
                          <dd className="text-sm text-gray-900">{permission.userEmail || 'Not provided'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">User ID</dt>
                          <dd className="text-sm text-gray-900 font-mono">{permission.userId}</dd>
                        </div>
                      </dl>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Permission Details</h3>
                      <dl className="space-y-3">
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Type</dt>
                          <dd>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPermissionTypeColor(permission.permissionType)}`}>
                              {permission.permissionType}
                            </span>
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Resource</dt>
                          <dd>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getResourceColor(permission.resource)}`}>
                              {permission.resource}
                            </span>
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Granted By</dt>
                          <dd className="text-sm text-gray-900">{permission.grantedBy}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Granted At</dt>
                          <dd className="text-sm text-gray-900">
                            {formatGrantedAtDate(permission.grantedAt)}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>

                  {/* Permission Explanation */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-blue-900 mb-2">What This Permission Means</h3>
                    <p className="text-blue-800">
                      {getPermissionDescription(permission.permissionType, permission.resource)}
                    </p>
                    <div className="mt-3 text-sm text-blue-700">
                      <p><strong>Permission Type:</strong> {permission.permissionType === 'read' ? 'View only access' : 'Full access including modifications'}</p>
                      <p><strong>Resource:</strong> {permission.resource === 'logs' ? 'System audit logs and activity records' : 
                                                     permission.resource === 'permissions' ? 'User permission management' :
                                                     permission.resource === 'user' ? 'User account management' :
                                                     'Client data and information'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
