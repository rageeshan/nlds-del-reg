export interface Delegate {
  delegateId: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  age: number;
  entity: string;
  role?: string;
  foodPreference: string;
  delegatePack: boolean;
  checkedIn: boolean;
  checkedInAt?: string;
  contactNumber?: string;
  
  // Add-ons
  comboPack?: { purchased: boolean; size?: string; quantity: number };
  delegateTshirt?: { purchased: boolean; size?: string; quantity: number };
  wristBand?: { purchased: boolean; quantity: number };
  stickerPack?: { purchased: boolean; quantity: number };
  bucketHat?: { purchased: boolean; quantity: number };
  totalItems?: number;
}

export interface CheckInResult {
  success: boolean;
  delegate: Delegate;
  alreadyCheckedIn: boolean;
  message: string;
}

export interface DelegateStats {
  total: number;
  checkedIn: number;
  remaining: number;
  percentage: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
