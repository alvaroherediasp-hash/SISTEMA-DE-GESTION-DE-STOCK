// ============================================================
// SISTEMA LICEO RUGBY CLUB - FIREBASE
// ============================================================

function puestosOptions() {
  const puestos = [
    '', '1 - Pilar Izquierdo', '2 - Hooker', '3 - Pilar Derecho',
    '4 - Segunda Línea', '5 - Segunda Línea', '6 - Tercera Línea',
    '7 - Tercera Línea', '8 - Tercera Línea', '9 - Medio Scrum',
    '10 - Apertura', '11 - Wing', '12 - Centro', '13 - Centro',
    '14 - Wing', '15 - Fullback'
  ];
  return `<option value="">Seleccionar...</option>${puestos.map(p => `<option>${p}</option>`).join('')}`;
}

// ============================================================
// COLECCIONES
// ============================================================
const jugRef = db.collection('jugadores');
const asiRef = db.collection('asistencia');
const ccRef = db.collection('cuotasClub');
const cuRef = db.collection('cuotasUnion');
const parRef = db.collection('partidos');
const pagRef = db.collection('pagosPartido');

// ============================================================
// NAVEGACIÓN
// ============================================================
document.querySelectorAll('.nav-links a').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    document.querySelectorAll('.nav-links a').forEach(x => x.classList.remove('active'));
    a.classList.add('active');
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(`section-${a.dataset.section}`).classList.add('active');
    const fn = {
      buscar: () => {},
      jugadores: cargarJugadores,
      asistencia: initAsistencia,
      'cuotas-club': cargarCuotasClub,
      'cuotas-union': cargarCuotasUnion,
      partidos: cargarPartidos
    }[a.dataset.section];
    if (fn) fn();
  });
});

// ============================================================
// BUSCAR
// ============================================================
let debounceTimer;
document.getElementById('buscarInput').addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(buscarJugadores, 300);
});

async function buscarJugadores() {
  const q = document.getElementById('buscarInput').value.trim().toLowerCase();
  const div = document.getElementById('resultadosBusqueda');
  if (!q) { div.innerHTML = '<p class="muted">Escribí para buscar...</p>'; return; }

  const snap = await jugRef.get();
  const jugadores = [];
  snap.forEach(d => {
    const j = d.data(); j.id = d.id;
    if (j.nombre?.toLowerCase().includes(q) || (j.apellido || '').toLowerCase().includes(q) || j.dni?.includes(q)) {
      jugadores.push(j);
    }
  });

  if (!jugadores.length) { div.innerHTML = '<p class="muted">Sin resultados</p>'; return; }

  div.innerHTML = `<div class="result-grid">
    ${jugadores.map(j => `
      <div class="card" onclick="verDetalle('${j.id}')">
        <div class="card-info">
          <div class="nombre">${j.nombre}${j.apellido ? ' ' + j.apellido : ''}</div>
          ${j.apodo ? `<div class="apodo">"${j.apodo}"</div>` : ''}
          <div class="dni">📄 ${j.dni}</div>
          ${j.p1 ? `<div class="puesto">${j.p1}</div>` : ''}
        </div>
      </div>
    `).join('')}
  </div>`;
}

// ============================================================
// JUGADORES
// ============================================================
let jugadoresCache = [];

async function cargarJugadores() {
  const snap = await jugRef.orderBy('nombre').get();
  jugadoresCache = [];
  snap.forEach(d => { const j = d.data(); j.id = d.id; jugadoresCache.push(j); });
  renderJugadores(jugadoresCache);
}

function renderJugadores(lista) {
  const div = document.getElementById('jugadoresLista');
  if (!lista.length) { div.innerHTML = '<p class="muted">No hay jugadores</p>'; return; }
  div.innerHTML = `<div class="result-grid">
    ${lista.map(j => `
      <div class="card" onclick="verDetalle('${j.id}')">
        <div class="card-info">
          <div class="nombre">${j.nombre}${j.apellido ? ' ' + j.apellido : ''}</div>
          ${j.apodo ? `<div class="apodo">"${j.apodo}"</div>` : ''}
          <div class="dni">📄 ${j.dni}</div>
          ${j.p1 ? `<div class="puesto">${j.p1}</div>` : ''}
        </div>
      </div>
    `).join('')}
  </div>`;
}

document.getElementById('btnNuevoJugador').addEventListener('click', () => abrirModalEditar(null));

function abrirModalEditar(jugador) {
  document.getElementById('modalTitulo').textContent = jugador ? 'Editar Jugador' : 'Nuevo Jugador';
  document.getElementById('editId').value = jugador?.id || '';
  document.getElementById('editDni').value = jugador?.dni || '';
  document.getElementById('editNombre').value = jugador?.nombre || '';
  document.getElementById('editApodo').value = jugador?.apodo || '';
  document.getElementById('editCelular').value = jugador?.celular || '';
  document.getElementById('editCorreo').value = jugador?.correo || '';
  document.getElementById('editP1').value = jugador?.p1 || '';
  document.getElementById('editP2').value = jugador?.p2 || '';
  document.getElementById('editP3').value = jugador?.p3 || '';
  document.getElementById('modalEditar').classList.add('show');
}

async function guardarJugador() {
  const id = document.getElementById('editId').value;
  const data = {
    nombre: document.getElementById('editNombre').value,
    apellido: '',
    dni: document.getElementById('editDni').value,
    apodo: document.getElementById('editApodo').value,
    celular: document.getElementById('editCelular').value,
    correo: document.getElementById('editCorreo').value,
    p1: document.getElementById('editP1').value,
    p2: document.getElementById('editP2').value,
    p3: document.getElementById('editP3').value
  };
  if (!data.dni || !data.nombre) { alert('DNI y Nombre obligatorios'); return; }

  try {
    if (id) {
      await jugRef.doc(id).update(data);
    } else {
      await jugRef.add(data);
    }
    cerrarModal('modalEditar');
    cargarJugadores();
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

function cerrarModal(id) {
  document.getElementById(id).classList.remove('show');
}

async function verDetalle(id) {
  const doc = await jugRef.doc(id).get();
  if (!doc.exists) return;
  const j = doc.data();
  document.getElementById('detalleBody').innerHTML = `
    <div class="detail-grid">
      <div class="detail-item"><span class="label">Nombre</span><span class="value">${j.nombre}${j.apellido || ''}</span></div>
      <div class="detail-item"><span class="label">Apodo</span><span class="value">${j.apodo || '-'}</span></div>
      <div class="detail-item"><span class="label">DNI</span><span class="value">${j.dni}</span></div>
      <div class="detail-item"><span class="label">Celular</span><span class="value">${j.celular || '-'}</span></div>
      <div class="detail-item"><span class="label">Correo</span><span class="value">${j.correo || '-'}</span></div>
      <div class="detail-item"><span class="label">Puesto 1</span><span class="value badge-puesto">${j.p1 || '-'}</span></div>
      <div class="detail-item"><span class="label">Puesto 2</span><span class="value">${j.p2 || '-'}</span></div>
      <div class="detail-item"><span class="label">Puesto 3</span><span class="value">${j.p3 || '-'}</span></div>
    </div>`;

  document.getElementById('btnEditarJugador').onclick = () => {
    cerrarModal('modalDetalle');
    abrirModalEditar(j);
  };
  document.getElementById('btnEliminarJugador').onclick = async () => {
    if (confirm('¿Eliminar jugador?')) {
      await jugRef.doc(id).delete();
      cerrarModal('modalDetalle');
      cargarJugadores();
    }
  };
  document.getElementById('modalDetalle').classList.add('show');
}

// ============================================================
// ASISTENCIA ENTRENAMIENTO
// ============================================================
function initAsistencia() {
  const now = new Date();
  const y = now.getFullYear();
  const w = Math.ceil((now - new Date(y, 0, 1)) / (7 * 86400000));
  document.getElementById('semanaAsistencia').value = `${y}-W${String(w).padStart(2, '0')}`;
  cargarAsistencia();
}

async function cargarAsistencia() {
  const semana = document.getElementById('semanaAsistencia').value;
  const snap = await asiRef.where('semana', '==', semana).get();
  const asistencias = {};
  snap.forEach(d => { asistencias[d.data().jugador_id] = d.data(); });

  const jugSnap = await jugRef.orderBy('nombre').get();
  const tbody = document.getElementById('asistenciaBody');
  tbody.innerHTML = '';

  jugSnap.forEach(d => {
    const j = d.data();
    const a = asistencias[d.id] || { d1: false, d2: false, d3: false, estado: 'no_asistio' };
    const cls = a.estado === 'completo' ? 'bg-green' : a.estado === 'incompleto' ? 'bg-yellow' : 'bg-red';
    const txt = a.estado === 'completo' ? 'Completo' : a.estado === 'incompleto' ? 'Incompleto' : 'No asistió';
    tbody.innerHTML += `<tr>
      <td>${j.nombre}${j.apellido ? ' ' + j.apellido : ''}</td>
      <td><input type="checkbox" ${a.d1 ? 'checked' : ''} onchange="toggleAsistencia('${d.id}','${semana}',1,this.checked)" /></td>
      <td><input type="checkbox" ${a.d2 ? 'checked' : ''} onchange="toggleAsistencia('${d.id}','${semana}',2,this.checked)" /></td>
      <td><input type="checkbox" ${a.d3 ? 'checked' : ''} onchange="toggleAsistencia('${d.id}','${semana}',3,this.checked)" /></td>
      <td><span class="badge ${cls}">${txt}</span></td>
    </tr>`;
  });
}

async function toggleAsistencia(jugId, semana, dia, checked) {
  const docId = `${jugId}_${semana}`;
  const ref = asiRef.doc(docId);
  const snap = await ref.get();
  const data = snap.exists ? snap.data() : { jugador_id: jugId, semana, d1: false, d2: false, d3: false, estado: 'no_asistio' };
  data[`d${dia}`] = checked;
  const count = [data.d1, data.d2, data.d3].filter(Boolean).length;
  data.estado = count === 3 ? 'completo' : count > 0 ? 'incompleto' : 'no_asistio';
  await ref.set(data);
  cargarAsistencia();
}

async function generarTodasAsistencias() {
  const semana = document.getElementById('semanaAsistencia').value;
  const jugSnap = await jugRef.get();
  const batch = db.batch();
  jugSnap.forEach(d => {
    const docId = `${d.id}_${semana}`;
    batch.set(asiRef.doc(docId), { jugador_id: d.id, semana, d1: false, d2: false, d3: false, estado: 'no_asistio' }, { merge: true });
  });
  await batch.commit();
  cargarAsistencia();
}

// ============================================================
// CUOTAS CLUB
// ============================================================
async function cargarCuotasClub() {
  const anio = parseInt(document.getElementById('anioCuotasClub').value);
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const jugSnap = await jugRef.orderBy('nombre').get();
  const tbody = document.getElementById('cuotasClubBody');
  tbody.innerHTML = '';

  jugSnap.forEach(async (d) => {
    const j = d.data();
    let html = `<tr><td>${j.nombre}${j.apellido ? ' ' + j.apellido : ''}</td>`;
    for (let m = 1; m <= 12; m++) {
      const docId = `${d.id}_${m}_${anio}`;
      const snap = await ccRef.doc(docId).get();
      const checked = snap.exists && snap.data().pagado ? 'checked' : '';
      html += `<td><input type="checkbox" ${checked} onchange="toggleCuotaClub('${d.id}',${m},${anio},this.checked)" /></td>`;
    }
    html += '</tr>';
    tbody.innerHTML += html;
  });
}

async function toggleCuotaClub(jugId, mes, anio, checked) {
  await ccRef.doc(`${jugId}_${mes}_${anio}`).set({ jugador_id: jugId, mes, anio, pagado: checked }, { merge: true });
}

// ============================================================
// CUOTAS UNIÓN
// ============================================================
async function cargarCuotasUnion() {
  const anio = parseInt(document.getElementById('anioCuotasUnion').value);
  const jugSnap = await jugRef.orderBy('nombre').get();
  const tbody = document.getElementById('cuotasUnionBody');
  tbody.innerHTML = '';

  jugSnap.forEach(async (d) => {
    const j = d.data();
    const snap = await cuRef.doc(`${d.id}_${anio}`).get();
    const c = snap.exists ? snap.data() : {};
    tbody.innerHTML += `<tr>
      <td>${j.nombre}${j.apellido ? ' ' + j.apellido : ''}</td>
      <td><input type="checkbox" ${c.c1_check ? 'checked' : ''} onchange="toggleCuotaUnion('${d.id}',${anio},'c1_check',this.checked)" /></td>
      <td><input type="number" class="inp-sm" value="${c.c1_importe || ''}" onchange="toggleCuotaUnion('${d.id}',${anio},'c1_importe',this.value)" /></td>
      <td><input type="text" class="inp-sm" value="${c.c1_medio || ''}" placeholder="Medio" onchange="toggleCuotaUnion('${d.id}',${anio},'c1_medio',this.value)" /></td>
      <td><input type="checkbox" ${c.c2_check ? 'checked' : ''} onchange="toggleCuotaUnion('${d.id}',${anio},'c2_check',this.checked)" /></td>
      <td><input type="number" class="inp-sm" value="${c.c2_importe || ''}" onchange="toggleCuotaUnion('${d.id}',${anio},'c2_importe',this.value)" /></td>
      <td><input type="text" class="inp-sm" value="${c.c2_medio || ''}" placeholder="Medio" onchange="toggleCuotaUnion('${d.id}',${anio},'c2_medio',this.value)" /></td>
    </tr>`;
  });
}

async function toggleCuotaUnion(jugId, anio, campo, valor) {
  await cuRef.doc(`${jugId}_${anio}`).set({ jugador_id: jugId, anio, [campo]: valor }, { merge: true });
}

// ============================================================
// PARTIDOS (3° TIEMPO)
// ============================================================
async function cargarPartidos() {
  const snap = await parRef.orderBy('fecha', 'desc').get();
  const tbody = document.getElementById('partidosBody');
  tbody.innerHTML = '';
  snap.forEach(d => {
    const p = d.data();
    tbody.innerHTML += `<tr>
      <td>${new Date(p.fecha).toLocaleDateString('es-AR')}</td>
      <td><button class="btn btn-sm btn-info" onclick="verPagos('${d.id}')">Ver Pagos</button></td>
    </tr>`;
  });
}

async function agregarPartido() {
  if (!confirm('¿Crear partido para hoy?')) return;
  const fecha = new Date().toISOString().split('T')[0];
  const ref = await parRef.add({ fecha, created: Date.now() });

  const jugSnap = await jugRef.get();
  const batch = db.batch();
  jugSnap.forEach(d => {
    batch.set(pagRef.doc(), { partido_id: ref.id, jugador_id: d.id, check: false, importe: '', medio: '', estado: 'no_pago' });
  });
  await batch.commit();
  cargarPartidos();
}

let pagosPartidoActual = [];

async function verPagos(partidoId) {
  const parSnap = await parRef.doc(partidoId).get();
  const partido = parSnap.data();
  const fechaPartido = new Date(partido.fecha);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  fechaPartido.setHours(0, 0, 0, 0);
  const pasado = fechaPartido < hoy;

  const pagSnap = await pagRef.where('partido_id', '==', partidoId).get();
  pagosPartidoActual = [];
  const tbody = document.getElementById('pagosBody');
  tbody.innerHTML = '';

  for (const doc of pagSnap.docs) {
    const p = doc.data();
    const jDoc = await jugRef.doc(p.jugador_id).get();
    const j = jDoc.data();
    const medioDisplay = p.medio || (pasado && !p.medio ? 'no pago' : '');
    const estado = p.check && p.medio ? 'pagado' : (pasado && !p.medio ? 'no_pago' : 'pendiente');
    const cls = estado === 'pagado' ? 'bg-green' : estado === 'no_pago' ? 'bg-red' : 'bg-yellow';
    const txt = estado === 'pagado' ? 'Pagado' : estado === 'no_pago' ? 'No pagó' : 'Pendiente';

    pagosPartidoActual.push({ id: doc.id, partido_id: partidoId, jugador_id: p.jugador_id });
    tbody.innerHTML += `<tr>
      <td>${j.nombre}${j.apellido ? ' ' + j.apellido : ''}</td>
      <td><input type="checkbox" ${p.check ? 'checked' : ''} onchange="actualizarPagoLocal('${doc.id}', 'check', this.checked)" /></td>
      <td><input type="number" class="inp-sm" value="${p.importe || ''}" onchange="actualizarPagoLocal('${doc.id}', 'importe', this.value)" /></td>
      <td><input type="text" class="inp-sm" value="${medioDisplay}" placeholder="Efectivo/Transferencia" onchange="actualizarPagoLocal('${doc.id}', 'medio', this.value)" /></td>
      <td><span class="badge ${cls}" id="estado-${doc.id}">${txt}</span></td>
    </tr>`;
  }
  document.getElementById('modalPagos').classList.add('show');
}

function actualizarPagoLocal(id, campo, valor) {
  const p = pagosPartidoActual.find(x => x.id === id);
  if (p) p[campo] = valor;
  // Actualizar badge
  const row = document.querySelector(`#pagosBody tr:has(input[onchange*="${id}"])`);
  if (row) {
    const inputs = row.querySelectorAll('input');
    const check = inputs[0]?.checked;
    const medio = inputs[2]?.value;
    const estado = check && medio ? 'pagado' : 'no_pago';
    const badge = document.getElementById(`estado-${id}`);
    if (badge) {
      badge.className = `badge ${estado === 'pagado' ? 'bg-green' : 'bg-red'}`;
      badge.textContent = estado === 'pagado' ? 'Pagado' : 'No pagó';
    }
  }
}

async function guardarPagos() {
  const batch = db.batch();
  for (const p of pagosPartidoActual) {
    const estado = p.check && p.medio ? 'pagado' : 'no_pago';
    batch.update(pagRef.doc(p.id), { check: p.check || false, importe: p.importe || '', medio: p.medio || '', estado });
  }
  await batch.commit();
  cerrarModal('modalPagos');
  cargarPartidos();
}

// ============================================================
// INIT
// ============================================================
cargarJugadores();