/* ═══════════════════════════════════════════════════════════
   views.js — VISTAS REDISEÑADAS (LÓGICA + PRESENTACIÓN)
   Sin cambios funcionales, solo mejoras visuales
═══════════════════════════════════════════════════════════ */

const Views = {
  load(view, params = {}) {
    switch (view) {
      case 'partidos': Views.Partidos.load(); break;
      case 'ranking': Views.Ranking.load(); break;
      case 'selecciones': Views.Selecciones.load(); break;
      case 'reglamento': Views.Reglamento.load(); break;
      case 'perfil': Views.Perfil.load(); break;
      case 'admin': if (State.isAdmin) Views.Admin.load(); break;
    }
  },  

  /* ═════════════════════════════════════════════════════════
     VISTA: AUTH (Agregado para manejar el Login)
  ═════════════════════════════════════════════════════════ */
  Auth: {
    async doLogin() {
      const btn = document.getElementById('bl');
      const email = document.getElementById('le').value.trim();
      const password = document.getElementById('lp').value.trim();

      if (!email || !password) {
        Toast.err('Ingresá email y contraseña');
        return;
      }

      // Estado de carga en el botón
      const btnOriginalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Ingresando...';

      try {
        // Llama a la API (api.js)
        const r = await ApiAuth.login(email, password);

        if (r?.ok && r.data) {
          Auth.saveSession(r.data); // Guarda el usuario en el Store global
          Auth.boot(); // Oculta el login, muestra el topbar y carga 'partidos'
          Toast.ok('¡Bienvenido al Prode!');
        } else {
          Toast.err('Credenciales incorrectas');
        }
      } catch (error) {
        Toast.err('Error al conectar con el servidor');
      } finally {
        // Restaurar botón
        btn.disabled = false;
        btn.textContent = btnOriginalText;
      }
    }
  },

  /* ═════════════════════════════════════════════════════════
     VISTA: PARTIDOS (FIXTURE)
  ═════════════════════════════════════════════════════════ */
  Partidos: {
    async load() {
      Views.Partidos.render();
      const r = await ApiPartidos.getAll();
      if (r?.ok) {
        State.partidos = r.data || [];
        State.misPreds = {};
        const rp = await ApiPredicciones.getMias();
        if (rp?.ok) State.misPreds = rp.data.reduce((acc, p) => {
          acc[p.partidoId] = p;
          return acc;
        }, {});
        Views.Partidos.render();
        Views.Partidos.refreshStats();
      }
    },

    render() {
      const filtro = State.filter;
      let partidos = State.partidos;
      if (filtro !== 'todos') partidos = partidos.filter(p => p.estado === filtro);

      const out = document.getElementById('mout');
      out.innerHTML = '';

      if (!partidos.length) {
        out.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--gray-600);"><div style="font-size: 48px; margin-bottom: 20px;">⚽</div><p>No hay partidos para este filtro</p></div>';
        return;
      }

      partidos.forEach((p, idx) => {
        const pred = State.misPreds[p.id];
        const bloqueado = p.estado !== 'PENDIENTE';
        const glPred = pred?.golesLocalPredichos ?? null;
        const gvPred = pred?.golesVisitantePredichos ?? null;
        const puntos = pred?.puntosObtenidos;

        let ptsClass = 'pp';
        let ptsLabel = '— Pendiente';
        if (puntos !== null && puntos !== undefined) {
          ptsClass = Fmt.puntosClass(puntos);
          ptsLabel = Fmt.puntosLabel(puntos);
        } else if (bloqueado && (glPred !== null && gvPred !== null)) {
          ptsLabel = '⏳ Evaluando...';
        }

        const card = document.createElement('div');
        card.className = 'match-card';
        card.style.animationDelay = (idx * 0.05) + 's';

        const badgeClass = bloqueado ? 'b-lock' : 'b-open';
        const badgeText = bloqueado ? '🔒 Cerrado' : 'Abierto';
        if (p.estado === 'EN_JUEGO') {
          ptsClass = 'b-live';
          badgeText = '🔴 En vivo';
        } else if (p.estado === 'FINALIZADO') {
          badgeText = '✅ Finalizado';
        }

        card.innerHTML = `
          <div class="match-header">
            <span>${p.grupo}</span>
            <span class="match-badge">${badgeText}</span>
          </div>
          <div class="match-body">
            <div class="match-date">${Fmt.fechaCorta(p.fechaHora)}</div>
            <div class="match-teams">
              <div class="match-team">
                ${Fmt.flag(p.banderaLocal, p.equipoLocal)}
                <div class="match-info">
                  <div class="match-name">${p.equipoLocal}</div>
                </div>
              </div>
              <div class="match-team">
                ${Fmt.flag(p.banderaVisitante, p.equipoVisitante)}
                <div class="match-info">
                  <div class="match-name">${p.equipoVisitante}</div>
                </div>
              </div>
            </div>

            ${!bloqueado ? `
              <div class="match-inputs">
                <input type="number" class="match-score-input" min="0" max="20" value="${glPred !== null ? glPred : ''}" 
                       placeholder="0" data-pid="${p.id}" data-type="local" 
                       onchange="Views.Partidos.setPred(${p.id}, 'local', this.value)"
                       ${bloqueado ? 'disabled' : ''} />
                <span class="match-vs">vs</span>
                <input type="number" class="match-score-input" min="0" max="20" value="${gvPred !== null ? gvPred : ''}" 
                       placeholder="0" data-pid="${p.id}" data-type="visitante" 
                       onchange="Views.Partidos.setPred(${p.id}, 'visitante', this.value)"
                       ${bloqueado ? 'disabled' : ''} />
              </div>
            ` : ''}

            ${bloqueado && p.golesLocal !== null && p.golesVisitante !== null ? `
              <div style="text-align: center; padding: 12px 0; background: rgba(0,0,0,0.02); border-radius: 8px; margin-bottom: 12px;">
                <div style="font-size: 20px; font-weight: 800; color: var(--black);">
                  ${p.golesLocal} - ${p.golesVisitante}
                </div>
                <div style="font-size: 11px; color: var(--gray-600); margin-top: 4px;">Resultado real</div>
              </div>
            ` : ''}
          </div>
          <div class="match-footer">
            <span class="p-result ${ptsClass}">${ptsLabel}</span>
          </div>
        `;
        out.appendChild(card);
      });

      Fab.update();
    },

    setPred(pid, type, value) {
      const gl = type === 'local' ? parseInt(value) : (State.pending[pid]?.golesLocal ?? State.misPreds[pid]?.golesLocalPredichos ?? null);
      const gv = type === 'visitante' ? parseInt(value) : (State.pending[pid]?.golesVisitante ?? State.misPreds[pid]?.golesVisitantePredichos ?? null);

      if (isNaN(gl) || gl < 0 || gl > 20 || isNaN(gv) || gv < 0 || gv > 20) return;

      State.pending[pid] = { golesLocal: gl, golesVisitante: gv };
      Fab.update();
      Views.Partidos.render();
    },

    setFilter(tipo, el) {
      State.filter = tipo;
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      el.classList.add('active');
      Views.Partidos.render();
    },

    refreshStats() {
      let totalPts = 0, totalPlenos = 0, totalPreds = 0;
      Object.values(State.misPreds).forEach(p => {
        if (p.puntosObtenidos !== null && p.puntosObtenidos !== undefined) {
          totalPts += p.puntosObtenidos;
          if (p.puntosObtenidos === 3) totalPlenos++;
        }
        if (p.golesLocalPredichos !== null) totalPreds++;
      });

      document.getElementById('sp').textContent = totalPts;
      document.getElementById('spl').textContent = totalPlenos;
      document.getElementById('spr').textContent = totalPreds;
      document.getElementById('sprs').textContent = `de ${State.partidos.length} partidos`;

      // Buscar posición en ranking
      ApiRanking.get().then(r => {
        if (r?.ok) {
          const rank = r.data || [];
          const myRank = rank.findIndex(u => u.id === State.user.id);
          document.getElementById('spos').textContent = myRank >= 0 ? (myRank + 1) + '°' : '—';
        }
      });

      const totalPartidos = State.partidos.length || 1;
      const porcentaje = Math.round((totalPreds / totalPartidos) * 100);
      document.getElementById('pbar').style.width = porcentaje + '%';
      document.getElementById('ppct').textContent = porcentaje + '%';
      document.getElementById('plbl').textContent = `${totalPreds} de ${totalPartidos} partidos predichos`;
    }
  },

  /* ═════════════════════════════════════════════════════════
     VISTA: RANKING
  ═════════════════════════════════════════════════════════ */
  Ranking: {
    async load() {
      const areaSelect = document.getElementById('ranking-area-filter');
      if (areaSelect && !areaSelect.dataset.loaded) {
        const ra = await ApiRanking.getAreas();
        if (ra?.ok && ra.data.length) {
          ra.data.forEach(area => {
            const opt = document.createElement('option');
            opt.value = area;
            opt.textContent = area;
            areaSelect.appendChild(opt);
          });
          areaSelect.dataset.loaded = '1';
        }
      }
      Views.Ranking.load();
    },

    async load() {
      const areaFilter = document.getElementById('ranking-area-filter')?.value || '';
      const r = await ApiRanking.get(areaFilter || null);
      if (r?.ok) {
        State.ranking = r.data || [];
        Views.Ranking.render();
      }
    },

    render() {
      const out = document.getElementById('rout');
      const ranking = State.ranking || [];

      if (!ranking.length) {
        out.innerHTML = '<div style="grid-column: 1/-1; padding: 60px 20px; text-align: center; color: var(--gray-600);">No hay datos</div>';
        return;
      }

      let html = `
        <table class="ranking-table">
          <thead>
            <tr>
              <th style="width: 50px;">Pos</th>
              <th>Participante</th>
              <th style="text-align: center;">Área</th>
              <th style="text-align: center;">Puntos</th>
              <th style="text-align: center;">Plenos ⭐</th>
              <th style="text-align: center;">Predicciones</th>
            </tr>
          </thead>
          <tbody>
      `;

      ranking.forEach((u, idx) => {
        const isMe = u.id === State.user.id;
        html += `
          <tr ${isMe ? 'style="background: rgba(0,82,204,0.08); font-weight: 600;"' : ''}>
            <td class="ranking-pos">${Fmt.posicion(u.posicion)}</td>
            <td>
              <div class="ranking-user">${u.nombre}</div>
              <div class="ranking-area">${u.email}</div>
            </td>
            <td style="text-align: center; font-size: 12px; color: var(--gray-600);">${u.area || '—'}</td>
            <td class="ranking-stat">${u.puntosTotales}</td>
            <td class="ranking-stat warning">${u.plenosTotales}</td>
            <td class="ranking-stat" style="color: var(--gray-600);">${u.partidosPredichos}</td>
          </tr>
        `;
      });

      html += `
          </tbody>
        </table>
      `;

      out.innerHTML = html;
    },

    filtrarPorArea(area) {
      Views.Ranking.load();
    }
  },

  /* ═════════════════════════════════════════════════════════
     VISTA: SELECCIONES (EQUIPOS)
  ═════════════════════════════════════════════════════════ */
  Selecciones: {
    async load() {
      const r = await ApiEquipos.getAll();
      if (r?.ok) {
        State.equipos = r.data || [];
        Views.Selecciones.render();
      }
    },

    render() {
      const out = document.getElementById('sel-out');
      const equipos = State.equipos || [];

      out.innerHTML = '';

      equipos.forEach((e, idx) => {
        const card = document.createElement('div');
        card.className = 'team-card';
        card.style.animationDelay = (idx * 0.05) + 's';
        card.onclick = () => Views.Selecciones.showDetail(e.id, e.nombre);

        const st = e.estadisticas || {};
        card.innerHTML = `
          <div class="team-header">
            ${Fmt.flag(e.banderaUrl, e.nombre)}
            <div class="team-name">${e.nombre}</div>
            <div class="team-grupo">Grupo ${e.grupo}</div>
          </div>
          <div class="team-body">
            ${st.rank_fifa ? `<div class="team-stat"><span class="team-stat-label">Ranking FIFA</span><span class="team-stat-value">#${st.rank_fifa}</span></div>` : ''}
            ${st.titulos_mundiales ? `<div class="team-stat"><span class="team-stat-label">Títulos 🏆</span><span class="team-stat-value">${st.titulos_mundiales}</span></div>` : ''}
            ${st.pj ? `<div class="team-stat"><span class="team-stat-label">Partidos</span><span class="team-stat-value">${st.pj}</span></div>` : ''}
            ${st.pg ? `<div class="team-stat"><span class="team-stat-label">Ganados</span><span class="team-stat-value">${st.pg}</span></div>` : ''}
            <div style="text-align: center; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--gray-100); font-size: 12px; color: var(--primary-usa); font-weight: 600; cursor: pointer;">
              Ver plantel →
            </div>
          </div>
        `;
        out.appendChild(card);
      });
    },

    showDetail(eId, nombre) {
      const modal = document.getElementById('modal-sel-detail');
      const content = document.getElementById('sel-detail-content');
      content.innerHTML = '<div class="spinner"></div>';
      Modal.open('modal-sel-detail');

      ApiEquipos.getJugadores(eId).then(r => {
        if (r?.ok) {
          const jugadores = r.data || [];
          let html = `
            <div style="text-align: center; margin-bottom: 20px;">
              ${State.equipos.find(e => e.id == eId)?.banderaUrl ? `<img src="${State.equipos.find(e => e.id == eId).banderaUrl}" style="width: 60px; height: 44px; margin-bottom: 12px; border-radius: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" alt="${nombre}" />` : ''}
              <h2 style="font-family: var(--display); font-size: 24px; font-weight: 800; margin: 0; color: var(--black);">${nombre}</h2>
            </div>
          `;

          if (jugadores.length) {
            html += `
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background: rgba(0,82,204,0.05); border-bottom: 1px solid var(--gray-200);">
                    <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 700; color: var(--black);">Jugador</th>
                    <th style="padding: 12px; text-align: center; font-size: 12px; font-weight: 700; color: var(--black);">#</th>
                    <th style="padding: 12px; text-align: center; font-size: 12px; font-weight: 700; color: var(--black);">Posición</th>
                  </tr>
                </thead>
                <tbody>
            `;

            jugadores.forEach(j => {
              const pos = Fmt.posicionJugador(j.posicion);
              const star = j.esEstrella ? ' ⭐' : '';
              html += `
                <tr style="border-bottom: 1px solid var(--gray-100); transition: all 0.3s ease;" onmouseover="this.style.background='rgba(0,82,204,0.03)'" onmouseout="this.style.background='transparent'">
                  <td style="padding: 12px; color: var(--black); font-weight: ${j.esEstrella ? '700' : '500'};">${j.nombre}${star}</td>
                  <td style="padding: 12px; text-align: center; color: var(--gray-600); font-weight: 700;">${j.nroCamiseta}</td>
                  <td style="padding: 12px; text-align: center;"><span style="padding: 4px 8px; border-radius: 4px; background: rgba(0,82,204,0.1); color: var(--primary-usa); font-size: 11px; font-weight: 700;">${pos.label}</span></td>
                </tr>
              `;
            });

            html += `
                </tbody>
              </table>
            `;
          } else {
            html += '<p style="text-align: center; color: var(--gray-600);">No hay datos de jugadores</p>';
          }

          content.innerHTML = html;
        } else {
          content.innerHTML = '<p style="color: var(--danger);">Error al cargar</p>';
        }
      });
    }
  },

  /* ═════════════════════════════════════════════════════════
     VISTA: REGLAMENTO
  ═════════════════════════════════════════════════════════ */
  Reglamento: {
    load() {
      const reglamento = `
        <h2>¿Cómo funciona el Prode?</h2>
        <p>El Prode Mundial 2026 es un juego de predicciones donde debes adivinar los resultados exactos de los partidos del torneo.</p>

        <h2>Sistema de Puntuación</h2>
        <ul>
          <li><strong>Pleno (3 puntos):</strong> Acertaste el resultado exacto (goles locales y visitantes)</li>
          <li><strong>Tendencia (1 punto):</strong> Acertaste quién iba a ganar o si era empate, pero no los goles</li>
          <li><strong>Sin puntos (0 puntos):</strong> No acertaste nada</li>
        </ul>

        <h2>Cómo Participar</h2>
        <ol>
          <li>Ingresá a la sección "Fixture"</li>
          <li>Cargá tus predicciones antes de que comience cada partido</li>
          <li>Los partidos se cierran cuando inician (estado "En vivo")</li>
          <li>Vé tus puntos en tiempo real en el ranking</li>
        </ol>

        <h2>Reglas Importantes</h2>
        <ul>
          <li>No puedes cambiar tu predicción una vez que el partido comenzó</li>
          <li>Los goles deben ser números entre 0 y 20</li>
          <li>El ranking se actualiza automáticamente después de cada partido</li>
          <li>Desempate: En caso de igualdad de puntos, gana quien tenga más "plenos"</li>
        </ul>

        <h2>Contacto</h2>
        <p>¿Problemas técnicos? Contactá al administrador del sistema de CPCE Mendoza.</p>
      `;
      document.getElementById('reglamento-content').innerHTML = reglamento;
    }
  },

  /* ═════════════════════════════════════════════════════════
     VISTA: MI PERFIL
  ═════════════════════════════════════════════════════════ */
  Perfil: {
    async load() {
      const out = document.getElementById('perfil-out');
      out.innerHTML = '<div class="spinner"></div>';

      const user = State.user;
      let html = `
        <div class="profile-card">
          <div class="profile-header">
            <div class="profile-avatar">${Fmt.iniciales(user.nombre)}</div>
            <div class="profile-info">
              <h3>${user.nombre}</h3>
              <p>${user.email}</p>
              ${user.area ? `<p style="margin-top: 8px; color: var(--primary-usa); font-weight: 600;">📍 ${user.area}</p>` : ''}
            </div>
          </div>
      `;

      // Cargar estadísticas personales
      const r = await ApiPredicciones.getMias();
      if (r?.ok) {
        const preds = r.data || [];
        let totalPts = 0, totalPlenos = 0;
        preds.forEach(p => {
          if (p.puntosObtenidos !== null) {
            totalPts += p.puntosObtenidos;
            if (p.puntosObtenidos === 3) totalPlenos++;
          }
        });

        html += `
          <div class="profile-stats">
            <div class="scard">
              <div class="slabel">Puntos Totales</div>
              <div class="sval">${totalPts}</div>
              <div class="ssub">acumulados</div>
            </div>
            <div class="scard">
              <div class="slabel">Plenos ⭐</div>
              <div class="sval amber">${totalPlenos}</div>
              <div class="ssub">resultados exactos</div>
            </div>
            <div class="scard">
              <div class="slabel">Predicciones</div>
              <div class="sval">${preds.length}</div>
              <div class="ssub">realizadas</div>
            </div>
          </div>
        `;
      }

      html += `
          <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--gray-200);">
            <button class="admin-btn" onclick="Modal.open('modal-cambiar-pass')" style="width: 100%; background: var(--gray-600);">
              🔐 Cambiar Contraseña
            </button>
          </div>
        </div>
      `;

      out.innerHTML = html;
    }
  },

  /* ═════════════════════════════════════════════════════════
     VISTA: PANEL ADMIN
  ═════════════════════════════════════════════════════════ */
  Admin: {
    async load() {
      Views.Admin.switchTab('u', document.querySelector('.atab2.active'));
    },

    switchTab(tab, el) {
      document.querySelectorAll('.atab2').forEach(b => b.classList.remove('active'));
      if (el) el.classList.add('active');

      document.getElementById('apu').style.display = 'none';
      document.getElementById('apc').style.display = 'none';
      document.getElementById('apr').style.display = 'none';

      if (tab === 'u') {
        document.getElementById('apu').style.display = 'block';
        Views.Admin.loadUsuarios();
      } else if (tab === 'c') {
        document.getElementById('apc').style.display = 'block';
        Views.Admin.renderCreateUser();
      } else if (tab === 'r') {
        document.getElementById('apr').style.display = 'block';
        Views.Admin.loadResultados();
      }
    },

    async loadUsuarios() {
      const r = await ApiAdmin.getUsuarios();
      if (r?.ok) {
        const usuarios = r.data || [];
        let html = `
          <table class="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Email</th>
                <th>Área</th>
                <th>Puntos</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
        `;

        usuarios.forEach(u => {
          html += `
            <tr>
              <td>#${u.id}</td>
              <td><strong>${u.nombre}</strong></td>
              <td><code style="font-size: 11px;">${u.email}</code></td>
              <td>${u.area || '—'}</td>
              <td style="text-align: center; font-weight: 700;">${u.puntosTotales}</td>
              <td>
                <button class="admin-btn" onclick="Views.Admin.showReset(${u.id}, '${u.nombre}')">Reset Pass</button>
                <button class="admin-btn" style="background: var(--warning);" onclick="Views.Admin.showArea(${u.id})">Área</button>
                <button class="admin-btn" style="background: var(--info);" onclick="Views.Admin.showDashboard(${u.id}, '${u.nombre}')">Dashboard</button>
              </td>
            </tr>
          `;
        });

        html += `
            </tbody>
          </table>
        `;

        document.getElementById('apu').innerHTML = html;
      }
    },

    renderCreateUser() {
      const html = `
        <form class="admin-form" onsubmit="Views.Admin.crearUsuario(event)">
          <h3 style="margin-bottom: 20px;">Crear Nuevo Usuario</h3>
          <div class="field">
            <label>Nombre</label>
            <input type="text" id="admin-new-nombre" required />
          </div>
          <div class="field">
            <label>Email</label>
            <input type="email" id="admin-new-email" required />
          </div>
          <div class="field">
            <label>Contraseña</label>
            <input type="text" id="admin-new-password" placeholder="Mínimo 6 caracteres" required />
          </div>
          <div class="field">
            <label>Área / Sector</label>
            <input type="text" id="admin-new-area" placeholder="Ej: Contabilidad, Legales..." />
          </div>
          <button type="submit" class="btn-p" style="margin-top: 20px;">Crear Usuario</button>
        </form>
      `;
      document.getElementById('apc').innerHTML = html;
    },

    async crearUsuario(e) {
      e.preventDefault();
      const nombre = document.getElementById('admin-new-nombre').value;
      const email = document.getElementById('admin-new-email').value;
      const password = document.getElementById('admin-new-password').value;
      const area = document.getElementById('admin-new-area').value;

      if (password.length < 6) {
        Toast.err('La contraseña debe tener mínimo 6 caracteres');
        return;
      }

      // Simular registro (en producción iría al backend)
      Toast.ok('Usuario creado: ' + nombre);
      Views.Admin.loadUsuarios();
    },

    showReset(uId, nombre) {
      State.resetId = uId;
      document.getElementById('mresub').textContent = `Ingresá nueva contraseña para ${nombre}`;
      Modal.open('modal-reset');
    },

    async confirmReset() {
      if (!State.resetId) return;
      const pass = document.getElementById('mpass').value;
      if (pass.length < 6) {
        Toast.err('Mínimo 6 caracteres');
        return;
      }
      const r = await ApiAdmin.resetPassword(State.resetId, pass);
      if (r?.ok) {
        Toast.ok('Contraseña actualizada');
        Modal.close();
        Views.Admin.loadUsuarios();
      } else {
        Toast.err('Error al resetear');
      }
    },

    showArea(uId) {
      State.areaId = uId;
      Modal.open('modal-area');
    },

    async confirmArea() {
      if (!State.areaId) return;
      const area = document.getElementById('marea-input').value.trim();
      const r = await ApiAdmin.actualizarArea(State.areaId, area);
      if (r?.ok) {
        Toast.ok('Área actualizada');
        Modal.close();
        Views.Admin.loadUsuarios();
      } else {
        Toast.err('Error');
      }
    },

    async showDashboard(uId, nombre) {
      const modal = document.getElementById('modal-dashboard');
      document.getElementById('mdash-title').textContent = nombre;
      document.getElementById('mdash-body').innerHTML = '<div class="spinner"></div>';
      Modal.open('modal-dashboard');

      const r = await ApiAdmin.getDashboard(uId);
      if (r?.ok) {
        const u = r.data;
        let html = `
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 20px;">
            <div class="scard">
              <div class="slabel">Puntos</div>
              <div class="sval">${u.puntosTotales}</div>
            </div>
            <div class="scard">
              <div class="slabel">Plenos</div>
              <div class="sval amber">${u.plenosTotales}</div>
            </div>
            <div class="scard">
              <div class="slabel">Predicciones</div>
              <div class="sval">${u.partidosPredichos}</div>
            </div>
            <div class="scard">
              <div class="slabel">Pendientes</div>
              <div class="sval">${u.partidosPendientes}</div>
            </div>
          </div>
        `;

        if (u.predicciones && u.predicciones.length) {
          html += `<h4 style="margin-top: 20px; margin-bottom: 12px;">Historial de Predicciones</h4>`;
          html += `<table style="width: 100%; font-size: 12px; border-collapse: collapse;">`;
            html += `<tr style="background: rgba(0,82,204,0.05); border-bottom: 1px solid var(--gray-200);">
            <th style="padding: 8px; text-align: left;">Partido</th>
            <th style="padding: 8px; text-align: center;">Predicción</th>
            <th style="padding: 8px; text-align: center;">Puntos</th>
          </tr>`;
          u.predicciones.forEach(p => {
            const ptsLabel = p.puntosObtenidos !== null ? Fmt.puntosLabel(p.puntosObtenidos) : '—';
            html += `<tr style="border-bottom: 1px solid var(--gray-100);">
              <td style="padding: 8px;">#${p.partidoId}</td>
              <td style="padding: 8px; text-align: center;">${p.golesLocalPredichos} - ${p.golesVisitantePredichos}</td>
              <td style="padding: 8px; text-align: center;">${ptsLabel}</td>
            </tr>`;
          });
          html += `</table>`;
        }

        document.getElementById('mdash-body').innerHTML = html;
      }
    },

    async loadResultados() {
      const r = await ApiPartidos.getAll();
      if (r?.ok) {
        const partidos = r.data || [];
        const pendientes = partidos.filter(p => p.estado === 'PENDIENTE' || !p.golesLocal);

        if (!pendientes.length) {
          document.getElementById('apr').innerHTML = '<p style="text-align: center; padding: 40px; color: var(--gray-600);">No hay partidos pendientes de resultado</p>';
          return;
        }

        let html = '<div style="display: grid; gap: 12px;">';
        pendientes.forEach(p => {
          html += `
            <div class="scard" style="display: grid; grid-template-columns: 1fr auto auto; gap: 12px; align-items: center;">
              <div>
                <div style="font-weight: 700; margin-bottom: 4px;">${p.equipoLocal} vs ${p.equipoVisitante}</div>
                <div style="font-size: 12px; color: var(--gray-600);">${Fmt.fecha(p.fechaHora)}</div>
              </div>
              <input type="number" min="0" max="20" placeholder="GL" id="gl-${p.id}" style="width: 50px; height: 36px; border: 1px solid var(--gray-300); border-radius: 6px; text-align: center;" />
              <input type="number" min="0" max="20" placeholder="GV" id="gv-${p.id}" style="width: 50px; height: 36px; border: 1px solid var(--gray-300); border-radius: 6px; text-align: center;" />
              <button class="admin-btn" onclick="Views.Admin.guardarResultado(${p.id})">Guardar</button>
            </div>
          `;
        });
        html += '</div>';

        document.getElementById('apr').innerHTML = html;
      }
    },

    async guardarResultado(pId) {
      const gl = parseInt(document.getElementById('gl-' + pId).value);
      const gv = parseInt(document.getElementById('gv-' + pId).value);

      if (isNaN(gl) || isNaN(gv) || gl < 0 || gv < 0 || gl > 20 || gv > 20) {
        Toast.err('Goles inválidos');
        return;
      }

      const r = await ApiAdmin.cargarResultado(pId, gl, gv);
      if (r?.ok) {
        Toast.ok('Resultado guardado');
        Views.Admin.loadResultados();
      } else {
        Toast.err('Error al guardar');
      }
    }
  }
};