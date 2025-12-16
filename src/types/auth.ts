export type AuthUser = {
  id: string;
  uid: string;
  username: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
};

export type AuthResponse = {
  user: AuthUser | null;
  error?: string;
};
