export function mostrar(id, actualizarUI) {
    document.querySelectorAll("section").forEach(section => section.classList.remove("active"));
    const section = document.getElementById(id);
    if (section) section.classList.add("active");
    actualizarUI();
}

const UMBRAL_ASISTENCIA = 80; // ajústalo al criterio real de tu equipo

export function nivelRiesgo(m) {
    const notaBaja = m.nota < 3;
    const faltasAltas = m.faltas > 5 || (m.asistencia != null && m.asistencia < UMBRAL_ASISTENCIA);
    if (notaBaja && faltasAltas) return "high";
    if (notaBaja || faltasAltas) return "medium";
    return "low";
}

export function actualizarUI(profile) {
    if (!profile) return;
    const materias = profile.materias || [];
    ["materiaFaltas", "materiaEval"].forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;
        select.innerHTML = '<option value="">Select subject</option>';
        materias.forEach(materia => {
            const option = document.createElement("option");
            option.value = materia.nombre;
            option.textContent = materia.nombre;
            select.appendChild(option);
        });
    });

    const total = materias.length;
    const riesgoAlto = materias.filter(m => nivelRiesgo(m) === "high").length;
    const riesgoMedio = materias.filter(m => nivelRiesgo(m) === "medium").length;
    document.getElementById("stats").innerHTML = `
        <div class="stat-card"><h3>${total}</h3><p>Total Subjects</p></div>
        <div class="stat-card"><h3 class="risk-medium">${riesgoMedio}</h3><p>Medium Risk</p></div>
        <div class="stat-card"><h3 class="risk-high">${riesgoAlto}</h3><p>High Risk</p></div>`;

    const tbody = document.getElementById("listaMaterias");
    tbody.innerHTML = "";
    materias.forEach((materia, index) => {
        const enRiesgo = nivelRiesgo(materia) !== "low";
        const row = tbody.insertRow();
        row.insertCell(0).textContent = materia.nombre;
        row.insertCell(1).textContent = materia.nota;
        row.insertCell(2).textContent = materia.asistencia != null
            ? `${materia.faltas} (${materia.asistencia}% att.)`
            : materia.faltas;
        row.insertCell(3).innerHTML = `<span class="${enRiesgo ? "bad" : "good"}">${enRiesgo ? "⚠️ At risk" : "✅ Good"}</span>`;
        row.insertCell(4).innerHTML = `
            <button class="edit-btn" data-index="${index}" data-accion="editar">✏️</button>
            <button class="delete-btn" data-index="${index}" data-accion="eliminar">🗑️</button>`;
    });
    if (!materias.length) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">📭 No subjects added</td></tr>';
}

export function mostrarResultado(materia) {
    const nivel = nivelRiesgo(materia);
    const textos = {
        high: ["🔴 HIGH RISK", "danger", "Immediate attention required! Low performance and many absences."],
        medium: ["🟡 MEDIUM RISK", "warning",
            materia.nota < 3 ? "Improve your grade. Study more." : "Reduce your absences."],
        low: ["🟢 DOING WELL", "success", "Keep it up. Maintain good performance."]
    };
    const [resultado, estado, recomendacion] = textos[nivel];
    const asistencia = materia.asistencia != null ? ` | Attendance: ${materia.asistencia}%` : "";
    document.getElementById("resultadoEvaluacion").innerHTML = `
        <div class="evaluation-result ${estado}">
            <h3>${resultado}</h3>
            <p><strong>${materia.nombre}</strong> - Grade: ${materia.nota} | Absences: ${materia.faltas}${asistencia}</p>
            <p>💡 ${recomendacion}</p>
        </div>`;
}