// src/utils/db.js
const path     = require('path');
const fs       = require('fs');
const Database = require('better-sqlite3');

/**
 * Abre/crea la base en userData y aplica DDL.
 */
function initDb(app) {
  const dataDir = app.getPath('userData');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const file = path.join(dataDir, 'gestion.db');
  const db   = new Database(file);

  db.exec(`
    CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      descripcion TEXT NOT NULL UNIQUE,
      barcode TEXT UNIQUE,
      precio_unidad REAL,
      precio_x1000g REAL
    );
    CREATE TABLE IF NOT EXISTS ventas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL,
      tipo_pago TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS itemsVenta (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venta_id INTEGER NOT NULL,
      producto_id INTEGER NOT NULL,
      cantidad REAL NOT NULL,
      subtotal REAL NOT NULL,
      FOREIGN KEY (venta_id) REFERENCES ventas(id),
      FOREIGN KEY (producto_id) REFERENCES productos(id)
    );
  `);

  return db;
}

/**
 * Registra todos los handlers IPCMain
 */
function initDbHandlers(ipcMain, app) {
  const db = initDb(app);

  // 1) Listar todos
  ipcMain.handle('productos:listar', () => {
    return db
      .prepare('SELECT * FROM productos ORDER BY descripcion COLLATE NOCASE')
      .all();
  });

  // 2) Obtener uno solo
  ipcMain.handle('productos:obtener', (evt, id) => {
    return db
      .prepare('SELECT * FROM productos WHERE id = ?')
      .get(id);
  });

  // 3) Agregar
  ipcMain.handle('productos:agregar', (evt, p) => {
    const stmt = db.prepare(`
      INSERT INTO productos (descripcion, barcode, precio_unidad, precio_x1000g)
      VALUES (@descripcion, @barcode, @precio_unidad, @precio_x1000g)
    `);
    const info = stmt.run(p);
    return { id: info.lastInsertRowid };
  });

  // 4) Editar
  ipcMain.handle('productos:editar', (evt, p) => {
    db.prepare(`
      UPDATE productos
      SET descripcion=@descripcion,
          barcode=@barcode,
          precio_unidad=@precio_unidad,
          precio_x1000g=@precio_x1000g
      WHERE id=@id
    `).run(p);
  });

  // 5) Eliminar
  ipcMain.handle('productos:eliminar', (evt, id) => {
    db.prepare('DELETE FROM productos WHERE id = ?').run(id);
  });

  // 6) Registrar ventas (transacción)
  ipcMain.handle('ventas:registrar', (evt, { fecha, tipo_pago, items }) => {
    const insertVenta = db.prepare(`
      INSERT INTO ventas (fecha, tipo_pago) VALUES (?, ?)
    `);
    const ventaInfo = insertVenta.run(fecha, tipo_pago);
    const ventaId   = ventaInfo.lastInsertRowid;

    const insertItem = db.prepare(`
      INSERT INTO itemsVenta (venta_id, producto_id, cantidad, subtotal)
      VALUES (?, ?, ?, ?)
    `);

    const calcularTotal = db.transaction(itms => {
      let total = 0;
      for (const it of itms) {
        insertItem.run(ventaId, it.producto.id, it.cantidad, it.subtotal);
        total += it.subtotal;
      }
      return total;
    });

    const total = calcularTotal(items);
    return { id: ventaId, total };
  });

  // 7) (Opcional) Listar ventas con items
  ipcMain.handle('ventas:listar', () => {
    const ventas = db.prepare('SELECT * FROM ventas ORDER BY id').all();
    const items  = db.prepare('SELECT * FROM itemsVenta').all();
    return ventas.map(v => ({
      ...v,
      items: items.filter(i => i.venta_id === v.id)
    }));
  });
}

module.exports = { initDbHandlers };