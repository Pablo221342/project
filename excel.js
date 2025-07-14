// src/utils/excel.js
const ExcelJS = require('exceljs');
const { db }  = require('./db');

async function generarReporteVentas(dialog) {
  // Obtiene datos
  const ventas = db.prepare(`SELECT * FROM ventas ORDER BY id`).all();
  const items  = db.prepare(`SELECT * FROM itemsVenta`).all();

  // Crea workbook y hoja
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Ventas');

  ws.columns = [
    { header: 'Venta ID',   key: 'ventaId',   width: 10 },
    { header: 'Fecha',      key: 'fecha',     width: 25 },
    { header: 'Tipo Pago',  key: 'tipo_pago', width: 15 },
    { header: 'Prod. ID',   key: 'prodId',    width: 10 },
    { header: 'Cantidad',   key: 'cantidad',  width: 12 },
    { header: 'Subtotal',   key: 'subtotal',  width: 12 }
  ];

  // Rellena filas
  for (const v of ventas) {
    const lista = items.filter(i => i.venta_id === v.id);
    for (const it of lista) {
      ws.addRow({
        ventaId:  v.id,
        fecha:    v.fecha,
        tipo_pago:v.tipo_pago,
        prodId:   it.producto_id,
        cantidad: it.cantidad,
        subtotal: it.subtotal
      });
    }
  }

  // Dialog "Guardar como..."
  const { filePath } = await dialog.showSaveDialog({
    title: 'Guardar reporte de ventas',
    defaultPath: 'reporte_ventas.xlsx',
    filters: [{ name: 'Excel', extensions: ['xlsx'] }]
  });
  if (!filePath) throw new Error('Guardado cancelado');

  // Escribe archivo
  await wb.xlsx.writeFile(filePath);
  return filePath;
}

function initExcelHandlers(ipcMain, dialog) {
  ipcMain.handle('reporte:generar', () => generarReporteVentas(dialog));
}

module.exports = { initExcelHandlers };