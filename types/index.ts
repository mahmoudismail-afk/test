export type UserRole = 'admin' | 'staff' | 'member';
export type MemberStatus = 'active' | 'inactive' | 'paused' | 'expired';
export type MembershipStatus = 'active' | 'expired' | 'paused' | 'cancelled';
export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'other';
export type ClassStatus = 'scheduled' | 'cancelled' | 'completed';
export type BookingStatus = 'confirmed' | 'waitlisted' | 'cancelled';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  role: UserRole;
  created_at: string;
}

export interface Member {
  id: string;
  profile_id: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | null;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  notes?: string;
  status: MemberStatus;
  created_at: string;
  profile?: Profile;
  memberships?: Membership[];
}

export interface MembershipPlan {
  id: string;
  name: string;
  description?: string;
  price: number;
  duration_days: number;
  features?: string[];
  is_active: boolean;
  created_at: string;
}

export interface Membership {
  id: string;
  member_id: string;
  plan_id: string;
  start_date: string;
  end_date: string;
  status: MembershipStatus;
  created_at: string;
  plan?: MembershipPlan;
  member?: Member;
}

export interface Trainer {
  id: string;
  profile_id: string;
  bio?: string;
  certifications?: string[];
  specialties?: string[];
  is_active: boolean;
  created_at: string;
  profile?: Profile;
}

export interface ClassType {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  created_at: string;
}

export interface ClassSchedule {
  id: string;
  class_type_id: string;
  trainer_id?: string;
  title: string;
  start_time: string;
  end_time: string;
  capacity: number;
  location?: string;
  status: ClassStatus;
  created_at: string;
  class_type?: ClassType;
  trainer?: Trainer;
  bookings?: ClassBooking[];
  booking_count?: number;
}

export interface ClassBooking {
  id: string;
  schedule_id: string;
  member_id: string;
  status: BookingStatus;
  booked_at: string;
  member?: Member;
  schedule?: ClassSchedule;
}

export interface Payment {
  id: string;
  member_id: string;
  membership_id?: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_date: string;
  notes?: string;
  created_at: string;
  member?: Member;
  membership?: Membership;
}

export interface CheckIn {
  id: string;
  member_id: string;
  checked_in_at: string;
  checked_in_by?: string;
  notes?: string;
  member?: Member;
}

export interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  monthlyRevenue: number;
  classesToday: number;
  newMembersThisMonth: number;
  checkInsToday: number;
}

export interface RevenueData {
  month: string;
  revenue: number;
}

export interface AttendanceData {
  date: string;
  count: number;
}
