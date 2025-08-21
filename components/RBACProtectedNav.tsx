import React from 'react';
import { useRBAC } from '@/lib/hooks/useRBAC-client';
import { ResourceType } from '@/lib/types';

interface NavigationItem {
  href: string;
  label: string;
  resource: ResourceType;
  icon?: React.ReactNode;
  children?: NavigationItem[];
}

interface RBACProtectedNavProps {
  userId?: string;
  userRole?: 'admin' | 'basic';
  navigationItems: NavigationItem[];
  className?: string;
  onItemClick?: (item: NavigationItem) => void;
  renderItem?: (item: NavigationItem, isDisabled: boolean, canAccess: boolean) => React.ReactNode;
}

/**
 * Component that renders navigation items based on user permissions
 */
export function RBACProtectedNav({
  userId,
  userRole = 'basic',
  navigationItems,
  className = '',
  onItemClick,
  renderItem
}: RBACProtectedNavProps) {
  const { canRead, loading } = useRBAC({ userId, userRole });

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading permissions...</span>
      </div>
    );
  }

  const renderNavigationItem = (item: NavigationItem): React.ReactNode => {
    const canAccess = canRead(item.resource);
    const isDisabled = !canAccess;

    // Use custom render function if provided
    if (renderItem) {
      return renderItem(item, isDisabled, canAccess);
    }

    // Default rendering
    const baseClasses = "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200";
    // const activeClasses = "bg-blue-100 text-blue-700";
    const inactiveClasses = "text-gray-500 hover:text-gray-700 hover:bg-gray-50";
    const disabledClasses = "text-gray-400 cursor-not-allowed opacity-50";

    const classes = isDisabled 
      ? `${baseClasses} ${disabledClasses}`
      : `${baseClasses} ${inactiveClasses}`;

    const handleClick = (e: React.MouseEvent) => {
      if (isDisabled) {
        e.preventDefault();
        return;
      }
      
      if (onItemClick) {
        onItemClick(item);
      }
    };

    return (
      <a
        key={item.href}
        href={isDisabled ? '#' : item.href}
        className={classes}
        onClick={handleClick}
        title={isDisabled ? `No permission to access ${item.label}` : item.label}
      >
        {item.icon}
        <span>{item.label}</span>
        {isDisabled && (
          <span className="ml-1 text-xs text-gray-400">(No access)</span>
        )}
      </a>
    );
  };

  const renderNavigationGroup = (item: NavigationItem): React.ReactNode => {
    const canAccess = canRead(item.resource);
    const isDisabled = !canAccess;

    if (isDisabled) {
      return null; // Hide entire group if no access
    }

    return (
      <div key={item.href} className="space-y-1">
        {renderNavigationItem(item)}
        {item.children && (
          <div className="ml-4 space-y-1">
            {item.children.map(child => renderNavigationItem(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <nav className={className}>
      <div className="space-y-1">
        {navigationItems.map(item => 
          item.children ? renderNavigationGroup(item) : renderNavigationItem(item)
        )}
      </div>
    </nav>
  );
}

/**
 * Component for protecting individual navigation items
 */
export function RBACProtectedNavItem({
  userId,
  userRole = 'basic',
  resource,
  children,
  fallback = null,
  showDisabled = false
}: {
  userId?: string;
  userRole?: 'admin' | 'basic';
  resource: ResourceType;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showDisabled?: boolean;
}) {
  const { canRead, loading } = useRBAC({ userId, userRole });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!canRead(resource)) {
    if (showDisabled) {
      return (
        <div className="opacity-50 cursor-not-allowed">
          {children}
        </div>
      );
    }
    return fallback;
  }

  return <>{children}</>;
}

/**
 * Hook for checking if navigation items should be shown
 */
export function useNavigationPermissions(userId?: string, userRole?: 'admin' | 'basic') {
  const { canRead, loading } = useRBAC({ userId, userRole });

  const canAccessResource = React.useCallback((resource: ResourceType) => {
    return canRead(resource);
  }, [canRead]);

  return {
    canAccessResource,
    loading,
    // Predefined permission checks for common resources
    canAccessUsers: canRead('users'),
    canAccessPermissions: canRead('permissions'),
    canAccessAudit: canRead('audit'),
    canAccessClients: canRead('clients'),
    canAccessFiles: canRead('files'),
    canAccessFolders: canRead('folders'),
    canAccessSettings: canRead('settings'),
  };
}
