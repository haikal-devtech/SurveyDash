import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Test connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error: any) {
    if (error.message.includes("offline")) {
      console.error("Firebase is offline. Check configuration.");
    }
  }
}
testConnection();

export interface FirestoreErrorInfo {
  error: string;
  operationType: "create" | "update" | "delete" | "list" | "get" | "write";
  path: string | null;
  authInfo: {
    userId: string;
    email: string;
    emailVerified: boolean;
    isAnonymous: boolean;
    providerInfo: any[];
  };
}

export function handleFirestoreError(error: any, operation: FirestoreErrorInfo["operationType"], path: string | null = null): never {
  const authInfo = auth.currentUser ? {
    userId: auth.currentUser.uid,
    email: auth.currentUser.email || "",
    emailVerified: auth.currentUser.emailVerified,
    isAnonymous: auth.currentUser.isAnonymous,
    providerInfo: auth.currentUser.providerData
  } : {
    userId: "",
    email: "",
    emailVerified: false,
    isAnonymous: true,
    providerInfo: []
  };

  const errorInfo: FirestoreErrorInfo = {
    error: error.message || "Unknown Firestore error",
    operationType: operation,
    path,
    authInfo
  };

  throw new Error(JSON.stringify(errorInfo));
}
