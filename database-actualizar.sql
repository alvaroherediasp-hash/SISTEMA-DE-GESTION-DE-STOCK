-- =========================================
-- MERCADITO POS - Actualización de Base de Datos
-- Ejecutar este script si ya tienes una base de datos existente
-- =========================================

-- Verificar que estamos usando una base de datos
SELECT 'Actualizando base de datos mercadito...' AS mensaje;

-- =========================================
-- 1. AGREGAR COLUMNA parent_id A CATEGORÍAS (para subcategorías)
-- =========================================
-- Verificar si la columna ya existe
SET @column_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'categories' 
    AND COLUMN_NAME = 'parent_id'
);

-- Agregar parent_id si no existe
SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE categories ADD COLUMN parent_id INT DEFAULT NULL AFTER id',
    'SELECT "parent_id ya existe" AS status');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Agregar foreign key si no existe
SET @fk_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'categories' 
    AND CONSTRAINT_NAME = 'categories_ibfk_1'
);

SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE categories ADD CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL',
    'SELECT "Foreign key ya existe" AS status');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =========================================
-- 2. AGREGAR COLUMNA image A CATEGORÍAS (logo de marca)
-- =========================================
SET @column_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'categories' 
    AND COLUMN_NAME = 'image'
);

SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE categories ADD COLUMN image VARCHAR(255) DEFAULT NULL AFTER emoji',
    'SELECT "image ya existe en categories" AS status');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =========================================
-- 3. CREAR TABLA DE PROVEEDORES
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
-- 4. CREAR TABLA DE COMPRAS
-- =========================================
DROP TABLE IF EXISTS purchase_items;
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
-- 5. AGREGAR payment_method A SALES (si no existe)
-- =========================================
SET @column_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'sales' 
    AND COLUMN_NAME = 'payment_method'
);

SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE sales ADD COLUMN payment_method VARCHAR(50) DEFAULT "Efectivo" AFTER items_count',
    'SELECT "payment_method ya existe" AS status');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =========================================
-- 6. AGREGAR image A PRODUCTS (si no existe)
-- =========================================
SET @column_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'products' 
    AND COLUMN_NAME = 'image'
);

SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE products ADD COLUMN image VARCHAR(255) DEFAULT NULL AFTER emoji',
    'SELECT "image ya existe en products" AS status');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =========================================
-- 7. INSERTAR SUBCATEGORÍAS DE EJEMPLO (si no existen)
-- =========================================
INSERT IGNORE INTO categories (id, name, emoji, parent_id) VALUES
(100, 'Perfumería', '🧴', 5),
(101, 'Desinfectantes', '🦠', 5);

-- =========================================
-- 8. AGREGAR CAMPO purchase_price A PRODUCTOS (si no existe)
-- =========================================
SET @column_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'products' 
    AND COLUMN_NAME = 'purchase_price'
);

SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE products ADD COLUMN purchase_price DECIMAL(10,2) DEFAULT NULL AFTER price',
    'SELECT "purchase_price ya existe" AS status');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =========================================
-- 9. AGREGAR CAMPOS PARA VENTA POR PESO (si no existen)
-- =========================================
SET @column_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'products' 
    AND COLUMN_NAME = 'sell_by_weight'
);

SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE products ADD COLUMN sell_by_weight BOOLEAN DEFAULT FALSE AFTER purchase_price, ADD COLUMN weight_unit VARCHAR(10) DEFAULT "kg" AFTER sell_by_weight',
    'SELECT "Campos de peso ya existen" AS status');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =========================================
-- 10. CREAR TABLA DE COMBOS
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

CREATE TABLE combo_products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    combo_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    FOREIGN KEY (combo_id) REFERENCES combos(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- =========================================
-- VERIFICACIÓN
-- =========================================
SELECT 'Base de datos actualizada correctamente!' AS mensaje;

-- Mostrar estructura de categorías
SELECT 'CATEGORÍAS:' AS '';
DESCRIBE categories;

-- Mostrar proveedores
SELECT 'PROVEEDORES:' AS '';
SELECT COUNT(*) AS total_proveedores FROM suppliers;

-- Mostrar compras  
SELECT 'COMPRAS:' AS '';
SELECT COUNT(*) AS total_compras FROM purchases;

-- Mostrar categorías con subcategorías
SELECT 'CATEGORÍAS Y SUBCATEGORÍAS:' AS '';
SELECT c1.name AS categoria, c2.name AS subcategoria
FROM categories c1
LEFT JOIN categories c2 ON c1.id = c2.parent_id
WHERE c1.parent_id IS NULL
ORDER BY c1.name, c2.name;
