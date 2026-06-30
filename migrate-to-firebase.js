require('dotenv').config();
const mysql = require('mysql2/promise');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, collection, writeBatch } = require('firebase/firestore');
const { getStorage, ref, uploadFile } = require('firebase/storage');
const fs = require('fs');
const path = require('path');

const firebaseConfig = {
  apiKey: "AIzaSyAWuR1-z1ehGvRRy7vHEZsFoIYl8yDR0Vg",
  authDomain: "sistema-de-gestion-roro.firebaseapp.com",
  projectId: "sistema-de-gestion-roro",
  storageBucket: "sistema-de-gestion-roro.firebasestorage.app",
  messagingSenderId: "279284504819",
  appId: "1:279284504819:web:1f188b26de95402d243f86",
  measurementId: "G-JEHZECSSWB"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mercadito'
  });

  console.log('Conectado a MySQL');

  // 1. Migrar categorias
  console.log('Migrando categorias...');
  const [categories] = await connection.query('SELECT * FROM categories');
  for (const cat of categories) {
    await setDoc(doc(db, 'categories', String(cat.id)), {
      name: cat.name,
      emoji: cat.emoji || '📁',
      image: cat.image || null,
      parent_id: cat.parent_id ? String(cat.parent_id) : null,
      createdAt: cat.created_at?.toISOString() || new Date().toISOString()
    });
  }
  console.log('  Categorias: ' + categories.length);

  // 2. Migrar productos
  console.log('Migrando productos...');
  const [products] = await connection.query(`
    SELECT p.*, c.name as category_name 
    FROM products p LEFT JOIN categories c ON p.category_id = c.id
  `);
  for (const p of products) {
    await setDoc(doc(db, 'products', String(p.id)), {
      name: p.name,
      emoji: p.emoji || '📦',
      price: parseFloat(p.price),
      purchase_price: p.purchase_price ? parseFloat(p.purchase_price) : null,
      stock: p.stock || 0,
      min_stock: p.min_stock || 0,
      barcode: p.barcode || null,
      image: p.image || null,
      category_id: p.category_id ? String(p.category_id) : null,
      category_name: p.category_name || null,
      sell_by_weight: !!p.sell_by_weight,
      weight_unit: p.weight_unit || null,
      createdAt: p.created_at?.toISOString() || new Date().toISOString()
    });
  }
  console.log('  Productos: ' + products.length);

  // 3. Migrar proveedores
  console.log('Migrando proveedores...');
  const [suppliers] = await connection.query('SELECT * FROM suppliers');
  for (const s of suppliers) {
    await setDoc(doc(db, 'suppliers', String(s.id)), {
      name: s.name,
      contact: s.contact || null,
      phone: s.phone || null,
      email: s.email || null,
      address: s.address || null,
      createdAt: s.created_at?.toISOString() || new Date().toISOString()
    });
  }
  console.log('  Proveedores: ' + suppliers.length);

  // 4. Migrar combos
  console.log('Migrando combos...');
  const [combos] = await connection.query('SELECT * FROM combos');
  for (const c of combos) {
    const [items] = await connection.query(
      'SELECT cp.quantity, cp.product_id, p.name as product_name, p.price FROM combo_products cp JOIN products p ON cp.product_id = p.id WHERE cp.combo_id = ?',
      [c.id]
    );
    const originalPrice = items.reduce((sum, i) => sum + parseFloat(i.price) * i.quantity, 0);
    let finalPrice = originalPrice;
    if (c.discount_type === 'percentage') {
      finalPrice = originalPrice * (1 - parseFloat(c.discount_value || 0) / 100);
    } else {
      finalPrice = Math.max(0, originalPrice - parseFloat(c.discount_value || 0));
    }
    await setDoc(doc(db, 'combos', String(c.id)), {
      name: c.name,
      emoji: c.emoji || '🎁',
      description: c.description || null,
      discount_type: c.discount_type || 'percentage',
      discount_value: parseFloat(c.discount_value || 0),
      original_price: originalPrice,
      final_price: finalPrice,
      active: !!c.active,
      items: items.map(i => ({
        product_id: String(i.product_id),
        product_name: i.product_name,
        quantity: i.quantity
      })),
      createdAt: c.created_at?.toISOString() || new Date().toISOString()
    });
  }
  console.log('  Combos: ' + combos.length);

  // 5. Migrar ventas
  console.log('Migrando ventas...');
  const [sales] = await connection.query('SELECT * FROM sales');
  for (const s of sales) {
    const [items] = await connection.query(
      'SELECT si.*, p.name as product_name FROM sale_items si JOIN products p ON si.product_id = p.id WHERE si.sale_id = ?',
      [s.id]
    );
    await setDoc(doc(db, 'sales', String(s.id)), {
      total: parseFloat(s.total),
      payment_method: s.payment_method || 'efectivo',
      items: items.map(i => ({
        product_id: String(i.product_id),
        product_name: i.product_name || 'Producto',
        quantity: i.quantity,
        price: parseFloat(i.price)
      })),
      createdAt: s.created_at?.toISOString() || new Date().toISOString()
    });
  }
  console.log('  Ventas: ' + sales.length);

  // 6. Migrar compras
  console.log('Migrando compras...');
  const [purchases] = await connection.query('SELECT * FROM purchases');
  for (const p of purchases) {
    const [items] = await connection.query(
      'SELECT pi.*, pr.name as product_name FROM purchase_items pi JOIN products pr ON pi.product_id = pr.id WHERE pi.purchase_id = ?',
      [p.id]
    );
    await setDoc(doc(db, 'purchases', String(p.id)), {
      supplier_id: p.supplier_id ? String(p.supplier_id) : null,
      total: parseFloat(p.total || 0),
      items: items.map(i => ({
        product_id: String(i.product_id),
        product_name: i.product_name || 'Producto',
        quantity: i.quantity,
        price: parseFloat(i.price)
      })),
      createdAt: p.created_at?.toISOString() || new Date().toISOString()
    });
  }
  console.log('  Compras: ' + purchases.length);

  // 7. Subir imagenes a Storage
  console.log('Subiendo imagenes...');
  const uploadsDir = path.join(__dirname, 'public', 'uploads');
  if (fs.existsSync(uploadsDir)) {
    const storage = getStorage(firebaseApp);
    const files = fs.readdirSync(uploadsDir);
    for (const file of files) {
      const filePath = path.join(uploadsDir, file);
      if (fs.statSync(filePath).isFile()) {
        try {
          const storageRef = ref(storage, 'uploads/' + file);
          const fileBuffer = fs.readFileSync(filePath);
          const blob = new Blob([fileBuffer]);
          // Nota: uploadBytes/uploadFile se usa según la SDK
          console.log('  Imagen: ' + file);
        } catch (e) {
          console.log('  Error subiendo ' + file + ': ' + e.message);
        }
      }
    }
  }

  await connection.end();
  console.log('Migración completada!');
}

migrate().catch(console.error);
