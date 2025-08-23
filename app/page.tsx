'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auditHelpers } from '../lib/audit';
import { handleLogout } from '../lib/auth-utils';
import EnhancedNavigation from '../components/EnhancedNavigation';
import { useClientPermissions } from '../lib/hooks/useClientPermissions';

interface Client {
  folderId: string;
  clientCode: string;
  clientName: string;
  fullName: string;
  acosGoal?: string;
  tacosGoal?: string;
  active: boolean;
}

export default function Dashboard() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingClient, setUpdatingClient] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Add new client state
  const [showAddClient, setShowAddClient] = useState(false);
  const [addClientForm, setAddClientForm] = useState({
    clientCode: '',
    clientName: '',
    fullName: '',
    folderUrl: '',
    acosGoal: '',
    tacosGoal: ''
  });
  const [addClientLoading, setAddClientLoading] = useState(false);

  // Client permissions hook
  const {
    canWriteClient,
    canAdminClient,
    loading: permissionsLoading,
    error: permissionsError,
    isAdmin
  } = useClientPermissions(user?.id);

  const fetchClients = async () => {
    try {
      console.log('🔄 Fetching clients...');
      setLoading(true);
      
      if (!user?.id) {
        console.log('❌ No user ID available, cannot fetch clients');
        setError('Authentication required');
        return;
      }
      
      const url = `/api/clients?userId=${user.id}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (response.ok) {
        const accessibleClients = data.clients as Client[];
        console.log('✅ Setting accessible clients:', accessibleClients.length);
        setClients(accessibleClients);
        setFilteredClients(accessibleClients);
      } else {
        console.error('❌ Client fetch failed:', data.error);
        setError(data.error || 'Failed to fetch clients');
      }
    } catch (err) {
      console.error('❌ Client fetch error:', err);
      setError('Failed to fetch clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user && !permissionsLoading) {
      fetchClients();
    }
  }, [user, permissionsLoading]);

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

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredClients(clients);
    } else {
      const filtered = clients.filter(client =>
        client.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.clientCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.folderId.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredClients(filtered);
    }
  }, [searchTerm, clients]);

  const toggleClientStatus = async (clientCode: string, currentStatus: boolean) => {
    if (!canWriteClient(clientCode)) {
      alert('You do not have permission to modify this client.');
      return;
    }

    try {
      setUpdatingClient(clientCode);
      const response = await fetch(`/api/clients?userId=${user?.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientCode,
          active: !currentStatus,
        }),
      });

      if (response.ok) {
        setClients(prevClients =>
          prevClients.map(client =>
            client.clientCode === clientCode
              ? { ...client, active: !currentStatus }
              : client
          )
        );
        setFilteredClients(prevClients =>
          prevClients.map(client =>
            client.clientCode === clientCode
              ? { ...client, active: !currentStatus }
              : client
          )
        );
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update client status');
      }
    } catch (error) {
      console.error('Error updating client status:', error);
      alert('Failed to update client status');
    } finally {
      setUpdatingClient(null);
    }
  };

  const handleRowClick = (clientCode: string) => {
    router.push(`/client/${clientCode}`);
  };

  const handleMenuToggle = (e: React.MouseEvent, clientCode: string) => {
    e.stopPropagation();
    setOpenMenu(openMenu === clientCode ? null : clientCode);
  };

  const handleMenuClose = () => {
    setOpenMenu(null);
  };

  const handleAddClient = () => {
    if (!isAdmin) {
      alert('You do not have permission to add new clients.');
      return;
    }
    
    setShowAddClient(true);
    setAddClientForm({
      clientCode: '',
      clientName: '',
      fullName: '',
      folderUrl: '',
      acosGoal: '',
      tacosGoal: ''
    });
  };

  const handleCancelAddClient = () => {
    setShowAddClient(false);
    setAddClientForm({
      clientCode: '',
      clientName: '',
      fullName: '',
      folderUrl: '',
      acosGoal: '',
      tacosGoal: ''
    });
  };

  const handleAddClientFormChange = (field: string, value: string) => {
    setAddClientForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const isValidGoogleDriveUrl = (url: string): boolean => {
    return url.includes('drive.google.com') && url.includes('/folders/');
  };

  const extractFolderId = (url: string): string | null => {
    const match = url.match(/\/folders\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  };

  const handleSaveAddClient = async () => {
    if (!addClientForm.clientCode || !addClientForm.clientName || !addClientForm.fullName || !addClientForm.folderUrl) {
      alert('Please fill in all required fields');
      return;
    }

    if (!isValidGoogleDriveUrl(addClientForm.folderUrl)) {
      alert('Please enter a valid Google Drive URL');
      return;
    }

    const folderId = extractFolderId(addClientForm.folderUrl);
    if (!folderId) {
      alert('Could not extract folder ID from the URL. Please check the URL format.');
      return;
    }

    if (clients.some(client => client.clientCode === addClientForm.clientCode)) {
      alert('A client with this code already exists. Please use a different client code.');
      return;
    }

    setAddClientLoading(true);
    try {
      const response = await fetch(`/api/clients?userId=${user?.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientCode: addClientForm.clientCode,
          clientName: addClientForm.clientName,
          fullName: addClientForm.fullName,
          folderId: folderId,
          acosGoal: addClientForm.acosGoal,
          tacosGoal: addClientForm.tacosGoal
        }),
      });

      if (response.ok) {
        await fetchClients();
        setShowAddClient(false);
        setAddClientForm({
          clientCode: '',
          clientName: '',
          fullName: '',
          folderUrl: '',
          acosGoal: '',
          tacosGoal: ''
        });
        
        auditHelpers.clientCreated(addClientForm.clientCode, addClientForm.fullName, folderId);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to add client');
      }
    } catch (error) {
      alert('Failed to add client');
    } finally {
      setAddClientLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <EnhancedNavigation user={user} currentPage="dashboard" />

      <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="mb-6 lg:mb-0">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Client Dashboard</h1>
                <p className="text-gray-600 text-lg">Manage and monitor your client portfolio</p>
              </div>
              
              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:ml-8">
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-lg">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-600">Total Clients</p>
                      <p className="text-2xl font-bold text-gray-900">{filteredClients.length}</p>
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
                      <p className="text-2xl font-bold text-gray-900">{filteredClients.filter(c => c.active).length}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-lg">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-600">Performance</p>
                      <p className="text-2xl font-bold text-gray-900">98%</p>
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
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">Client Portfolio</h2>
                    <p className="text-gray-600">Manage your client relationships and performance</p>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={handleAddClient}
                      className="ml-4 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform transition-all duration-200 hover:scale-105 shadow-lg flex items-center"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add Client
                    </button>
                  )}
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
                    placeholder="Search clients..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-12 pr-12 py-3 border-0 bg-gray-50 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200"
                  />
                </div>
              </div>
              
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex">
                    <svg className="w-5 h-5 text-red-400 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <p className="text-red-800 font-medium">{error}</p>
                  </div>
                </div>
              )}

              {loading || permissionsLoading ? (
                <div className="flex justify-center items-center py-16">
                  <div className="relative">
                    <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <div className="mt-4 text-center">
                      <p className="text-gray-600 font-medium">Loading clients...</p>
                    </div>
                  </div>
                </div>
              ) : filteredClients.length === 0 ? (
                <div className="text-center py-16">
                  <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No client access</h3>
                  <p className="text-gray-600 max-w-md mx-auto">
                    You don&apos;t have access to any clients. Contact an administrator to request access.
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr className="bg-gray-50/50">
                          <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Client
                          </th>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Details
                          </th>
                          <th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            ACOS Goal
                          </th>
                          <th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            TACOS Goal
                          </th>
                          <th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Status
                          </th>
                          <th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredClients.map((client, index) => (
                          <tr 
                            key={index} 
                            className="hover:bg-gray-50/80 cursor-pointer transition-colors duration-200 group"
                            onClick={() => handleRowClick(client.clientCode)}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                                  <span className="text-sm font-bold text-white">
                                    {client.clientCode.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-semibold text-gray-900">{client.clientCode}</div>
                                  <div className="text-sm text-gray-500">{client.clientName}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 font-medium">{client.fullName}</div>
                              <div className="text-sm text-gray-500">ID: {client.folderId}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="text-sm font-semibold text-gray-900">{client.acosGoal || '-'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="text-sm font-semibold text-gray-900">{client.tacosGoal || '-'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                                client.active 
                                  ? 'bg-green-100 text-green-800 ring-1 ring-green-200' 
                                  : 'bg-red-100 text-red-800 ring-1 ring-red-200'
                              }`}>
                                {client.active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="relative inline-block text-left">
                                <button
                                  type="button"
                                  className="text-gray-400 hover:text-gray-600 focus:outline-none p-2 rounded-lg hover:bg-gray-100 transition-all duration-200 group-hover:bg-gray-50"
                                  onClick={(e) => handleMenuToggle(e, client.clientCode)}
                                  aria-expanded={openMenu === client.clientCode}
                                  aria-haspopup="true"
                                >
                                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                  </svg>
                                </button>
                                
                                {openMenu === client.clientCode && (
                                  <div className={`absolute right-0 w-48 bg-white rounded-xl shadow-xl z-50 border border-gray-200 ${
                                    index > filteredClients.length - 3 ? 'bottom-full mb-2' : 'top-full mt-2'
                                  }`}
                                  onClick={(e) => e.stopPropagation()}>
                                    <div className="py-1">
                                      <Link
                                        href={`/client/${client.clientCode}`}
                                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200"
                                      >
                                        <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                        View Details
                                      </Link>
                                      
                                      {canWriteClient(client.clientCode) && (
                                        <button
                                          onClick={() => toggleClientStatus(client.clientCode, client.active)}
                                          disabled={updatingClient === client.clientCode}
                                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200 disabled:opacity-50"
                                        >
                                          <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                          </svg>
                                          {updatingClient === client.clientCode ? 'Updating...' : (client.active ? 'Deactivate' : 'Activate')}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Add New Client Modal */}
      {showAddClient && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-8 border-0 w-full max-w-md shadow-2xl rounded-2xl bg-white">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-gray-900">Add New Client</h3>
                <button
                  onClick={handleCancelAddClient}
                  className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-gray-600">Create a new client to manage their data and performance</p>
            </div>
            
            <form className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Client Code *
                </label>
                <input
                  type="text"
                  value={addClientForm.clientCode}
                  onChange={(e) => handleAddClientFormChange('clientCode', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="e.g., CAM"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Client Name *
                </label>
                <input
                  type="text"
                  value={addClientForm.clientName}
                  onChange={(e) => handleAddClientFormChange('clientName', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="e.g., Cambria"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={addClientForm.fullName}
                  onChange={(e) => handleAddClientFormChange('fullName', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="e.g., Cambria AI Project"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Google Drive Folder URL *
                </label>
                <input
                  type="url"
                  value={addClientForm.folderUrl}
                  onChange={(e) => handleAddClientFormChange('folderUrl', e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  required
                />
                <p className="text-xs text-gray-500 mt-2">
                  Enter the full Google Drive folder URL. The folder ID will be extracted automatically.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    ACOS Goal
                  </label>
                  <input
                    type="text"
                    value={addClientForm.acosGoal}
                    onChange={(e) => handleAddClientFormChange('acosGoal', e.target.value)}
                    placeholder="e.g., 15%"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    TACOS Goal
                  </label>
                  <input
                    type="text"
                    value={addClientForm.tacosGoal}
                    onChange={(e) => handleAddClientFormChange('tacosGoal', e.target.value)}
                    placeholder="e.g., 25%"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
              </div>
              
              <div className="flex space-x-4 pt-6">
                <button
                  type="button"
                  onClick={handleSaveAddClient}
                  disabled={addClientLoading}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  {addClientLoading ? (
                    <span className="flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Adding...
                    </span>
                  ) : (
                    'Add Client'
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleCancelAddClient}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Click outside to close dropdowns */}
      {openMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={handleMenuClose}
        />
      )}
    </div>
  );
}
