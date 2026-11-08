const API_URL = "https://api-riesgo-academico.onrender.com";   // o http://localhost:3000 con el proxy

export const normalizar = texto =>
    texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();

function textoError(detalle) {
    if (Array.isArray(detalle)) {
        return detalle.map(d => `${(d.loc || []).slice(1).join(".")}: ${d.msg}`).join("; ");
    }
    return String(detalle);
}

export async function predecirRiesgo(datos) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60000);
    try {
        const res = await fetch(`${API_URL}/predict`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos),
            signal: controller.signal
        });
        if (!res.ok) {
            let detalle = await res.text();
            try { detalle = textoError(JSON.parse(detalle).detail); } catch { /* texto plano */ }
            throw new Error(`API ${res.status}: ${detalle}`);
        }
        return await res.json();
    } catch (error) {
        if (error.name === "AbortError") throw new Error("The AI service took too long to respond.");
        throw error;
    } finally {
        clearTimeout(timer);
    }
}

// Color según el nivel; los nombres exactos de las clases dependen del modelo
function estadoPorNivel(nivel) {
    const n = normalizar(String(nivel));
    if (/ALT|HIGH/.test(n)) return "danger";
    if (/MED/.test(n)) return "warning";
    if (/BAJ|LOW|BIEN/.test(n)) return "success";
    return "";
}

export function mostrarResultadoIA(data) {
    const out = document.getElementById("resultadoIA");
    out.innerHTML = "";

    const caja = document.createElement("div");
    caja.className = `evaluation-result ${estadoPorNivel(data.nivel_riesgo)}`.trim();

    const titulo = document.createElement("h3");
    titulo.textContent = `Risk level: ${data.nivel_riesgo}`;
    caja.appendChild(titulo);

    if (data.probabilidades) {
        Object.entries(data.probabilidades)
            .sort((a, b) => b[1] - a[1])
            .forEach(([clase, prob]) => {
                const p = document.createElement("p");
                p.textContent = `${clase}: ${(prob * 100).toFixed(1)}%`;
                caja.appendChild(p);
            });
    }
    out.appendChild(caja);
}

export const MATERIAS_IA = [
    "ALGEBRA LINEAL",
    "CALCULO DIFERENCIAL",
    "EXPRESION",
    "FUNDAMENTOS DE PROGRAMACION",
    "SEMINARIO DE INGENIERIA I"
];

const TOTAL_CLASES = 32;   // supuesto, solo se usa si faltan los campos en la base

export function datosIADeMateria(m) {
    const asistidas = m.asistencia_actual ??
        (m.asistencia != null ? Math.round(TOTAL_CLASES * m.asistencia / 100) : undefined);
    const faltadas = m.inasistencia_actual ??
        (asistidas != null ? TOTAL_CLASES - asistidas : m.faltas);
    return {
        SH_1: m.SH_1,
        SF_1: m.SF_1,
        creditos_asignatura: m.creditos_asignatura,
        asistencia_actual: asistidas,
        inasistencia_actual: faltadas
    };
}