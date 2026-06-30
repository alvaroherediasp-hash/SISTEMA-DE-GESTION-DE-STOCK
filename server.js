const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mysql = require('mysql2');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

let pool;
let promisePool;

async function initDB() {
  const tempPool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
  const tempPromisePool = tempPool.promise();

  const connection = await tempPromisePool.getConnection();
  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS club_liceo`);
    console.log('Base de datos creada');
  } finally {
    connection.release();
    await tempPool.end();
  }

  pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'club_liceo',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
  promisePool = pool.promise();

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS jugadores (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(100) NOT NULL,
      apellido VARCHAR(100) DEFAULT '',
      dni VARCHAR(20) UNIQUE NOT NULL,
      apodo VARCHAR(50),
      celular VARCHAR(20),
      correo VARCHAR(100),
      p1 VARCHAR(50),
      p2 VARCHAR(50),
      p3 VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS asistencia_entrenamiento (
      id INT AUTO_INCREMENT PRIMARY KEY,
      jugador_id INT NOT NULL,
      semana VARCHAR(10) NOT NULL,
      dia1_check BOOLEAN DEFAULT FALSE,
      dia2_check BOOLEAN DEFAULT FALSE,
      dia3_check BOOLEAN DEFAULT FALSE,
      estado ENUM('completo', 'incompleto', 'no_asistio') DEFAULT 'no_asistio',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (jugador_id) REFERENCES jugadores(id) ON DELETE CASCADE,
      UNIQUE KEY unique_jugador_semana (jugador_id, semana)
    )
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS cuota_club (
      id INT AUTO_INCREMENT PRIMARY KEY,
      jugador_id INT NOT NULL,
      mes INT NOT NULL,
      anio INT NOT NULL,
      check_pagado BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (jugador_id) REFERENCES jugadores(id) ON DELETE CASCADE,
      UNIQUE KEY unique_club_mes (jugador_id, mes, anio)
    )
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS cuota_union (
      id INT AUTO_INCREMENT PRIMARY KEY,
      jugador_id INT NOT NULL,
      anio INT NOT NULL,
      cuota1_check BOOLEAN DEFAULT FALSE,
      cuota1_importe DECIMAL(10,2),
      cuota1_medio_pago VARCHAR(50),
      cuota2_check BOOLEAN DEFAULT FALSE,
      cuota2_importe DECIMAL(10,2),
      cuota2_medio_pago VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (jugador_id) REFERENCES jugadores(id) ON DELETE CASCADE,
      UNIQUE KEY unique_union_anio (jugador_id, anio)
    )
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS partidos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      fecha DATE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS pago_partido (
      id INT AUTO_INCREMENT PRIMARY KEY,
      partido_id INT NOT NULL,
      jugador_id INT NOT NULL,
      check_asistio BOOLEAN DEFAULT FALSE,
      importe DECIMAL(10,2),
      medio_pago VARCHAR(50),
      estado_pago ENUM('pagado', 'no_pago') DEFAULT 'no_pago',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (partido_id) REFERENCES partidos(id) ON DELETE CASCADE,
      FOREIGN KEY (jugador_id) REFERENCES jugadores(id) ON DELETE CASCADE,
      UNIQUE KEY unique_partido_jugador (partido_id, jugador_id)
    )
  `);

  console.log('Base de datos inicializada correctamente');
}

// ==================== JUGADORES ====================

app.get('/api/jugadores', async (req, res) => {
  try {
    const [rows] = await promisePool.query('SELECT * FROM jugadores ORDER BY apellido, nombre');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/jugadores/buscar', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);
    const [rows] = await promisePool.query(
      `SELECT * FROM jugadores WHERE nombre LIKE ? OR apellido LIKE ? OR dni LIKE ? ORDER BY apellido, nombre`,
      [`%${q}%`, `%${q}%`, `%${q}%`]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/jugadores/:id', async (req, res) => {
  try {
    const [rows] = await promisePool.query('SELECT * FROM jugadores WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Jugador no encontrado' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/jugadores', async (req, res) => {
  try {
    const { nombre, apellido, dni, apodo, celular, correo, p1, p2, p3 } = req.body;
    const [result] = await promisePool.query(
      'INSERT INTO jugadores (nombre, apellido, dni, apodo, celular, correo, p1, p2, p3) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [nombre, apellido || '', dni, apodo, celular, correo, p1, p2, p3]
    );
    res.json({ id: result.insertId, message: 'Jugador creado exitosamente' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'El DNI ya existe' });
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/jugadores/:id', async (req, res) => {
  try {
    const { nombre, apellido, dni, apodo, celular, correo, p1, p2, p3 } = req.body;
    await promisePool.query(
      'UPDATE jugadores SET nombre=?, apellido=?, dni=?, apodo=?, celular=?, correo=?, p1=?, p2=?, p3=? WHERE id=?',
      [nombre, apellido || '', dni, apodo, celular, correo, p1, p2, p3, req.params.id]
    );
    res.json({ message: 'Jugador actualizado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/jugadores/:id', async (req, res) => {
  try {
    await promisePool.query('DELETE FROM jugadores WHERE id = ?', [req.params.id]);
    res.json({ message: 'Jugador eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ASISTENCIA ENTRENAMIENTO ====================

app.get('/api/asistencia', async (req, res) => {
  try {
    const { semana } = req.query;
    let query = 'SELECT a.*, j.nombre, j.apellido, j.dni FROM asistencia_entrenamiento a JOIN jugadores j ON a.jugador_id = j.id';
    let params = [];
    if (semana) { query += ' WHERE a.semana = ?'; params.push(semana); }
    query += ' ORDER BY j.apellido, j.nombre';
    const [rows] = await promisePool.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/asistencia', async (req, res) => {
  try {
    const { jugador_id, semana, dia1_check, dia2_check, dia3_check } = req.body;
    let estado = 'no_asistio';
    const checks = [dia1_check, dia2_check, dia3_check].filter(Boolean).length;
    if (checks === 3) estado = 'completo';
    else if (checks > 0) estado = 'incompleto';

    await promisePool.query(
      `INSERT INTO asistencia_entrenamiento (jugador_id, semana, dia1_check, dia2_check, dia3_check, estado)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE dia1_check=?, dia2_check=?, dia3_check=?, estado=?`,
      [jugador_id, semana, dia1_check || false, dia2_check || false, dia3_check || false, estado,
       dia1_check || false, dia2_check || false, dia3_check || false, estado]
    );
    res.json({ message: 'Asistencia guardada', estado });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== CUOTAS CLUB ====================

app.get('/api/cuotas-club', async (req, res) => {
  try {
    const { anio } = req.query;
    let query = 'SELECT j.id, j.nombre, j.apellido, j.dni, c.mes, c.check_pagado FROM cuota_club c JOIN jugadores j ON c.jugador_id = j.id';
    let params = [];
    if (anio) { query += ' WHERE c.anio = ?'; params.push(anio); }
    query += ' ORDER BY j.apellido, j.nombre, c.mes';
    const [rows] = await promisePool.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/cuotas-club', async (req, res) => {
  try {
    const { jugador_id, mes, anio, check_pagado } = req.body;
    await promisePool.query(
      `INSERT INTO cuota_club (jugador_id, mes, anio, check_pagado) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE check_pagado=?`,
      [jugador_id, mes, anio, check_pagado, check_pagado]
    );
    res.json({ message: 'Cuota club guardada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== CUOTAS UNION ====================

app.get('/api/cuotas-union', async (req, res) => {
  try {
    const { anio } = req.query;
    let query = 'SELECT j.id, j.nombre, j.apellido, j.dni, c.* FROM cuota_union c JOIN jugadores j ON c.jugador_id = j.id';
    let params = [];
    if (anio) { query += ' WHERE c.anio = ?'; params.push(anio); }
    query += ' ORDER BY j.apellido, j.nombre';
    const [rows] = await promisePool.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/cuotas-union', async (req, res) => {
  try {
    const { jugador_id, anio, cuota1_check, cuota1_importe, cuota1_medio_pago, cuota2_check, cuota2_importe, cuota2_medio_pago } = req.body;
    await promisePool.query(
      `INSERT INTO cuota_union (jugador_id, anio, cuota1_check, cuota1_importe, cuota1_medio_pago, cuota2_check, cuota2_importe, cuota2_medio_pago)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE cuota1_check=?, cuota1_importe=?, cuota1_medio_pago=?, cuota2_check=?, cuota2_importe=?, cuota2_medio_pago=?`,
      [jugador_id, anio, cuota1_check || false, cuota1_importe, cuota1_medio_pago, cuota2_check || false, cuota2_importe, cuota2_medio_pago,
       cuota1_check || false, cuota1_importe, cuota1_medio_pago, cuota2_check || false, cuota2_importe, cuota2_medio_pago]
    );
    res.json({ message: 'Cuota unión guardada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== PARTIDOS ====================

app.get('/api/partidos', async (req, res) => {
  try {
    const [rows] = await promisePool.query('SELECT * FROM partidos ORDER BY fecha DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/partidos', async (req, res) => {
  const connection = await promisePool.getConnection();
  try {
    await connection.beginTransaction();
    const fecha = req.body.fecha || new Date().toISOString().split('T')[0];
    const [result] = await connection.query('INSERT INTO partidos (fecha) VALUES (?)', [fecha]);
    const partidoId = result.insertId;
    const [jugadores] = await connection.query('SELECT id FROM jugadores');
    for (const jugador of jugadores) {
      await connection.query('INSERT INTO pago_partido (partido_id, jugador_id, estado_pago) VALUES (?, ?, ?)', [partidoId, jugador.id, 'no_pago']);
    }
    await connection.commit();
    res.json({ id: partidoId, message: 'Partido creado' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

app.get('/api/partidos/:id', async (req, res) => {
  try {
    const [partidos] = await promisePool.query('SELECT * FROM partidos WHERE id = ?', [req.params.id]);
    if (partidos.length === 0) return res.status(404).json({ error: 'Partido no encontrado' });
    const [pagos] = await promisePool.query(
      `SELECT p.*, j.nombre, j.apellido, j.dni FROM pago_partido p JOIN jugadores j ON p.jugador_id = j.id WHERE p.partido_id = ? ORDER BY j.apellido, j.nombre`,
      [req.params.id]
    );
    const fechaPartido = new Date(partidos[0].fecha);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    fechaPartido.setHours(0, 0, 0, 0);
    const pagosActualizados = pagos.map(pago => {
      if (fechaPartido < hoy && !pago.medio_pago) return { ...pago, estado_pago: 'no_pago', medio_pago: 'no pago' };
      return pago;
    });
    res.json({ partido: partidos[0], pagos: pagosActualizados });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/partidos/:id/pagos', async (req, res) => {
  try {
    const { pagos } = req.body;
    for (const pago of pagos) {
      const estadoPago = pago.check_asistio && pago.medio_pago ? 'pagado' : 'no_pago';
      await promisePool.query(
        `UPDATE pago_partido SET check_asistio=?, importe=?, medio_pago=?, estado_pago=? WHERE id=?`,
        [pago.check_asistio || false, pago.importe, pago.medio_pago, estadoPago, pago.id]
      );
    }
    res.json({ message: 'Pagos actualizados' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/partidos/:id', async (req, res) => {
  try {
    await promisePool.query('DELETE FROM partidos WHERE id = ?', [req.params.id]);
    res.json({ message: 'Partido eliminado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

initDB().then(() => {
  app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));
});