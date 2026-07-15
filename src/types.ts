export interface Branch {
  id: number;
  name: string;
  location: string;
  pastor: string;
  date_opened: string;
}

export interface CellGroup {
  id: number;
  name: string;
  leader: string;
  meeting_details: string;
  branch_id: number | null;
  branch_name?: string;
}

export interface Member {
  id: number;
  name: string;
  contact: string;
  join_date: string;
  status: string; // 'Active', 'Inactive', 'Visitor'
  gender: string; // 'Male', 'Female'
  family_role: string; // 'Father', 'Mother', 'Youth', 'Child', 'Single'
  birth_date: string;
  branch_id: number | null;
  cell_group_id: number | null;
  branch_name?: string;
  cell_group_name?: string;
  reg_number?: string;
}

export interface Contribution {
  id: number;
  member_id: number | null;
  member_name: string;
  amount: number;
  type: string; // 'Tithe', 'Offering', 'Building Fund', 'Missions', 'Benevolence'
  date: string;
  payment_method: string; // 'M-Pesa', 'Cash', 'Bank Transfer', 'Cheque'
  branch_name?: string;
  cell_group_id?: number | null;
  cell_group_name?: string;
}

export interface Expenditure {
  id: number;
  category: string; // 'Salaries', 'Utilities', 'Charity', 'Missions', 'Maintenance', 'Events', 'Other'
  amount: number;
  date: string;
  description: string;
  status: string; // 'Pending', 'Approved', 'Rejected'
}

export interface PrayerRequest {
  id: number;
  date: string;
  requestor_name: string | null;
  content: string;
  status: string; // 'Pending', 'Addressed', 'Prayed For'
  is_anonymous: number; // 1 or 0
}

export interface BulkSms {
  id: number;
  date: string;
  sender: string;
  recipient_count: number;
  message: string;
  recipients?: string;
}

export interface Event {
  id: number;
  title: string;
  description: string;
  date: string;
  location: string;
}

export interface Sermon {
  id: number;
  title: string;
  speaker: string;
  date: string;
  summary: string;
  media_url?: string;
}

export interface Hymn {
  id: number;
  number: number;
  title: string;
  key: string;
  category: string;
  lyrics_english: string;
  lyrics_kiswahili: string;
  lyrics_luo: string;
}

export interface AttendanceSession {
  id: number;
  date: string;
  service_name: string;
  branch_id: number;
  branch_name?: string;
  total_members?: number;
  present_count?: number;
}

export interface AttendanceRecord {
  id: number;
  member_id: number;
  member_name: string;
  status: string; // 'Present', 'Absent'
}

export interface AttendanceTrendItem {
  id: number;
  date: string;
  service_name: string;
  branch_name: string;
  present_count: number;
  total_count: number;
}

export interface ChartItem {
  name: string;
  value: number;
}

export interface DashboardStats {
  memberCount: number;
  totalContributions: number;
  totalExpenditures: number;
  netBalance: number;
  branchesCount: number;
  cellGroupsCount: number;
  attendanceTrend: AttendanceTrendItem[];
  donationByType: ChartItem[];
  expenseByCategory: ChartItem[];
  recentMembers: Member[];
  recentContributions: Contribution[];
}

export interface MemberStatement {
  member: Member;
  contributions: Contribution[];
  total: number;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  assigned_to: string;
  due_date: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  category: 'Event' | 'Facility' | 'Administration' | 'Other';
}

