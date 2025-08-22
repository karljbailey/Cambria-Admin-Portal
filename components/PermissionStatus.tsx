'use client';

import { useClientPermissions } from '@/lib/hooks/useClientPermissions';

interface PermissionStatusProps {
  userId?: string;
  clientCode?: string;
}

export default function PermissionStatus({ userId, clientCode }: PermissionStatusProps) {
  const {
    canReadClient,
    canWriteClient,
    canAdminClient,
    loading: permissionsLoading,
    error: permissionsError,
    isAdmin,
    accessibleClients,
    userPermissions,
    refreshPermissions
  } = useClientPermissions(userId);

  if (!userId) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
        <h3 className="text-lg font-medium text-yellow-800 mb-2">Permission Status</h3>
        <p className="text-yellow-700">No user ID provided</p>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <h3 className="text-lg font-medium text-blue-800 mb-2">Permission Status</h3>
      
      <div className="space-y-2 text-sm">
        <div>
          <strong>User ID:</strong> {userId}
        </div>
        <div>
          <strong>Loading:</strong> {permissionsLoading ? '🔄 Yes' : '✅ No'}
        </div>
        <div>
          <strong>Error:</strong> {permissionsError || 'None'}
        </div>
        <div>
          <strong>Admin:</strong> {isAdmin ? '👑 Yes' : '👤 No'}
        </div>
        <div>
          <strong>Accessible Clients:</strong> {accessibleClients.length} ({accessibleClients.join(', ')})
        </div>
        <div>
          <strong>User Permissions:</strong> {userPermissions.length}
        </div>
        
        <div className="mt-4">
          <button
            onClick={refreshPermissions}
            disabled={permissionsLoading}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {permissionsLoading ? 'Refreshing...' : 'Refresh Permissions'}
          </button>
        </div>
        
        {clientCode && (
          <div className="mt-4 p-3 bg-white rounded border">
            <h4 className="font-medium text-blue-800 mb-2">Client: {clientCode}</h4>
            <div className="space-y-1">
              <div>
                <strong>Can Read:</strong> {canReadClient(clientCode) ? '✅ Yes' : '❌ No'}
              </div>
              <div>
                <strong>Can Write:</strong> {canWriteClient(clientCode) ? '✅ Yes' : '❌ No'}
              </div>
              <div>
                <strong>Can Admin:</strong> {canAdminClient(clientCode) ? '✅ Yes' : '❌ No'}
              </div>
            </div>
          </div>
        )}
        
        {userPermissions.length > 0 && (
          <div className="mt-4 p-3 bg-white rounded border">
            <h4 className="font-medium text-blue-800 mb-2">Permission Details:</h4>
            <ul className="space-y-1">
              {userPermissions.map((perm, index) => (
                <li key={index} className="text-xs">
                  {perm.clientCode}: {perm.permissionType} (granted by {perm.grantedBy})
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
