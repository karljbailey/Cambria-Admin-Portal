'use client';

import { useState, useEffect, useCallback } from 'react';
// import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auditHelpers } from '@/lib/audit';
// import { handleLogout } from '@/lib/auth-utils';
import EnhancedNavigation from '@/components/EnhancedNavigation';

interface AuditLog {
  id: number;
  timestamp: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: string;
  resource: string;
  resourceId: string;
  resourceName: string;
  details: string;
  ipAddress: string;
  userAgent: string;
}

interface AuditResponse {
  logs: AuditLog[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  filters: {
    actions: string[];
    users: { id: string; name: string; email: string }[];
    resources: string[];
  };
}

export default function AuditPage() {
  const router = useRouter();
  const [auditData, setAuditData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action: '',
    userId: '',
    resource: '',
    startDate: '',
    endDate: '',
    search: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [user, setUser] = useState<{ id: string; email: string; name?: string; role?: string } | null>(null);

  const fetchAuditLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(filters.action && { action: filters.action }),
        ...(filters.userId && { userId: filters.userId }),
        ...(filters.resource && { resource: filters.resource }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate })
      });

      const response = await fetch(`/api/audit?${params}`);
      const data = await response.json();
      setAuditData(data);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters]);

  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/session');
      const data = await response.json();
      
      if (data.authenticated) {
        setUser(data.user);
        fetchAuditLogs();
      } else {
        router.push('/login');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      router.push('/login');
    }
  }, [router, fetchAuditLogs]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (currentPage || filters) {
      fetchAuditLogs();
    }
  }, [currentPage, filters, fetchAuditLogs]);

  // Add audit log when audit page is viewed
  useEffect(() => {
    const filterString = Object.entries(filters)
      .filter(([, value]) => value)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
    
    auditHelpers.auditLogViewed(filterString || 'no filters');
  }, [filters]);

  const getActionColor = (action: string) => {
    const colors: { [key: string]: string } = {
      'CREATE_CLIENT': 'bg-green-100 text-green-800',
      'UPDATE_CLIENT': 'bg-blue-100 text-blue-800',
      'DELETE_CLIENT': 'bg-red-100 text-red-800',
      'TOGGLE_CLIENT_STATUS': 'bg-yellow-100 text-yellow-800',
      'VIEW_CLIENT': 'bg-gray-100 text-gray-800',
      'UPLOAD_FILE': 'bg-purple-100 text-purple-800',
      'DELETE_FILE': 'bg-red-100 text-red-800',
      'CREATE_FOLDER': 'bg-green-100 text-green-800',
      'UPDATE_PERMISSIONS': 'bg-orange-100 text-orange-800',
      'VIEW_AUDIT_LOG': 'bg-indigo-100 text-indigo-800',
      'LOGIN': 'bg-teal-100 text-teal-800'
    };
    return colors[action] || 'bg-gray-100 text-gray-800';
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const filteredLogs = auditData?.logs.filter(log => {
    if (!filters.search) return true;
    const searchLower = filters.search.toLowerCase();
    return (
      log.userName.toLowerCase().includes(searchLower) ||
      log.action.toLowerCase().includes(searchLower) ||
      log.resourceName.toLowerCase().includes(searchLower) ||
      log.details.toLowerCase().includes(searchLower)
    );
  }) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Navigation */}
      <EnhancedNavigation user={user} currentPage="audit" />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Filters */}
          <div className="bg-white shadow rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Filters</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Search */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                  <input
                    type="text"
                    placeholder="Search activities..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Action Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
                  <select
                    value={filters.action}
                    onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Actions</option>
                    {auditData?.filters.actions.map((action) => (
                      <option key={action} value={action}>
                        {action.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                {/* User Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
                  <select
                    value={filters.userId}
                    onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Users</option>
                    {auditData?.filters.users.map((user, index) => (
                      <option key={`${user.id}-${user.email}-${index}`} value={user.name}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Resource Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Resource</label>
                  <select
                    value={filters.resource}
                    onChange={(e) => setFilters({ ...filters, resource: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Resources</option>
                    {auditData?.filters.resources.map((resource) => (
                      <option key={resource} value={resource}>
                        {resource}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Clear Filters */}
              <div className="mt-4">
                <button
                  onClick={() => setFilters({
                    action: '',
                    userId: '',
                    resource: '',
                    startDate: '',
                    endDate: '',
                    search: ''
                  })}
                  className="text-sm text-gray-600 hover:text-gray-900 underline"
                >
                  Clear all filters
                </button>
              </div>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
                <div className="flex items-center justify-between mb-4 sm:mb-0">
                  <h3 className="text-lg font-medium text-gray-900">
                    Activity Log ({auditData?.pagination.total || 0} total entries)
                  </h3>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading audit logs...</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr>
                          <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-3">
                            Timestamp
                          </th>
                          <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-3">
                            User
                          </th>
                          <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-3">
                            Action
                          </th>
                          <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-3">
                            Resource
                          </th>
                          <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-3">
                            Details
                          </th>
                          <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-3">
                            IP Address
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {filteredLogs.map((log, index) => (
                          <tr key={log.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatTimestamp(log.timestamp)}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{log.userName}</div>
                                <div className="text-sm text-gray-500">{log.userEmail}</div>
                              </div>
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionColor(log.action)}`}>
                                {log.action.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{log.resourceName}</div>
                                <div className="text-sm text-gray-500">{log.resource}</div>
                              </div>
                            </td>
                            <td className="px-3 py-4 text-sm text-gray-900 max-w-xs truncate">
                              {log.details}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                              {log.ipAddress}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {auditData && auditData.pagination.totalPages > 1 && (
                    <div className="bg-white px-4 py-3 flex items-center justify-between sm:px-6 mt-6">
                      <div className="flex-1 flex justify-between sm:hidden">
                        <button
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setCurrentPage(Math.min(auditData.pagination.totalPages, currentPage + 1))}
                          disabled={currentPage === auditData.pagination.totalPages}
                          className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm text-gray-700">
                            Showing{' '}
                            <span className="font-medium">{(currentPage - 1) * auditData.pagination.limit + 1}</span>
                            {' '}to{' '}
                            <span className="font-medium">
                              {Math.min(currentPage * auditData.pagination.limit, auditData.pagination.total)}
                            </span>
                            {' '}of{' '}
                            <span className="font-medium">{auditData.pagination.total}</span>
                            {' '}results
                          </p>
                        </div>
                        <div>
                          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                            <button
                              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                              disabled={currentPage === 1}
                              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                            >
                              Previous
                            </button>
                            {Array.from({ length: Math.min(5, auditData.pagination.totalPages) }, (_, i) => {
                              const page = Math.max(1, Math.min(auditData.pagination.totalPages - 4, currentPage - 2)) + i;
                              return (
                                <button
                                  key={page}
                                  onClick={() => setCurrentPage(page)}
                                  className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                    page === currentPage
                                      ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                      : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                  }`}
                                >
                                  {page}
                                </button>
                              );
                            })}
                            <button
                              onClick={() => setCurrentPage(Math.min(auditData.pagination.totalPages, currentPage + 1))}
                              disabled={currentPage === auditData.pagination.totalPages}
                              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                            >
                              Next
                            </button>
                          </nav>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
