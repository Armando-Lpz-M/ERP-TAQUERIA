/* ══════════════════════════════════════
   TAQUERÍA ERP — Login
   Autenticación JWT con roles
══════════════════════════════════════ */

const API = 'http://127.0.0.1:8000/api';

/**
 * Realiza el proceso de login:
 * 1. Obtiene tokens JWT
 * 2. Guarda tokens en localStorage
 * 3. Obtiene rol del usuario via /api/me/
 * 4. Redirige al ERP
 */
async function doLogin() {
  const u      = document.getElementById('u').value.trim();
  const p      = document.getElementById('p').value;
  const errBar = document.getElementById('err-bar');
  const btn    = document.getElementById('btn-login');
  const txt    = document.getElementById('btn-txt');

  errBar.style.display = 'none';

  if (!u || !p) {
    mostrarError('Completa usuario y contraseña');
    return;
  }

  // Estado de carga
  btn.classList.add('loading');
  txt.innerHTML = '<div class="spinner"></div> Verificando...';

  try {
    // 1. Obtener tokens JWT
    const res = await fetch(`${API}/token/`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ username: u, password: p }),
    });

    if (!res.ok) throw new Error('Credenciales incorrectas');
    const tokens = await res.json();

    // 2. Guardar tokens en localStorage
    localStorage.setItem('erp_access',  tokens.access);
    localStorage.setItem('erp_refresh', tokens.refresh);
    localStorage.setItem('erp_user',    u);

    // 3. Obtener rol del usuario via /api/me/
    try {
      const meRes = await fetch(`${API}/me/`, {
        headers: { Authorization: 'Bearer ' + tokens.access },
      });

      if (meRes.ok) {
        const meData = await meRes.json();
        localStorage.setItem('erp_rol',          meData.rol);
        localStorage.setItem('erp_is_superuser', meData.is_superuser);
      } else {
        localStorage.setItem('erp_rol', 'admin');
      }
    } catch {
      localStorage.setItem('erp_rol', 'admin');
    }

    // 4. Redirigir al ERP
    txt.innerHTML      = '✓ Acceso concedido';
    btn.style.background = '#5a9e1f';
    btn.style.color      = '#fff';
    setTimeout(() => { window.location.href = '/erp/'; }, 600);

  } catch {
    btn.classList.remove('loading');
    btn.style.background = '';
    btn.style.color      = '';
    txt.textContent      = 'Entrar al sistema';
    mostrarError('Usuario o contraseña incorrectos');
  }
}

/**
 * Muestra un mensaje de error en la barra de error
 * @param {string} msg - Mensaje a mostrar
 */
function mostrarError(msg) {
  const el    = document.getElementById('err-bar');
  el.textContent  = msg;
  el.style.display = 'block';
}

// Enter para hacer login
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doLogin();
});