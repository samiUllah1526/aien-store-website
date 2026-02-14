export interface UserRoleDto {
  roleId: string;
  roleName: string;
}

export interface UserResponseDto {
  id: string;
  name: string;
  email: string;
  status: string;
  lastLoginAt: string | null;
  roleIds: string[];
  roles: UserRoleDto[];
  createdAt: string;
  updatedAt: string;
}

export interface RoleResponseDto {
  id: string;
  name: string;
}
