import { collection, getDocs } from "firebase/firestore";
import { obtenerEstudiante } from "./auth.js";

let baseCache = [];   // cursos leídos de Firestore (solo lectura)

const key = user => `alerta_materias_${user.uid}`;

function leerLocal(user) {
    try {
        return { extras: [], cambios: {}, eliminadas: [], ...JSON.parse(localStorage.getItem(key(user))) };
    } catch {
        return { extras: [], cambios: {}, eliminadas: [] };
    }
}

function guardarLocal(user, data) {
    localStorage.setItem(key(user), JSON.stringify(data));
}

function combinar(user) {
    const local = leerLocal(user);
    const base = baseCache
        .filter(m => !local.eliminadas.includes(m.nombre))
        .map(m => ({ ...m, ...(local.cambios[m.nombre] || {}) }));
    return [...base, ...local.extras];
}

export async function cargarMaterias(user) {
    baseCache = [];
    const est = await obtenerEstudiante(user);
    if (est) {
        const snap = await getDocs(collection(est.ref, "Cursos"));
        baseCache = snap.docs.map(d => {
            const c = d.data();
            return {
                nombre: c.Materia,
                nota: c.Nota ?? c.nota,
                faltas: 0,
                asistencia: c.asistencia,
                progreso: c.progreso,
                riesgo: c.riesgo,
                SH_1: c.SH_1,
                SF_1: c.SF_1,
                creditos_asignatura: c.creditos_asignatura,
                asistencia_actual: c.asistencia_actual,
                inasistencia_actual: c.inasistencia_actual
            };
        });
    }
    return combinar(user);
}
// Aplica cambios a una materia (extra local o curso de Firestore)
function modificar(user, nombre, campos) {
    const local = leerLocal(user);
    const extra = local.extras.find(m => m.nombre === nombre);
    if (extra) Object.assign(extra, campos);
    else local.cambios[nombre] = { ...(local.cambios[nombre] || {}), ...campos };
    guardarLocal(user, local);
}

export async function agregarMateria(user, profile, nombre, nota) {
    if (!user) return { success: false, error: "Not logged in" };
    if ((profile.materias || []).some(m => m.nombre.toLowerCase() === nombre.toLowerCase())) {
        return { success: false, error: "Subject already exists" };
    }
    const local = leerLocal(user);
    local.eliminadas = local.eliminadas.filter(n => n !== nombre);
    local.extras.push({ nombre, nota, faltas: 0 });
    guardarLocal(user, local);
    profile.materias = combinar(user);
    return { success: true };
}

export async function editarMateria(user, profile, index, nota) {
    const materia = (profile.materias || [])[index];
    if (!user) return { success: false, error: "Not logged in" };
    if (!materia) return { success: false, error: "Invalid index" };
    modificar(user, materia.nombre, { nota });
    profile.materias = combinar(user);
    return { success: true };
}

export async function eliminarMateria(user, profile, index) {
    const materia = (profile.materias || [])[index];
    if (!user) return { success: false, error: "Not logged in" };
    if (!materia) return { success: false, error: "Invalid index" };
    const local = leerLocal(user);
    const eraExtra = local.extras.some(m => m.nombre === materia.nombre);
    if (eraExtra) local.extras = local.extras.filter(m => m.nombre !== materia.nombre);
    else local.eliminadas.push(materia.nombre);
    guardarLocal(user, local);
    profile.materias = combinar(user);
    return { success: true };
}

export async function guardarFaltas(user, profile, nombreMateria, faltas) {
    if (!user) return { success: false, error: "Not logged in" };
    modificar(user, nombreMateria, { faltas });
    profile.materias = combinar(user);
    return { success: true };
}

// Solo borra los datos locales; Firestore no se toca
export async function eliminarPerfil(user) {
    localStorage.removeItem(key(user));
}