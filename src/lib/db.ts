import { Collection, Db, MongoClient, ObjectId } from "mongodb";

const mongoUri =
  process.env.MONGODB_URI ;

const dbName = process.env.MONGODB_DB || "reddit_recommender";

if (!mongoUri) {
  throw new Error("Missing MONGODB_URI environment variable");
}

type GlobalWithMongo = typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>;
};

const globalWithMongo = global as GlobalWithMongo;

const getClient = async (): Promise<MongoClient> => {
  if (!globalWithMongo._mongoClientPromise) {
    globalWithMongo._mongoClientPromise = MongoClient.connect(mongoUri);
  }
  return globalWithMongo._mongoClientPromise;
};

export const getDb = async (): Promise<Db> => {
  const client = await getClient();
  return client.db(dbName);
};

export type UserDocument = {
  _id: ObjectId;
  username: string;
  email: string;
  password: string;
  createdAt?: Date;
};

export type InterestDocument = {
  _id: ObjectId;
  userId: ObjectId;
  interest: string;
  subInterest?: string;
  weight: number;
  createdAt?: Date;
};

export type WeightDocument = {
  _id: ObjectId;
  userId: ObjectId;
  label: string;
  value: number;
  hint?: string;
  createdAt?: Date;
};

export type ConfigDocument = {
  _id?: ObjectId;
  userId: ObjectId;
  topics?: string[];
  weights: Record<string, number>;
  createdAt?: Date;
  updatedAt?: Date;
};

export type PostDocument = {
  _id?: ObjectId;
  id: string;
  kind?: string;
  query?: string;
  title?: string;
  body?: string | null;
  author?: string | null;
  score?: number | null;
  upvote_ratio?: number | null;
  num_comments?: number | null;
  subreddit?: string | null;
  created_utc?: string | Date | null;
  url?: string | null;
  flair?: string | null;
  over_18?: boolean | null;
  is_self?: boolean | null;
  spoiler?: boolean | null;
  locked?: boolean | null;
  is_video?: boolean | null;
  domain?: string | null;
  thumbnail?: string | null;
  url_overridden_by_dest?: string | null;
  media?: any;
  media_metadata?: any;
  gallery_data?: any;
  final_score?: number | null;
};

export const toObjectId = (value: string | ObjectId | null | undefined) => {
  if (!value) return null;
  if (value instanceof ObjectId) return value;
  try {
    return new ObjectId(value);
  } catch (error) {
    return null;
  }
};

export const getUsersCollection = async (): Promise<Collection<UserDocument>> => {
  const db = await getDb();
  const col = db.collection<UserDocument>("users");
  await Promise.all([
    col.createIndex({ email: 1 }, { unique: true }),
    col.createIndex({ username: 1 }, { unique: true, sparse: true }),
  ]);
  return col;
};

export const getInterestsCollection = async (): Promise<Collection<InterestDocument>> => {
  const db = await getDb();
  const col = db.collection<InterestDocument>("user_interests");
  await col.createIndex(
    { userId: 1, interest: 1, subInterest: 1 },
    { unique: true }
  );
  return col;
};

export const getWeightsCollection = async (): Promise<Collection<WeightDocument>> => {
  const db = await getDb();
  const col = db.collection<WeightDocument>("user_weights");
  await col.createIndex({ userId: 1, label: 1 }, { unique: true });
  return col;
};

export const getConfigCollection = async (): Promise<Collection<ConfigDocument>> => {
  const db = await getDb();
  const col = db.collection<ConfigDocument>("confg");
  await col.createIndex({ userId: 1 }, { unique: true });
  return col;
};

export const getPostsCollection = async (): Promise<Collection<PostDocument>> => {
  const db = await getDb();
  return db.collection<PostDocument>("posts");
};
