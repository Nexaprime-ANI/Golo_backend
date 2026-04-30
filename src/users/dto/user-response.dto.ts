export class UserResponseDto {
  id: string;
  name: string;
  email: string;
  role: string;
  accountType: 'user' | 'merchant';
||||||| C:\Users\ADMIN\AppData\Local\Temp\merge_base.tmp
  accountType?: 'user' | 'merchant';
  isBanned?: boolean;
  banReason?: string;
  isEmailVerified: boolean;
  profile?: any;
  profilePhoto?: string | null;
  merchantProfile?: any;
  iWantPreference?: {
    category?: string;
    title?: string;
    description?: string;
    createdAt?: Date;
    updatedAt?: Date;
  } | null;
  createdAt: Date;

||||||| 5ac03ce
  

  // Loyalty fields
  loyaltyPoints?: number;
  merchantLoyaltyPoints?: { [merchantId: string]: number };
  loyaltyTier?: string;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}
