const API_URL = 'http://localhost:3000';

let jugadores = [];
let jugadorEditandoId = null;
let debounceTimer;

// DOM Elements
const buscarInput = document.getElementById('buscar');
const btnNuevo = document.getElementById('btnNuevo');
const btnReload = document.getElementById('btnReload');
const modal = document.getElementById('modal');
const modalVer = document.getElementById('modalVer');
const tabla = document.getElementById('tabla');
const tituloModal = document.getElementById('tituloModal');
const btnCerrar = document.getElementById('btnCerrar');
const btnCerrarVer = document.getElementById('btnCerrarVer');
const btnGuardar = document.getElementById('btnGuardar');
const btnEditar = document.getElementById('btnEditar');
const btnEliminar = document.getElementById('btnEliminar');
const detalle = document.getElementById('detalle');

// Init
cargarJugadores();

// Event Listeners
buscarInput.addEventListener('input', buscar);
btnNuevo.addEventListener('click', abrirModalNuevo);
btnReload.addEventListener('click', cargarJugadores);
btnCerrar.addEventListener('click', () => modal.classList.remove('show'));
btnCerrarVer.addEventListener('click', () => modalVer.classList.remove('show'));
btnGuardar.addEventListener('click', guardarJugador);
btnEditar.addEventListener('click', editarDesdeVer);
btnEliminar.addEventListener('click', eliminarDesdeVer);

// Functions
function cargarJugadores() {
  fetch(`${API_URL}/api/jugadores`)
    .then(r => r.json())
    .then(data => {
      jugadores = data;
      renderizar(data);
    })
    .catch(err => {
      tabla.innerHTML = `<div class="error">Error conectando al servidor. Asegúrate que el servidor esté corriendo.</div>`;
    });
}

function buscar() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const q = buscarInput.value.toLowerCase();
    if (!q) {
      renderizar(jugadores);
      return;
    }
    const filtrados = jugadores.filter(j => 
      j.nombre.toLowerCase().includes(q) || 
      j.apellido.toLowerCase().includes(q) || 
      j.dni.toLowerCase().includes(q)
    );
    renderizar(filtrados);
  }, 300);
}

function renderizar(data) {
  if (data.length === 0) {
    tabla.innerHTML = '<div class="vacio">No hay jugadores registrados</div>';
    return;
  }
  tabla.innerHTML = data.map(j => `
    <div class="card" onclick="verJugador(${j.id})">
      <div class="card-info">
        <div class="nombre">${j.nombre} ${j.apellido}</div>
        ${j.apodo ? `<div class="apodo">"${j.apodo}"</div>` : ''}
        <div class="dni">📄 ${j.dni}</div>
        ${j.p1 ? `<div class="puesto">${j.p1}</div>` : ''}
        <div class="contacto">
          ${j.celular ? `<div class="contacto-item">📱 ${j.celular}</div>` : ''}
          ${j.correo ? `<div class="contacto-item">✉️ ${j.correo}</div>` : ''}
        </div>
      </div>
    </div>
  `).join('');
}

function abrirModalNuevo() {
  jugadorEditandoId = null;
  tituloModal.textContent = 'Nuevo Jugador';
  document.getElementById('dni').value = '';
  document.getElementById('nombre').value = '';
  document.getElementById('apodo').value = '';
  document.getElementById('celular').value = '';
  document.getElementById('correo').value = '';
  document.getElementById('p1').value = '';
  document.getElementById('p2').value = '';
  document.getElementById('p3').value = '';
  modal.classList.add('show');
}

function abrirModalEditar(jugador) {
  jugadorEditandoId = jugador.id;
  tituloModal.textContent = 'Editar Jugador';
  document.getElementById('dni').value = jugador.dni || '';
  document.getElementById('nombre').value = jugador.nombre || '';
  document.getElementById('apodo').value = jugador.apodo || '';
  document.getElementById('celular').value = jugador.celular || '';
  document.getElementById('correo').value = jugador.correo || '';
  document.getElementById('p1').value = jugador.p1 || '';
  document.getElementById('p2').value = jugador.p2 || '';
  document.getElementById('p3').value = jugador.p3 || '';
  modalVer.classList.remove('show');
  modal.classList.add('show');
}

function guardarJugador() {
  const data = {
    dni: document.getElementById('dni').value,
    nombre: document.getElementById('nombre').value,
    apodo: document.getElementById('apodo').value,
    celular: document.getElementById('celular').value,
    correo: document.getElementById('correo').value,
    p1: document.getElementById('p1').value,
    p2: document.getElementById('p2').value,
    p3: document.getElementById('p3').value
  };

  if (!data.dni || !data.nombre) {
    alert('DNI y Nombre son obligatorios');
    return;
  }

  const method = jugadorEditandoId ? 'PUT' : 'POST';
  const url = jugadorEditandoId ? `${API_URL}/api/jugadores/${jugadorEditandoId}` : `${API_URL}/api/jugadores`;

  fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
    .then(r => r.json())
    .then(res => {
      if (res.error) {
        alert(res.error);
        return;
      }
      modal.classList.remove('show');
      cargarJugadores();
    });
}

function verJugador(id) {
  const j = jugadores.find(x => x.id === id);
  if (!j) return;
  
  modalVer.classList.add('show');
  detalle.innerHTML = `
    <div class="detalle-item">
      <div class="detalle-label">Nombre</div>
      <div class="detalle-value">${j.nombre} ${j.apellido}</div>
    </div>
    <div class="detalle-item">
      <div class="detalle-label">Apodo</div>
      <div class="detalle-value">${j.apodo || '-'}</div>
    </div>
    <div class="detalle-item">
      <div class="detalle-label">DNI</div>
      <div class="detalle-value">${j.dni}</div>
    </div>
    <div class="detalle-item">
      <div class="detalle-label">Celular</div>
      <div class="detalle-value">${j.celular || '-'}</div>
    </div>
    <div class="detalle-item">
      <div class="detalle-label">Correo</div>
      <div class="detalle-value">${j.correo || '-'}</div>
    </div>
    <div class="detalle-item">
      <div class="detalle-label">Puesto 1</div>
      <div class="detalle-value puesto">${j.p1 || '-'}</div>
    </div>
    <div class="detalle-item">
      <div class="detalle-label">Puesto 2</div>
      <div class="detalle-value">${j.p2 || '-'}</div>
    </div>
    <div class="detalle-item">
      <div class="detalle-label">Puesto 3</div>
      <div class="detalle-value">${j.p3 || '-'}</div>
    </div>
  `;
  
  btnEditar.onclick = () => abrirModalEditar(j);
  btnEliminar.onclick = () => eliminarJugador(j.id);
}

function editarDesdeVer() {
  const j = jugadores.find(x => x.id === jugadorEditandoId);
  if (j) abrirModalEditar(j);
}

function eliminarJugador(id) {
  if (confirm('¿Estás seguro de eliminar este jugador?')) {
    fetch(`${API_URL}/api/jugadores/${id}`, { method: 'DELETE' })
      .then(() => {
        modalVer.classList.remove('show');
        cargarJugadores();
      });
  }
}

function eliminarDesdeVer() {
  if (jugadorEditandoId) eliminarJugador(jugadorEditandoId);
}