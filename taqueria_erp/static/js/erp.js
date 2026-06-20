/* ══════════════════════════════════════
   TAQUERÍA ERP — Sistema principal
   Gestión de órdenes, inventario,
   empleados y reportes
══════════════════════════════════════ */

/* ── PROTECCIÓN DE RUTA ─────────────
   Redirige al login si no hay sesión
─────────────────────────────────────*/
(function protegerRuta() {
  const token = localStorage.getItem('erp_access');
  const user  = localStorage.getItem('erp_user');
  if (!token || !user) window.location.replace('/login/');
})();

/* ══════════════════════════════════════
   CONFIG
══════════════════════════════════════ */
const API = 'http://127.0.0.1:8000/api';

/* ══════════════════════════════════════
   STATE — Estado global de la aplicación
══════════════════════════════════════ */
const S = {
  token:       localStorage.getItem('erp_access'),
  refresh:     localStorage.getItem('erp_refresh'),
  user:        localStorage.getItem('erp_user'),
  rol:         localStorage.getItem('erp_rol') || 'mesero',
  ordenes:     [],
  ordenActual: null,
  menu:        [],
  ingredientes:[],
  empleados:   [],
  metodo:      'efectivo',
  ventasHoy:   0,
  ordenesHoy:  0,
  charts:      {},
  reporteData: [],
};

/* ══════════════════════════════════════
   UTILS
══════════════════════════════════════ */

/** Formatea un número como moneda MXN */
const fmt = n => '$' + parseFloat(n || 0).toFixed(2);

/** Calcula el total de una orden */
const calcTotal = o => o.items.reduce((s, i) => s + i.precio * i.qty, 0);

/**
 * Muestra un toast notification
 * @param {string} msg   - Mensaje
 * @param {string} type  - 'ok' | 'err' | ''
 */
function toast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className   = `toast show ${type}`;
  setTimeout(() => { el.className = 'toast'; }, 3000);
}

const abrirModal  = id => document.getElementById(id).classList.add('open');
const cerrarModal = id => document.getElementById(id).classList.remove('open');

/* ══════════════════════════════════════
   API FETCH — con refresh automático de token
══════════════════════════════════════ */

/**
 * Wrapper de fetch con autenticación JWT y refresco automático
 * @param {string} path  - Ruta de la API (ej: '/cocina/productos/menu/')
 * @param {object} opts  - Opciones de fetch
 */
async function apiFetch(path, opts = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(opts.headers || {}),
  };

  if (S.token) headers['Authorization'] = 'Bearer ' + S.token;

  let r = await fetch(API + path, { ...opts, headers });

  // Token expirado — intentar refresh automático
  if (r.status === 401 && S.refresh) {
    try {
      const rr = await fetch(`${API}/token/refresh/`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ refresh: S.refresh }),
      });

      if (rr.ok) {
        const d  = await rr.json();
        S.token  = d.access;
        localStorage.setItem('erp_access', d.access);
        headers['Authorization'] = 'Bearer ' + d.access;
        r = await fetch(API + path, { ...opts, headers });
      } else {
        doLogout();
        return null;
      }
    } catch {
      doLogout();
      return null;
    }
  }

  if (!r.ok) throw new Error(await r.text());
  if (r.status === 204) return null;
  return r.json();
}

/* ══════════════════════════════════════
   NAVEGACIÓN Y PERMISOS
══════════════════════════════════════ */

/**
 * Navega a una página del sistema
 * @param {string} page - Nombre de la página
 * @param {Element} btn - Botón del sidebar que activó la navegación
 */
function navTo(page, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('pg-' + page).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  // Cargar datos de cada sección
  const loaders = {
    dashboard:   renderDashboard,
    inventario:  cargarInventario,
    empleados:   cargarEmpleados,
    reportes:    cargarReportes,
    'menu-admin': cargarMenuAdmin,
  };
  loaders[page]?.();
}

/** Oculta del sidebar las secciones que el rol no puede ver */
function aplicarPermisos() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    const roles = btn.getAttribute('data-roles')?.split(',') || [];
    btn.style.display = roles.includes(S.rol) ? '' : 'none';
  });
}

/** Cierra la sesión y redirige al login */
function doLogout() {
  localStorage.clear();
  window.location.replace('/login/');
}

/* ══════════════════════════════════════
   DEMO DATA — Fallback cuando la API no responde
══════════════════════════════════════ */
const MENU_DEMO = [
  {
    categoria: 'Tacos',
    productos: [
      { id: 1, nombre: 'Taco al pastor',  precio: '18.00', disponible: true },
      { id: 2, nombre: 'Taco de bistec',  precio: '20.00', disponible: true },
      { id: 3, nombre: 'Taco de suadero', precio: '18.00', disponible: true },
      { id: 4, nombre: 'Taco de tripa',   precio: '16.00', disponible: true },
    ],
  },
  {
    categoria: 'Quesadillas',
    productos: [
      { id: 5, nombre: 'Quesadilla queso',     precio: '35.00', disponible: true },
      { id: 6, nombre: 'Quesadilla con carne', precio: '45.00', disponible: true },
    ],
  },
  {
    categoria: 'Bebidas',
    productos: [
      { id: 7, nombre: 'Agua fresca', precio: '20.00', disponible: true },
      { id: 8, nombre: 'Refresco',    precio: '25.00', disponible: true },
    ],
  },
  {
    categoria: 'Extras',
    productos: [
      { id: 9,  nombre: 'Guacamole', precio: '15.00', disponible: true },
      { id: 10, nombre: 'Tostada',   precio: '12.00', disponible: true },
    ],
  },
];

const INV_DEMO = [
  { id: 1, nombre: 'Carne de pastor', unidad: 'kg',  stock_actual: '5.50', stock_minimo: '2.00' },
  { id: 2, nombre: 'Tortillas',       unidad: 'pza', stock_actual: '200',  stock_minimo: '50'   },
  { id: 3, nombre: 'Cebolla',         unidad: 'kg',  stock_actual: '0.30', stock_minimo: '1.00' },
  { id: 4, nombre: 'Cilantro',        unidad: 'kg',  stock_actual: '2.00', stock_minimo: '0.50' },
  { id: 5, nombre: 'Queso Oaxaca',    unidad: 'kg',  stock_actual: '1.00', stock_minimo: '1.00' },
];

const EMP_DEMO = [
  { id: 1, nombre: 'Carlos', apellido: 'H.', rol: 'taquero', activo: true },
  { id: 2, nombre: 'Ana',    apellido: 'L.', rol: 'cajero',  activo: true },
  { id: 3, nombre: 'Luis',   apellido: 'M.', rol: 'mesero',  activo: true },
];

/* ══════════════════════════════════════
   CARGA INICIAL
══════════════════════════════════════ */

/** Carga todos los datos necesarios al iniciar el sistema */
async function cargarTodo() {
  // Info del usuario en sidebar
  document.getElementById('u-av').textContent   = (S.user || '?')[0].toUpperCase();
  document.getElementById('u-name').textContent = S.user || '—';
  document.getElementById('u-rol').textContent  = S.rol  || '—';
  document.getElementById('dash-date').textContent = new Date().toLocaleDateString(
    'es-MX', { weekday: 'long', day: 'numeric', month: 'long' }
  );

  aplicarPermisos();

  // Menú
  try {
    S.menu = await apiFetch('/cocina/productos/menu/');
  } catch {
    S.menu = MENU_DEMO;
    toast('Menú en modo demo', '');
  }

  // Ingredientes
  try {
    const r = await apiFetch('/cocina/ingredientes/');
    S.ingredientes = r?.results || r;
  } catch {
    S.ingredientes = INV_DEMO;
  }

  // Empleados
  try {
    const r = await apiFetch('/empleados/empleados/');
    S.empleados = r?.results || r;
    const sel = document.getElementById('mo-emp');
    sel.innerHTML = '<option value="">Sin asignar</option>';
    S.empleados.forEach(e => {
      const o = document.createElement('option');
      o.value       = e.id;
      o.textContent = `${e.nombre} ${e.apellido}`;
      sel.appendChild(o);
    });
  } catch {
    S.empleados = EMP_DEMO;
  }

  // Poblar selects de ingredientes
  ['me-i', 'ms-i'].forEach(id => {
    const s = document.getElementById(id);
    s.innerHTML = '<option value="">Seleccionar...</option>';
    S.ingredientes.forEach(i => {
      const o = document.createElement('option');
      o.value       = i.id;
      o.textContent = `${i.nombre} (${i.unidad})`;
      s.appendChild(o);
    });
  });

  // Categorías para modal de producto
  const cats = [...new Set(S.menu.map(c => c.categoria))];
  const sc   = document.getElementById('mp-cat');
  sc.innerHTML = '<option value="">Seleccionar...</option>';
  cats.forEach(c => {
    const o = document.createElement('option');
    o.value = c; o.textContent = c; sc.appendChild(o);
  });

  renderDashboard();
}

/* ══════════════════════════════════════
   DASHBOARD
══════════════════════════════════════ */
const MESAS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/** Renderiza el dashboard con mesas y órdenes activas */
function renderDashboard() {
  const activas = S.ordenes.filter(o => o.activa);
  document.getElementById('s-mesas').textContent  = activas.length;
  document.getElementById('s-ventas').textContent = fmt(S.ventasHoy);
  document.getElementById('s-ord').textContent    = S.ordenesHoy;

  // Grid de mesas
  const g = document.getElementById('mesas-grid');
  g.innerHTML = '';

  const todasMesas = [
    ...MESAS.map(n => ({ label: `Mesa ${n}`, key: `Mesa ${n}` })),
    { label: '🛵 Para llevar A', key: 'Para llevar A' },
    { label: '🛵 Para llevar B', key: 'Para llevar B' },
  ];

  todasMesas.forEach(({ label, key }) => {
    const or = S.ordenes.find(o => o.mesa === key && o.activa);
    const d  = document.createElement('div');
    d.className = 'mesa-card ' + (or ? 'ocupada' : '');
    d.innerHTML = `
      <div class="mesa-dot ${or ? 'dot-ocu' : 'dot-libre'}"></div>
      <div class="mesa-num">${label.replace('🛵 ', '')}</div>
      <div class="mesa-lbl">${or ? 'Ocupada' : 'Libre'}</div>
      ${or ? `<div class="mesa-monto">${fmt(calcTotal(or))}</div>` : ''}
    `;
    d.onclick = () => or
      ? irAOrden(or)
      : (document.getElementById('mo-mesa').value = key, abrirModal('modal-orden'));
    g.appendChild(d);
  });

  // Tabla de órdenes activas
  const tb = document.getElementById('dash-tbody');
  tb.innerHTML = '';

  if (!activas.length) {
    tb.innerHTML = '<tr><td colspan="5" class="empty-s">Sin órdenes activas</td></tr>';
    return;
  }

  activas.forEach(o => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${o.mesa}</strong></td>
      <td>${o.items.length} items</td>
      <td>${fmt(calcTotal(o))}</td>
      <td><span class="badge bg-amber">Abierta</span></td>
      <td>
        <button class="btn btn-amber btn-sm"
          onclick="irAOrden(S.ordenes.find(x=>x.id===${o.id}))">
          Abrir
        </button>
      </td>
    `;
    tb.appendChild(tr);
  });
}

/* ══════════════════════════════════════
   ÓRDENES
══════════════════════════════════════ */

function abrirModalOrden() {
  document.getElementById('mo-mesa').value = '';
  abrirModal('modal-orden');
}

/** Crea una nueva orden y la abre */
function crearOrden() {
  const mesa  = document.getElementById('mo-mesa').value.trim() || 'Sin nombre';
  const empId = document.getElementById('mo-emp').value;
  cerrarModal('modal-orden');

  const orden = { id: Date.now(), mesa, empId, items: [], activa: true, apiId: null };
  S.ordenes.push(orden);

  // Sincronizar con API (best-effort)
  apiFetch('/ventas/ordenes/', {
    method: 'POST',
    body: JSON.stringify({ mesa: null, empleado: empId || null, estado: 'abierta', notas: mesa }),
  }).then(r => { if (r) orden.apiId = r.id; }).catch(() => {});

  irAOrden(orden);
}

/**
 * Abre la vista de tomar orden
 * @param {object} orden - Orden a abrir
 */
function irAOrden(orden) {
  S.ordenActual = orden;
  document.getElementById('orden-tb-lbl').textContent = orden.mesa.toUpperCase();
  document.getElementById('tk-client').textContent    = orden.mesa;
  renderMenuOrden();
  renderTicket();
  navTo('ordenes', document.querySelector('[data-page="ordenes"]'));
}

/** Renderiza el menú de productos */
function renderMenuOrden() {
  const panel = document.getElementById('menu-scroll');
  panel.innerHTML = '';

  S.menu.forEach(cat => {
    const sec = document.createElement('div');
    sec.className = 'cat-sec';

    const gr = document.createElement('div');
    gr.className = 'prods-grid';

    (cat.productos || [])
      .filter(pr => pr.disponible !== false)
      .forEach(prod => {
        const b = document.createElement('button');
        b.className = 'prod-card';
        b.innerHTML = `
          <div class="prod-n">${prod.nombre}</div>
          <div class="prod-p">${fmt(prod.precio)}</div>
        `;
        b.onclick = () => agregarItem(prod);
        gr.appendChild(b);
      });

    sec.innerHTML = `<div class="cat-lbl">${cat.categoria}</div>`;
    sec.appendChild(gr);
    panel.appendChild(sec);
  });
}

/**
 * Agrega un producto a la orden actual
 * @param {object} prod - Producto a agregar
 */
function agregarItem(prod) {
  const o  = S.ordenActual;
  const ex = o.items.find(i => i.id === prod.id);
  if (ex) {
    ex.qty++;
  } else {
    o.items.push({ id: prod.id, nombre: prod.nombre, precio: parseFloat(prod.precio), qty: 1 });
  }
  renderTicket();
}

/**
 * Cambia la cantidad de un item en la orden
 * @param {number} idx   - Índice del item
 * @param {number} delta - +1 o -1
 */
function cambiarQty(idx, delta) {
  S.ordenActual.items[idx].qty += delta;
  if (S.ordenActual.items[idx].qty <= 0) S.ordenActual.items.splice(idx, 1);
  renderTicket();
}

/** Renderiza el ticket lateral con los items de la orden */
function renderTicket() {
  const o = S.ordenActual;
  const c = document.getElementById('tk-rows');
  c.innerHTML = '';

  if (!o.items.length) {
    c.innerHTML = '<p class="empty-s">Sin productos</p>';
  } else {
    o.items.forEach((item, i) => {
      const r = document.createElement('div');
      r.className = 't-row';
      r.innerHTML = `
        <div class="qw">
          <button class="qb" onclick="cambiarQty(${i}, -1)">−</button>
          <span class="qn">${item.qty}</span>
          <button class="qb" onclick="cambiarQty(${i}, 1)">+</button>
        </div>
        <span class="t-n">${item.nombre}</span>
        <span class="t-s">${fmt(item.precio * item.qty)}</span>
      `;
      c.appendChild(r);
    });
  }

  document.getElementById('tk-total').textContent = fmt(calcTotal(o));
  renderDashboard();
}

/* ══════════════════════════════════════
   COBRO
══════════════════════════════════════ */

/** Abre el overlay de cobro */
function abrirCobro() {
  const o = S.ordenActual;
  if (!o.items.length) { toast('Agrega al menos un producto', 'err'); return; }

  document.getElementById('cobro-tot').textContent = fmt(calcTotal(o));

  const lista = document.getElementById('cobro-items');
  lista.innerHTML = '';
  o.items.forEach(i => {
    const r = document.createElement('div');
    r.className = 'cobro-row';
    r.innerHTML = `<span>${i.qty}× ${i.nombre}</span><span>${fmt(i.precio * i.qty)}</span>`;
    lista.appendChild(r);
  });

  // Reset método de pago
  document.querySelectorAll('.met-btn').forEach(b => b.classList.remove('sel'));
  document.querySelectorAll('.met-btn')[0].classList.add('sel');
  S.metodo = 'efectivo';
  document.getElementById('efec-sec').style.display   = 'block';
  document.getElementById('cambio-blk').style.display = 'none';
  document.getElementById('cobro-pago').value         = '';
  document.getElementById('cobro-ov').classList.add('open');
}

const cerrarCobro = () => document.getElementById('cobro-ov').classList.remove('open');

/**
 * Selecciona el método de pago
 * @param {string}  m  - 'efectivo' | 'tarjeta' | 'transferencia'
 * @param {Element} el - Botón seleccionado
 */
function selMet(m, el) {
  S.metodo = m;
  document.querySelectorAll('.met-btn').forEach(b => b.classList.remove('sel'));
  el.classList.add('sel');
  document.getElementById('efec-sec').style.display = m === 'efectivo' ? 'block' : 'none';
}

/** Calcula y muestra el cambio en tiempo real */
function calcCambio() {
  const total = calcTotal(S.ordenActual);
  const pago  = parseFloat(document.getElementById('cobro-pago').value) || 0;
  const blk   = document.getElementById('cambio-blk');

  if (pago >= total) {
    blk.style.display = 'block';
    document.getElementById('cambio-v').textContent = fmt(pago - total);
  } else {
    blk.style.display = 'none';
  }
}

/** Confirma el pago, cierra la orden y genera el ticket */
async function confirmarPago() {
  const o       = S.ordenActual;
  const total   = calcTotal(o);
  const pagoCon = parseFloat(document.getElementById('cobro-pago').value) || total;

  o.activa = false;
  S.ventasHoy  += total;
  S.ordenesHoy += 1;

  // Cerrar en API
  if (o.apiId) {
    try {
      await apiFetch(`/ventas/ordenes/${o.apiId}/cerrar/`, {
        method: 'POST',
        body:   JSON.stringify({ metodo_pago: S.metodo, pagado_con: pagoCon }),
      });
    } catch { /* continuar sin bloquear */ }
  }

  // Generar reporte del día
  apiFetch('/reportes/ventas-diarias/generar/', { method: 'POST' }).catch(() => {});

  cerrarCobro();
  mostrarTicket(o, total, pagoCon);
  document.getElementById('s-ventas').textContent = fmt(S.ventasHoy);
  document.getElementById('s-ord').textContent    = S.ordenesHoy;
}

/**
 * Muestra el ticket de compra en pantalla
 * @param {object} o       - Orden
 * @param {number} total   - Total cobrado
 * @param {number} pagoCon - Cantidad entregada por el cliente
 */
function mostrarTicket(o, total, pagoCon) {
  const fecha = new Date().toLocaleString('es-MX', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  let h = `
    <h3 class="tp-h3">🌮 TAQUERÍA ERP</h3>
    <span class="tp-s">${fecha} · ${o.mesa}</span>
    <hr class="ti-div">
  `;

  o.items.forEach(i => {
    h += `<div class="ti-r"><span>${i.qty}× ${i.nombre}</span><span>${fmt(i.precio * i.qty)}</span></div>`;
  });

  h += `
    <hr class="ti-div">
    <div class="ti-tot"><span>TOTAL</span><span>${fmt(total)}</span></div>
    <div class="ti-r" style="color:#777;margin-top:3px"><span>Pago: ${S.metodo}</span></div>
  `;

  if (S.metodo === 'efectivo') {
    h += `
      <div class="ti-r" style="color:#777"><span>Entregó:</span><span>${fmt(pagoCon)}</span></div>
      <div class="ti-r" style="color:#777"><span>Cambio:</span><span>${fmt(pagoCon - total)}</span></div>
    `;
  }

  h += `<div class="ti-ty">¡Gracias por su visita!</div>`;

  document.getElementById('ticket-papel').innerHTML = h;
  document.getElementById('tp-sub').textContent     = `${o.mesa} · ${fmt(total)} · ${S.metodo}`;
  document.getElementById('ticket-ov').classList.add('open');
}

/** Cierra el ticket y vuelve al dashboard */
function cerrarTicket() {
  document.getElementById('ticket-ov').classList.remove('open');
  toast('Orden cobrada y enviada a reportes ✓', 'ok');
  navTo('dashboard', document.querySelector('[data-page="dashboard"]'));
}

/* ══════════════════════════════════════
   MENÚ ADMIN
══════════════════════════════════════ */

/** Carga la tabla del menú en la vista admin */
function cargarMenuAdmin() {
  const tb = document.getElementById('menu-tbody');
  tb.innerHTML = '';

  S.menu.forEach(cat => {
    (cat.productos || []).forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${p.nombre}</strong></td>
        <td><span class="badge bg-amber">${cat.categoria}</span></td>
        <td>${fmt(p.precio)}</td>
        <td>
          <span class="badge ${p.disponible !== false ? 'bg-green' : 'bg-red'}">
            ${p.disponible !== false ? 'Sí' : 'No'}
          </span>
        </td>
        <td>
          <button class="btn btn-ghost btn-sm"
            onclick="editarProd(${p.id}, '${cat.categoria}')">
            Editar
          </button>
        </td>
      `;
      tb.appendChild(tr);
    });
  });
}

let editProdId = null;

/** Abre el modal para agregar un nuevo producto */
function abrirModalProd() {
  editProdId = null;
  document.getElementById('mprod-title').textContent = 'Nuevo producto';
  ['mp-n', 'mp-p'].forEach(id => { document.getElementById(id).value = ''; });
  abrirModal('modal-prod');
}

/**
 * Abre el modal para editar un producto existente
 * @param {number} id  - ID del producto
 * @param {string} cat - Categoría del producto
 */
function editarProd(id, cat) {
  editProdId = id;
  let prod   = null;
  S.menu.forEach(c => c.productos.forEach(p => { if (p.id === id) prod = p; }));
  if (!prod) return;

  document.getElementById('mprod-title').textContent = 'Editar producto';
  document.getElementById('mp-n').value   = prod.nombre;
  document.getElementById('mp-p').value   = prod.precio;
  document.getElementById('mp-cat').value = cat;
  document.getElementById('mp-d').value   = prod.disponible !== false ? 'true' : 'false';
  abrirModal('modal-prod');
}

/** Guarda un producto nuevo o editado */
async function guardarProducto() {
  const n   = document.getElementById('mp-n').value.trim();
  const p   = document.getElementById('mp-p').value;
  const c   = document.getElementById('mp-cat').value;
  const disp = document.getElementById('mp-d').value === 'true';

  if (!n || !p) { toast('Completa todos los campos', 'err'); return; }

  if (editProdId) {
    // Editar producto existente
    S.menu.forEach(cat => cat.productos.forEach(pr => {
      if (pr.id === editProdId) { pr.nombre = n; pr.precio = String(p); pr.disponible = disp; }
    }));
    try {
      await apiFetch(`/cocina/productos/${editProdId}/`, {
        method: 'PATCH',
        body:   JSON.stringify({ nombre: n, precio: parseFloat(p), disponible: disp }),
      });
    } catch { /* continuar */ }
    toast('Producto actualizado', 'ok');
  } else {
    // Nuevo producto
    const id  = Date.now();
    const cat = S.menu.find(x => x.categoria === c);
    const obj = { id, nombre: n, precio: String(p), disponible: true };

    if (cat) cat.productos.push(obj);
    else S.menu.push({ categoria: c, productos: [obj] });

    try {
      await apiFetch('/cocina/productos/', {
        method: 'POST',
        body:   JSON.stringify({ nombre: n, precio: parseFloat(p), disponible: true, categoria_nombre: c }),
      });
    } catch { /* continuar */ }
    toast('Producto agregado', 'ok');
  }

  cerrarModal('modal-prod');
  cargarMenuAdmin();
}

/* ══════════════════════════════════════
   INVENTARIO
══════════════════════════════════════ */

/** Carga y renderiza el inventario */
async function cargarInventario() {
  try {
    const r = await apiFetch('/cocina/ingredientes/');
    S.ingredientes = r?.results || r;
  } catch { /* usar datos actuales */ }

  const tb = document.getElementById('inv-tbody');
  tb.innerHTML = '';

  S.ingredientes.forEach(i => {
    const act     = parseFloat(i.stock_actual || 0);
    const min     = parseFloat(i.stock_minimo || 0);
    const pct     = min > 0 ? Math.min((act / min) * 100, 100) : 100;
    const bajo    = act <= min;
    const amarillo = act <= min * 1.5 && !bajo;
    const color   = bajo ? 'var(--red)' : amarillo ? 'var(--amber)' : 'var(--green)';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${i.nombre}</strong></td>
      <td><span class="badge bg-muted">${i.unidad}</span></td>
      <td>
        ${act}
        <div class="stock-bar">
          <div class="stock-fill" style="width:${pct}%;background:${color}"></div>
        </div>
      </td>
      <td>${min}</td>
      <td>
        <span class="badge ${bajo ? 'bg-red' : amarillo ? 'bg-amber' : 'bg-green'}">
          ${bajo ? '⚠ Bajo' : amarillo ? 'Bajo' : 'OK'}
        </span>
      </td>
    `;
    tb.appendChild(tr);
  });
}

/** Registra una entrada de inventario */
async function guardarEntrada() {
  const id  = document.getElementById('me-i').value;
  const qty = parseFloat(document.getElementById('me-q').value);
  const c   = parseFloat(document.getElementById('me-c').value) || 0;

  if (!id || !qty) { toast('Completa los campos requeridos', 'err'); return; }

  const ing = S.ingredientes.find(i => String(i.id) === id);
  if (ing) ing.stock_actual = String(parseFloat(ing.stock_actual || 0) + qty);

  try {
    await apiFetch('/inventario/entradas/', {
      method: 'POST',
      body:   JSON.stringify({ ingrediente_id: parseInt(id), cantidad: qty, costo_unitario: c, notas: '' }),
    });
    toast('Entrada registrada', 'ok');
  } catch {
    toast('Guardado localmente', '');
  }

  cerrarModal('modal-entrada');
  cargarInventario();
}

/** Registra una salida o merma de inventario */
async function guardarSalida() {
  const id  = document.getElementById('ms-i').value;
  const qty = parseFloat(document.getElementById('ms-q').value);
  const m   = document.getElementById('ms-m').value;

  if (!id || !qty) { toast('Completa los campos requeridos', 'err'); return; }

  const ing = S.ingredientes.find(i => String(i.id) === id);
  if (ing) {
    const nuevo = parseFloat(ing.stock_actual || 0) - qty;
    if (nuevo < 0) { toast('Stock insuficiente', 'err'); return; }
    ing.stock_actual = String(nuevo);
  }

  try {
    await apiFetch('/inventario/salidas/', {
      method: 'POST',
      body:   JSON.stringify({ ingrediente_id: parseInt(id), cantidad: qty, motivo: m }),
    });
    toast('Salida registrada', 'ok');
  } catch {
    toast('Guardado localmente', '');
  }

  cerrarModal('modal-salida');
  cargarInventario();
}

/* ══════════════════════════════════════
   EMPLEADOS
══════════════════════════════════════ */
const ROL_ICONOS = { taquero: '🔥', mesero: '🍽️', cajero: '💰', admin: '⭐' };

/** Carga y renderiza los empleados */
async function cargarEmpleados() {
  try {
    const r = await apiFetch('/empleados/empleados/');
    S.empleados = r?.results || r;
  } catch { /* usar datos actuales */ }

  const g = document.getElementById('emp-grid');
  g.innerHTML = '';

  S.empleados.forEach(e => {
    const c = document.createElement('div');
    c.className = 'emp-card';
    c.innerHTML = `
      <div style="display:flex;align-items:center;gap:9px">
        <div class="emp-av">${e.nombre[0]}${e.apellido[0]}</div>
        <div>
          <div class="emp-name">${e.nombre} ${e.apellido}</div>
          <div class="emp-rol">${ROL_ICONOS[e.rol] || '👤'} ${e.rol}</div>
        </div>
      </div>
      <span class="badge ${e.activo !== false ? 'bg-green' : 'bg-red'}" style="margin-top:7px">
        ${e.activo !== false ? 'Activo' : 'Inactivo'}
      </span>
    `;
    g.appendChild(c);
  });

  if (!S.empleados.length) g.innerHTML = '<p class="empty-s">Sin empleados registrados</p>';
}

/** Guarda un nuevo empleado */
async function guardarEmpleado() {
  const n = document.getElementById('mep-n').value.trim();
  const a = document.getElementById('mep-a').value.trim();

  if (!n || !a) { toast('Nombre y apellido requeridos', 'err'); return; }

  const obj = {
    id:       Date.now(),
    nombre:   n,
    apellido: a,
    rol:      document.getElementById('mep-r').value,
    telefono: document.getElementById('mep-t').value,
    activo:   true,
  };

  S.empleados.push(obj);

  try {
    await apiFetch('/empleados/empleados/', { method: 'POST', body: JSON.stringify(obj) });
    toast('Empleado agregado', 'ok');
  } catch {
    toast('Guardado localmente', '');
  }

  cerrarModal('modal-emp');
  cargarEmpleados();

  // Actualizar select de empleados en modal orden
  const sel = document.getElementById('mo-emp');
  const op  = document.createElement('option');
  op.value       = obj.id;
  op.textContent = `${n} ${a}`;
  sel.appendChild(op);
}

/* ══════════════════════════════════════
   REPORTES + GRÁFICAS
══════════════════════════════════════ */
Chart.defaults.color       = '#686560';
Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
Chart.defaults.font.family = "'DM Sans', sans-serif";

/** Destruye una gráfica existente para poder recrearla */
const destroyChart = id => {
  if (S.charts[id]) { S.charts[id].destroy(); delete S.charts[id]; }
};

/** Carga los reportes desde la API */
async function cargarReportes() {
  try { await apiFetch('/reportes/ventas-diarias/generar/', { method: 'POST' }); } catch { /* continuar */ }

  try {
    const r = await apiFetch('/reportes/ventas-diarias/');
    S.reporteData = r?.results || r || [];
    renderReportes(S.reporteData);
  } catch {
    renderReportesDemo();
  }
}

/** Genera/actualiza el reporte del día */
async function generarReporte() {
  try {
    await apiFetch('/reportes/ventas-diarias/generar/', { method: 'POST' });
    toast('Reporte actualizado', 'ok');
    cargarReportes();
  } catch {
    renderReportesDemo();
    toast('Modo demo', '');
  }
}

/**
 * Renderiza los reportes con datos reales de la API
 * @param {Array} lista - Lista de reportes diarios
 */
function renderReportes(lista) {
  if (!lista || !lista.length) { renderReportesDemo(); return; }

  const hoy = lista[0];
  document.getElementById('r-total').textContent = fmt(hoy.total_ventas);
  document.getElementById('r-ords').textContent  = hoy.total_ordenes;
  document.getElementById('r-efec').textContent  = fmt(hoy.total_efectivo);

  const dig = parseFloat(hoy.total_tarjeta || 0) + parseFloat(hoy.total_transferencia || 0);
  document.getElementById('r-dig').textContent = fmt(dig);
  document.getElementById('s-top').textContent = hoy.producto_mas_vendido || '—';

  dibujarGraficas(lista);
  renderTablaReportes(lista);
}

/** Renderiza reportes con datos de demostración */
function renderReportesDemo() {
  document.getElementById('r-total').textContent = fmt(S.ventasHoy || 1450);
  document.getElementById('r-ords').textContent  = S.ordenesHoy  || 28;
  document.getElementById('r-efec').textContent  = fmt(980);
  document.getElementById('r-dig').textContent   = fmt(470);

  const demo    = generarDemoData();
  S.reporteData = demo;
  dibujarGraficas(demo);
  renderTablaReportes(demo);
}

/** Genera datos de demostración para los reportes */
function generarDemoData() {
  const dias = ['2026-04-25','2026-04-26','2026-04-27','2026-04-28','2026-04-29','2026-04-30','2026-05-01'];
  const tots = [820, 1240, 960, 1100, 1450, 2100, 1450];
  return dias.map((f, i) => ({
    fecha:                f,
    total_ventas:         tots[i],
    total_ordenes:        Math.round(tots[i] / 52),
    total_efectivo:       tots[i] * 0.65,
    total_tarjeta:        tots[i] * 0.25,
    total_transferencia:  tots[i] * 0.10,
    producto_mas_vendido: 'Taco al pastor',
  }));
}

/**
 * Dibuja las 4 gráficas de reportes con Chart.js
 * @param {Array} lista - Lista de reportes diarios
 */
function dibujarGraficas(lista) {
  const hoy = lista[0] || {};

  // 1. Barras por método de pago
  destroyChart('metodo');
  S.charts['metodo'] = new Chart(document.getElementById('chart-metodo'), {
    type: 'bar',
    data: {
      labels:   ['Efectivo', 'Tarjeta', 'Transfer.'],
      datasets: [{
        data: [
          parseFloat(hoy.total_efectivo      || 0),
          parseFloat(hoy.total_tarjeta       || 0),
          parseFloat(hoy.total_transferencia || 0),
        ],
        backgroundColor: ['rgba(239,159,39,0.8)', 'rgba(59,130,246,0.8)', 'rgba(90,158,31,0.8)'],
        borderColor:     ['#EF9F27', '#3b82f6', '#5a9e1f'],
        borderWidth: 1,
        borderRadius: 5,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { ticks: { callback: v => '$' + v }, grid: { color: 'rgba(255,255,255,0.04)' } },
        x: { grid: { display: false } },
      },
    },
  });

  // 2. Línea tendencia semanal
  destroyChart('semana');
  const l7 = lista.slice(0, 7).reverse().map(r => r.fecha?.slice(5) || '');
  const v7 = lista.slice(0, 7).reverse().map(r => parseFloat(r.total_ventas || 0));
  S.charts['semana'] = new Chart(document.getElementById('chart-semana'), {
    type: 'line',
    data: {
      labels:   l7,
      datasets: [{
        data: v7, label: 'Ventas',
        borderColor:     '#EF9F27',
        backgroundColor: 'rgba(239,159,39,0.1)',
        fill: true, tension: 0.4,
        pointBackgroundColor: '#EF9F27', pointRadius: 4,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { ticks: { callback: v => '$' + v }, grid: { color: 'rgba(255,255,255,0.04)' } },
        x: { grid: { display: false } },
      },
    },
  });

  // 3. Barras horizontales productos más vendidos
  destroyChart('productos');
  const pm = {};
  S.ordenes.filter(o => !o.activa).forEach(o =>
    o.items.forEach(i => { pm[i.nombre] = (pm[i.nombre] || 0) + i.qty; })
  );
  const pl = Object.keys(pm).length
    ? Object.keys(pm).slice(0, 6)
    : ['Taco al pastor', 'Quesadilla', 'Taco bistec', 'Agua fresca', 'Taco suadero', 'Refresco'];
  const pv = Object.keys(pm).length
    ? Object.values(pm).slice(0, 6)
    : [45, 28, 22, 18, 15, 12];
  S.charts['productos'] = new Chart(document.getElementById('chart-productos'), {
    type: 'bar',
    data: {
      labels:   pl,
      datasets: [{
        data: pv,
        backgroundColor: 'rgba(239,159,39,0.75)',
        borderColor: '#EF9F27', borderWidth: 1, borderRadius: 4,
      }],
    },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' } },
        y: { grid: { display: false } },
      },
    },
  });

  // 4. Donut distribución
  destroyChart('donut');
  S.charts['donut'] = new Chart(document.getElementById('chart-donut'), {
    type: 'doughnut',
    data: {
      labels: ['Efectivo', 'Tarjeta', 'Transfer.'],
      datasets: [{
        data: [
          parseFloat(hoy.total_efectivo      || 980),
          parseFloat(hoy.total_tarjeta       || 360),
          parseFloat(hoy.total_transferencia || 110),
        ],
        backgroundColor: ['rgba(239,159,39,0.8)', 'rgba(59,130,246,0.8)', 'rgba(90,158,31,0.8)'],
        borderWidth: 0, hoverOffset: 6,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '65%',
      plugins: { legend: { position: 'bottom', labels: { padding: 12, font: { size: 10 } } } },
    },
  });
}

/**
 * Renderiza la tabla del historial de reportes
 * @param {Array} lista - Lista de reportes diarios
 */
function renderTablaReportes(lista) {
  const tb = document.getElementById('rep-tbody');
  tb.innerHTML = '';

  lista.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.fecha}</td>
      <td>${r.total_ordenes}</td>
      <td><strong>${fmt(r.total_ventas)}</strong></td>
      <td>${fmt(r.total_efectivo)}</td>
      <td>${fmt(r.total_tarjeta       || 0)}</td>
      <td>${fmt(r.total_transferencia || 0)}</td>
      <td>${r.producto_mas_vendido || '—'}</td>
    `;
    tb.appendChild(tr);
  });

  if (!lista.length) {
    tb.innerHTML = '<tr><td colspan="7" class="empty-s">Sin reportes aún</td></tr>';
  }
}

/* ══════════════════════════════════════
   EXPORTAR EXCEL
══════════════════════════════════════ */

/** Exporta los reportes a un archivo Excel con 3 hojas */
function exportarExcel() {
  const wb = XLSX.utils.book_new();

  // Hoja 1: Ventas diarias
  const resumen = [
    ['TAQUERÍA ERP — Reporte de Ventas'],
    ['Generado:', new Date().toLocaleString('es-MX')],
    [],
    ['Fecha', 'Órdenes', 'Total', 'Efectivo', 'Tarjeta', 'Transfer.', 'Más vendido'],
  ];
  S.reporteData.forEach(r => resumen.push([
    r.fecha, r.total_ordenes,
    parseFloat(r.total_ventas       || 0),
    parseFloat(r.total_efectivo     || 0),
    parseFloat(r.total_tarjeta      || 0),
    parseFloat(r.total_transferencia|| 0),
    r.producto_mas_vendido || '—',
  ]));
  const ws1 = XLSX.utils.aoa_to_sheet(resumen);
  ws1['!cols'] = [{ wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Ventas Diarias');

  // Hoja 2: Inventario
  const invData = [['Ingrediente', 'Unidad', 'Stock Actual', 'Mínimo', 'Estado']];
  S.ingredientes.forEach(i => {
    const a = parseFloat(i.stock_actual || 0);
    const m = parseFloat(i.stock_minimo || 0);
    invData.push([i.nombre, i.unidad, a, m, a <= m ? '⚠ Bajo' : a <= m * 1.5 ? 'Bajo' : 'OK']);
  });
  const ws2 = XLSX.utils.aoa_to_sheet(invData);
  ws2['!cols'] = [{ wch: 20 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Inventario');

  // Hoja 3: Órdenes del día
  const ordsData = [['Mesa/Cliente', 'Productos', 'Total', 'Estado']];
  S.ordenes.forEach(o => ordsData.push([
    o.mesa,
    o.items.map(i => `${i.qty}x ${i.nombre}`).join(', '),
    calcTotal(o).toFixed(2),
    o.activa ? 'Abierta' : 'Cobrada',
  ]));
  const ws3 = XLSX.utils.aoa_to_sheet(ordsData);
  ws3['!cols'] = [{ wch: 18 }, { wch: 40 }, { wch: 12 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, ws3, 'Órdenes del día');

  XLSX.writeFile(wb, `reporte_taqueria_${new Date().toISOString().slice(0, 10)}.xlsx`);
  toast('Excel descargado ✓', 'ok');
}

/* ══════════════════════════════════════
   EXPORTAR PDF
══════════════════════════════════════ */

/** Exporta los reportes a un archivo PDF con tablas y gráficas */
function exportarPDF() {
  const { jsPDF } = window.jspdf;
  const doc       = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const fecha     = new Date().toLocaleString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });

  // Encabezado
  doc.setFillColor(239, 159, 39);
  doc.rect(0, 0, 210, 26, 'F');
  doc.setTextColor(26, 19, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('TAQUERÍA ERP', 14, 13);
  doc.setFontSize(9);
  doc.text(`Reporte de Ventas — ${fecha}`, 14, 21);

  // Stats del día
  doc.setFillColor(30, 28, 24);
  doc.rect(0, 26, 210, 28, 'F');
  const statsX = [14, 62, 110, 158];
  const statsL = ['Total ventas', 'Órdenes', 'Efectivo', 'Tarjeta+Transfer.'];
  const statsV = [
    document.getElementById('r-total').textContent,
    document.getElementById('r-ords').textContent,
    document.getElementById('r-efec').textContent,
    document.getElementById('r-dig').textContent,
  ];
  statsX.forEach((x, i) => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(160, 156, 148);
    doc.text(statsL[i], x, 34);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(239, 159, 39);
    doc.text(statsV[i], x, 45);
  });

  // Tabla historial
  doc.autoTable({
    startY: 62,
    head: [['Fecha', 'Órdenes', 'Total', 'Efectivo', 'Tarjeta', 'Transfer.', 'Más vendido']],
    body: S.reporteData.map(r => [
      r.fecha, r.total_ordenes,
      fmt(r.total_ventas), fmt(r.total_efectivo),
      fmt(r.total_tarjeta || 0), fmt(r.total_transferencia || 0),
      r.producto_mas_vendido || '—',
    ]),
    headStyles:          { fillColor: [239, 159, 39], textColor: [26, 19, 0], fontStyle: 'bold', fontSize: 7 },
    bodyStyles:          { fontSize: 7 },
    alternateRowStyles:  { fillColor: [245, 242, 235] },
    styles:              { cellPadding: 2.5 },
    margin:              { left: 14, right: 14 },
  });

  let y = doc.lastAutoTable.finalY + 10;

  // Gráfica de métodos de pago
  if (y < 220) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(30, 28, 24);
    doc.text('Distribución por método de pago', 14, y);
    y += 5;

    const hoy  = S.reporteData[0] || {};
    const mets = [
      { label: 'Efectivo',  val: parseFloat(hoy.total_efectivo      || 980), color: [239, 159, 39] },
      { label: 'Tarjeta',   val: parseFloat(hoy.total_tarjeta       || 360), color: [59,  130, 246] },
      { label: 'Transfer.', val: parseFloat(hoy.total_transferencia || 110), color: [90,  158,  31] },
    ];
    const maxV = Math.max(...mets.map(m => m.val), 1);

    mets.forEach(m => {
      const pct = m.val / maxV;
      doc.setFillColor(220, 218, 214); doc.rect(14, y, 130, 6, 'F');
      doc.setFillColor(...m.color);    doc.rect(14, y, 130 * pct, 6, 'F');
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(30, 28, 24);
      doc.text(m.label, 14, y + 10);
      doc.setFont('helvetica', 'bold');
      doc.text(fmt(m.val), 148, y + 4);
      y += 16;
    });
  }

  // Pie de página
  const pages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7); doc.setTextColor(160, 156, 148);
    doc.text(`Taquería ERP — ${fecha} — Pág ${i}/${pages}`, 14, 290);
  }

  doc.save(`reporte_taqueria_${new Date().toISOString().slice(0, 10)}.pdf`);
  toast('PDF descargado ✓', 'ok');
}

/* ══════════════════════════════════════
   INIT
══════════════════════════════════════ */
window.addEventListener('DOMContentLoaded', cargarTodo);