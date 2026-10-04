export type Role = "STUDENT" | "CLUB_ADMIN" | "SUPER_ADMIN";
export type BookingStatus = "CONFIRMED" | "CANCELLED";

export interface MembershipInfo {
  clubId: string;
  role: Role;
  club: { id: string; name: string };
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  memberships: MembershipInfo[];
}

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  memberships: MembershipInfo[];
}

export interface ClubSummary {
  id: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  createdAt: string;
  _count: { memberships: number };
}

export interface ClubMember {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  role: Role;
  joinedAt: string;
}

export interface ClubBookingInfo {
  id: string;
  title: string;
  purpose: string | null;
  startTime: string;
  endTime: string;
  classroom: { id: string; name: string; building: string };
}

export interface ClubDetail {
  club: { id: string; name: string; description: string | null; logoUrl: string | null; createdAt: string };
  members: ClubMember[];
  upcomingBookings: ClubBookingInfo[];
}

export interface Classroom {
  id: string;
  name: string;
  building: string;
  floor: number;
  capacity: number;
  type: string;
  x: number | null;
  y: number | null;
}

export interface ClassroomDetail {
  classroom: Classroom;
  upcomingBookings: {
    id: string;
    title: string;
    purpose: string | null;
    startTime: string;
    endTime: string;
    club: { id: string; name: string };
    bookedBy: { name: string };
  }[];
}

export interface Booking {
  id: string;
  title: string;
  purpose: string | null;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  club: { id: string; name: string };
  classroom: { id: string; name: string; building: string };
  bookedBy: { id: string; name: string };
}
