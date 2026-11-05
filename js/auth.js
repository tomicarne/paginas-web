import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    updatePassword,
    onAuthStateChanged
} from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "./firebase.js";

export async function registrar(email, password, nombreCompleto, idEstudiante) {
    try {
        const correo = email.trim().toLowerCase();

        const snap = await getDocs(query(collection(db, "students"), where("email", "==", correo)));
        if (snap.empty) {
            return { success: false, error: "This email is not in the student database." };
        }

        const estudiante = snap.docs[0].data();
        if (String(idEstudiante).trim().toUpperCase() !== String(estudiante.ID).toUpperCase()) {
            return { success: false, error: "The student ID doesn't match this email." };
        }

        const cred = await createUserWithEmailAndPassword(auth, correo, password);
        return { success: true, user: cred.user };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function login(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return { success: true, user: userCredential.user };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export function escucharAuth(callback) {
    return onAuthStateChanged(auth, callback);
}

export async function logout() {
    await signOut(auth);
}

export function cambiarPassword(user, password) {
    return updatePassword(user, password);
}

// Solo lectura: busca el documento del estudiante por email
export async function obtenerEstudiante(user) {
    const q = query(collection(db, "students"), where("email", "==", user.email.toLowerCase()));
    const snap = await getDocs(q);
    return snap.empty ? null : snap.docs[0];
}

export async function cargarPerfil(user) {
    const est = await obtenerEstudiante(user);
    const data = est ? est.data() : {};
    return {
        nombre: data.nombre || "",
        programa: data.programa || "",
        semestre: data.Semestre,
        fechaRegistro: user.metadata?.creationTime || new Date().toISOString(),
        materias: []
    };
}