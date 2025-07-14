// src/renderer.js
const { ipcRenderer } = require('electron');
import './index.css';

document.addEventListener('DOMContentLoaded', () => {

  // ——————————————————————————
  // 1) Referencias al DOM
  // ——————————————————————————
  const tabProductos       = document.getElementById('tabProductos');
  const tabVentas          = document.getElementById('tabVentas');
  const contProd           = document.getElementById('contenedorProductos');
  const contVent           = document.getElementById('contenedorVentas');

  const formProducto       = document.getElementById('formProducto');
  const btnCancelarEdicion = document.getElementById('btnCancelarEdicion');
  const tblProductos       = document.querySelector('#tblProductos tbody');
  const prodContainer      = document.getElementById('prodContainer');

  const barcodeInput       = document.getElementById('barcodeInput');
  const btnBuscarCodigo    = document.getElementById('btnBuscarCodigo');

  const descripcionInput   = document.getElementById('descripcionInput');
  const listaDescs         = document.getElementById('listaDescripciones');
  const buscarBtn          = document.getElementById('buscarBtn');

  const productoActual     = document.getElementById('productoActual');

  const formVenta          = document.getElementById('formVenta');
  const cantidadInput      = document.getElementById('cantidadInput');
  const btnConfirmarVenta  = document.getElementById('btnConfirmarVenta');
  const btnVaciarTicket    = document.getElementById('btnVaciarTicket');
  const btnExportar        = document.getElementById('btnExportar');

  const ticketBody         = document.querySelector('#ticketActual tbody');
  const totalVenta         = document.getElementById('totalVenta');

  // ——————————————————————————
  // 2) Estado global
  // ——————————————————————————
  let ticket = [];
  let productoSeleccionado = null;

  let productosCache = [];
  let offsetRender   = 0;
  const CHUNK = 20;

  // ——————————————————————————
  // 3) Utilitarios
  // ——————————————————————————
  async function buscarProductoPorCodigo(codigo) {
    const all = await ipcRenderer.invoke('productos:listar');
    return all.find(p => p.barcode && p.barcode.toString() === codigo.toString());
  }

  async function procesarBusquedaCodigo(code) {
    const p = await buscarProductoPorCodigo(code);
    if (!p) {
      alert(`No se encontró producto con código "${code}"`);
      barcodeInput.value = '';
      return barcodeInput.focus();
    }
    productoSeleccionado = p;
    productoActual.textContent = `→ ${p.descripcion}`;
    return p;
  }

  async function buscarProductoPorDescripcion(desc) {
    const all = await ipcRenderer.invoke('productos:listar');
    return all.find(p => p.descripcion.toLowerCase() === desc.toLowerCase());
  }

  function mostrarMensaje(texto) {
    const msg = document.createElement('div');
    msg.className = 'mensaje';
    msg.textContent = texto;
    document.body.appendChild(msg);
    setTimeout(() => msg.remove(), 3000);
  }

  function sortYCacheProductos(list) {
    list.sort((a, b) => a.descripcion.localeCompare(b.descripcion, 'es', { sensitivity: 'base' }));
    productosCache = list;
    offsetRender   = 0;
  }

  function loadMoreProductos() {
    const slice = productosCache.slice(offsetRender, offsetRender + CHUNK);
    slice.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${p.descripcion}</td>
        <td>${p.barcode || ''}</td>
        <td>${p.precio_unidad || ''}</td>
        <td>${p.precio_x1000g || ''}</td>
        <td>
          <button class="btnEditar" data-id="${p.id}">✎</button>
          <button class="btnEliminar" data-id="${p.id}">🗑️</button>
        </td>`;
      tblProductos.appendChild(tr);
    });
    offsetRender += CHUNK;
  }

  async function renderProductos() {
    tblProductos.innerHTML = '';
    const list = await ipcRenderer.invoke('productos:listar');
    sortYCacheProductos(list);
    listaDescs.innerHTML = '';
    productosCache.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.descripcion;
      listaDescs.appendChild(opt);
    });
    loadMoreProductos();
  }

  prodContainer.addEventListener('scroll', () => {
    if (prodContainer.scrollTop + prodContainer.clientHeight >= prodContainer.scrollHeight - 5) {
      loadMoreProductos();
    }
  });

  // ——————————————————————————
  // 4) CRUD Productos
  // ——————————————————————————
  formProducto.addEventListener('submit', async e => {
    e.preventDefault();
    const datos = Object.fromEntries(new FormData(formProducto));
    const desc = datos.descripcion.trim();
    const bc   = (datos.barcode || '').trim();
    const pu   = parseFloat(datos.precio_unidad) || 0;
    const pw   = parseFloat(datos.precio_x1000g) || 0;
    const editingId = +formProducto.dataset.editingId || null;

    // Validaciones
    if (!desc) {
      alert('La descripción es obligatoria');
      formProducto.querySelector('[name="descripcion"]').focus();
      return;
    }
    if ((pu > 0 && pw > 0) || (pu === 0 && pw === 0)) {
      alert('Define precio unidad O kilo, no ambos');
      formProducto.querySelector('[name="precio_unidad"]').focus();
      return;
    }
    const all = await ipcRenderer.invoke('productos:listar');
    if (all.some(x => x.descripcion.toLowerCase() === desc.toLowerCase() && x.id !== editingId)) {
      alert('Descripción duplicada');
      formProducto.querySelector('[name="descripcion"]').focus();
      return;
    }
    if (bc && all.some(x => x.barcode === bc && x.id !== editingId)) {
      alert('Código de barras duplicado');
      formProducto.querySelector('[name="barcode"]').focus();
      return;
    }

    if (editingId) {
      await ipcRenderer.invoke('productos:editar', {
        id: editingId,
        descripcion: desc,
        barcode: bc || null,
        precio_unidad: pu || null,
        precio_x1000g: pw || null
      });
      mostrarMensaje('Producto actualizado');
    } else {
      await ipcRenderer.invoke('productos:agregar', {
        descripcion: desc,
        barcode: bc || null,
        precio_unidad: pu || null,
        precio_x1000g: pw || null
      });
      mostrarMensaje('Producto agregado');
    }

    formProducto.reset();
    delete formProducto.dataset.editingId;
    formProducto.querySelector('button[type="submit"]').textContent = 'Guardar';
    btnCancelarEdicion.classList.add('hidden');
    renderProductos();
  });

  tblProductos.addEventListener('click', async e => {
    const target = e.target;
    const id     = +target.dataset.id;

    if (target.classList.contains('btnEliminar')) {
      if (confirm('¿Eliminar este producto?')) {
        await ipcRenderer.invoke('productos:eliminar', id);
        mostrarMensaje('Producto eliminado');
        renderProductos();
      }
      return;
    }

    if (target.classList.contains('btnEditar')) {
      const p = await ipcRenderer.invoke('productos:obtener', id);

      const descInput = formProducto.querySelector('[name="descripcion"]');
      const bcInput   = formProducto.querySelector('[name="barcode"]');
      const puInput   = formProducto.querySelector('[name="precio_unidad"]');
      const pwInput   = formProducto.querySelector('[name="precio_x1000g"]');
      const submitBtn = formProducto.querySelector('button[type="submit"]');

      descInput.value = p.descripcion;
      bcInput.value   = p.barcode || '';
      puInput.value   = p.precio_unidad || '';
      pwInput.value   = p.precio_x1000g || '';

      formProducto.dataset.editingId = id;
      submitBtn.textContent = 'Actualizar';
      btnCancelarEdicion.classList.remove('hidden');
      setTimeout(() => descInput.focus(), 0);
    }
  });

  btnCancelarEdicion.addEventListener('click', () => {
    formProducto.reset();
    delete formProducto.dataset.editingId;
    formProducto.querySelector('button[type="submit"]').textContent = 'Guardar';
    btnCancelarEdicion.classList.add('hidden');
    formProducto.querySelector('[name="descripcion"]').focus();
  });

  // ——————————————————————————
  // 5) Terminal de Ventas
  // ——————————————————————————
  formVenta.addEventListener('submit', async e => {
    e.preventDefault();
    if (!productoSeleccionado) {
      return alert('Primero selecciona un producto');
    }
    const cant = parseFloat(cantidadInput.value);
    if (!(cant > 0)) {
      alert('Cantidad inválida');
      return cantidadInput.focus();
    }
    const p = productoSeleccionado;
    ticket.push({
      producto: p,
      cantidad: cant,
      subtotal: p.precio_unidad
        ? p.precio_unidad * cant
        : (p.precio_x1000g / 1000) * cant
    });
    cantidadInput.value = '';
    productoSeleccionado = null;
    productoActual.textContent = '';
    actualizarTicket();
    barcodeInput.focus();
  });

  btnConfirmarVenta.addEventListener('click', async () => {
    if (ticket.length === 0) {
      return alert('El ticket está vacío');
    }
    if (!confirm('¿Finalizar la venta?')) return;

    let tipoPago;
    try {
      tipoPago = await ipcRenderer.invoke('ventas:seleccionar-medio-pago');
    } catch {
      return; // cancelado
    }

    const now = new Date().toISOString();
    const res = await ipcRenderer.invoke('ventas:registrar', {
      fecha: now,
      tipo_pago: tipoPago,
      items: ticket
    });

    alert(`Venta #${res.id} por $${res.total.toFixed(2)}`);
    ticket = [];
    productoSeleccionado = null;
    productoActual.textContent = '';
    actualizarTicket();
    barcodeInput.focus();
  });

  btnVaciarTicket.addEventListener('click', () => {
    if (!ticket.length) return;
    if (confirm('¿Vaciar todo el ticket?')) {
      ticket = [];
      productoSeleccionado = null;
      productoActual.textContent = '';
      actualizarTicket();
      barcodeInput.focus();
    }
  });

  ticketBody.addEventListener('click', e => {
    if (!e.target.classList.contains('btnBorrarLinea')) return;
    const i = +e.target.dataset.index;
    ticket.splice(i, 1);
    actualizarTicket();
  });

  // ——————————————————————————
  // 6) Pestañas y arranque
  // ——————————————————————————
  contProd.classList.remove('hidden');
  contVent.classList.add('hidden');
  tabProductos.classList.add('active');
  tabVentas.classList.remove('active');

  tabProductos.addEventListener('click', () => {
    contProd.classList.remove('hidden');
    contVent.classList.add('hidden');
    tabProductos.classList.add('active');
    tabVentas.classList.remove('active');
  });
  tabVentas.addEventListener('click', () => {
    contVent.classList.remove('hidden');
    contProd.classList.add('hidden');
    tabVentas.classList.add('active');
    tabProductos.classList.remove('active');
  });

  // Foco inicial
  barcodeInput.focus();

  // ——————————————————————————
  // 7) actualizarTicket()
  // ——————————————————————————
  function actualizarTicket() {
    ticketBody.innerHTML = '';
    let total = 0;
    ticket.forEach((l, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${l.producto.descripcion}</td>
        <td>${l.cantidad}</td>
        <td>${l.subtotal.toFixed(2)}</td>
        <td><button class="btnBorrarLinea" data-index="${i}">🗑️</button></td>`;
      ticketBody.appendChild(tr);
      total += l.subtotal;
    });
    totalVenta.textContent = `$${total.toFixed(2)}`;
  }

  // Finalmente, el primer render de productos
  renderProductos();
});