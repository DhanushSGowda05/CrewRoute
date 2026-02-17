export interface User {
  id: string;
  clerkId: string;
  username: string;
  email?: string;
  phoneNumber?: string;
  profileImage?: string;
  pushToken?: string;
  createdAt: string;
  updatedAt: string;
}