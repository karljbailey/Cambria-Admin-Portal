'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { auditHelpers } from '@/lib/audit';
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

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;
  
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<UserForm>({
    email: '',
    name: '',
    role: 'basic',
    password: '',
    generatePassword: false
  });
  const [formLoading, setFormLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [generatedCredentials, setGeneratedCredentials] = useState<{
    email: string;
    password: string;
    name: string;
  } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<boolean>(false);

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
        setCurrentUser(data.user);
        fetchUser();
      } else {
        router.push('/login');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      router.push('/login');
    }
  };

  const fetchUser = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/permissions');
      const data = await response.json();
      
      if (data.success) {
        const foundUser = data.users.find((u: User) => u.id === userId);
        if (foundUser) {
          setUser(foundUser);
          setFormData({
            email: foundUser.email,
            name: foundUser.name,
            role: foundUser.role,
            password: '',
            generatePassword: false
          });
          // Add audit log for viewing user
          auditHelpers.userViewed(foundUser.name, foundUser.email);
        } else {
          setError('User not found');
        }
      } else {
        setError('Failed to fetch user');
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      setError('Failed to fetch user');
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

      const userData: any = {
        email: formData.email,
        name: formData.name,
        role: formData.role,
        status: 'active' as const
      };

      // Only include password fields if a new password is provided
      if (finalPassword) {
        const { hash: passwordHash, salt: passwordSalt } = await import('@/lib/auth').then(m => m.hashPassword(finalPassword));
        userData.passwordHash = passwordHash;
        userData.passwordSalt = passwordSalt;
      }

      const response = await fetch('/api/permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...userData, id: userId })
      });

      const data = await response.json();
      
      if (data.success) {
        // Add audit log
        auditHelpers.permissionsUpdated(formData.name, user?.role || '', formData.role);
        
        // Show generated credentials if password was generated
        if (formData.generatePassword) {
          setGeneratedCredentials({
            email: formData.email,
            password: finalPassword,
            name: formData.name
          });
        }
        
        setEditing(false);
        fetchUser(); // Refresh user data
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

  const handleToggleStatus = async () => {
    if (!user) return;
    
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    
    try {
      const response = await fetch('/api/permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, status: newStatus })
      });

      const data = await response.json();
      
      if (data.success) {
        auditHelpers.permissionsUpdated(user.name, user.status, newStatus);
        fetchUser(); // Refresh user data
      } else {
        alert(data.error || 'Failed to update user status');
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      alert('Failed to update user status');
    }
  };

  const handleDeleteUser = async () => {
    if (!user) return;
    setDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!user) return;

    try {
      const response = await fetch(`/api/permissions?id=${userId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (data.success) {
        auditHelpers.userDeleted(user.name);
        router.push('/users');
      } else {
        alert(data.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    }
  };

  const getRoleColor = (role: string) => {
    return role === 'admin' ? 'bg-white text-gray-700 border border-gray-200' : 'bg-white text-gray-700 border border-gray-200';
  };

  const getStatusColor = (status: string) => {
    return status === 'active' ? 'bg-white text-gray-700 border border-gray-200' : 'bg-gray-100 text-gray-700 border border-gray-200';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <EnhancedNavigation user={currentUser} currentPage="users" />
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <EnhancedNavigation user={currentUser} currentPage="users" />
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">User not found</h3>
              <p className="mt-1 text-sm text-gray-500">{error || 'The user you are looking for does not exist.'}</p>
              <div className="mt-6">
                <Link
                  href="/users"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Back to Users
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <EnhancedNavigation user={currentUser} currentPage="users" />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Breadcrumbs */}
          <nav className="flex mb-6" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-3">
              <li className="inline-flex items-center">
                <Link
                  href="/users"
                  className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600"
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                  </svg>
                  Users
                </Link>
              </li>
              <li>
                <div className="flex items-center">
                  <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2">
                    {user.name}
                  </span>
                </div>
              </li>
            </ol>
          </nav>

          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              {/* Header with Actions */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-16 w-16">
                    <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-xl font-medium text-blue-600">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getRoleColor(user.role)}`}>
                    {user.role === 'admin' ? 'Administrator' : 'Basic User'}
                  </span>
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(user.status)}`}>
                    {user.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                  
                                    {!editing && (
                    <button
                      onClick={() => setEditing(true)}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                  )}
                </div>
              </div>

              {/* User Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">User Information</h3>
                    <dl className="space-y-3">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Full Name</dt>
                        <dd className="text-sm text-gray-900">{user.name}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Email Address</dt>
                        <dd className="text-sm text-gray-900">{user.email}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Role</dt>
                        <dd>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                            {user.role === 'admin' ? 'Administrator' : 'Basic User'}
                          </span>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Status</dt>
                        <dd>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user.status)}`}>
                            {user.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Activity</h3>
                    <dl className="space-y-3">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Last Login</dt>
                        <dd className="text-sm text-gray-900">
                          {user.lastLogin ? (
                            <div>
                              <div>{new Date(user.lastLogin).toLocaleDateString()}</div>
                              <div className="text-xs text-gray-400">
                                {new Date(user.lastLogin).toLocaleTimeString()}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">Never</span>
                          )}
                        </dd>
                      </div>
                      {user.created_at && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Created</dt>
                          <dd className="text-sm text-gray-900">
                            {new Date(user.created_at).toLocaleDateString()}
                          </dd>
                        </div>
                      )}
                      {user.updated_at && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                          <dd className="text-sm text-gray-900">
                            {new Date(user.updated_at).toLocaleDateString()}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </div>
              </div>

              {/* Edit Form */}
              {editing && (
                <div className="mt-8 border-t border-gray-200 pt-8">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Edit User</h3>
                  
                  <form onSubmit={handleSubmit} className="space-y-6">
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

                    {/* Additional Actions */}
                    <div className="border-t border-gray-200 pt-6">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Additional Actions</h4>
                      <div className="flex space-x-3">
                        <button
                          type="button"
                          onClick={handleToggleStatus}
                          className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                            user.status === 'active'
                              ? 'text-red-700 bg-red-100 border border-red-300 hover:bg-red-200'
                              : 'text-green-700 bg-green-100 border border-green-300 hover:bg-green-200'
                          }`}
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={user.status === 'active' ? "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"} />
                          </svg>
                          {user.status === 'active' ? 'Deactivate User' : 'Activate User'}
                        </button>
                        <button
                          type="button"
                          onClick={handleDeleteUser}
                          className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-700 bg-red-100 border border-red-300 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete User
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => setEditing(false)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={formLoading}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        {formLoading ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Generated Credentials Modal */}
              {generatedCredentials && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                  <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                    <div className="mt-3">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">New Password Generated</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Email</label>
                          <p className="text-sm text-gray-900">{generatedCredentials.email}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">New Password</label>
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={generatedCredentials.password}
                              readOnly
                              className="flex-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-sm font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => navigator.clipboard.writeText(generatedCredentials.password)}
                              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                            >
                              Copy
                            </button>
                          </div>
                        </div>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                          <p className="text-sm text-yellow-800">
                            Please save this password securely. It will not be shown again.
                          </p>
                        </div>
                      </div>
                      <div className="mt-6">
                        <button
                          onClick={() => setGeneratedCredentials(null)}
                          className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                             )}

               {/* Delete Confirmation Modal */}
               {deleteConfirm && (
                 <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                   <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                     <div className="mt-3">
                       <div className="flex items-center mb-4">
                         <div className="flex-shrink-0">
                           <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                             <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                             </svg>
                           </div>
                         </div>
                         <div className="ml-3">
                           <h3 className="text-lg font-medium text-gray-900">Delete User</h3>
                           <p className="text-sm text-gray-500">This action cannot be undone.</p>
                         </div>
                       </div>
                       <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                         <p className="text-sm text-red-800">
                           Are you sure you want to delete <strong>{user?.name}</strong>? 
                           This will permanently remove their account and all associated data.
                         </p>
                       </div>
                       <div className="flex justify-end space-x-3">
                         <button
                           onClick={() => setDeleteConfirm(false)}
                           className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                         >
                           Cancel
                         </button>
                         <button
                           onClick={confirmDelete}
                           className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                         >
                           Delete User
                         </button>
                       </div>
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
