-- =========================================
-- MERCADITO POS - Base de Datos Completa
-- Versión con imágenes, subcategorías, proveedores y compras
-- =========================================

CREATE DATABASE IF NOT EXISTS mercadito;
USE mercadito;

-- =========================================
-- TABLA DE CATEGORÍAS (con subcategorías e imágenes)
-- =========================================
DROP TABLE IF EXISTS categories;
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    parent_id INT DEFAULT NULL,
    name VARCHAR(100) NOT NULL,
    emoji VARCHAR(10) DEFAULT '📦',
    image VARCHAR(255) DEFAULT NULL,
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- =========================================
-- TABLA DE PRODUCTOS
-- =========================================
DROP TABLE IF EXISTS products;
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    category_id INT,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    purchase_price DECIMAL(10, 2) DEFAULT NULL,
    sell_by_weight BOOLEAN DEFAULT FALSE,
    weight_unit VARCHAR(10) DEFAULT 'kg',
    stock INT NOT NULL DEFAULT 0,
    min_stock INT NOT NULL DEFAULT 5,
    emoji VARCHAR(10) DEFAULT '📦',
    image VARCHAR(255) DEFAULT NULL,
    barcode VARCHAR(50) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- =========================================
-- TABLA DE VENTAS
-- =========================================
DROP TABLE IF EXISTS sales;
CREATE TABLE sales (
    id INT AUTO_INCREMENT PRIMARY KEY,
    total DECIMAL(10, 2) NOT NULL DEFAULT 0,
    items_count INT NOT NULL DEFAULT 0,
    payment_method VARCHAR(50) DEFAULT 'Efectivo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================
-- TABLA DE ITEMS DE VENTA
-- =========================================
DROP TABLE IF EXISTS sale_items;
CREATE TABLE sale_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sale_id INT NOT NULL,
    product_id INT,
    product_name VARCHAR(200),
    quantity INT NOT NULL DEFAULT 1,
    price DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- =========================================
-- TABLA DE PROVEEDORES
-- =========================================
DROP TABLE IF EXISTS suppliers;
CREATE TABLE suppliers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(100),
    address VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =========================================
-- TABLA DE COMPRAS
-- =========================================
DROP TABLE IF EXISTS purchases;
CREATE TABLE purchases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    supplier_id INT,
    total DECIMAL(10, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    receipt_image VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
);

-- =========================================
-- TABLA DE ITEMS DE COMPRA
-- =========================================
DROP TABLE IF EXISTS purchase_items;
CREATE TABLE purchase_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    purchase_id INT NOT NULL,
    product_id INT,
    product_name VARCHAR(200),
    quantity INT NOT NULL DEFAULT 1,
    unit_cost DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- =========================================
-- TABLA DE COMBOS
-- =========================================
DROP TABLE IF EXISTS combo_products;
DROP TABLE IF EXISTS combos;
CREATE TABLE combos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    emoji VARCHAR(10) DEFAULT '🎁',
    description TEXT,
    discount_type ENUM('percentage', 'fixed') DEFAULT 'percentage',
    discount_value DECIMAL(10, 2) NOT NULL DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =========================================
-- TABLA DE ITEMS DE COMBO
-- =========================================
CREATE TABLE combo_products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    combo_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    FOREIGN KEY (combo_id) REFERENCES combos(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- =========================================
-- INSERTAR CATEGORÍAS DE EJEMPLO
-- =========================================
INSERT INTO categories (id, name, emoji) VALUES
(1, 'Verdulería', '🥬'),
(2, 'Carnicería', '🥩'),
(3, 'Lácteos', '🥛'),
(4, 'Bebidas', '🥤'),
(5, 'Limpieza', '🧹'),
(6, 'Almacén', '🥫'),
(7, 'Panadería', '🍞'),
(8, 'Congelados', '🧊');

-- Subcategorías de ejemplo
INSERT INTO categories (name, emoji, parent_id) VALUES
('Perfumería', '🧴', 5),
('Desinfectantes', '🦠', 5);

-- =========================================
-- INSERTAR PRODUCTOS DE EJEMPLO
-- =========================================
INSERT INTO products (name, category_id, price, stock, min_stock, emoji) VALUES
('Manzanas', 1, 250.00, 50, 10, '🍎'),
('Bananas', 1, 180.00, 40, 10, '🍌'),
('Lechuga', 1, 120.00, 25, 5, '🥬'),
('Tomates', 1, 200.00, 35, 10, '🍅'),
('Naranjas', 1, 150.00, 45, 10, '🍊'),
('Limones', 1, 100.00, 30, 8, '🍋'),
('Carne Molida', 2, 850.00, 20, 5, '🥩'),
('Pollo', 2, 650.00, 15, 5, '🍗'),
('Milanesa', 2, 750.00, 30, 8, '🥨'),
('Churrasco', 2, 950.00, 10, 3, '🥩'),
('Leche', 3, 280.00, 60, 15, '🥛'),
('Queso', 3, 450.00, 25, 8, '🧀'),
('Yogur', 3, 180.00, 40, 10, '🥤'),
('Manteca', 3, 320.00, 20, 5, '🧈'),
('Gaseosa', 4, 350.00, 50, 12, '🥤'),
('Agua', 4, 120.00, 80, 20, '💧'),
('Jugo', 4, 280.00, 30, 8, '🧃'),
('Vino', 4, 650.00, 15, 5, '🍷'),
('Cerveza', 4, 280.00, 40, 10, '🍺'),
('Detergente', 5, 280.00, 35, 10, '🧴'),
('Lavandina', 5, 150.00, 40, 10, '🧹'),
('Escoba', 5, 450.00, 10, 3, '🧹'),
('Jabón', 5, 180.00, 30, 8, '🧼'),
('Arroz', 6, 220.00, 50, 15, '🍚'),
('Fideos', 6, 180.00, 60, 15, '🍝'),
('Aceite', 6, 550.00, 25, 8, '🫒'),
('Azúcar', 6, 200.00, 40, 10, '🍬'),
('Harina', 6, 180.00, 35, 10, '🌾'),
('Pan', 7, 150.00, 40, 10, '🍞'),
('Facturas', 7, 80.00, 30, 10, '🥐'),
('Medialunas', 7, 90.00, 25, 8, '🥐'),
('Helado', 8, 850.00, 8, 3, '🍦'),
('Pizza Congelada', 8, 650.00, 12, 5, '🍕'),
('Hamburguesas', 8, 550.00, 15, 5, '🍔');

-- =========================================
-- VERIFICACIÓN
-- =========================================
SELECT 'Base de datos mercadito creada correctamente!' AS mensaje;
SELECT COUNT(*) AS total_categorias FROM categories;
SELECT COUNT(*) AS total_productos FROM products;
SELECT COUNT(*) AS total_proveedores FROM suppliers;
SELECT COUNT(*) AS total_compras FROM purchases;
SELECT COUNT(*) AS total_combos FROM combos;
