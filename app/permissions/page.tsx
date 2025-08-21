'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auditHelpers } from '@/lib/audit';
// import { handleLogout } from '@/lib/auth-utils';
import EnhancedNavigation from '@/components/EnhancedNavigation';
import { formatGrantedAtDateShort } from '@/lib/date-utils';

interface Permission {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  permissionType: 'read' | 'write' | 'admin';
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
  permissionType: 'read' | 'write' | 'admin';
  resource: string;
}

export default function PermissionsPage() {
  const router = useRouter();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddPermission, setShowAddPermission] = useState(false);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [formData, setFormData] = useState<PermissionForm>({
    userId: '',
    userName: '',
    permissionType: 'read',
    resource: 'logs'
  });
  const [formLoading, setFormLoading] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [user, setUser] = useState<{ id: string; email: string; name?: string; role?: string } | null>(null);
  const [users, setUsers] = useState<{ id: string; email: string; name: string; role: string }[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);

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
        fetchPermissions();
        fetchUsers();
      } else {
        router.push('/login');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      router.push('/login');
    }
  };

  const fetchPermissions = async () => {
    try {
      const response = await fetch('/api/permissions/list');
      const data = await response.json();
      if (data.success) {
        setPermissions(data.permissions);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/permissions');
      const data = await response.json();
      if (data.success) {
        // Filter out admin users
        const nonAdminUsers = data.users.filter((user: { id: string; email: string; name: string; role: string }) => user.role !== 'admin');
        setUsers(nonAdminUsers);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchUserDetails = async (userId: string) => {
    try {
      const response = await fetch(`/api/permissions?userId=${userId}`);
      const data = await response.json();
      if (data.success && data.users) {
        const user = data.users.find((u: { id: string; email: string; name: string; role: string }) => u.id === userId);
        return user;
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const url = editingPermission ? '/api/permissions/list' : '/api/permissions/list';
      const method = editingPermission ? 'PUT' : 'POST';
      const body = editingPermission 
        ? { ...formData, id: editingPermission.id, grantedBy: user?.email || 'unknown', grantedAt: new Date().toISOString() }
        : { ...formData, grantedBy: user?.email || 'unknown', grantedAt: new Date().toISOString() };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      
      if (data.success) {
        // Add audit log
        if (editingPermission) {
                  auditHelpers.permissionsUpdated(formData.userName, editingPermission.permissionType, formData.permissionType);
      } else {
        auditHelpers.userCreated(formData.userName, formData.userId);
        }
        
        setShowAddPermission(false);
        setEditingPermission(null);
        setFormData({
          userId: '',
          userName: '',
          permissionType: 'read',
          resource: 'logs'
        });
        setUserSearchTerm('');
        setShowUserDropdown(false);
        fetchPermissions();
      } else {
        alert(data.error || 'Failed to save permission');
      }
    } catch (error) {
      console.error('Error saving permission:', error);
      alert('Failed to save permission');
    } finally {
      setFormLoading(false);
    }
  };

  // const handleDelete = async (permissionId: string) => { /* unused */ };

  // const handleEdit = (permission: Permission) => { /* unused */ };

  const handleUserSelect = (selectedUser: { id: string; name: string }) => {
    setFormData({
      ...formData,
      userId: selectedUser.id,
      userName: selectedUser.name,
    });
    setUserSearchTerm(selectedUser.name);
    setShowUserDropdown(false);
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  // UserDetailsCell component
  const UserDetailsCell = ({ userId, userName, userEmail }: { userId: string; userName: string; userEmail?: string }) => {
    const [userDetails, setUserDetails] = useState<{ id: string; email: string; name: string; role: string } | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
      const loadUserDetails = async () => {
        if (!userEmail && userId) {
          setLoading(true);
          const user = await fetchUserDetails(userId);
          setUserDetails(user);
          setLoading(false);
        }
      };
      loadUserDetails();
    }, [userId, userEmail]);

    if (loading) {
      return (
        <div>
          <div className="text-sm font-medium text-gray-900">{userName}</div>
          <div className="text-sm text-gray-500">Loading...</div>
        </div>
      );
    }

    const displayEmail = userEmail || userDetails?.email || 'No email';

    return (
      <div>
        <div className="text-sm font-medium text-gray-900">{userName}</div>
        <div className="text-sm text-gray-500">{displayEmail}</div>
      </div>
    );
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      // Close user search dropdown
      if (!target.closest('.user-search-dropdown')) {
        setShowUserDropdown(false);
      }
      
      // Close action menu
      if (!target.closest('.action-menu-container')) {
        setOpenMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const filteredPermissions = permissions.filter(permission =>
    permission.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    permission.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    permission.permissionType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    permission.resource.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPermissionTypeColor = (type: string) => {
    switch (type) {
      case 'admin': return 'bg-white text-gray-700 border border-gray-200';
      case 'write': return 'bg-white text-gray-700 border border-gray-200';
      case 'read': return 'bg-white text-gray-700 border border-gray-200';
      default: return 'bg-white text-gray-700 border border-gray-200';
    }
  };

  const getResourceColor = (resource: string) => {
    switch (resource) {
      case 'all': return 'bg-white text-gray-700 border border-gray-200';
      case 'clients': return 'bg-white text-gray-700 border border-gray-200';
      case 'reports': return 'bg-white text-gray-700 border border-gray-200';
      case 'audit': return 'bg-white text-gray-700 border border-gray-200';
      case 'permissions': return 'bg-white text-gray-700 border border-gray-200';
      default: return 'bg-white text-gray-700 border border-gray-200';
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Navigation */}
      <EnhancedNavigation user={user} currentPage="permissions" />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Add Button */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search permissions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          <button
            onClick={() => {
              setShowAddPermission(true);
              setEditingPermission(null);
              setFormData({
                userId: '',
                userName: '',
                permissionType: 'read',
                resource: 'logs'
              });
              setUserSearchTerm('');
              setShowUserDropdown(false);
            }}
            className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md transition-colors duration-200 font-medium text-sm"
          >
            Add Permission
          </button>
        </div>

        {/* Permissions Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Permission Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Resource
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Granted By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Granted At
                  </th>

                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPermissions.map((permission) => (
                  <tr 
                    key={permission.id} 
                    className="hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                    onClick={() => router.push(`/permissions/${permission.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <UserDetailsCell userId={permission.userId} userName={permission.userName} userEmail={permission.userEmail} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPermissionTypeColor(permission.permissionType)}`}>
                        {permission.permissionType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getResourceColor(permission.resource)}`}>
                        {permission.resource}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {permission.grantedBy}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatGrantedAtDateShort(permission.grantedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredPermissions.length === 0 && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No permissions found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'Try adjusting your search terms.' : 'Get started by creating a new permission.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Permission Modal */}
      {showAddPermission && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-xl rounded-lg bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingPermission ? 'Edit Permission' : 'Add New Permission'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">User</label>
                  <div className="relative user-search-dropdown">
                    <input
                      type="text"
                      placeholder="Search for a user..."
                      value={userSearchTerm}
                      onChange={(e) => {
                        setUserSearchTerm(e.target.value);
                        setShowUserDropdown(true);
                        if (!e.target.value) {
                          setFormData({...formData, userId: '', userName: ''});
                        }
                      }}
                      onFocus={() => setShowUserDropdown(true)}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                    {showUserDropdown && filteredUsers.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                        {filteredUsers.map((user) => (
                          <div
                            key={user.id}
                            onClick={() => handleUserSelect(user)}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                          >
                            <div className="font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {formData.userName && (
                    <div className="mt-1 text-sm text-gray-600">
                      Selected: {formData.userName}
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Permission Type</label>
                  <select
                    value={formData.permissionType}
                    onChange={(e) => setFormData({...formData, permissionType: e.target.value as 'admin' | 'read' | 'write'})}
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
                

                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddPermission(false);
                      setEditingPermission(null);
                      setUserSearchTerm('');
                      setShowUserDropdown(false);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-md transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-gray-700 hover:bg-gray-800 rounded-md disabled:opacity-50 transition-colors duration-200"
                  >
                    {formLoading ? 'Saving...' : (editingPermission ? 'Update' : 'Create')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
