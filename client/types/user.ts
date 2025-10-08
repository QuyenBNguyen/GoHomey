// types/user.ts
export type Role = "customer" | "driver" | "admin";
export type Gender = "male" | "female" | "other";

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  role: Role;
  gender: Gender;
  avatar: string;
  dob: string;
}
