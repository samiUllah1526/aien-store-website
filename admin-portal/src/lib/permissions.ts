/**
 * Nav config and permission-driven visibility for the admin portal.
 * Full list of permissions is fetched from the backend (see permissions-api.ts).
 * User's permissions for show/hide come from the JWT (getStoredPermissions in auth.ts).
 */

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  /** Required permission name (must match backend). User must have this permission to see the item. */
  permission?: string;
  /** If true, only show when user has superadmin:manage (overrides permission for this item). */
  superAdminOnly?: boolean;
}

/**
 * Nav items for the admin sidebar. Permission names must match those returned by GET /admin/permissions.
 * Visibility is applied client-side using the user's permissions from the JWT.
 */
export function getNavItems(): NavItem[] {
  return [
    { href: '/admin', label: 'Dashboard', icon: 'dashboard', permission: 'dashboard:read' },
    { href: '/admin/orders', label: 'Orders', icon: 'orders', permission: 'orders:read' },
    { href: '/admin/products', label: 'Products', icon: 'products', permission: 'products:read' },
    { href: '/admin/inventory', label: 'Inventory', icon: 'inventory', permission: 'inventory:read' },
    { href: '/admin/categories', label: 'Categories', icon: 'categories', permission: 'categories:read' },
    { href: '/admin/users', label: 'Users', icon: 'users', permission: 'users:read' },
    {
      href: '/admin/admin-settings',
      label: 'User Management',
      icon: 'settings',
      superAdminOnly: true,
    },
    { href: '/admin/vouchers', label: 'Vouchers', icon: 'vouchers', permission: 'vouchers:read' },
    { href: '/admin/sales-campaigns', label: 'Sales Campaigns', icon: 'vouchers', permission: 'sales-campaigns:read' },
    { href: '/admin/settings', label: 'Settings', icon: 'settings', permission: 'settings:read' },
    { href: '/admin/site-deployment', label: 'Site deployment', icon: 'deploy', permission: 'deploy:website' },
    { href: '/admin/email-logs', label: 'Email Logs', icon: 'emaillogs', permission: 'emaillogs:read' },
    { href: '/admin/jobs', label: 'Jobs', icon: 'jobs', permission: 'jobs:read' },
    { href: '/admin/docs', label: 'Documentation', icon: 'docs', permission: 'docs:read' },
  ];
}

/**
 * Map admin routes to the minimum permission required to access the page.
 * Permission names match the backend. Used for optional redirect or "no access" UI.
 */
export const ROUTE_PERMISSION: Record<string, string> = {
  '/admin': 'dashboard:read',
  '/admin/orders': 'orders:read',
  '/admin/products': 'products:read',
  '/admin/inventory': 'inventory:read',
  '/admin/categories': 'categories:read',
  '/admin/users': 'users:read',
  '/admin/admin-settings': 'superadmin:manage',
  '/admin/vouchers': 'vouchers:read',
  '/admin/sales-campaigns': 'sales-campaigns:read',
  '/admin/settings': 'settings:read',
  '/admin/site-deployment': 'deploy:website',
  '/admin/email-logs': 'emaillogs:read',
  '/admin/jobs': 'jobs:read',
  '/admin/docs': 'docs:read',
};
