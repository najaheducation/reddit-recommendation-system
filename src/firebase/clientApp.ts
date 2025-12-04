/**
 * Firebase-free stubs so the app can run without Firebase credentials.
 * These keep the existing imports working while avoiding runtime Firebase errors.
 */
type Noop = (..._args: any[]) => any;

const app = {};
const auth = {
  currentUser: null,
  onAuthStateChanged: (cb: Noop) => {
    cb(null);
    return () => null;
  },
};
const firestore = {};
const storage = {};

export { app, auth, firestore, storage };
