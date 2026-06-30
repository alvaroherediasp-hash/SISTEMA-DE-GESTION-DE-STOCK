const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const types = /jpeg|jpg|png|gif|webp/;
        const extname = types.test(path.extname(file.originalname).toLowerCase());
        const mimetype = types.test(file.mimetype);
        if (extname && mimetype) cb(null, true);
        else cb(new Error('Solo se permiten imagenes (jpg, png, gif, webp)'));
    }
});

app.use('/uploads', express.static(uploadsDir));

let pool;

async function initDatabase() {
    try {
        pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'mercadito',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        const connection = await pool.getConnection();
        console.log('✓ Conectado a MySQL');
        connection.release();
        return true;
    } catch (error) {
        console.error('✗ Error de conexión a MySQL:', error.message);
        return false;
    }
}

app.get('/api/categories', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM categories ORDER BY COALESCE(parent_id, id), name');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/categories/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM categories WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Categoría no encontrada' });
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/categories', async (req, res) => {
    try {
        const { name, emoji, image, parent_id } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: 'Nombre requerido' });
        }

        const [result] = await pool.query(
            'INSERT INTO categories (name, emoji, image, parent_id) VALUES (?, ?, ?, ?)',
            [name, emoji || '📦', image || null, parent_id || null]
        );

        const [category] = await pool.query('SELECT * FROM categories WHERE id = ?', [result.insertId]);
        res.status(201).json(category[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/categories/:id', async (req, res) => {
    try {
        const { name, emoji, image, parent_id } = req.body;
        
        if (parent_id == req.params.id) {
            return res.status(400).json({ error: 'Una categoría no puede ser subcategoría de sí misma' });
        }

        await pool.query(
            'UPDATE categories SET name = ?, emoji = ?, image = ?, parent_id = ? WHERE id = ?',
            [name, emoji || '📦', image || null, parent_id || null, req.params.id]
        );

        const [category] = await pool.query('SELECT * FROM categories WHERE id = ?', [req.params.id]);
        if (category.length === 0) return res.status(404).json({ error: 'Categoría no encontrada' });
        res.json(category[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/categories/:id/image', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se subió ninguna imagen' });
        }

        const imagePath = '/uploads/' + req.file.filename;
        
        await pool.query('UPDATE categories SET image = ? WHERE id = ?', [imagePath, req.params.id]);
        
        res.json({ image: imagePath, message: 'Imagen subida correctamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/categories/:id/image', async (req, res) => {
    try {
        await pool.query('UPDATE categories SET image = NULL WHERE id = ?', [req.params.id]);
        res.json({ message: 'Imagen eliminada' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/categories/:id', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [children] = await connection.query('SELECT id FROM categories WHERE parent_id = ?', [req.params.id]);
        if (children.length > 0) {
            await connection.query('UPDATE categories SET parent_id = NULL WHERE parent_id = ?', [req.params.id]);
        }

        await connection.query('UPDATE products SET category_id = NULL WHERE category_id = ?', [req.params.id]);
        
        const [result] = await connection.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
        
        if (result.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Categoría no encontrada' });
        }

        await connection.commit();
        res.json({ message: 'Categoría eliminada' });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

app.get('/api/categories/:id/subcategories', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM categories WHERE parent_id = ? ORDER BY name', [req.params.id]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/products', async (req, res) => {
    try {
        const { category, subcategory_id, search } = req.query;
        let query = `
            SELECT DISTINCT p.*, c.name as category_name, c.emoji as category_emoji 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            WHERE 1=1
        `;
        const params = [];

        if (subcategory_id && subcategory_id !== 'all') {
            query += ' AND p.category_id = ?';
            params.push(subcategory_id);
        } else if (category && category !== 'all') {
            query += ' AND c.name = ?';
            params.push(category);
        }

        if (search) {
            query += ' AND (p.name LIKE ? OR c.name LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        query += ' GROUP BY p.id ORDER BY p.name';
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/products/:id', async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT p.*, c.name as category_name 
             FROM products p 
             LEFT JOIN categories c ON p.category_id = c.id 
             WHERE p.id = ?`, 
            [req.params.id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/products', async (req, res) => {
    try {
        const { name, category_id, price, purchase_price, sell_by_weight, weight_unit, stock, min_stock, emoji, barcode } = req.body;
        
        if (!name || price === undefined || stock === undefined) {
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        }

        if (barcode) {
            const [existing] = await pool.query('SELECT id FROM products WHERE barcode = ?', [barcode]);
            if (existing.length > 0) {
                return res.status(400).json({ error: 'Ya existe un producto con este código de barras' });
            }
        }

        const [result] = await pool.query(
            'INSERT INTO products (name, category_id, price, purchase_price, sell_by_weight, weight_unit, stock, min_stock, emoji, barcode) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [name, category_id || null, price, purchase_price || null, sell_by_weight || false, weight_unit || 'kg', stock, min_stock || 5, emoji || '📦', barcode || null]
        );

        const [newProduct] = await pool.query(
            `SELECT p.*, c.name as category_name 
             FROM products p 
             LEFT JOIN categories c ON p.category_id = c.id 
             WHERE p.id = ?`,
            [result.insertId]
        );

        res.status(201).json(newProduct[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/products/:id', async (req, res) => {
    try {
        const { name, category_id, price, purchase_price, sell_by_weight, weight_unit, stock, min_stock, emoji, barcode } = req.body;

        if (barcode) {
            const [existing] = await pool.query('SELECT id FROM products WHERE barcode = ? AND id != ?', [barcode, req.params.id]);
            if (existing.length > 0) {
                return res.status(400).json({ error: 'Ya existe otro producto con este código de barras' });
            }
        }

        const [result] = await pool.query(
            `UPDATE products 
             SET name = ?, category_id = ?, price = ?, purchase_price = ?, sell_by_weight = ?, weight_unit = ?, stock = ?, min_stock = ?, emoji = ?, barcode = ?
             WHERE id = ?`,
            [name, category_id || null, price, purchase_price || null, sell_by_weight || false, weight_unit || 'kg', stock, min_stock || 5, emoji || '📦', barcode || null, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        const [updated] = await pool.query(
            `SELECT p.*, c.name as category_name 
             FROM products p 
             LEFT JOIN categories c ON p.category_id = c.id 
             WHERE p.id = ?`,
            [req.params.id]
        );

        res.json(updated[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        res.json({ message: 'Producto eliminado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.patch('/api/products/:id/stock', async (req, res) => {
    try {
        const { amount } = req.body;
        
        if (amount === undefined) {
            return res.status(400).json({ error: 'Cantidad requerida' });
        }

        const [result] = await pool.query(
            'UPDATE products SET stock = stock + ? WHERE id = ?',
            [amount, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        const [updated] = await pool.query(
            `SELECT p.*, c.name as category_name 
             FROM products p 
             LEFT JOIN categories c ON p.category_id = c.id 
             WHERE p.id = ?`,
            [req.params.id]
        );

        res.json(updated[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/products/:id/image', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se subió ninguna imagen' });
        }

        const imagePath = '/uploads/' + req.file.filename;
        
        await pool.query('UPDATE products SET image = ? WHERE id = ?', [imagePath, req.params.id]);
        
        res.json({ image: imagePath, message: 'Imagen subida correctamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/products/:id/image', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT image FROM products WHERE id = ?', [req.params.id]);
        
        if (rows.length > 0 && rows[0].image) {
            const imagePath = path.join(__dirname, 'public', rows[0].image);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }
        
        await pool.query('UPDATE products SET image = NULL WHERE id = ?', [req.params.id]);
        
        res.json({ message: 'Imagen eliminada' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/products/barcode/:code', async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT p.*, c.name as category_name 
             FROM products p 
             LEFT JOIN categories c ON p.category_id = c.id 
             WHERE p.barcode = ?`,
            [req.params.code]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado con este código de barras' });
        }
        
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/sales', async (req, res) => {
    try {
        const [sales] = await pool.query(`
            SELECT s.*, 
                   GROUP_CONCAT(
                       CONCAT(si.quantity, 'x ', IFNULL(si.product_name, 'Producto'), ' (', si.price, ')')
                       SEPARATOR ', '
                   ) as items_detail
            FROM sales s
            LEFT JOIN sale_items si ON s.id = si.sale_id
            GROUP BY s.id
            ORDER BY s.created_at DESC
            LIMIT 100
        `);
        
        const [allItems] = await pool.query(`
            SELECT si.*, s.id as sale_id
            FROM sale_items si
            JOIN sales s ON si.sale_id = s.id
            ORDER BY si.id
        `);
        
        const salesWithItems = sales.map(sale => {
            const saleItems = allItems.filter(item => item.sale_id === sale.id);
            return {
                ...sale,
                items: saleItems.map(item => ({
                    name: item.product_name,
                    qty: item.quantity,
                    price: parseFloat(item.price)
                }))
            };
        });
        
        res.json(salesWithItems);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/sales', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();

        const { items, payment_method } = req.body;
        
        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'No hay items en la venta' });
        }

        let total = 0;
        let itemsCount = 0;

        for (const item of items) {
            const [product] = await connection.query(
                'SELECT id, name, price, stock FROM products WHERE id = ?',
                [item.product_id]
            );

            if (product.length === 0) {
                throw new Error(`Producto ID ${item.product_id} no encontrado`);
            }

            if (product[0].stock < item.quantity) {
                throw new Error(`Stock insuficiente para ${product[0].name}`);
            }

            await connection.query(
                'UPDATE products SET stock = stock - ? WHERE id = ?',
                [item.quantity, item.product_id]
            );

            total += product[0].price * item.quantity;
            itemsCount += item.quantity;
        }

        const [saleResult] = await connection.query(
            'INSERT INTO sales (total, items_count, payment_method) VALUES (?, ?, ?)',
            [total, itemsCount, payment_method || 'Efectivo']
        );

        const saleId = saleResult.insertId;

        for (const item of items) {
            const [product] = await connection.query(
                'SELECT name, price FROM products WHERE id = ?',
                [item.product_id]
            );

            await connection.query(
                'INSERT INTO sale_items (sale_id, product_id, product_name, quantity, price) VALUES (?, ?, ?, ?, ?)',
                [saleId, item.product_id, product[0].name, item.quantity, product[0].price]
            );
        }

        await connection.commit();

        const [sale] = await connection.query(
            `SELECT s.*, 
                    GROUP_CONCAT(si.quantity, 'x ', si.product_name SEPARATOR ', ') as items_detail
             FROM sales s
             LEFT JOIN sale_items si ON s.id = si.sale_id
             WHERE s.id = ?
             GROUP BY s.id`,
            [saleId]
        );

        res.status(201).json(sale[0]);
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

app.get('/api/stats', async (req, res) => {
    try {
        const [productsStats] = await pool.query(`
            SELECT 
                COUNT(*) as total, 
                SUM(stock * COALESCE(purchase_price, price)) as investment,
                SUM(stock * price) as potential_value,
                SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) as out_of_stock, 
                SUM(CASE WHEN stock > 0 AND stock <= min_stock THEN 1 ELSE 0 END) as low_stock 
            FROM products
        `);
        
        const today = new Date().toISOString().split('T')[0];
        const [todaySales] = await pool.query(
            'SELECT COALESCE(SUM(total), 0) as today_total, COUNT(*) as count FROM sales WHERE DATE(created_at) = ?',
            [today]
        );
        
        const investment = parseFloat(productsStats[0].investment) || 0;
        const potentialValue = parseFloat(productsStats[0].potential_value) || 0;
        const potentialProfit = potentialValue - investment;
        
        res.json({
            total_products: productsStats[0].total || 0,
            inventory_investment: investment,
            inventory_value: potentialValue,
            potential_profit: potentialProfit,
            out_of_stock: productsStats[0].out_of_stock || 0,
            low_stock: productsStats[0].low_stock || 0,
            today_sales: todaySales[0].today_total || 0,
            today_count: todaySales[0].count || 0
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/inventory', async (req, res) => {
    try {
        const { search } = req.query;
        let query = `
            SELECT DISTINCT p.*, c.name as category_name 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            WHERE 1=1
        `;
        const params = [];

        if (search) {
            query += ' AND (p.name LIKE ? OR c.name LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        query += ' GROUP BY p.id ORDER BY p.name';
        
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/stock', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT DISTINCT p.*, c.name as category_name 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            GROUP BY p.id ORDER BY p.name
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.get('/setup', async (req, res) => {
    const fs = require('fs');
    const path = require('path');
    
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'database.sql'), 'utf8');
        
        const tempPool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            multipleStatements: true
        });

        const connection = await tempPool.getConnection();
        await connection.query(sql);
        connection.release();
        await tempPool.end();

        res.json({ message: 'Base de datos configurada correctamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al configurar: ' + error.message });
    }
});

// ============================================
// ENDPOINTS DE PROVEEDORES
// ============================================

app.get('/api/suppliers', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM suppliers ORDER BY name');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/suppliers', async (req, res) => {
    try {
        const { name, phone, email, address, notes } = req.body;
        if (!name) return res.status(400).json({ error: 'Nombre requerido' });
        
        const [result] = await pool.query(
            'INSERT INTO suppliers (name, phone, email, address, notes) VALUES (?, ?, ?, ?, ?)',
            [name, phone || null, email || null, address || null, notes || null]
        );
        
        const [supplier] = await pool.query('SELECT * FROM suppliers WHERE id = ?', [result.insertId]);
        res.status(201).json(supplier[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/suppliers/:id', async (req, res) => {
    try {
        const { name, phone, email, address, notes } = req.body;
        
        await pool.query(
            'UPDATE suppliers SET name = ?, phone = ?, email = ?, address = ?, notes = ? WHERE id = ?',
            [name, phone || null, email || null, address || null, notes || null, req.params.id]
        );
        
        const [supplier] = await pool.query('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
        if (supplier.length === 0) return res.status(404).json({ error: 'Proveedor no encontrado' });
        res.json(supplier[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/suppliers/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM suppliers WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Proveedor no encontrado' });
        res.json({ message: 'Proveedor eliminado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// ENDPOINTS DE COMPRAS
// ============================================

app.get('/api/purchases', async (req, res) => {
    try {
        const [purchases] = await pool.query(`
            SELECT p.*, s.name as supplier_name 
            FROM purchases p 
            LEFT JOIN suppliers s ON p.supplier_id = s.id 
            ORDER BY p.created_at DESC
        `);
        
        for (const purchase of purchases) {
            const [items] = await pool.query('SELECT * FROM purchase_items WHERE purchase_id = ?', [purchase.id]);
            purchase.items = items;
        }
        
        res.json(purchases);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/purchases', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();

        const { supplier_id, items, notes } = req.body;
        
        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'No hay items en la compra' });
        }

        let total = 0;

        for (const item of items) {
            total += item.unit_cost * item.quantity;
        }

        const [purchaseResult] = await connection.query(
            'INSERT INTO purchases (supplier_id, total, notes) VALUES (?, ?, ?)',
            [supplier_id || null, total, notes || null]
        );

        const purchaseId = purchaseResult.insertId;

        for (const item of items) {
            await connection.query(
                'INSERT INTO purchase_items (purchase_id, product_id, product_name, quantity, unit_cost, subtotal) VALUES (?, ?, ?, ?, ?, ?)',
                [purchaseId, item.product_id || null, item.product_name || 'Producto', item.quantity, item.unit_cost, item.unit_cost * item.quantity]
            );
            
            if (item.product_id) {
                await connection.query(
                    'UPDATE products SET stock = stock + ? WHERE id = ?',
                    [item.quantity, item.product_id]
                );
            }
        }

        await connection.commit();

        res.status(201).json({ id: purchaseId, total, message: 'Compra registrada' });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

app.post('/api/purchases/:id/receipt', upload.single('receipt'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se subió ninguna imagen' });
        }

        const receiptPath = '/uploads/' + req.file.filename;
        
        await pool.query('UPDATE purchases SET receipt_image = ? WHERE id = ?', [receiptPath, req.params.id]);
        
        res.json({ receipt_image: receiptPath, message: 'Recibo subido correctamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/purchases/:id', async (req, res) => {
    try {
        const [purchases] = await pool.query(`
            SELECT p.*, s.name as supplier_name 
            FROM purchases p 
            LEFT JOIN suppliers s ON p.supplier_id = s.id 
            WHERE p.id = ?
        `);
        
        if (purchases.length === 0) return res.status(404).json({ error: 'Compra no encontrada' });
        
        const [items] = await pool.query('SELECT * FROM purchase_items WHERE purchase_id = ?', [req.params.id]);
        purchases[0].items = items;
        
        res.json(purchases[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// ENDPOINTS DE COMBOS
// ============================================

app.get('/api/combos', async (req, res) => {
    try {
        const [combos] = await pool.query('SELECT * FROM combos ORDER BY created_at DESC');
        
        for (const combo of combos) {
            const [items] = await pool.query(`
                SELECT cp.*, p.name as product_name, p.price as product_price, p.stock
                FROM combo_products cp
                JOIN products p ON cp.product_id = p.id
                WHERE cp.combo_id = ?
            `, [combo.id]);
            
            let originalPrice = 0;
            for (const item of items) {
                originalPrice += item.product_price * item.quantity;
            }
            
            combo.items = items;
            combo.original_price = originalPrice;
            
            if (combo.discount_type === 'percentage') {
                combo.final_price = originalPrice * (1 - combo.discount_value / 100);
            } else {
                combo.final_price = Math.max(0, originalPrice - combo.discount_value);
            }
        }
        
        res.json(combos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/combos/:id', async (req, res) => {
    try {
        const [combos] = await pool.query('SELECT * FROM combos WHERE id = ?', [req.params.id]);
        if (combos.length === 0) return res.status(404).json({ error: 'Combo no encontrado' });
        
        const [items] = await pool.query(`
            SELECT cp.*, p.name as product_name, p.price as product_price, p.stock
            FROM combo_products cp
            JOIN products p ON cp.product_id = p.id
            WHERE cp.combo_id = ?
        `, [req.params.id]);
        
        let originalPrice = 0;
        for (const item of items) {
            originalPrice += item.product_price * item.quantity;
        }
        
        const combo = combos[0];
        combo.items = items;
        combo.original_price = originalPrice;
        
        if (combo.discount_type === 'percentage') {
            combo.final_price = originalPrice * (1 - combo.discount_value / 100);
        } else {
            combo.final_price = Math.max(0, originalPrice - combo.discount_value);
        }
        
        res.json(combo);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/combos', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();

        const { name, emoji, description, discount_type, discount_value, items } = req.body;
        
        if (!name) return res.status(400).json({ error: 'Nombre requerido' });
        if (!items || items.length === 0) return res.status(400).json({ error: 'Debe agregar productos al combo' });

        const discountVal = parseFloat(discount_value) || 0;
        
        const [result] = await connection.query(
            'INSERT INTO combos (name, emoji, description, discount_type, discount_value) VALUES (?, ?, ?, ?, ?)',
            [name, emoji || '🎁', description || null, discount_type || 'percentage', discountVal]
        );

        const comboId = result.insertId;

        for (const item of items) {
            if (!item.product_id) continue;
            await connection.query(
                'INSERT INTO combo_products (combo_id, product_id, quantity) VALUES (?, ?, ?)',
                [comboId, item.product_id, parseInt(item.quantity) || 1]
            );
        }

        await connection.commit();

        const [newCombo] = await pool.query('SELECT * FROM combos WHERE id = ?', [comboId]);
        res.status(201).json(newCombo[0]);
    } catch (error) {
        console.error('Error al crear combo:', error);
        if (connection) await connection.rollback();
        res.status(500).json({ error: 'Error al crear combo: ' + error.message });
    } finally {
        if (connection) connection.release();
    }
});

app.put('/api/combos/:id', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();

        const { name, emoji, description, discount_type, discount_value, items, active } = req.body;
        
        if (!name) return res.status(400).json({ error: 'Nombre requerido' });

        await connection.query(
            'UPDATE combos SET name = ?, emoji = ?, description = ?, discount_type = ?, discount_value = ?, active = ? WHERE id = ?',
            [name, emoji || '🎁', description || null, discount_type || 'percentage', discount_value || 0, active !== undefined ? active : true, req.params.id]
        );

        if (items) {
            await connection.query('DELETE FROM combo_products WHERE combo_id = ?', [req.params.id]);
            
            for (const item of items) {
                await connection.query(
                    'INSERT INTO combo_products (combo_id, product_id, quantity) VALUES (?, ?, ?)',
                    [req.params.id, item.product_id, item.quantity || 1]
                );
            }
        }

        await connection.commit();

        const [updatedCombo] = await pool.query('SELECT * FROM combos WHERE id = ?', [req.params.id]);
        res.json(updatedCombo[0]);
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

app.delete('/api/combos/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM combos WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Combo no encontrado' });
        res.json({ message: 'Combo eliminado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

async function start() {
    const dbConnected = await initDatabase();
    
    if (!dbConnected) {
        console.log('\n⚠️  MySQL no está disponible.');
        console.log('   Ejecuta primero el script de base de datos');
    }

    app.listen(PORT, () => {
        console.log(`\n🚀 Servidor corriendo en http://localhost:${PORT}`);
        console.log(`📊 API disponible en http://localhost:${PORT}/api`);
        console.log(`🔧 Setup BD en http://localhost:${PORT}/setup`);
    });
}

start();
