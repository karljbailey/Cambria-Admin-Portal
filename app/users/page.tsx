'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auditHelpers } from '@/lib/audit';
import { hashPassword, generateToken } from '@/lib/auth';
import { handleLogout } from '@/lib/auth-utils';
import EnhancedNavigation from '@/components/EnhancedNavigation';

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

  const roleOptions = [
    { value: 'basic', label: 'Basic User' },
    { value: 'admin', label: 'Admin User' }
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
      const response = await fetch('/api/permissions');
      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
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

  const handleGeneratePassword = () => {
    const newPassword = generateRandomPassword();
    setFormData(prev => ({
      ...prev,
      password: newPassword,
      generatePassword: true
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      let finalPassword = formData.password;
      if (formData.generatePassword && !formData.password) {
        finalPassword = generateRandomPassword();
      }

      if (!finalPassword) {
        alert('Please enter a password or generate one');
        setFormLoading(false);
        return;
      }

      if (editingUser) {
        // Update existing user - use permissions endpoint
        const { hash: passwordHash, salt: passwordSalt } = await hashPassword(finalPassword);

        const userData = {
          email: formData.email,
          name: formData.name,
          role: formData.role,
          passwordHash,
          passwordSalt,
          status: 'active' as const
        };

        const response = await fetch('/api/permissions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...userData, id: editingUser.id })
        });

        const data = await response.json();
        
        if (data.success) {
          auditHelpers.permissionsUpdated(formData.name, editingUser.role, formData.role);
          setShowAddUser(false);
          setEditingUser(null);
          setFormData({
            email: '',
            name: '',
            role: 'basic',
            password: '',
            generatePassword: false
          });
          fetchUsers();
        } else {
          alert(data.error || 'Failed to update user');
        }
      } else {
        // Create new user - use new users endpoint
        const userData = {
          email: formData.email,
          name: formData.name,
          role: formData.role,
          password: finalPassword
        };

        const response = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData)
        });

        const data = await response.json();
        
        if (data.success) {
          // Show generated credentials if password was generated
          if (formData.generatePassword) {
            setGeneratedCredentials({
              email: formData.email,
              password: finalPassword,
              name: formData.name
            });
          }
          
          setShowAddUser(false);
          setEditingUser(null);
          setFormData({
            email: '',
            name: '',
            role: 'basic',
            password: '',
            generatePassword: false
          });
          fetchUsers();
        } else {
          alert(data.error || 'Failed to create user');
        }
      }
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Failed to save user');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      name: user.name,
      role: user.role,
      password: '',
      generatePassword: false
    });
    setShowAddUser(true);
  };

  const handleEditFromDialog = () => {
    if (selectedUser) {
      setFormData({
        email: selectedUser.email,
        name: selectedUser.name,
        role: selectedUser.role,
        password: '',
        generatePassword: false
      });
      setEditingUser(selectedUser);
      setDialogMode('edit');
    }
  };

  const handleSaveFromDialog = async () => {
    if (!selectedUser || !selectedUser.id) return;
    
    try {
      setFormLoading(true);
      
      let finalPassword = formData.password;
      if (formData.generatePassword && !formData.password) {
        finalPassword = generateRandomPassword();
      }

      const userData: any = {
        email: formData.email,
        name: formData.name,
        role: formData.role,
        status: selectedUser.status,
        id: selectedUser.id
      };

      // Only include password fields if a new password is provided
      if (finalPassword) {
        const { hash: passwordHash, salt: passwordSalt } = await hashPassword(finalPassword);
        userData.passwordHash = passwordHash;
        userData.passwordSalt = passwordSalt;
      }

      const response = await fetch('/api/permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      const data = await response.json();
      
      if (data.success) {
        // Add audit log
        auditHelpers.permissionsUpdated(formData.name, selectedUser.role, formData.role);
        
        // Show generated credentials if password was generated
        if (formData.generatePassword && finalPassword) {
          setGeneratedCredentials({
            email: formData.email,
            password: finalPassword,
            name: formData.name
          });
        }
        
        // Update the selected user with new data
        const updatedUser = { ...selectedUser, ...formData };
        setSelectedUser(updatedUser);
        setDialogMode('view');
        setEditingUser(null);
        fetchUsers();
      } else {
        alert(data.error || 'Failed to update user');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user');
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleStatusFromDialog = async () => {
    if (!selectedUser || !selectedUser.id) return;
    
    const newStatus = selectedUser.status === 'active' ? 'inactive' : 'active';
    
    try {
      const response = await fetch('/api/permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedUser.id,
          email: selectedUser.email,
          name: selectedUser.name,
          role: selectedUser.role,
          status: newStatus
        })
      });

      const data = await response.json();
      
      if (data.success) {
        const updatedUser = { ...selectedUser, status: newStatus as 'active' | 'inactive' };
        setSelectedUser(updatedUser);
        auditHelpers.permissionsUpdated(selectedUser.name, selectedUser.status, newStatus);
        fetchUsers();
      } else {
        alert(data.error || 'Failed to update user status');
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      alert('Failed to update user status');
    }
  };

  const handleDeleteFromDialog = async () => {
    if (!selectedUser || !selectedUser.id) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedUser.name}?`)) return;

    try {
      const response = await fetch(`/api/permissions?id=${selectedUser.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (data.success) {
        auditHelpers.userDeleted(selectedUser.name);
        setShowUserDialog(false);
        setSelectedUser(null);
        fetchUsers();
      } else {
        alert(data.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete ${userName}?`)) return;

    try {
      const response = await fetch(`/api/permissions?id=${userId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (data.success) {
        auditHelpers.userDeleted(userName);
        fetchUsers();
      } else {
        alert(data.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: 'active' | 'inactive', userName: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    try {
      const response = await fetch('/api/permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, status: newStatus })
      });

      const data = await response.json();
      
      if (data.success) {
        auditHelpers.permissionsUpdated(userName, currentStatus, newStatus);
        fetchUsers();
      } else {
        alert(data.error || 'Failed to update user status');
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      alert('Failed to update user status');
    }
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleColor = (role: string) => {
    return role === 'admin' ? 'bg-white text-gray-700 border border-gray-200' : 'bg-white text-gray-700 border border-gray-200';
  };

  const getStatusColor = (status: string) => {
    return status === 'active' ? 'bg-white text-gray-700 border border-gray-200' : 'bg-white text-gray-700 border border-gray-200';
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
      <EnhancedNavigation user={user} currentPage="users" />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow-sm border border-gray-200 rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
                <div className="flex items-center justify-between mb-4 sm:mb-0">
                  <h2 className="text-lg font-medium text-gray-900">Users</h2>
                  <button
                    onClick={() => setShowAddUser(true)}
                    className="ml-4 px-4 py-2 text-sm font-medium text-white bg-gray-700 hover:bg-gray-800 rounded-md transition-colors duration-200 flex items-center"
                  >
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add User
                  </button>
                </div>
                
                {/* Search Bar */}
                <div className="relative max-w-sm w-full">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>

              {/* Users Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                                         {filteredUsers.map((user) => (
                       <tr 
                         key={user.id} 
                         className="hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                         onClick={() => {
                           setSelectedUser(user);
                           setDialogMode('view');
                           setShowUserDialog(true);
                         }}
                       >
                         <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user.status)}`}>
                            {user.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Add/Edit User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-xl rounded-lg bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingUser ? 'Edit User' : 'Add New User'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    disabled={!!editingUser}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value as 'admin' | 'basic'})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    {roleOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                {!editingUser && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Password</label>
                    <div className="mt-1 flex space-x-2">
                      <input
                        type="text"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value, generatePassword: false})}
                        placeholder="Enter password or generate one"
                        className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={handleGeneratePassword}
                        className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                      >
                        Generate
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddUser(false);
                      setEditingUser(null);
                      setFormData({
                        email: '',
                        name: '',
                        role: 'basic',
                        password: '',
                        generatePassword: false
                      });
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-gray-700 border border-transparent rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 transition-colors duration-200"
                  >
                    {formLoading ? 'Saving...' : (editingUser ? 'Update' : 'Create')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Generated Credentials Modal */}
      {generatedCredentials && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">User Credentials</h3>
              <div className="bg-gray-50 p-4 rounded-md mb-4">
                <p className="text-sm text-gray-600 mb-2"><strong>Name:</strong> {generatedCredentials.name}</p>
                <p className="text-sm text-gray-600 mb-2"><strong>Email:</strong> {generatedCredentials.email}</p>
                <p className="text-sm text-gray-600 mb-2"><strong>Password:</strong> {generatedCredentials.password}</p>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`Email: ${generatedCredentials.email}\nPassword: ${generatedCredentials.password}`);
                    alert('Credentials copied to clipboard!');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Copy to Clipboard
                </button>
                <button
                  onClick={() => setGeneratedCredentials(null)}
                  className="px-4 py-2 text-sm font-medium text-white bg-gray-700 border border-transparent rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
              )}

      {/* User Details Dialog */}
      {showUserDialog && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-xl rounded-lg bg-white">
            <div className="mt-3">
              {/* Dialog Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-white border border-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-lg font-medium text-gray-600">
                      {selectedUser.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{selectedUser.name}</h3>
                    <p className="text-sm text-gray-500">{selectedUser.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowUserDialog(false);
                    setSelectedUser(null);
                    setDialogMode('view');
                    setEditingUser(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {dialogMode === 'view' ? (
                /* View Mode */
                <div className="space-y-6">
                  {/* User Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                      <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getRoleColor(selectedUser.role)}`}>
                        {selectedUser.role === 'admin' ? 'Administrator' : 'Basic User'}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(selectedUser.status)}`}>
                        {selectedUser.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Login</label>
                      <p className="text-sm text-gray-900">
                        {selectedUser.lastLogin ? (
                          <div>
                            <div>{new Date(selectedUser.lastLogin).toLocaleDateString()}</div>
                            <div className="text-xs text-gray-500">
                              {new Date(selectedUser.lastLogin).toLocaleTimeString()}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">Never</span>
                        )}
                      </p>
                    </div>
                    {selectedUser.created_at && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
                        <p className="text-sm text-gray-900">
                          {new Date(selectedUser.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex justify-between items-center pt-6 border-t border-gray-200">
                    <div className="flex space-x-3">
                      <button
                        onClick={handleToggleStatusFromDialog}
                        className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                          selectedUser.status === 'active'
                            ? 'text-gray-700 bg-white border border-gray-200 hover:bg-gray-50'
                            : 'text-gray-700 bg-white border border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={selectedUser.status === 'active' ? "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"} />
                        </svg>
                        {selectedUser.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={handleDeleteFromDialog}
                        className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    </div>
                    <button
                      onClick={handleEditFromDialog}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gray-700 border border-transparent rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                  </div>
                </div>
              ) : (
                /* Edit Mode */
                <form onSubmit={(e) => { e.preventDefault(); handleSaveFromDialog(); }} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        disabled
                      />
                      <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Role</label>
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({...formData, role: e.target.value as 'admin' | 'basic'})}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        {roleOptions.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">New Password (Optional)</label>
                      <div className="mt-1 flex rounded-md shadow-sm">
                        <input
                          type="password"
                          value={formData.password}
                          onChange={(e) => setFormData({...formData, password: e.target.value})}
                          className="flex-1 block w-full border border-gray-300 rounded-l-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Leave blank to keep current password"
                        />
                        <button
                          type="button"
                          onClick={handleGeneratePassword}
                          className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-sm font-medium text-gray-700 hover:bg-gray-100"
                        >
                          Generate
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => {
                        setDialogMode('view');
                        setEditingUser(null);
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={formLoading}
                      className="px-4 py-2 text-sm font-medium text-white bg-gray-700 border border-transparent rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 transition-colors duration-200"
                    >
                      {formLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    );
  }
