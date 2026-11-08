import { auth } from "./firebase.js";
import { cambiarPassword, cargarPerfil, escucharAuth, login, logout, registrar } from "./auth.js";
import { agregarMateria, cargarMaterias, editarMateria, eliminarMateria, eliminarPerfil, guardarFaltas } from "./materias.js";
import { actualizarUI, mostrar, mostrarResultado } from "./ui.js";
import { predecirRiesgo, mostrarResultadoIA, normalizar, datosIADeMateria } from "./ia.js";
let currentUser = null;
let userProfile = null;

function refreshUI() {
    actualizarUI(userProfile);
}

function showMessage(id, message, type = "error") {
    document.getElementById(id).innerHTML = `<div class="alert alert-${type}">${message}</div>`;
}

function setLoggedOutUI() {
    document.getElementById("menu").style.display = "none";
    document.getElementById("login").style.display = "flex";
    document.querySelectorAll("section").forEach(section => section.classList.remove("active"));
    document.getElementById("login").classList.add("active");
}

escucharAuth(async user => {
    currentUser = user;
    if (!user) {
        userProfile = null;
        setLoggedOutUI();
        return;
    }

    try {
        userProfile = await cargarPerfil(user);
        userProfile.materias = await cargarMaterias(user);
    } catch (error) {
        userProfile = { nombre: "", fechaRegistro: new Date().toISOString(), materias: [] };
        console.error("No se pudo cargar el perfil de Firestore:", error);
    }

    document.getElementById("login").style.display = "none";
    document.getElementById("menu").style.display = "flex";
    document.getElementById("userInfo").textContent = `👋 ${user.email} | ${userProfile.nombre || ""}`;
    document.getElementById("perfilUsuario").textContent = user.email;
    document.getElementById("perfilNombre").textContent = userProfile.nombre || "";
    document.getElementById("perfilFecha").textContent = new Date(userProfile.fechaRegistro).toLocaleDateString();
    mostrar("inicio", refreshUI);
});
document.getElementById("toggleLink").addEventListener("click", () => {
    const isLogin = document.getElementById("btnLogin").textContent === "Sign In";
    document.getElementById("formTitle").textContent = isLogin ? "Register" : "Sign In";
    document.getElementById("btnLogin").textContent = isLogin ? "Register" : "Sign In";
    document.getElementById("nombreCompleto").classList.toggle("hidden", !isLogin);
    // Agregar esto:
    document.getElementById("idEstudiante").classList.toggle("hidden", !isLogin);
    document.getElementById("programa").classList.toggle("hidden", !isLogin);
    document.getElementById("semestre").classList.toggle("hidden", !isLogin);
    document.getElementById("toggleLink").textContent = isLogin ? "Already have an account? Sign In" : "Don't have an account? Register";
    document.getElementById("loginMessage").innerHTML = "";
});

document.getElementById("btnLogin").addEventListener("click", async () => {
    const email = document.getElementById("usuario").value.trim();
    const password = document.getElementById("password").value;
    const idEstudiante = document.getElementById("idEstudiante").value.trim();
    const isLogin = document.getElementById("btnLogin").textContent === "Sign In";

    if (!email || !password || (!isLogin && !idEstudiante)) {
        return showMessage("loginMessage", "❌ Please fill all fields");
    }
    if (!isLogin && password.length < 6) {
        return showMessage("loginMessage", "❌ Password must be at least 6 characters");
    }

    const result = isLogin
        ? await login(email, password)
        : await registrar(email, password, "", idEstudiante);

    if (!result.success) return showMessage("loginMessage", `❌ ${result.error}`);
    if (!isLogin) showMessage("loginMessage", "✅ Registration successful! You are now logged in.", "success");
});
document.getElementById("btnLogout").addEventListener("click", logout);
document.querySelectorAll("#menu .links button[data-seccion]").forEach(button => {
    button.addEventListener("click", () => mostrar(button.dataset.seccion, refreshUI));
});

document.getElementById("btnAgregarMateria").addEventListener("click", async () => {
    const nombre = document.getElementById("materia").value.trim();
    const nota = parseFloat(document.getElementById("nota").value);
    if (!nombre) return alert("❌ Enter subject name");
    if (isNaN(nota) || nota < 0 || nota > 5) return alert("❌ Grade must be between 0 and 5");
    const result = await agregarMateria(currentUser, userProfile, nombre, nota);
    if (!result.success) return alert("❌ " + result.error);
    document.getElementById("materia").value = "";
    document.getElementById("nota").value = "";
    refreshUI();
});

document.getElementById("listaMaterias").addEventListener("click", async event => {
    const target = event.target.closest("button");
    if (!target) return;
    const index = parseInt(target.dataset.index);
    if (target.dataset.accion === "editar") {
        const materia = userProfile.materias[index];
        const value = prompt("New grade for " + materia.nombre, materia.nota);
        const nota = parseFloat(value);
        if (value !== null && !isNaN(nota) && nota >= 0 && nota <= 5) {
            const result = await editarMateria(currentUser, userProfile, index, nota);
            if (!result.success) alert("❌ " + result.error); else refreshUI();
        }
    } else if (target.dataset.accion === "eliminar" && confirm("Delete this subject?")) {
        const result = await eliminarMateria(currentUser, userProfile, index);
        if (!result.success) alert("❌ " + result.error); else refreshUI();
    }
});

document.getElementById("btnGuardarFaltas").addEventListener("click", async () => {
    const nombre = document.getElementById("materiaFaltas").value;
    const faltas = parseInt(document.getElementById("faltasNum").value);
    if (!nombre) return alert("Select a subject");
    if (isNaN(faltas) || faltas < 0) return alert("Enter a valid number of absences");
    const result = await guardarFaltas(currentUser, userProfile, nombre, faltas);
    if (!result.success) return alert( result.error);
    document.getElementById("faltasNum").value = "";
    refreshUI();
});

document.getElementById("btnEvaluar").addEventListener("click", () => {
    const nombre = document.getElementById("materiaEval").value;
    const materia = (userProfile?.materias || []).find(item => item.nombre === nombre);
    if (materia) mostrarResultado(materia);
});

document.getElementById("btnCambiarPass").addEventListener("click", async () => {
    const password = document.getElementById("nuevaPass").value;
    const confirmPassword = document.getElementById("confirmPass").value;
    if (!password || password.length < 6) return showMessage("perfilMessage", "❌ Password must be at least 6 characters");
    if (password !== confirmPassword) return showMessage("perfilMessage", "❌ Passwords do not match");
    try {
        await cambiarPassword(auth.currentUser, password);
        showMessage("perfilMessage", "✅ Password updated successfully", "success");
        document.getElementById("nuevaPass").value = "";
        document.getElementById("confirmPass").value = "";
    } catch (error) { showMessage("perfilMessage", ` ${error.message}`); }
});

document.getElementById("btnExportar").addEventListener("click", () => {
    if (!userProfile) return;
    const data = JSON.stringify({ email: currentUser.email, ...userProfile }, null, 2);
    const url = URL.createObjectURL(new Blob([data], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${currentUser.email}_academic_data.json`;
    link.click();
    URL.revokeObjectURL(url);
});

document.getElementById("btnEliminarCuenta").addEventListener("click", async () => {
    if (!confirm("⚠️ Are you sure? All your data will be permanently deleted.")) return;
    try {
        await eliminarPerfil(currentUser);
        await currentUser.delete();
        await logout();
    } catch (error) { alert("❌ Error deleting account: " + error.message); }
});

const buscarMateria = nombre => (userProfile?.materias || []).find(m => m.nombre === nombre);

document.getElementById("materiaIA").addEventListener("change", event => {
    const m = (userProfile?.materias || []).find(x => normalizar(x.nombre) === event.target.value);
    const d = m ? datosIADeMateria(m) : {};
    const poner = (id, valor) => { document.getElementById(id).value = valor ?? ""; };
    poner("sh1IA", d.SH_1);
    poner("sf1IA", d.SF_1);
    poner("creditosIA", d.creditos_asignatura);
    poner("asistenciaIA", d.asistencia_actual);
    poner("inasistenciaIA", d.inasistencia_actual);
});

document.getElementById("btnPredecirIA").addEventListener("click", async () => {
    const nombre = document.getElementById("materiaIA").value;
    if (!nombre) return alert("Select a subject");

    const num = id => parseFloat(document.getElementById(id).value);
    const datos = {
        SH_1: num("sh1IA"),
        SF_1: num("sf1IA"),
        creditos_asignatura: num("creditosIA"),
        asistencia_actual: num("asistenciaIA"),
        inasistencia_actual: num("inasistenciaIA"),
        asignatura: nombre
    };

    if ([datos.SH_1, datos.SF_1].some(v => isNaN(v) || v < 0 || v > 5)) return alert("SH_1 and SF_1 must be between 0 and 5");
    if (isNaN(datos.creditos_asignatura) || datos.creditos_asignatura <= 0) return alert("Credits must be greater than 0");
    if ([datos.asistencia_actual, datos.inasistencia_actual].some(v => isNaN(v) || v < 0)) return alert("Attendance values must be 0 or more");

    const boton = document.getElementById("btnPredecirIA");
    const out = document.getElementById("resultadoIA");
    boton.disabled = true;
    out.textContent = "⏳ Contacting the AI service (the first request can take up to a minute)...";
    try {
        mostrarResultadoIA(await predecirRiesgo(datos));
    } catch (error) {
        out.textContent = "❌ " + error.message;
    } finally {
        boton.disabled = false;
    }
});