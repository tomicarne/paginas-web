import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { db } from "./firebase.js";
import {
    doc,
    writeBatch
} from "firebase/firestore";

// Obtener la ruta actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ubicación del JSON
const datosPath = path.join(
    __dirname,
    "firestore_100_estudiantes_UNAB_ids_variados.json"
);

// Leer JSON
const datos = JSON.parse(
    fs.readFileSync(datosPath, "utf8")
);

async function cargarEstudiantes() {

    let batch = writeBatch(db);
    let operaciones = 0;

    let estudiantesCargados = 0;
    let cursosCargados = 0;

    async function guardarBatch() {

        if (operaciones === 0) {
            return;
        }

        await batch.commit();

        console.log(
            `Batch enviado correctamente: ${operaciones} operaciones`
        );

        batch = writeBatch(db);
        operaciones = 0;
    }

    try {

        for (const estudiante of datos.documents) {

            const studentId = estudiante.documentId;

            // ==========================================
            // CREAR / ACTUALIZAR ESTUDIANTE
            // ==========================================

            const estudianteRef = doc(
                db,
                "students",
                studentId
            );

            batch.set(estudianteRef, {
                ID: estudiante.ID,
                Semestre: estudiante.Semestre,
                email: estudiante.email,
                nombre: estudiante.nombre,
                programa: estudiante.programa
            });

            operaciones++;
            estudiantesCargados++;

            // ==========================================
            // CREAR CURSOS
            // ==========================================

            for (const curso of estudiante.Cursos) {

                const cursoRef = doc(
                    db,
                    "students",
                    studentId,
                    "Cursos",
                    curso.documentId
                );

                batch.set(cursoRef, {
                    Materia: curso.Materia,
                    asistencia: curso.asistencia,
                    nota: curso.nota,
                    progreso: curso.progreso,
                    riesgo: curso.riesgo
                });

                operaciones++;
                cursosCargados++;

                // Máximo recomendado por lote
                if (operaciones >= 450) {
                    await guardarBatch();
                }
            }
        }

        // Guardar las operaciones restantes
        await guardarBatch();

        console.log("");
        console.log("======================================");
        console.log("       CARGA COMPLETADA");
        console.log("======================================");
        console.log(`Estudiantes cargados: ${estudiantesCargados}`);
        console.log(`Cursos cargados: ${cursosCargados}`);
        console.log("======================================");

    } catch (error) {

        console.error("");
        console.error("======================================");
        console.error("         ERROR DE FIRESTORE");
        console.error("======================================");
        console.error(error);

    }
}
// cargar_estudiantes.js (Agregar al final o crear script aparte)
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, updateDoc, getFirestore } from "firebase/firestore";
// ... (tu configuración de Firebase)

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Contraseña temporal para todos (se les puede pedir que la cambien al iniciar sesión)
const CONTRASENA_TEMPORAL = "UNAB123!";

async function crearCuentasParaEstudiantes() {
    const datos = JSON.parse(fs.readFileSync(datosPath, "utf8"));

    for (const estudiante of datos.documents) {
        try {
            // 1. Crear la cuenta de autenticación
            const userCredential = await createUserWithEmailAndPassword(
                auth, 
                estudiante.email, 
                CONTRASENA_TEMPORAL
            );
            const uid = userCredential.user.uid;

            // 2. Actualizar el documento del estudiante en Firestore para guardar su UID
            const studentRef = doc(db, "students", estudiante.documentId);
            await updateDoc(studentRef, { 
                uid: uid, // Guardamos el UID para poder identificarlo al iniciar sesión
                contrasenaTemporal: CONTRASENA_TEMPORAL // Opcional: guardar para avisarle al usuario
            });

            console.log(`✅ Cuenta creada para ${estudiante.email}`);
        } catch (error) {
            console.error(`❌ Error creando cuenta para ${estudiante.email}:`, error.message);
        }
    }
}

crearCuentasParaEstudiantes();
cargarEstudiantes();