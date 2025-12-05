/**
 * Mock authentication utility for frontend-only mode.
 * Simulates user login and signup without Firebase.
 */

export interface MockUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

// Store mock users in memory (in a real app, this would be in a database)
const mockUsers: Array<{ email: string; password: string; user: MockUser }> = [
  {
    email: "demo@reddit.com",
    password: "demo123",
    user: {
      uid: "demo-user-1",
      email: "demo@reddit.com",
      displayName: "Demo User",
      photoURL: "/images/redditlogo.png",
    },
  },
  {
    email: "test@reddit.com",
    password: "test123",
    user: {
      uid: "test-user-1",
      email: "test@reddit.com",
      displayName: "Test User",
      photoURL: "/images/redditFace.svg",
    },
  },
];

/**
 * Mock login function
 */
export const mockLogin = async (
  email: string,
  password: string
): Promise<MockUser | null> => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  const userData = mockUsers.find(
    (u) => u.email === email && u.password === password
  );

  if (userData) {
    return userData.user;
  }

  throw new Error("Invalid email or password");
};

/**
 * Mock signup function
 */
export const mockSignup = async (
  email: string,
  password: string
): Promise<MockUser> => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Check if user already exists
  const existingUser = mockUsers.find((u) => u.email === email);
  if (existingUser) {
    throw new Error("A user with that email already exists");
  }

  // Create new user
  const newUser: MockUser = {
    uid: `user-${Date.now()}`,
    email,
    displayName: email.split("@")[0],
    photoURL: "/images/redditlogo.png",
  };

  // Add to mock users array
  mockUsers.push({
    email,
    password,
    user: newUser,
  });

  return newUser;
};

/**
 * Mock logout function
 */
export const mockLogout = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 200));
  // In a real app, this would clear tokens, etc.
};

