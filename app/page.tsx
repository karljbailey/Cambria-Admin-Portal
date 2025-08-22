'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auditHelpers } from '../lib/audit';
import { handleLogout } from '../lib/auth-utils';
import EnhancedNavigation from '../components/EnhancedNavigation';
import { useClientPermissions } from '../lib/hooks/useClientPermissions';
import PermissionDebugger from '../components/PermissionDebugger';

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

  // Client permissions hook - simplified since filtering is now at API level
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
      
      // Only fetch clients if user is authenticated
      if (!user?.id) {
        console.log('❌ No user ID available, cannot fetch clients');
        setError('Authentication required');
        return;
      }
      
      // Pass user ID to get filtered clients from API
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

  // Refetch clients when permissions are loaded
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
        // Don't fetch clients here - will be fetched when permissions are loaded
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

  // const handleLogoutClick = () => { /* unused */ };

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
    // Check if user has write permission for this client
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
        // Update local state
        setClients(prevClients =>
          prevClients.map(client =>
            client.clientCode === clientCode
              ? { ...client, active: !currentStatus }
              : client
          )
        );
        
        // Add audit log
        const client = clients.find(c => c.clientCode === clientCode);
        if (client) {
          auditHelpers.clientStatusToggled(clientCode, client.fullName, !currentStatus);
        }
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update client status');
      }
    } catch (err) {
      setError('Failed to update client status');
    } finally {
      setUpdatingClient(null);
    }
  };

  const getFolderUrl = (folderId: string) => {
    return `https://drive.google.com/drive/folders/${folderId}`;
  };

  const handleMenuToggle = (e: React.MouseEvent, clientCode: string) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenMenu(openMenu === clientCode ? null : clientCode);
  };

  const handleMenuClose = () => {
    setOpenMenu(null);
  };

  const handleMenuAction = (action: () => void) => {
    action();
    handleMenuClose();
  };

  const handleRowClick = (clientCode: string) => {
    router.push(`/client/${clientCode}`);
  };

  // Extract folder ID from Google Drive URL
  const extractFolderId = (url: string): string | null => {
    const patterns = [
      /\/folders\/([a-zA-Z0-9_-]+)/,
      /id=([a-zA-Z0-9_-]+)/,
      /\/d\/([a-zA-Z0-9_-]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  };

  // Validate Google Drive URL
  const isValidGoogleDriveUrl = (url: string): boolean => {
    return url.includes('drive.google.com') || url.includes('docs.google.com');
  };

  // Add new client
  const handleAddClient = () => {
    // Check if user has admin access or can create clients
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

  // Cancel adding client
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

  // Save new client
  const handleSaveAddClient = async () => {
    // Validate required fields
    if (!addClientForm.clientCode || !addClientForm.clientName || !addClientForm.fullName || !addClientForm.folderUrl) {
      alert('Please fill in all required fields');
      return;
    }

    // Validate folder URL
    if (!isValidGoogleDriveUrl(addClientForm.folderUrl)) {
      alert('Please enter a valid Google Drive URL');
      return;
    }

    const folderId = extractFolderId(addClientForm.folderUrl);
    if (!folderId) {
      alert('Could not extract folder ID from the URL. Please check the URL format.');
      return;
    }

    // Check if client code already exists
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
        // Refresh client list
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
        
        // Add audit log
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

  // Handle form changes
  const handleAddClientFormChange = (field: string, value: string) => {
    setAddClientForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Checking authentication...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Navigation */}
      <EnhancedNavigation user={user} currentPage="dashboard" />
      
      {/* Permission Debugger (development only) */}
      {/* <PermissionDebugger userId={user?.id} /> */}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
                <div className="flex items-center justify-between mb-4 sm:mb-0">
                  <h2 className="text-lg font-medium text-gray-900">Client List</h2>
                  {isAdmin && (
                    <button
                      onClick={handleAddClient}
                      className="ml-4 px-3 py-1.5 text-sm border border-gray-300 text-gray-700 bg-white rounded-md hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500 flex items-center"
                    >
                      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add Client
                    </button>
                  )}
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
                    placeholder="Search clients..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <div className="relative group">
                      <svg className="h-5 w-5 text-gray-400 hover:text-gray-600 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                      </svg>
                      <div className="absolute bottom-full right-0 mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50">
                        Search by: Client Name, Client Code, Full Name, or Folder ID
                        <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-800">{error}</p>
                </div>
              )}

              {loading || permissionsLoading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : filteredClients.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No client access</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    You don&apos;t have access to any clients. Contact an administrator to request access.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="inline-block min-w-full align-middle">
                    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                      <table className="min-w-full divide-y divide-gray-300">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                              Client Code
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                              Client Name
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                              Full Name
                            </th>
                            <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                              ACOS Goal
                            </th>
                            <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                              TACOS Goal
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                              Status
                            </th>
                            <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredClients.map((client, index) => (
                            <tr 
                              key={index} 
                              className="hover:bg-gray-50 cursor-pointer"
                              onClick={() => handleRowClick(client.clientCode)}
                            >
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {client.clientCode}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {client.clientName}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {client.fullName}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                                {client.acosGoal || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                                {client.tacosGoal || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  client.active 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {client.active ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                                <div className="relative inline-block text-left">
                                  <button
                                    type="button"
                                    className="text-gray-400 hover:text-gray-600 focus:outline-none p-1 rounded-full hover:bg-gray-100 transition-colors"
                                    onClick={(e) => handleMenuToggle(e, client.clientCode)}
                                    aria-expanded={openMenu === client.clientCode}
                                    aria-haspopup="true"
                                  >
                                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                    </svg>
                                  </button>
                                  
                                  {/* Dropdown Menu */}
                                  {openMenu === client.clientCode && (
                                    <div className={`absolute right-0 w-48 bg-white rounded-md shadow-lg z-50 border border-gray-200 ${
                                      index > filteredClients.length - 3 ? 'bottom-full mb-2' : 'top-full mt-2'
                                    }`}
                                    onClick={(e) => e.stopPropagation()}>
                                      <div className="py-1">
                                        <Link
                                          href={`/client/${client.clientCode}`}
                                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                          onClick={handleMenuClose}
                                        >
                                          View More
                                        </Link>
                                        {canWriteClient(client.clientCode) && (
                                          <button
                                            onClick={() => handleMenuAction(() => toggleClientStatus(client.clientCode, client.active))}
                                            disabled={updatingClient === client.clientCode}
                                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                                          >
                                            {updatingClient === client.clientCode ? (
                                              <span className="flex items-center">
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                                                Updating...
                                              </span>
                                            ) : (
                                              `${client.active ? 'Set as Inactive' : 'Set as Active'}`
                                            )}
                                          </button>
                                        )}
                                        <button
                                          onClick={() => handleMenuAction(() => {
                                            const url = getFolderUrl(client.folderId);
                                            window.open(url, '_blank');
                                          })}
                                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        >
                                          View Folder
                                        </button>
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
                  
                  {filteredClients.length === 0 && !error && (
                    <div className="text-center py-8">
                      <p className="text-gray-500">
                        {searchTerm ? 'No clients found matching your search.' : 'No clients found'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Add New Client Modal */}
      {showAddClient && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Client</h3>
              
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client Code *
                  </label>
                  <input
                    type="text"
                    value={addClientForm.clientCode}
                    onChange={(e) => handleAddClientFormChange('clientCode', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., CAM"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client Name *
                  </label>
                  <input
                    type="text"
                    value={addClientForm.clientName}
                    onChange={(e) => handleAddClientFormChange('clientName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Cambria"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={addClientForm.fullName}
                    onChange={(e) => handleAddClientFormChange('fullName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Cambria AI Project"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Google Drive Folder URL *
                  </label>
                  <input
                    type="url"
                    value={addClientForm.folderUrl}
                    onChange={(e) => handleAddClientFormChange('folderUrl', e.target.value)}
                    placeholder="https://drive.google.com/drive/folders/..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter the full Google Drive folder URL. The folder ID will be extracted automatically.
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ACOS Goal
                    </label>
                    <input
                      type="text"
                      value={addClientForm.acosGoal}
                      onChange={(e) => handleAddClientFormChange('acosGoal', e.target.value)}
                      placeholder="e.g., 15%"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      TACOS Goal
                    </label>
                    <input
                      type="text"
                      value={addClientForm.tacosGoal}
                      onChange={(e) => handleAddClientFormChange('tacosGoal', e.target.value)}
                      placeholder="e.g., 25%"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={handleSaveAddClient}
                    disabled={addClientLoading}
                    className="flex-1 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {addClientLoading ? 'Adding...' : 'Add Client'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelAddClient}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
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
