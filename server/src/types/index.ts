export type UserRole = 'parking_administrator' | 'service_admin';

// Роль водителя не хранится в БД, используется для публичного доступа
export type AllUserRoles = UserRole | 'driver';

export interface JWTPayload {
  userId: number;
  username: string;
  role: UserRole;
}

export interface Parking {
  id: number;
  name: string;
  address: string;
  total_spots: number;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  created_at: Date;
}

export interface CreateParkingInput {
  name: string;
  address: string;
  total_spots?: number;
  latitude?: number;
  longitude?: number;
  is_active?: boolean;
}

export interface UpdateParkingInput {
  name?: string;
  address?: string;
  total_spots?: number;
  latitude?: number;
  longitude?: number;
  is_active?: boolean;
}

export interface Camera {
  id: number;
  name: string;
  rtsp_url: string;
  is_active: boolean;
  created_at: Date;
}

export interface CreateCameraInput {
  name: string;
  rtsp_url: string;
  is_active?: boolean;
}

export interface UpdateCameraInput {
  name?: string;
  rtsp_url?: string;
  is_active?: boolean;
}

export interface ParkingCamera {
  id: number;
  parking_id: number;
  camera_id: number;
  created_at: Date;
}

export interface ParkingSpot {
  id: number;
  parking_id: number;
  spot_number: number;
  is_free: boolean;
  coordinates: Record<string, any>;
  last_updated: Date;
}

export interface CreateParkingSpotInput {
  parking_id: number;
  spot_number: number;
  is_free?: boolean;
  coordinates: Record<string, any>;
}

export interface UpdateParkingSpotInput {
  spot_number?: number;
  is_free?: boolean;
  coordinates?: Record<string, any>;
}

export interface ParkingHistory {
  id: number;
  parking_id: number;
  spots_state: number[];
  recorded_at: Date;
}

export interface CreateParkingHistoryInput {
  parking_id: number;
  spots_state: number[];
}

export interface AppUser {
  id: number;
  username: string;
  password_hash: string;
  role: UserRole;
  is_active: boolean;
  created_at: Date;
}

export interface CreateAppUserInput {
  username: string;
  password: string; // Пароль в открытом виде, будет хэширован
  role: UserRole;
  is_active?: boolean;
}

export interface UpdateAppUserInput {
  username?: string;
  password?: string; // Пароль в открытом виде, будет хэширован
  role?: UserRole;
  is_active?: boolean;
}

export interface LoginInput {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: number;
    username: string;
    role: UserRole;
  };
}

export interface UserParking {
  id: number;
  user_id: number;
  parking_id: number;
  created_at: Date;
}

