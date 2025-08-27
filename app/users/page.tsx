'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auditHelpers } from '@/lib/audit';
import { hashPassword, generateToken } from '@/lib/auth';
import { handleLogout } from '@/lib/auth-utils';
import EnhancedNavigation from '@/components/EnhancedNavigation';
import ClientPermissionsManager from '@/components/ClientPermissionsManager';

interface User {
  id?: string;
  email: string;
  name: string;
  role: 'admin' | 'basic';
  status: 'active' | 'inactive';
  lastLogin?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

interface UserForm {
  email: string;
  name: string;
  role: 'admin' | 'basic';
  password: string;
  generatePassword: boolean;
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserForm>({
    email: '',
    name: '',
    role: 'basic',
    password: '',
    generatePassword: false
  });
  const [formLoading, setFormLoading] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState<{
    email: string;
    password: string;
    name: string;
  } | null>(null);
  const [user, setUser] = useState<any>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'view' | 'edit'>('view');
  const [showClientPermissions, setShowClientPermissions] = useState(false);
  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState<User | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [userClientPermissions, setUserClientPermissions] = useState<any[]>([]);

  const roleOptions = [
    { value: 'basic', label: 'Basic User' },
    { value: 'admin', label: 'Admin User' }
  ];

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user?.id) {
      fetchClients();
    }
  }, [user?.id]);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/session');
      const data = await response.json();
      
      if (data.authenticated) {
        setUser(data.user);
        fetchUsers();
      } else {
        router.push('/login');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      router.push('/login');
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      if (data.success) {
        console.log('📊 Fetched users:', data.users);
        console.log('📊 Sample user client permissions:', data.users[0]?.clientPermissions);
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      setClientsLoading(true);
      const response = await fetch(`/api/clients?userId=${user?.id}&forPermissionManagement=true`);
      const data = await response.json();
      if (data.clients) {
        setClients(data.clients);
        console.log(`📋 Fetched ${data.clients.length} clients for permission management`);
      } else {
        console.error('No clients data in response:', data);
        setClients([]);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      setClients([]);
    } finally {
      setClientsLoading(false);
    }
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleAddUser = () => {
    setFormData({
      email: '',
      name: '',
      role: 'basic',
      password: '',
      generatePassword: false
    });
    setShowAddUser(true);
    setGeneratedCredentials(null);
  };

  const handleEditUser = (user: User) => {
    console.log('📝 Editing user:', user);
    console.log('📝 User client permissions:', user.clientPermissions);
    
    setEditingUser(user);
    setFormData({
      email: user.email,
      name: user.name,
      role: user.role,
      password: '',
      generatePassword: false
    });
    // Load existing client permissions
    const permissions = user.clientPermissions || [];
    console.log('📝 Setting client permissions:', permissions);
    setUserClientPermissions(permissions);
    setShowAddUser(true);
    setGeneratedCredentials(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const userData: any = {
        email: formData.email,
        name: formData.name,
        role: formData.role,
        ...(editingUser && formData.role === 'basic' && {
          clientPermissions: userClientPermissions.filter(permission => permission.clientCode)
        })
      };

      // Only include password if it's being changed (for new users or when explicitly changing)
      if (!editingUser || formData.generatePassword || formData.password !== '') {
        let finalPassword = formData.password;
        if (formData.generatePassword) {
          finalPassword = generateRandomPassword();
        }
        userData.password = finalPassword;
      }

      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

              if (response.ok && data.success) {
          if (!editingUser && formData.generatePassword) {
            setGeneratedCredentials({
              email: formData.email,
              password: finalPassword,
              name: formData.name
            });
          } else {
            setShowAddUser(false);
            setEditingUser(null);
            fetchUsers();
            auditHelpers.userCreated(formData.name, formData.email, {
              id: user?.id || 'unknown',
              name: user?.name || 'Unknown User',
              email: user?.email || 'unknown@example.com'
            });
          }
        } else {
          alert(data.error || 'Failed to save user');
        }
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Failed to save user');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setUserToDelete(user);
      setShowDeleteDialog(true);
    }
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    
    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/users/${userToDelete.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        fetchUsers();
        auditHelpers.userDeleted(userToDelete.name, {
          id: user?.id || 'unknown',
          name: user?.name || 'Unknown User',
          email: user?.email || 'unknown@example.com'
        });
        setShowDeleteDialog(false);
        setUserToDelete(null);
      } else {
        alert(data.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: string) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: currentStatus === 'active' ? 'inactive' : 'active'
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        fetchUsers();
        auditHelpers.permissionsUpdated('User Status', currentStatus, currentStatus === 'active' ? 'inactive' : 'active');
      } else {
        alert(data.error || 'Failed to update user status');
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      alert('Failed to update user status');
    }
  };

  const handleManagePermissions = (user: User) => {
    setSelectedUserForPermissions(user);
    setShowClientPermissions(true);
  };

  const handleAddClientPermission = () => {
    setUserClientPermissions([...userClientPermissions, {
      clientCode: '',
      clientName: '',
      permissionType: 'read',
      grantedBy: user?.id || 'system',
      grantedAt: new Date()
    }]);
  };

  const handleRemoveClientPermission = (index: number) => {
    const newPermissions = userClientPermissions.filter((_, i) => i !== index);
    setUserClientPermissions(newPermissions);
  };

  const handleUpdateClientPermission = (index: number, field: string, value: string) => {
    const newPermissions = [...userClientPermissions];
    newPermissions[index] = { ...newPermissions[index], [field]: value };
    
    // Update client name when client code changes
    if (field === 'clientCode') {
      const selectedClient = clients.find(client => client.clientCode === value);
      if (selectedClient) {
        newPermissions[index].clientName = selectedClient.clientName;
      }
    }
    
    setUserClientPermissions(newPermissions);
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <EnhancedNavigation user={user} currentPage="users" />

      <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="mb-6 lg:mb-0">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">User Management</h1>
                <p className="text-gray-600 text-lg">Manage user accounts and permissions</p>
              </div>
              
              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:ml-8">
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-lg">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-600">Total Users</p>
                      <p className="text-2xl font-bold text-gray-900">{users.length}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-lg">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-600">Active</p>
                      <p className="text-2xl font-bold text-gray-900">{users.filter(u => u.status === 'active').length}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-lg">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-600">Admins</p>
                      <p className="text-2xl font-bold text-gray-900">{users.filter(u => u.role === 'admin').length}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Card */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
            <div className="p-6 lg:p-8">
              {/* Header with Search and Actions */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
                <div className="flex items-center justify-between mb-6 lg:mb-0">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">User Accounts</h2>
                    <p className="text-gray-600">Manage user access and permissions</p>
                  </div>
                  <button
                    onClick={handleAddUser}
                    className="ml-4 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform transition-all duration-200 hover:scale-105 shadow-lg flex items-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add User
                  </button>
                </div>
                
                {/* Enhanced Search Bar */}
                <div className="relative max-w-md w-full">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-12 pr-12 py-3 border-0 bg-gray-50 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200"
                  />
                </div>
              </div>

              {/* Users Table */}
              <div className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr className="bg-gray-50/50">
                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          User
                        </th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Role
                        </th>
                        <th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Last Login
                        </th>
                        <th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredUsers.map((userItem, index) => (
                        <tr key={userItem.id || index} className="hover:bg-gray-50/80 transition-colors duration-200">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                                <span className="text-sm font-bold text-white">
                                  {userItem.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-semibold text-gray-900">{userItem.name}</div>
                                <div className="text-sm text-gray-500">{userItem.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                              userItem.role === 'admin' 
                                ? 'bg-purple-100 text-purple-800 ring-1 ring-purple-200' 
                                : 'bg-gray-100 text-gray-800 ring-1 ring-gray-200'
                            }`}>
                              {userItem.role === 'admin' ? 'Admin' : 'Basic'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                              userItem.status === 'active' 
                                ? 'bg-green-100 text-green-800 ring-1 ring-green-200' 
                                : 'bg-red-100 text-red-800 ring-1 ring-red-200'
                            }`}>
                              {userItem.status === 'active' ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                            {userItem.lastLogin ? new Date(userItem.lastLogin).toLocaleDateString() : 'Never'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center space-x-2">
                              <button
                                onClick={() => handleEditUser(userItem)}
                                className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition-all duration-200"
                                title="Edit user"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              
                              <button
                                onClick={() => handleManagePermissions(userItem)}
                                className="text-green-600 hover:text-green-800 p-2 rounded-lg hover:bg-green-50 transition-all duration-200"
                                title="Manage permissions"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                                </svg>
                              </button>
                              
                              <button
                                onClick={() => handleToggleUserStatus(userItem.id!, userItem.status)}
                                className={`p-2 rounded-lg transition-all duration-200 ${
                                  userItem.status === 'active'
                                    ? 'text-orange-600 hover:text-orange-800 hover:bg-orange-50'
                                    : 'text-green-600 hover:text-green-800 hover:bg-green-50'
                                }`}
                                title={userItem.status === 'active' ? 'Deactivate user' : 'Activate user'}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                              </button>
                              
                              <button
                                onClick={() => handleDeleteUser(userItem.id!)}
                                className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50 transition-all duration-200"
                                title="Delete user"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Add/Edit User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-8 border-0 w-full max-w-md shadow-2xl rounded-2xl bg-white">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-gray-900">
                  {editingUser ? 'Edit User' : 'Add New User'}
                </h3>
                <button
                  onClick={() => {
                    setShowAddUser(false);
                    setEditingUser(null);
                    setGeneratedCredentials(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-gray-600">
                {editingUser ? 'Update user information and permissions' : 'Create a new user account'}
              </p>
            </div>
            
            {generatedCredentials ? (
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
                  <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">User Created Successfully!</h3>
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <p className="text-sm font-semibold text-blue-800 mb-3">Generated Credentials:</p>
                  <div className="space-y-2 text-left">
                    <div>
                      <span className="text-sm font-medium text-gray-700">Email:</span>
                      <p className="text-sm text-gray-900 font-mono bg-white p-2 rounded border">{generatedCredentials.email}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700">Password:</span>
                      <p className="text-sm text-gray-900 font-mono bg-white p-2 rounded border">{generatedCredentials.password}</p>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-6">
                  Please save these credentials securely. The password cannot be retrieved later.
                </p>
                <div className="flex space-x-4">
                  <button
                    onClick={() => {
                      setShowAddUser(false);
                      setEditingUser(null);
                      setGeneratedCredentials(null);
                      fetchUsers();
                    }}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter full name"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter email address"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Role *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => {
                      const newRole = e.target.value as 'admin' | 'basic';
                      setFormData({ ...formData, role: newRole });
                      // Clear client permissions if switching to admin
                      if (newRole === 'admin') {
                        setUserClientPermissions([]);
                      }
                    }}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    required
                  >
                    {roleOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Password {!editingUser && '*'}
                  </label>
                  <div className="space-y-3">
                    {editingUser && (
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="changePassword"
                          checked={formData.generatePassword || formData.password !== ''}
                          onChange={(e) => {
                            if (!e.target.checked) {
                              setFormData({ ...formData, password: '', generatePassword: false });
                            } else {
                              setFormData({ ...formData, generatePassword: true });
                            }
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="changePassword" className="ml-2 block text-sm text-gray-700">
                          Change password
                        </label>
                      </div>
                    )}
                    
                    {(!editingUser || formData.generatePassword || formData.password !== '') && (
                      <>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="generatePassword"
                            checked={formData.generatePassword}
                            onChange={(e) => setFormData({ ...formData, generatePassword: e.target.checked })}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor="generatePassword" className="ml-2 block text-sm text-gray-700">
                            Generate random password
                          </label>
                        </div>
                        
                        {!formData.generatePassword && (
                          <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                            placeholder="Enter password"
                            required={!editingUser && !formData.generatePassword}
                          />
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Client Permissions Section - Only show for basic users when editing */}
                {editingUser && formData.role === 'basic' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Client Permissions
                    </label>
                    {clientsLoading ? (
                      <div className="text-center py-4">
                        <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
                        <p className="text-sm text-gray-600">Loading clients...</p>
                      </div>
                    ) : clients.length === 0 ? (
                      <div className="text-center py-4">
                        <p className="text-sm text-gray-500">No clients available</p>
                      </div>
                    ) : (
                    <div className="space-y-4">
                      {userClientPermissions.map((permission, index) => (
                        <div key={index} className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                          <div className="flex-1">
                            <select
                              value={permission.clientCode}
                              onChange={(e) => handleUpdateClientPermission(index, 'clientCode', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="">Select a client</option>
                              {clients.map(client => (
                                <option key={client.clientCode} value={client.clientCode}>
                                  {client.clientName} ({client.clientCode})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="w-32">
                            <select
                              value={permission.permissionType}
                              onChange={(e) => handleUpdateClientPermission(index, 'permissionType', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="read">Read</option>
                              <option value="write">Write</option>
                              <option value="admin">Admin</option>
                            </select>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveClientPermission(index)}
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors duration-200"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      ))}
                      
                      <button
                        type="button"
                        onClick={handleAddClientPermission}
                        className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors duration-200 flex items-center justify-center"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add Client Permission
                      </button>
                    </div>
                    )}
                  </div>
                )}
                
                <div className="flex space-x-4 pt-6">
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 transition-all duration-200 transform hover:scale-105 shadow-lg"
                  >
                    {formLoading ? (
                      <span className="flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        {editingUser ? 'Updating...' : 'Creating...'}
                      </span>
                    ) : (
                      editingUser ? 'Update User' : 'Create User'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddUser(false);
                      setEditingUser(null);
                      setGeneratedCredentials(null);
                    }}
                    className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-all duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Client Permissions Modal */}
      {showClientPermissions && selectedUserForPermissions && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-8 border-0 w-full max-w-4xl shadow-2xl rounded-2xl bg-white">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-gray-900">
                  Manage Permissions for {selectedUserForPermissions.name}
                </h3>
                <button
                  onClick={() => {
                    setShowClientPermissions(false);
                    setSelectedUserForPermissions(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-gray-600">
                Assign client access permissions to this user
              </p>
            </div>
            
                         <ClientPermissionsManager 
               userId={selectedUserForPermissions.id!}
               userName={selectedUserForPermissions.name}
               currentAdminUserId={user?.id}
               onClose={() => {
                 setShowClientPermissions(false);
                 setSelectedUserForPermissions(null);
               }}
             />
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && userToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-8 border-0 w-full max-w-md shadow-2xl rounded-2xl bg-white">
            <div className="text-center">
              {/* Warning Icon */}
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
                <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Delete User</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete <span className="font-semibold text-gray-900">{userToDelete.name}</span>?
              </p>
              <p className="text-sm text-gray-500 mb-6">
                This action cannot be undone. The user will lose access to the system immediately.
              </p>
              
              <div className="flex space-x-4">
                <button
                  onClick={() => {
                    setShowDeleteDialog(false);
                    setUserToDelete(null);
                  }}
                  disabled={deleteLoading}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 disabled:opacity-50 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteUser}
                  disabled={deleteLoading}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white font-semibold rounded-xl hover:from-red-700 hover:to-pink-700 disabled:opacity-50 transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  {deleteLoading ? (
                    <span className="flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Deleting...
                    </span>
                  ) : (
                    'Delete User'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
