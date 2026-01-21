/**
 * Admin Permissions Configuration
 *
 * This is the single source of truth for all admin permissions.
 * To add a new permission:
 * 1. Add the permission key to AdminPermissionKey type
 * 2. Add the permission definition to ADMIN_PERMISSIONS
 * 3. Update the backend customer model to include the new permission
 * 4. Update the backend isAdminMiddleware.js with a new permission check
 */

// All available permission keys - add new ones here
export type AdminPermissionKey =
  | 'formBuilder'
  | 'dashboard'
  | 'vendorApproval'
  | 'userManagement';
  // Future permissions can be added here:
  // | 'analytics'
  // | 'billing'
  // | 'reports'

// Permission definition structure
export interface PermissionDefinition {
  key: AdminPermissionKey;
  label: string;
  description: string;
  route: string;
  icon: string; // lucide-react icon name
  // For sidebar ordering (lower = higher in menu)
  order: number;
}

// All permission definitions - single source of truth
export const ADMIN_PERMISSIONS: Record<AdminPermissionKey, PermissionDefinition> = {
  dashboard: {
    key: 'dashboard',
    label: 'Dashboard',
    description: 'View analytics and platform statistics',
    route: '/super-admin/dashboard',
    icon: 'LayoutDashboard',
    order: 1,
  },
  vendorApproval: {
    key: 'vendorApproval',
    label: 'Vendor Approval',
    description: 'Approve or reject vendor applications',
    route: '/super-admin/vendor-approval',
    icon: 'CheckSquare',
    order: 2,
  },
  userManagement: {
    key: 'userManagement',
    label: 'User Management',
    description: 'Manage customers and transporters',
    route: '/super-admin/user-management/customers',
    icon: 'Users',
    order: 3,
  },
  formBuilder: {
    key: 'formBuilder',
    label: 'Platform Config',
    description: 'Configure platform forms and settings',
    route: '/super-admin/form-builder',
    icon: 'Settings',
    order: 4,
  },
};

// Get ordered list of permissions (for sidebar)
export const getOrderedPermissions = (): PermissionDefinition[] => {
  return Object.values(ADMIN_PERMISSIONS).sort((a, b) => a.order - b.order);
};

// Admin permissions interface (for type safety)
export interface AdminPermissions {
  formBuilder: boolean;
  dashboard: boolean;
  vendorApproval: boolean;
  userManagement: boolean;
  // Add new permissions here when needed
}

// Default permissions for new admins
export const DEFAULT_ADMIN_PERMISSIONS: AdminPermissions = {
  formBuilder: true,  // Default permission for new admins
  dashboard: false,
  vendorApproval: false,
  userManagement: false,
};

// Check if user has a specific permission
export const hasPermission = (
  permissions: Partial<AdminPermissions> | null | undefined,
  permission: AdminPermissionKey
): boolean => {
  if (!permissions) return false;
  return permissions[permission] === true;
};

// Get first available route for user based on permissions
export const getFirstAvailableRoute = (
  permissions: Partial<AdminPermissions> | null | undefined
): string | null => {
  if (!permissions) return null;

  const orderedPermissions = getOrderedPermissions();

  for (const perm of orderedPermissions) {
    if (permissions[perm.key] === true) {
      return perm.route;
    }
  }

  return null;
};

// Get all available routes for user
export const getAvailableRoutes = (
  permissions: Partial<AdminPermissions> | null | undefined
): PermissionDefinition[] => {
  if (!permissions) return [];

  return getOrderedPermissions().filter(perm => permissions[perm.key] === true);
};

// Check if user has any admin permissions
export const hasAnyPermission = (
  permissions: Partial<AdminPermissions> | null | undefined
): boolean => {
  if (!permissions) return false;
  return Object.values(permissions).some(v => v === true);
};
