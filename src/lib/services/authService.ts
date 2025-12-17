import {
  hashPassword,
  mapDbUserToClient,
  signAuthToken,
  verifyAuthToken,
  verifyPassword,
} from "../auth";
import {
  getUsersCollection,
  toObjectId,
  UserDocument,
} from "../db";

export const registerAccount = async (
  email: string,
  username: string,
  password: string
) => {
  const users = await getUsersCollection();
  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedUsername = String(username).trim();

  const [existingByEmail, existingByUsername] = await Promise.all([
    users.findOne({ email: normalizedEmail }),
    users.findOne({ username: normalizedUsername }),
  ]);

  if (existingByEmail) {
    throw new Error("A user with that email already exists");
  }

  if (existingByUsername) {
    throw new Error("Username is already taken");
  }

  const hashedPassword = await hashPassword(password);

  const insertResult = await users.insertOne({
    username: normalizedUsername,
    email: normalizedEmail,
    password: hashedPassword,
    createdAt: new Date(),
  });

  const newUser: UserDocument = {
    _id: insertResult.insertedId,
    username: normalizedUsername,
    email: normalizedEmail,
    password: hashedPassword,
  };

  const token = signAuthToken(newUser);
  return { user: mapDbUserToClient(newUser), token };
};

export const loginAccount = async (email: string, password: string) => {
  const users = await getUsersCollection();
  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await users.findOne({ email: normalizedEmail });

  if (!user) {
    throw new Error("Invalid email or password");
  }

  const isValid = await verifyPassword(password, user.password);
  if (!isValid) {
    throw new Error("Invalid email or password");
  }

  const token = signAuthToken(user);
  return { user: mapDbUserToClient(user), token };
};

export const fetchUserFromToken = async (token: string) => {
  const payload = verifyAuthToken(token);
  const userId = toObjectId(String(payload.sub));
  if (!userId) return null;

  const users = await getUsersCollection();
  const user = await users.findOne({ _id: userId });
  return user ? mapDbUserToClient(user) : null;
};
