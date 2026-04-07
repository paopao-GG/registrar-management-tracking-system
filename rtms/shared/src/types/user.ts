export enum UserRole {
  ADMIN = 'admin',
  STAFF = 'staff',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export interface IUser {
  _id: string;
  name: string;
  username: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDTO {
  name: string;
  username: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserDTO {
  name?: string;
  role?: UserRole;
  status?: UserStatus;
}

export interface LoginDTO {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    name: string;
    username: string;
    role: UserRole;
  };
}
