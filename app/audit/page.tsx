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
        
        // Check if user is admin
        if (data.user.role !== 'admin') {
          alert('Access denied. Admin privileges required.');
          router.push('/');
          return;
        }
        
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <EnhancedNavigation user={user} currentPage="audit" />

      <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="mb-6 lg:mb-0">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Audit Log</h1>
                <p className="text-gray-600 text-lg">Monitor system activities and user actions</p>
              </div>
              
              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:ml-8">
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-lg">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-600">Total Entries</p>
                      <p className="text-2xl font-bold text-gray-900">{auditData?.pagination.total || 0}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-lg">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-600">Today's Activity</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {auditData?.logs.filter(log => {
                          const today = new Date().toDateString();
                          return new Date(log.timestamp).toDateString() === today;
                        }).length || 0}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-lg">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-600">Active Users</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {auditData?.filters.users.length || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden mb-6">
            <div className="p-6 lg:p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">Filters</h2>
                  <p className="text-gray-600">Refine audit log results</p>
                </div>
              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Search */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Search</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        placeholder="Search activities..."
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      />
                    </div>
                  </div>

                  {/* Action Filter */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Action</label>
                    <select
                      value={filters.action}
                      onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
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
                    <label className="block text-sm font-semibold text-gray-700 mb-2">User</label>
                    <select
                      value={filters.userId}
                      onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
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
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Resource</label>
                    <select
                      value={filters.resource}
                      onChange={(e) => setFilters({ ...filters, resource: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">End Date</label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
              </div>

              {/* Clear Filters */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setFilters({
                    action: '',
                    userId: '',
                    resource: '',
                    startDate: '',
                    endDate: '',
                    search: ''
                  })}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Clear all filters
                </button>
              </div>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
            <div className="p-6 lg:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
                <div className="flex items-center justify-between mb-4 sm:mb-0">
                  <h3 className="text-2xl font-bold text-gray-900">
                    Activity Log
                  </h3>
                  <div className="text-sm text-gray-600">
                    {auditData?.pagination.total || 0} total entries
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600 font-medium">Loading audit logs...</p>
                </div>
              ) : (
                <>
                  {filteredLogs.length === 0 ? (
                    <div className="text-center py-12">
                      <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No audit logs found</h3>
                      <p className="text-gray-600">Try adjusting your filters or check back later for new activity.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr className="bg-gray-50/50">
                          <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Timestamp
                          </th>
                          <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            User
                          </th>
                          <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Action
                          </th>
                          <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Resource
                          </th>
                          <th className="hidden lg:table-cell px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Details
                          </th>
                          <th className="hidden md:table-cell px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            IP Address
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredLogs.map((log, index) => (
                          <tr key={log.id} className="hover:bg-gray-50/80 transition-colors duration-200">
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 font-medium">
                                {new Date(log.timestamp).toLocaleDateString()}
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(log.timestamp).toLocaleTimeString()}
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-8 w-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                                  <span className="text-xs font-bold text-white">
                                    {log.userName.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div className="ml-3">
                                  <div className="text-sm font-semibold text-gray-900">{log.userName}</div>
                                  <div className="text-xs text-gray-500">{log.userEmail}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getActionColor(log.action)}`}>
                                {log.action.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-semibold text-gray-900">{log.resourceName}</div>
                                <div className="text-xs text-gray-500">{log.resource}</div>
                              </div>
                            </td>
                            <td className="hidden lg:table-cell px-4 py-4 text-sm text-gray-900 max-w-xs">
                              <div className="truncate" title={log.details}>
                                {log.details}
                              </div>
                            </td>
                            <td className="hidden md:table-cell px-4 py-4 whitespace-nowrap text-xs text-gray-500">
                              {log.ipAddress}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  )}
                  
                  {/* Pagination */}
                  {auditData && auditData.pagination.totalPages > 1 && (
                    <div className="bg-white/50 backdrop-blur-sm px-4 py-4 flex items-center justify-between sm:px-6 mt-6 rounded-xl border border-white/20">
                      <div className="flex-1 flex justify-between sm:hidden">
                        <button
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-all duration-200"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setCurrentPage(Math.min(auditData.pagination.totalPages, currentPage + 1))}
                          disabled={currentPage === auditData.pagination.totalPages}
                          className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-all duration-200"
                        >
                          Next
                        </button>
                      </div>
                                              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm text-gray-600">
                              Showing{' '}
                              <span className="font-semibold text-gray-900">{(currentPage - 1) * auditData.pagination.limit + 1}</span>
                              {' '}to{' '}
                              <span className="font-semibold text-gray-900">
                                {Math.min(currentPage * auditData.pagination.limit, auditData.pagination.total)}
                              </span>
                              {' '}of{' '}
                              <span className="font-semibold text-gray-900">{auditData.pagination.total}</span>
                              {' '}results
                            </p>
                          </div>
                        <div>
                          <nav className="relative z-0 inline-flex rounded-lg shadow-sm -space-x-px">
                            <button
                              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                              disabled={currentPage === 1}
                              className="relative inline-flex items-center px-3 py-2 rounded-l-lg border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-all duration-200"
                            >
                              Previous
                            </button>
                            {Array.from({ length: Math.min(5, auditData.pagination.totalPages) }, (_, i) => {
                              const page = Math.max(1, Math.min(auditData.pagination.totalPages - 4, currentPage - 2)) + i;
                              return (
                                <button
                                  key={page}
                                  onClick={() => setCurrentPage(page)}
                                  className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-all duration-200 ${
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
                              className="relative inline-flex items-center px-3 py-2 rounded-r-lg border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-all duration-200"
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
