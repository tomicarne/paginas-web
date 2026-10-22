import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAK02S79O6oEpU3KQGzhgwQIz2QabLwKAg",
  authDomain: "alertas-470d6.firebaseapp.com",
  projectId: "alertas-470d6",
  storageBucket: "alertas-470d6.firebasestorage.app",
  messagingSenderId: "333866626267",
  appId: "1:333866626267:web:1e8c8f959caf17ba65b0fe",
  measurementId: "G-F90J72N5R5"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };