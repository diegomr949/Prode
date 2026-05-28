/* ═══════════════════════════════════════════════════════════
   api.js — ADAPTADO PARA NODE.JS / EXPRESS
   Manejo de JWT y peticiones RESTful estándar
═══════════════════════════════════════════════════════════ */

// La URL base ahora es tu propio servidor Node.js (ruta relativa /api/)
const API_BASE = window.location.origin + '/api/';
const TIMEOUT_MS = 15_000;

/* ── HTTP helper nativo ── */
async function http(path, method = 'GET', body = null) {
    const token = localStorage.getItem('PRODE_TOKEN');
    
    // 1. Limpiamos la ruta (quitamos la barra '/' inicial si existe)
    let cleanPath = path;
    if (cleanPath.startsWith('/')) {
        cleanPath = cleanPath.substring(1);
    }
    
    // 2. Armamos la URL final
    let url = API_BASE + cleanPath;

    // 3. Configuramos los Headers (inyectamos el JWT de forma segura)
    const headers = { 
        'Content-Type': 'application/json' 
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const ctrl = new AbortController();
    const tid  = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

    const options = { 
        method: method, 
        headers: headers, 
        signal: ctrl.signal 
    };

    if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
    }

    try {
        const res = await fetch(url, options);
        clearTimeout(tid);

        const data = await res.json();

        // 4. Manejo global de expiración de sesión (JWT inválido o vencido)
        if (res.status === 401 || (data.error && data.code === 401)) {
            if (typeof Auth !== 'undefined') Auth.logout();
            if (typeof Toast !== 'undefined') Toast.info('Tu sesión expiró. Iniciá sesión nuevamente.');
            return null;
        }

        return { ok: !data.error, status: data.code || res.status, data: data.data };

    } catch (e) {
        clearTimeout(tid);
        if (e.name === 'AbortError') {
            if (typeof Toast !== 'undefined') Toast.err('El servidor tardó demasiado.');
        } else {
            if (typeof Toast !== 'undefined') Toast.err('Error de conexión con el servidor.');
            console.error('[API Error]:', e);
        }
        return null;
    }
}

// ---------------------------------------------------------
// REPOSITORIOS DE DATOS
// ---------------------------------------------------------

const ApiAuth = {
    login:  async (email, password) => {
        const r = await http('auth/login', 'POST', { email, password });
        if (r?.ok && r.data.token) localStorage.setItem('PRODE_TOKEN', r.data.token);
        return r;
    },
    registro: async (nombre, email, password, area) => {
        const r = await http('auth/registro', 'POST', { nombre, email, password, area });
        if (r?.ok && r.data.token) localStorage.setItem('PRODE_TOKEN', r.data.token);
        return r;
    },
    me:     () => http('auth/me'),
    logout: () => localStorage.removeItem('PRODE_TOKEN')
};

const ApiPartidos = {
    // Usamos query params estándar (con '?')
    getAll: (estado = null) => http('partidos' + (estado ? `?estado=${encodeURIComponent(estado)}` : '')),
};

const ApiPredicciones = {
    // Las predicciones las anidamos bajo el router de partidos en el backend
    getMias: () => http('partidos/predicciones/mis-predicciones'),
    guardar(pid, gl, gv) {
        if (!Number.isInteger(pid) || pid <= 0) return null;
        if (!Number.isInteger(gl) || gl < 0 || gl > 20) return null;
        if (!Number.isInteger(gv) || gv < 0 || gv > 20) return null;
        return http('partidos/predicciones', 'POST', { partidoId: pid, golesLocal: gl, golesVisitante: gv });
    },
};

const ApiRanking = {
    get:      (area = null) => http('ranking' + (area ? `?area=${encodeURIComponent(area)}` : '')),
    getAreas: () => http('ranking/areas'),
};

const ApiEquipos = {
    getAll:       ()   => http('equipos'),
    getJugadores: (id) => http(`equipos/${id}/jugadores`)
};

const ApiAdmin = {
    getUsuarios:     () => http('admin/usuarios'),
    getDashboard:    (id) => http(`admin/usuarios/${id}/dashboard`),
    resetPassword:   (id, p) => http(`admin/usuarios/${id}/reset-password`, 'PUT', { nuevaPassword: p }),
    actualizarArea:  (id, area) => http(`admin/usuarios/${id}/area`, 'PUT', { area: area || null }),
    getAreas:        () => http('ranking/areas'), 
    cargarResultado: (pid, gl, gv) => http(`admin/partidos/${pid}/resultado`, 'PUT', { golesLocal: gl, golesVisitante: gv }),
};

const ApiPerfil = {
    cambiarPassword: (passwordActual, nuevaPassword) => http('perfil/cambiar-password', 'PUT', { passwordActual, nuevaPassword }),
};