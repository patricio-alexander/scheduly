export interface ProfileData {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  bio: string | null;
  photo: string | null;
  /** Person */
  birthday: string | null;
  gender: string | null;
  firstName?: string;
  firstLastName?: string;
  secondName?: string | null;
  secondLastName?: string | null;
  /** PersonData (EdDeli) */
  bloodType: string | null;
  placeResidence?: string | null;
  direction?: string | null;
}
