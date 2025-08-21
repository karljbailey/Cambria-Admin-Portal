'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { auditHelpers } from '@/lib/audit';
// import { handleLogout } from '@/lib/auth-utils';
import EnhancedNavigation from '@/components/EnhancedNavigation';

interface Client {
  folderId: string;
  clientCode: string;
  clientName: string;
  fullName: string;
  acosGoal?: string;
  tacosGoal?: string;
  active: boolean;
}

interface FolderItem {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
}

interface MonthlyReport {
  month: string;
  profitLoss: {
    sales: number;
    costOfGoods: number;
    taxes: number;
    fbaFees: number;
    referralFees: number;
    storageFees: number;
    adExpenses: number;
    refunds: number;
    expenses: number;
    netProfit: number;
    margin: number;
    roi: number;
  };
  productPerformance: Array<{
    asin: string;
    title: string;
    salesThisMonth: number;
    salesChange: string;
    netProfitThisMonth: number;
    netProfitChange: string;
    marginThisMonth: number;
    marginChange: string;
    unitsThisMonth: number;
    unitsChange: string;
    refundRateThisMonth: number;
    refundRateChange: string;
    adSpendThisMonth: number;
    adSpendChange: string;
    acosThisMonth: number;
    acosChange: string;
    tacosThisMonth: number;
    tacosChange: string;
    ctrThisMonth: number;
    ctrChange: string;
    cvrThisMonth: number;
    cvrChange: string;
  }>;
  payouts: {
    latest: number;
    previous: number;
    average: number;
  };
  amazonPerformance: {
    salesThisMonth: number;
    salesChange: string;
    netProfitThisMonth: number;
    netProfitChange: string;
    marginThisMonth: number;
    marginChange: string;
    unitsThisMonth: number;
    unitsChange: string;
    refundRateThisMonth: number;
    refundRateChange: string;
    acosThisMonth: number;
    acosChange: string;
    tacosThisMonth: number;
    tacosChange: string;
    ctrThisMonth: number;
    ctrChange: string;
  };
}

export default function ClientPage() {
  const params = useParams();
  const router = useRouter();
  const clientCode = params.code as string;
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [folderData, setFolderData] = useState<FolderItem[]>([]);
  const [folderLoading, setFolderLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [monthlyReports, setMonthlyReports] = useState<MonthlyReport[]>([]);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  
  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    clientCode: '',
    clientName: '',
    fullName: '',
    folderUrl: '',
    acosGoal: '',
    tacosGoal: '',
    active: true
  });
  const [editLoading, setEditLoading] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  
  // Folder content state
  const [folderSearchTerm, setFolderSearchTerm] = useState('');
  const [filteredFolderData, setFilteredFolderData] = useState<FolderItem[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<FolderItem | null>(null);
  const [selectedFolderContents, setSelectedFolderContents] = useState<FolderItem[]>([]);
  const [selectedFolderLoading, setSelectedFolderLoading] = useState(false);
  
  // File upload state
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [user, setUser] = useState<{ id: string; email: string; name?: string; role?: string } | null>(null);

  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/session');
      const data = await response.json();
      
      if (data.authenticated) {
        setUser(data.user);
        // fetchClient will be called by useEffect after auth check
      } else {
        router.push('/login');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      router.push('/login');
    }
  }, [router]);



  useEffect(() => {
    if (process.env.NODE_ENV === 'test') {
      // Skip authentication in test environment
      setUser({ id: 'test-user', email: 'test@example.com', name: 'Test User', role: 'admin' });
    } else {
      checkAuth();
    }
  }, [checkAuth]);

  useEffect(() => {
    if (clientCode && user) {
      fetchClient();
    }
  }, [clientCode, user]);

  useEffect(() => {
    if (client?.folderId) {
      fetchFolderData();
    }
  }, [client?.folderId]);

  useEffect(() => {
    if (folderData.length > 0) {
      fetchMonthlyReports();
    }
  }, [folderData]);

  // Filter folder data based on search term
  useEffect(() => {
    if (folderSearchTerm.trim() === '') {
      setFilteredFolderData(folderData);
    } else {
      const filtered = folderData.filter(item =>
        item.name.toLowerCase().includes(folderSearchTerm.toLowerCase())
      );
      setFilteredFolderData(filtered);
    }
  }, [folderSearchTerm, folderData]);

  // Auto-select latest month when reports are loaded
  useEffect(() => {
    if (monthlyReports.length > 0 && !selectedMonth) {
      setSelectedMonth(monthlyReports[0].month);
    } else if (availableMonths.length > 0 && !selectedMonth) {
      setSelectedMonth(availableMonths[0]);
    }
  }, [monthlyReports, availableMonths, selectedMonth]);

  const fetchClient = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/clients');
      const data = await response.json();
      
      if (response.ok) {
        const foundClient = data.clients.find((c: Client) => c.clientCode === clientCode);
        if (foundClient) {
          setClient(foundClient);
          // Add audit log for viewing client
          auditHelpers.clientViewed(clientCode, foundClient.fullName);
        } else {
          setError('Client not found');
        }
      } else {
        setError(data.error || 'Failed to fetch client');
      }
    } catch (err) {
      setError('Failed to fetch client');
    } finally {
      setLoading(false);
    }
  }, [clientCode]);

  const fetchFolderData = async () => {
    if (!client?.folderId) return;
    
    try {
      setFolderLoading(true);
      const response = await fetch(`/api/folder/${client.folderId}`);
      const data = await response.json();
      
      if (response.ok) {
        setFolderData(data.items || []);
      } else {
        console.error('Failed to fetch folder data:', data.error);
        setFolderData([]);
      }
    } catch (err) {
      console.error('Error fetching folder data:', err);
      setFolderData([]);
    } finally {
      setFolderLoading(false);
    }
  };

  const fetchMonthlyReports = async () => {
    try {
      setReportLoading(true);
      
      const monthlyFolders = folderData.filter(item => 
        item.mimeType === 'application/vnd.google-apps.folder' &&
        /^\d{4}-\d{2}$/.test(item.name)
      );



      // Sort folders by date (newest first)
      monthlyFolders.sort((a, b) => b.name.localeCompare(a.name));
      
      // Set all available months for the picker
      setAvailableMonths(monthlyFolders.map(f => f.name));

      const reports: MonthlyReport[] = [];
      
      for (const folder of monthlyFolders) {
        const response = await fetch(`/api/folder/${folder.id}`);
        const data = await response.json();
        
        if (response.ok && data.items) {
          
          const monthlyReportFile = data.items.find((file: any) => 
            file.name.toLowerCase().includes('monthly-report')
          );
          
          if (monthlyReportFile) {
            const reportData = await fetch(`/api/file/${monthlyReportFile.id}`);
            const reportContent = await reportData.json();
            
            if (reportData.ok) {
              const reportWithMonth = {
                month: folder.name,
                ...reportContent
              };
              reports.push(reportWithMonth);
            } else {
              console.error(`Failed to fetch report data for ${folder.name}:`, reportContent);
              
              // Handle Excel file error specifically
              if (reportContent.error && reportContent.error.includes('Excel files')) {
                console.warn(`Excel file detected in ${folder.name}: ${reportContent.fileName}`);
              }
            }
          }
        }
      }
      setMonthlyReports(reports);
      if (reports.length > 0) {
        setSelectedMonth(reports[0].month); // Select the first (latest) month
      } else if (availableMonths.length > 0) {
        // If no reports found but we have folders, select the latest folder
        setSelectedMonth(availableMonths[0]);
      }
    } catch (err) {
      console.error('Error fetching monthly reports:', err);
    } finally {
      setReportLoading(false);
    }
  };

  const getFolderUrl = (folderId: string) => {
    return `https://drive.google.com/drive/folders/${folderId}`;
  };

  const formatMonthSlug = (name: string) => {
    // Check if the name matches a month pattern (YYYY-MM)
    const monthPattern = /^\d{4}-\d{2}$/;
    if (monthPattern.test(name)) {
      const [year, month] = name.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long' 
      });
    }
    return name;
  };

  const getSelectedReport = () => {
    return monthlyReports.find(report => report.month === selectedMonth);
  };

  const formatCurrency = (value: number | string) => {
    if (typeof value === 'string') {
      return value === 'N/A' ? 'N/A' : new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(parseFloat(value));
    }
    if (typeof value === 'number' && !isNaN(value)) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(value);
    }
    return 'N/A';
  };

  const formatPercentage = (value: number | string) => {
    if (typeof value === 'string') {
      return value === 'N/A' ? 'N/A' : `${parseFloat(value).toFixed(2)}%`;
    }
    if (typeof value === 'number' && !isNaN(value)) {
      return `${value.toFixed(2)}%`;
    }
    return 'N/A';
  };

  // Helper function to check if a value is numeric
  const isNumeric = (value: number | string): boolean => {
    if (typeof value === 'number') {
      return !isNaN(value);
    }
    if (typeof value === 'string') {
      if (value === 'N/A' || value === '') return false;
      const num = parseFloat(value);
      return !isNaN(num);
    }
    return false;
  };

  // Helper function to get numeric value for comparison
  const getNumericValue = (value: number | string): number => {
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      if (value === 'N/A' || value === '') return 0;
      const num = parseFloat(value);
      return isNaN(num) ? 0 : num;
    }
    return 0;
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

  // Start editing
  const handleEdit = () => {
    if (!client) return;
    
    setEditForm({
      clientCode: client.clientCode,
      clientName: client.clientName,
      fullName: client.fullName,
      folderUrl: `https://drive.google.com/drive/folders/${client.folderId}`,
      acosGoal: client.acosGoal || '',
      tacosGoal: client.tacosGoal || '',
      active: client.active
    });
    setIsEditing(true);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setIsEditing(false);
    setShowWarning(false);
    setEditForm({
      clientCode: '',
      clientName: '',
      fullName: '',
      folderUrl: '',
      acosGoal: '',
      tacosGoal: '',
      active: true
    });
  };

  // Save changes
  const handleSaveEdit = async () => {
    if (!client) return;

    // Validate folder URL
    if (!isValidGoogleDriveUrl(editForm.folderUrl)) {
      alert('Please enter a valid Google Drive URL');
      return;
    }

    const folderId = extractFolderId(editForm.folderUrl);
    if (!folderId) {
      alert('Could not extract folder ID from the URL. Please check the URL format.');
      return;
    }

    setEditLoading(true);
    try {
      const response = await fetch('/api/clients', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalCode: client.clientCode,
          clientCode: editForm.clientCode,
          clientName: editForm.clientName,
          fullName: editForm.fullName,
          folderId: folderId,
          acosGoal: editForm.acosGoal,
          tacosGoal: editForm.tacosGoal,
          active: editForm.active
        }),
      });

      if (response.ok) {
        // Refresh client data
        await fetchClient();
        setIsEditing(false);
        setShowWarning(false);
        setEditForm({
          clientCode: '',
          clientName: '',
          fullName: '',
          folderUrl: '',
          acosGoal: '',
          tacosGoal: '',
          active: true
        });
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update client');
      }
    } catch (error) {
      alert('Failed to update client');
    } finally {
      setEditLoading(false);
    }
  };

  // Handle form changes
  const handleFormChange = (field: string, value: string | boolean) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Fetch folder contents when a folder is clicked
  const handleFolderClick = async (folder: FolderItem) => {
    if (folder.mimeType !== 'application/vnd.google-apps.folder') return;
    
    setSelectedFolder(folder);
    setSelectedFolderLoading(true);
    
    try {
      const response = await fetch(`/api/folder/${folder.id}`);
      const data = await response.json();
      
      if (response.ok) {
        setSelectedFolderContents(data.items || []);
      } else {
        console.error('Failed to fetch folder contents:', data.error);
        setSelectedFolderContents([]);
      }
    } catch (err) {
      console.error('Error fetching folder contents:', err);
      setSelectedFolderContents([]);
    } finally {
      setSelectedFolderLoading(false);
    }
  };

  // Close folder view
  const handleCloseFolder = () => {
    setSelectedFolder(null);
    setSelectedFolderContents([]);
  };

  // Handle drag and drop for folder items
  const handleDragStart = (e: React.DragEvent, item: FolderItem) => {
    e.dataTransfer.setData('text/plain', JSON.stringify(item));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const itemData = e.dataTransfer.getData('text/plain');
    if (itemData) {
      try {
        const item = JSON.parse(itemData);
        console.log('Dropped item:', item);
        // You can add custom logic here for handling dropped items
      } catch (error) {
        console.error('Error parsing dropped item:', error);
      }
    }
  };

  // Handle file upload drag and drop
  const handleFileDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleFileDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await uploadFiles(files);
    }
  };

  // Handle file input change
  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      await uploadFiles(files);
    }
    // Reset the input
    e.target.value = '';
  };

  // Upload files to Google Drive
  const uploadFiles = async (files: File[]) => {
    // Use selected folder ID if we're viewing month folder contents, otherwise use main client folder
    const targetFolderId = selectedFolder && /^\d{4}-\d{2}$/.test(selectedFolder.name) 
      ? selectedFolder.id 
      : client?.folderId;
    
    if (!targetFolderId) {
      alert('No folder ID available for upload');
      return;
    }

    const fileNames = files.map(file => file.name);
    setUploadingFiles(prev => [...prev, ...fileNames]);
    
    for (const file of files) {
      try {
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folderId', targetFolderId);
        
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
          // Refresh folder data after successful upload
          setTimeout(() => {
            if (selectedFolder && /^\d{4}-\d{2}$/.test(selectedFolder.name)) {
              // Refresh selected folder contents
              handleFolderClick(selectedFolder);
            } else {
              // Refresh main folder data
              fetchFolderData();
            }
          }, 1000);
        } else {
          const error = await response.json();
          alert(`Failed to upload ${file.name}: ${error.error}`);
        }
      } catch (error) {
        console.error('Upload error:', error);
        alert(`Failed to upload ${file.name}`);
      } finally {
        setUploadingFiles(prev => prev.filter(name => name !== file.name));
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[file.name];
          return newProgress;
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div data-testid="loading-spinner" className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const selectedReport = getSelectedReport();

  if (error || !client) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="text-center">
                <h2 data-testid="error-title" className="text-xl font-semibold text-gray-900 mb-4">Client Not Found</h2>
                <p data-testid="error-message" className="text-gray-600 mb-4">{error || 'The requested client could not be found.'}</p>
                <Link
                  href="/"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Back to Dashboard
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
      {/* Enhanced Navigation */}
      <EnhancedNavigation user={user} currentPage="dashboard" />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              {/* Breadcrumbs */}
              <nav className="flex mb-6" aria-label="Breadcrumb">
                <ol className="inline-flex items-center space-x-1 md:space-x-3">
                  <li className="inline-flex items-center">
                    <Link
                      href="/"
                      className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600"
                    >
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                      </svg>
                      Dashboard
                    </Link>
                  </li>
                  <li>
                    <div className="flex items-center">
                      <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2">
                        {client.fullName}
                      </span>
                    </div>
                  </li>
                </ol>
              </nav>

              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">{client.fullName}</h2>
                <div className="flex items-center space-x-3">
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                    client.active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {client.active ? 'Active' : 'Inactive'}
                  </span>
                  <button
                    onClick={handleEdit}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Client Information</h3>
                    <dl className="space-y-3">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Client Code</dt>
                        <dd className="text-sm text-gray-900 font-mono">{client.clientCode}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Client Name</dt>
                        <dd data-testid="client-name" className="text-sm text-gray-900">{client.clientName}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Full Name</dt>
                        <dd className="text-sm text-gray-900">{client.fullName}</dd>
                      </div>
                    </dl>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Technical Details</h3>
                    <dl className="space-y-3">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Folder ID</dt>
                        <dd className="text-sm text-gray-900 font-mono break-all">{client.folderId}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Google Drive Folder</dt>
                        <dd className="text-sm text-gray-900">
                          <a
                            href={getFolderUrl(client.folderId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-900 underline"
                          >
                            View Folder in Google Drive
                          </a>
                          <span className="text-xs text-gray-500 ml-2">(May require permissions)</span>
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>

              {/* Edit Form Modal */}
              {isEditing && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                  <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                    <div className="mt-3">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Client Information</h3>
                      
                      {showWarning ? (
                        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                          <div className="flex">
                            <div className="flex-shrink-0">
                              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="ml-3">
                              <h3 className="text-sm font-medium text-yellow-800">Warning</h3>
                              <div className="mt-2 text-sm text-yellow-700">
                                <p>You are about to modify client data. This will update the Google Sheet and may affect other users. Are you sure you want to proceed?</p>
                              </div>
                            </div>
                          </div>
                          <div className="mt-4 flex space-x-3">
                            <button
                              onClick={handleSaveEdit}
                              disabled={editLoading}
                              className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50"
                            >
                              {editLoading ? 'Saving...' : 'Yes, Save Changes'}
                            </button>
                            <button
                              onClick={() => setShowWarning(false)}
                              className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-400"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <form className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Client Code
                            </label>
                            <input
                              type="text"
                              value={editForm.clientCode}
                              onChange={(e) => handleFormChange('clientCode', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                              required
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Client Name
                            </label>
                            <input
                              type="text"
                              value={editForm.clientName}
                              onChange={(e) => handleFormChange('clientName', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                              required
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Full Name
                            </label>
                            <input
                              type="text"
                              value={editForm.fullName}
                              onChange={(e) => handleFormChange('fullName', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                              required
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Google Drive Folder URL
                            </label>
                            <input
                              type="url"
                              value={editForm.folderUrl}
                              onChange={(e) => handleFormChange('folderUrl', e.target.value)}
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
                                value={editForm.acosGoal}
                                onChange={(e) => handleFormChange('acosGoal', e.target.value)}
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
                                value={editForm.tacosGoal}
                                onChange={(e) => handleFormChange('tacosGoal', e.target.value)}
                                placeholder="e.g., 25%"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                          </div>
                          
                          <div>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={editForm.active}
                                onChange={(e) => handleFormChange('active', e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <span className="ml-2 text-sm text-gray-700">Active</span>
                            </label>
                          </div>
                          
                          <div className="flex space-x-3 pt-4">
                            <button
                              type="button"
                              onClick={() => setShowWarning(true)}
                              className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                            >
                              Save Changes
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-400"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Monthly Reports Dashboard */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                {/* Dashboard Header */}
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Monthly Reports Dashboard</h3>
                    <p className="text-sm text-gray-600 mt-1">Comprehensive analytics and performance insights</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                        disabled={availableMonths.length === 0}
                      >
                        <option value="">Select a month</option>
                        {availableMonths.map((month) => (
                          <option key={month} value={month}>
                            {formatMonthSlug(month)}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    <button
                      onClick={fetchMonthlyReports}
                      disabled={reportLoading}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors duration-200 shadow-sm"
                    >
                      <svg className={`w-4 h-4 mr-2 ${reportLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      {reportLoading ? 'Loading...' : 'Refresh'}
                    </button>
                  </div>
                </div>

                {reportLoading ? (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 font-medium">Loading monthly reports...</p>
                    <p className="text-sm text-gray-500 mt-2">Please wait while we fetch your data</p>
                  </div>
                ) : selectedReport && selectedMonth ? (
                  <div className="space-y-8">
                    {/* Key Performance Indicators */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Total Sales</p>
                            <p className="text-3xl font-bold text-gray-900 mt-1">
                              {formatCurrency(selectedReport.profitLoss.sales)}
                            </p>
                          </div>
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Net Profit</p>
                            <p className="text-3xl font-bold text-gray-900 mt-1">
                              {formatCurrency(selectedReport.profitLoss.netProfit)}
                            </p>
                          </div>
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Profit Margin</p>
                            <p className="text-3xl font-bold text-gray-900 mt-1">
                              {formatPercentage(selectedReport.profitLoss.margin)}
                            </p>
                          </div>
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">ROI</p>
                            <p className="text-3xl font-bold text-gray-900 mt-1">
                              {formatPercentage(selectedReport.profitLoss.roi)}
                            </p>
                          </div>
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Amazon Performance Overview */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                        <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                          <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          Amazon Performance Overview
                        </h4>
                      </div>
                      <div className="p-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                          <div className="text-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                              <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                              </svg>
                            </div>
                            <p className="text-sm font-medium text-gray-600 mb-1">Sales</p>
                            <p className="text-xl font-bold text-gray-900">
                              {formatCurrency(selectedReport.amazonPerformance.salesThisMonth)}
                            </p>
                            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-2 ${
                              selectedReport.amazonPerformance.salesChange.includes('🔼') 
                                ? 'bg-green-50 text-green-700 border border-green-200' 
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                              {selectedReport.amazonPerformance.salesChange}
                            </div>
                          </div>

                          <div className="text-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                              <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                            </div>
                            <p className="text-sm font-medium text-gray-600 mb-1">Net Profit</p>
                            <p className="text-xl font-bold text-gray-900">
                              {formatCurrency(selectedReport.amazonPerformance.netProfitThisMonth)}
                            </p>
                            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-2 ${
                              selectedReport.amazonPerformance.netProfitChange.includes('🔼') 
                                ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                              {selectedReport.amazonPerformance.netProfitChange}
                            </div>
                          </div>

                          <div className="text-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                              <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                              </svg>
                            </div>
                            <p className="text-sm font-medium text-gray-600 mb-1">ACoS</p>
                            <p className="text-xl font-bold text-gray-900">
                              {formatPercentage(selectedReport.amazonPerformance.acosThisMonth)}
                            </p>
                            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-2 ${
                              selectedReport.amazonPerformance.acosChange.includes('🔽') 
                                ? 'bg-green-50 text-green-700 border border-green-200' 
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                              {selectedReport.amazonPerformance.acosChange}
                            </div>
                          </div>

                          <div className="text-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                              <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                            </div>
                            <p className="text-sm font-medium text-gray-600 mb-1">Units Sold</p>
                            <p className="text-xl font-bold text-gray-900">
                              {selectedReport.amazonPerformance.unitsThisMonth.toLocaleString()}
                            </p>
                            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-2 ${
                              selectedReport.amazonPerformance.unitsChange.includes('🔼') 
                                ? 'bg-green-50 text-green-700 border border-green-200' 
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                              {selectedReport.amazonPerformance.unitsChange}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Product Performance Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                          <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                            <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                            Product Performance
                          </h4>
                          <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full border">
                            {selectedReport.productPerformance.length} products
                          </span>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ASIN</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sales</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Profit</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Margin</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Units</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ACoS</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {selectedReport.productPerformance.map((product, index) => (
                              <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                                      <span className="text-xs font-medium text-gray-700">{index + 1}</span>
                                    </div>
                                    <div className="max-w-xs">
                                      <p className="text-sm font-medium text-gray-900 truncate" title={product.title}>
                                        {product.title}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="text-sm text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded">
                                    {product.asin}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <p className="text-sm font-medium text-green-700">
                                    {formatCurrency(product.salesThisMonth)}
                                  </p>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <p className={`text-sm font-medium ${isNumeric(product.netProfitThisMonth) && getNumericValue(product.netProfitThisMonth) >= 0 ? 'text-blue-700' : isNumeric(product.netProfitThisMonth) ? 'text-red-700' : 'text-gray-700'}`}>
                                    {formatCurrency(product.netProfitThisMonth)}
                                  </p>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <p className={`text-sm font-medium ${isNumeric(product.marginThisMonth) ? (getNumericValue(product.marginThisMonth) >= 20 ? 'text-green-700' : getNumericValue(product.marginThisMonth) >= 10 ? 'text-blue-700' : 'text-red-700') : 'text-gray-700'}`}>
                                    {formatPercentage(product.marginThisMonth)}
                                  </p>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <p className="text-sm font-medium text-gray-900">
                                    {isNumeric(product.unitsThisMonth) ? getNumericValue(product.unitsThisMonth).toLocaleString() : product.unitsThisMonth}
                                  </p>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <p className={`text-sm font-medium ${isNumeric(product.acosThisMonth) ? (getNumericValue(product.acosThisMonth) <= 15 ? 'text-green-700' : getNumericValue(product.acosThisMonth) <= 25 ? 'text-blue-700' : 'text-red-700') : 'text-gray-700'}`}>
                                    {formatPercentage(product.acosThisMonth)}
                                  </p>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Detailed Financial Metrics */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Profit & Loss Details */}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                          <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                            <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            Profit & Loss Details
                          </h4>
                        </div>
                        <div className="p-6">
                          <div className="space-y-4">
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                              <span className="text-sm text-gray-600">Cost of Goods</span>
                              <span className="text-sm font-medium text-gray-900">{formatCurrency(selectedReport.profitLoss.costOfGoods)}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                              <span className="text-sm text-gray-600">FBA Fees</span>
                              <span className="text-sm font-medium text-gray-900">{formatCurrency(selectedReport.profitLoss.fbaFees)}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                              <span className="text-sm text-gray-600">Referral Fees</span>
                              <span className="text-sm font-medium text-gray-900">{formatCurrency(selectedReport.profitLoss.referralFees)}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                              <span className="text-sm text-gray-600">Storage Fees</span>
                              <span className="text-sm font-medium text-gray-900">{formatCurrency(selectedReport.profitLoss.storageFees)}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                              <span className="text-sm text-gray-600">Ad Expenses</span>
                              <span className="text-sm font-medium text-gray-900">{formatCurrency(selectedReport.profitLoss.adExpenses)}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                              <span className="text-sm text-gray-600">Refunds</span>
                              <span className="text-sm font-medium text-gray-900">{formatCurrency(selectedReport.profitLoss.refunds)}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                              <span className="text-sm text-gray-600">Other Expenses</span>
                              <span className="text-sm font-medium text-gray-900">{formatCurrency(selectedReport.profitLoss.expenses)}</span>
                            </div>
                            <div className="flex justify-between items-center py-3 bg-gray-50 rounded-lg px-3">
                              <span className="text-sm font-semibold text-gray-900">Total Expenses</span>
                              <span className="text-sm font-bold text-gray-900">
                                {formatCurrency(
                                  selectedReport.profitLoss.costOfGoods + 
                                  selectedReport.profitLoss.fbaFees + 
                                  selectedReport.profitLoss.referralFees + 
                                  selectedReport.profitLoss.storageFees + 
                                  selectedReport.profitLoss.adExpenses + 
                                  selectedReport.profitLoss.refunds + 
                                  selectedReport.profitLoss.expenses
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Payouts Summary */}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                          <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                            <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                            </svg>
                            Payouts Summary
                          </h4>
                        </div>
                        <div className="p-6">
                          <div className="space-y-6">
                            <div className="text-center">
                              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                </svg>
                              </div>
                              <p className="text-sm font-medium text-gray-600 mb-1">Latest Payout</p>
                              <p className="text-2xl font-bold text-gray-900">
                                {formatCurrency(selectedReport.payouts.latest)}
                              </p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div className="text-center p-4 bg-gray-50 rounded-lg">
                                <p className="text-sm font-medium text-gray-600 mb-1">Previous</p>
                                <p className="text-lg font-semibold text-gray-900">
                                  {formatCurrency(selectedReport.payouts.previous)}
                                </p>
                              </div>
                              <div className="text-center p-4 bg-gray-50 rounded-lg">
                                <p className="text-sm font-medium text-gray-600 mb-1">Average</p>
                                <p className="text-lg font-semibold text-gray-900">
                                  {formatCurrency(selectedReport.payouts.average)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : selectedMonth && !selectedReport ? (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <svg className="h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Report Found</h3>
                    <p className="text-gray-600 mb-4">No monthly report found for {formatMonthSlug(selectedMonth)}</p>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-w-md mx-auto">
                      <p className="text-sm text-gray-700">
                        <strong>Supported formats:</strong> CSV files, Excel (.xlsx), and Google Sheets are all supported.
                      </p>
                    </div>
                  </div>
                ) : monthlyReports.length === 0 ? (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <svg className="h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Monthly Reports</h3>
                    <p className="text-gray-600 mb-4">No monthly report files found in the client folder.</p>
                    <p className="text-sm text-gray-500">Monthly report files with "Monthly-Report" in the name are required.</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <svg className="h-12 w-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Month</h3>
                    <p className="text-gray-600">Choose a month from the dropdown above to view detailed report data.</p>
                  </div>
                )}
              </div>

              {/* Folder Contents */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Folder Contents</h3>
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search folders and files..."
                        value={folderSearchTerm}
                        onChange={(e) => setFolderSearchTerm(e.target.value)}
                        className="pl-8 pr-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <svg className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <button
                      onClick={fetchFolderData}
                      disabled={folderLoading}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {folderLoading ? 'Loading...' : 'Refresh'}
                    </button>
                  </div>
                </div>
                
                {folderLoading ? (
                  <div className="bg-gray-50 rounded-lg p-6 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-gray-600">Loading folder data...</p>
                  </div>
                ) : filteredFolderData.length > 0 ? (
                  <div className="bg-gray-50 rounded-lg p-6" onDragOver={handleDragOver} onDrop={handleDrop}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredFolderData.map((item) => (
                        <div 
                          key={item.id} 
                          className={`bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow cursor-pointer ${
                            item.mimeType === 'application/vnd.google-apps.folder' ? 'hover:border-blue-300' : 'hover:border-gray-300'
                          }`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, item)}
                          onClick={() => item.mimeType === 'application/vnd.google-apps.folder' ? handleFolderClick(item) : null}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              {item.mimeType === 'application/vnd.google-apps.folder' ? (
                                <svg className="h-6 w-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                                </svg>
                              ) : (
                                <svg className="h-6 w-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {formatMonthSlug(item.name)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {item.mimeType === 'application/vnd.google-apps.folder' ? 'Folder' : 'File'}
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 flex items-center justify-between">
                            <a
                              href={item.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-900 underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Open in Drive
                            </a>
                            {item.mimeType === 'application/vnd.google-apps.folder' && (
                              <span className="text-xs text-gray-400">Click to view contents</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="text-center mb-6">
                      <svg className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <p className="text-gray-600">No data found in folder</p>
                      <p className="text-sm text-gray-500 mt-2">The folder appears to be empty or inaccessible.</p>
                    </div>
                    
                                        {/* Upload Progress for Empty Folder - Only show in month folder contents */}
                    {selectedFolder && selectedFolderContents && /^\d{4}-\d{2}$/.test(selectedFolder.name) && uploadingFiles.length > 0 && (
                      <div className="mt-6 space-y-2">
                        <h4 className="text-sm font-medium text-gray-900">Uploading files...</h4>
                        {uploadingFiles.map((fileName) => (
                          <div key={fileName} className="bg-white p-3 rounded-lg border">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-gray-700 truncate">{fileName}</span>
                              <span className="text-xs text-gray-500">{uploadProgress[fileName] || 0}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress[fileName] || 0}%` }}
                              ></div>
                            </div>
                          </div>
                                                ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Selected Folder Contents */}
              {selectedFolder && (
                <div className="mt-6 bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={handleCloseFolder}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <h4 className="text-lg font-medium text-gray-900">
                        Contents of: {formatMonthSlug(selectedFolder.name)}
                      </h4>
                    </div>
                  </div>
                  
                  {/* File Upload Area - Only show in month folder contents */}
                  {/^\d{4}-\d{2}$/.test(selectedFolder.name) && (
                    <div 
                      className={`mb-6 p-6 border-2 border-dashed rounded-lg text-center transition-colors ${
                        isDragOver 
                          ? 'border-blue-400 bg-blue-50' 
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      onDragOver={handleFileDragOver}
                      onDragLeave={handleFileDragLeave}
                      onDrop={handleFileDrop}
                    >
                      <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <div className="text-sm text-gray-600">
                        <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                          <span>Upload files</span>
                          <input 
                            id="file-upload" 
                            name="file-upload" 
                            type="file" 
                            multiple 
                            className="sr-only" 
                            onChange={handleFileInputChange}
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Files will be uploaded to this month folder
                      </p>
                    </div>
                  )}

                  {/* Upload Progress - Only show in month folder contents */}
                  {/^\d{4}-\d{2}$/.test(selectedFolder.name) && uploadingFiles.length > 0 && (
                    <div className="mb-6 space-y-2">
                      <h4 className="text-sm font-medium text-gray-900">Uploading files...</h4>
                      {uploadingFiles.map((fileName) => (
                        <div key={fileName} className="bg-white p-3 rounded-lg border">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-700 truncate">{fileName}</span>
                            <span className="text-xs text-gray-500">{uploadProgress[fileName] || 0}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${uploadProgress[fileName] || 0}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {selectedFolderLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <p className="text-gray-600">Loading folder contents...</p>
                    </div>
                  ) : selectedFolderContents.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {selectedFolderContents.map((item) => (
                        <div 
                          key={item.id} 
                          className="bg-gray-50 p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              {item.mimeType === 'application/vnd.google-apps.folder' ? (
                                <svg className="h-6 w-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                                </svg>
                              ) : (
                                <svg className="h-6 w-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {item.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {item.mimeType === 'application/vnd.google-apps.folder' ? 'Folder' : 'File'}
                              </p>
                            </div>
                          </div>
                          <div className="mt-3">
                            <a
                              href={item.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-900 underline"
                            >
                              Open in Drive
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <svg className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <p className="text-gray-600">This folder is empty</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
