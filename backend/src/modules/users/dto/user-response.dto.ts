export interface UserRoleDto {
  roleId: string;
  roleName: string;
}

export interface UserResponseDto {
  id: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  status: string;
  lastLoginAt: string | null;
  roleIds: string[];
  roles: UserRoleDto[];
  /** Resolved permission names (from roles + direct overrides). */
  permissions: string[];
  /** True if user has the Super Admin role. */
  isSuperAdmin: boolean;
  /** IDs of permissions directly assigned (grant or revoke). */
  directPermissionIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RoleResponseDto {
  id: string;
  name: string;
  description?: string | null;
}
