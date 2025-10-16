declare const firebase: any;

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

let firestore: any | null = null;
let functions: any | null = null;

export const initializeFirebase = (): boolean => {
  try {
    const configString = localStorage.getItem('silo_firebase_config');
    if (!configString) {
      console.warn("Firebase config not found in localStorage.");
      return false;
    }

    const firebaseConfig: FirebaseConfig = JSON.parse(configString);
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      console.warn("Firebase config is incomplete.");
      return false;
    }

    if (firebase.apps.length === 0) {
        firebase.initializeApp(firebaseConfig);
    }
    
    firestore = firebase.firestore();
    functions = firebase.functions();
    return true;
  } catch (error) {
    console.error("Failed to initialize Firebase:", error);
    return false;
  }
};

export const getFirestore = () => {
  if (!firestore) {
    console.error("Firestore not initialized.");
  }
  return firestore;
};

export const getFunctions = () => {
  if (!functions) {
    console.error("Firebase Functions not initialized.");
  }
  return functions;
};
