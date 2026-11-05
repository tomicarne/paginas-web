const API_URL = "https://api-riesgo-academico.onrender.com";
const ENDPOINT = "/predict";   // AJUSTAR según /docs

// AJUSTAR: los nombres de campo que espera la API
function construirPayload(materia, semestre) {
    return {
        nota: materia.nota,
        asistencia: materia.asistencia,
        progreso: materia.progreso,
        semestre
    };
}

export async function predecirRiesgo(materia, semestre) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60000);
    try {
        const res = await fetch(API_URL + ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(construirPayload(materia, semestre)),
            signal: controller.signal
        });
        if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
        return await res.json();
    } catch (error) {
        if (error.name === "AbortError") throw new Error("The AI service took too long to respond.");
        throw error;
    } finally {
        clearTimeout(timer);
    }
}

// AJUSTAR: muestra la respuesta; por ahora imprime el JSON tal cual
export function mostrarResultadoIA(data) {
    const out = document.getElementById("resultadoIA");
    out.innerHTML = "";
    const pre = document.createElement("pre");
    pre.textContent = JSON.stringify(data, null, 2);
    out.appendChild(pre);
}