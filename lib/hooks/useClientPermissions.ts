import { useState, useEffect, useCallback, useRef } from 'react';
import { permissionUtils } from '../permissions';

interface ClientPermission {
  clientCode: string;
  clientName: string;
  permissionType: 'read' | 'write' | 'admin';
  grantedBy: string;
  grantedAt: Date;
  expiresAt?: Date;
}

interface UseClientPermissionsReturn {
  // Permission checking functions
  canReadClient: (clientCode: string) => boolean;
  canWriteClient: (clientCode: string) => boolean;
  canAdminClient: (clientCode: string) => boolean;
  getClientPermissionLevel: (clientCode: string) => 'read' | 'write' | 'admin' | null;
  
  // User permissions data
  userPermissions: ClientPermission[];
  accessibleClients: string[];
  hasAnyClientAccess: boolean;
  
  // Loading and error states
  loading: boolean;
  error: string | null;
  
  // Utility functions
  filterClientsByPermission: <T extends { clientCode: string }>(clients: T[]) => T[];
  isAdmin: boolean;
  
  // Debug functions
  refreshPermissions: () => Promise<void>;
}

export function useClientPermissions(userId?: string): UseClientPermissionsReturn {
  const [userPermissions, setUserPermissions] = useState<ClientPermission[]>([]);
  const [accessibleClients, setAccessibleClients] = useState<string[]>([]);
  const [hasAnyClientAccess, setHasAnyClientAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Use refs to track initialization state
  const initialized = useRef(false);
  const initializationPromise = useRef<Promise<void> | null>(null);

  // Initialize permissions - this function ensures we only initialize once
  const initializePermissions = useCallback(async (): Promise<void> => {
    if (!userId) {
      setLoading(false);
      setError('No user ID provided');
      return;
    }

    if (initialized.current) {
      return;
    }

    // If initialization is already in progress, wait for it
    if (initializationPromise.current) {
      return initializationPromise.current;
    }

    // Create a new initialization promise
    initializationPromise.current = (async () => {
      try {
        console.log('🔧 Initializing permissions for user:', userId);
        setLoading(true);
        setError(null);

        // Step 1: Check admin status first
        console.log('👤 Checking admin status...');
        const adminCheck = await checkAdminStatus(userId);
        setIsAdmin(adminCheck);
        
        if (adminCheck) {
          console.log('✅ User is admin - skipping permission fetch');
          setUserPermissions([]);
          setAccessibleClients([]);
          setHasAnyClientAccess(true);
          setLoading(false);
          initialized.current = true;
          return;
        }

        // Step 2: Fetch user permissions
        console.log('🔍 Fetching user permissions...');
        const permissions = await fetchUserPermissions(userId);
        setUserPermissions(permissions);
        
        // Step 3: Set accessible clients
        const clientCodes = permissions.map(p => p.clientCode);
        setAccessibleClients(clientCodes);
        setHasAnyClientAccess(clientCodes.length > 0);
        
        console.log('✅ Permissions initialized:', {
          isAdmin: adminCheck,
          permissionsCount: permissions.length,
          accessibleClients: clientCodes
        });

      } catch (err) {
        console.error('❌ Permission initialization error:', err);
        setError('Failed to initialize permissions');
        setUserPermissions([]);
        setAccessibleClients([]);
        setHasAnyClientAccess(false);
      } finally {
        setLoading(false);
        initialized.current = true;
      }
    })();

    return initializationPromise.current;
  }, [userId]);

  // Check admin status
  const checkAdminStatus = async (uid: string): Promise<boolean> => {
    try {
      // Try database first
      const response = await fetch(`/api/users/${uid}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          return data.user.role === 'admin';
        }
      }
      
      // Fallback to session
      const sessionResponse = await fetch('/api/auth/session');
      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        if (sessionData.authenticated && sessionData.user) {
          return sessionData.user.role === 'admin';
        }
      }
      
      return false;
    } catch (err) {
      console.error('❌ Admin check error:', err);
      return false;
    }
  };

  // Fetch user permissions
  const fetchUserPermissions = async (uid: string): Promise<ClientPermission[]> => {
    try {
      const response = await fetch(`/api/permissions/client?userId=${uid}`);
      const data = await response.json();
      
      if (data.success) {
        return data.permissions || [];
      } else {
        console.error('❌ Permission fetch failed:', data.error);
        return [];
      }
    } catch (err) {
      console.error('❌ Permission fetch error:', err);
      return [];
    }
  };

  // Initialize on mount
  useEffect(() => {
    if (userId && !initialized.current) {
      initializePermissions();
    }
  }, [userId, initializePermissions]);

  // Reset when userId changes
  useEffect(() => {
    if (userId) {
      initialized.current = false;
      initializationPromise.current = null;
      setLoading(true);
      setError(null);
      setUserPermissions([]);
      setAccessibleClients([]);
      setHasAnyClientAccess(false);
      setIsAdmin(false);
    }
  }, [userId]);

  // Permission checking functions - these are now synchronous and reliable
  const canReadClient = useCallback((clientCode: string): boolean => {
    if (!initialized.current || loading) {
      console.log('⚠️ Permission check called before initialization complete');
      return false;
    }

    if (isAdmin) {
      return true;
    }

    // Case-insensitive matching
    const normalizedClientCode = clientCode.toUpperCase();
    const hasPermission = accessibleClients.some(ac => ac.toUpperCase() === normalizedClientCode);
    
    console.log('🔍 Permission check:', {
      clientCode,
      normalizedClientCode,
      accessibleClients,
      hasPermission,
      isAdmin,
      initialized: initialized.current
    });
    
    return hasPermission;
  }, [isAdmin, accessibleClients, loading]);

  const canWriteClient = useCallback((clientCode: string): boolean => {
    if (!initialized.current || loading) {
      return false;
    }

    if (isAdmin) return true;
    
    const normalizedClientCode = clientCode.toUpperCase();
    const permission = userPermissions.find(p => p.clientCode.toUpperCase() === normalizedClientCode);
    return permission ? ['write', 'admin'].includes(permission.permissionType) : false;
  }, [isAdmin, userPermissions, loading]);

  const canAdminClient = useCallback((clientCode: string): boolean => {
    if (!initialized.current || loading) {
      return false;
    }

    if (isAdmin) return true;
    
    const normalizedClientCode = clientCode.toUpperCase();
    const permission = userPermissions.find(p => p.clientCode.toUpperCase() === normalizedClientCode);
    return permission ? permission.permissionType === 'admin' : false;
  }, [isAdmin, userPermissions, loading]);

  const getClientPermissionLevel = useCallback((clientCode: string): 'read' | 'write' | 'admin' | null => {
    if (!initialized.current || loading) {
      return null;
    }

    if (isAdmin) return 'admin';
    
    const normalizedClientCode = clientCode.toUpperCase();
    const permission = userPermissions.find(p => p.clientCode.toUpperCase() === normalizedClientCode);
    return permission ? permission.permissionType : null;
  }, [isAdmin, userPermissions, loading]);

  // Filter clients by user permissions
  const filterClientsByPermission = useCallback(<T extends { clientCode: string }>(clients: T[]): T[] => {
    if (!initialized.current || loading) {
      console.log('⚠️ Client filtering called before initialization complete');
      return [];
    }

    if (isAdmin) {
      return clients;
    }
    
    const filtered = clients.filter(client => {
      const normalizedClientCode = client.clientCode.toUpperCase();
      return accessibleClients.some(ac => ac.toUpperCase() === normalizedClientCode);
    });
    
    console.log('🔍 Filtered clients:', { 
      totalClients: clients.length, 
      filteredCount: filtered.length,
      isAdmin,
      accessibleClients
    });
    
    return filtered;
  }, [isAdmin, accessibleClients, loading]);

  // Refresh permissions function
  const refreshPermissions = useCallback(async (): Promise<void> => {
    if (!userId) return;
    
    console.log('🔄 Refreshing permissions...');
    initialized.current = false;
    initializationPromise.current = null;
    await initializePermissions();
  }, [userId, initializePermissions]);

  return {
    // Permission checking functions
    canReadClient,
    canWriteClient,
    canAdminClient,
    getClientPermissionLevel,
    
    // User permissions data
    userPermissions,
    accessibleClients,
    hasAnyClientAccess,
    
    // Loading and error states
    loading,
    error,
    
    // Utility functions
    filterClientsByPermission,
    isAdmin,
    
    // Debug functions
    refreshPermissions
  };
}
