export interface RoleDetailDto {
  id: string;
  name: string;
  description: string | null;
  userCount: number;
  permissionCount: number;
  permissionIds: string[];
}

export interface PermissionGroupDto {
  category: string | null;
  permissions: Array<{
    id: string;
    name: string;
    description: string | null;
  }>;
}

export interface PermissionDetailDto {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  createdAt: string;
  updatedAt: string;
}
