Te he creado una tabla MySQL completa para tus indicadores PKI. Aquí están las características principales:

## **Características de la tabla:**

### **Campos principales:**
- **Tipos de datos apropiados**: ENUM para valores predefinidos, TEXT para descripciones largas, VARCHAR para textos cortos
- **Restricciones**: NOT NULL en campos obligatorios, UNIQUE para el código identificatorio
- **Valores por defecto**: Estado 'activo', timestamps automáticos

### **Funcionalidades especiales:**
- **Auto-incremento de versión**: Trigger que incrementa automáticamente la versión cuando se modifica un campo importante
- **Timestamps automáticos**: Fecha de creación y última actualización se manejan automáticamente
- **SET para campos multi-valor**: Permite seleccionar múltiples opciones en formato_presentación y nivel_desagregación

### **Índices para optimización:**
- Índices en los campos más consultados para mejorar el rendimiento
- Índice único en código_identificatorio

### **Ejemplos incluidos:**
- 2 registros de ejemplo para probar la tabla
- Consultas útiles para gestionar los indicadores

### **Consideraciones técnicas:**
- **Longitudes de campo** ajustadas según el uso típico
- **Tipos ENUM** para garantizar integridad de datos
- **Estructura normalizada** pero práctica para consultas

¿Te gustaría que ajuste algún tipo de dato, longitud de campo o agregue alguna funcionalidad específica?

-- Tabla para Indicadores PKI
CREATE TABLE indicadores_pki (
    -- Identificación
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo_identificatorio VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(200) NOT NULL,
    dimension ENUM('financiera', 'cliente', 'procesos', 'capital_humano') NOT NULL,
    descripcion TEXT NOT NULL,
    formula_calculo TEXT NOT NULL,
    fuente_datos VARCHAR(500) NOT NULL,
    objetivo TEXT NOT NULL,
    responsable VARCHAR(200) NOT NULL,
    
    -- Especificaciones de medición
    unidad_medida VARCHAR(100) NOT NULL,
    frecuencia_medicion ENUM('diaria', 'semanal', 'mensual', 'trimestral', 'anual') NOT NULL,
    periodicidad_reporte ENUM('diaria', 'semanal', 'mensual', 'trimestral', 'anual') NOT NULL,
    meta_valor_objetivo VARCHAR(100),
    umbral_critico VARCHAR(100),
    
    -- Clasificación
    categoria ENUM('eficiencia', 'eficacia', 'calidad', 'productividad') NOT NULL,
    criticidad ENUM('alta', 'media', 'baja') NOT NULL,
    tendencia_deseada ENUM('ascendente', 'descendente', 'estable') NOT NULL,
    estado ENUM('activo', 'inactivo', 'en_revision') NOT NULL DEFAULT 'activo',
    
    -- Control de cambios
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_ultima_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    version INT NOT NULL DEFAULT 1,
    comentarios_cambios TEXT,
    
    -- Presentación
    formato_presentacion SET('tabla', 'grafico', 'dashboard') NOT NULL,
    nivel_desagregacion SET('region', 'producto', 'cliente') NULL,
    
    -- Índices para optimizar consultas
    INDEX idx_codigo (codigo_identificatorio),
    INDEX idx_dimension (dimension),
    INDEX idx_estado (estado),
    INDEX idx_criticidad (criticidad),
    INDEX idx_responsable (responsable),
    INDEX idx_fecha_creacion (fecha_creacion)
);

-- Trigger para incrementar versión automáticamente en actualizaciones
DELIMITER //
CREATE TRIGGER tr_increment_version 
BEFORE UPDATE ON indicadores_pki
FOR EACH ROW 
BEGIN
    IF OLD.codigo_identificatorio != NEW.codigo_identificatorio OR
       OLD.nombre != NEW.nombre OR
       OLD.descripcion != NEW.descripcion OR
       OLD.formula_calculo != NEW.formula_calculo OR
       OLD.fuente_datos != NEW.fuente_datos OR
       OLD.objetivo != NEW.objetivo OR
       OLD.unidad_medida != NEW.unidad_medida OR
       OLD.frecuencia_medicion != NEW.frecuencia_medicion OR
       OLD.periodicidad_reporte != NEW.periodicidad_reporte OR
       OLD.meta_valor_objetivo != NEW.meta_valor_objetivo OR
       OLD.umbral_critico != NEW.umbral_critico OR
       OLD.categoria != NEW.categoria OR
       OLD.criticidad != NEW.criticidad OR
       OLD.tendencia_deseada != NEW.tendencia_deseada OR
       OLD.formato_presentacion != NEW.formato_presentacion OR
       OLD.nivel_desagregacion != NEW.nivel_desagregacion
    THEN
        SET NEW.version = OLD.version + 1;
    END IF;
END//
DELIMITER ;

-- Ejemplos de INSERT para probar la tabla
INSERT INTO indicadores_pki (
    codigo_identificatorio, nombre, dimension, descripcion, formula_calculo, 
    fuente_datos, objetivo, responsable, unidad_medida, frecuencia_medicion, 
    periodicidad_reporte, meta_valor_objetivo, umbral_critico, categoria, 
    criticidad, tendencia_deseada, formato_presentacion, nivel_desagregacion
) VALUES 
(
    'FIN001', 
    'Margen de Utilidad Bruta', 
    'financiera', 
    'Mide el porcentaje de utilidad bruta sobre las ventas totales',
    '(Ventas - Costo de Ventas) / Ventas * 100',
    'Sistema ERP - Módulo Contable',
    'Evaluar la eficiencia en la gestión de costos directos',
    'Gerente Financiero',
    'porcentaje',
    'mensual',
    'mensual',
    '25%',
    '20%',
    'eficiencia',
    'alta',
    'ascendente',
    'grafico,dashboard',
    'region,producto'
),
(
    'CLI001',
    'Índice de Satisfacción del Cliente',
    'cliente',
    'Mide el nivel de satisfacción promedio de los clientes',
    'Promedio de calificaciones de encuestas de satisfacción',
    'Sistema CRM - Encuestas',
    'Evaluar la percepción de calidad del servicio',
    'Gerente Comercial',
    'escala 1-10',
    'mensual',
    'trimestral',
    '8.5',
    '7.0',
    'calidad',
    'alta',
    'ascendente',
    'tabla,grafico',
    'region,cliente'
);

-- Consultas útiles para gestionar los indicadores
-- Ver todos los indicadores activos
SELECT codigo_identificatorio, nombre, dimension, criticidad, responsable 
FROM indicadores_pki 
WHERE estado = 'activo' 
ORDER BY criticidad DESC, dimension;

-- Ver indicadores por dimensión
SELECT dimension, COUNT(*) as total_indicadores
FROM indicadores_pki 
WHERE estado = 'activo'
GROUP BY dimension;

-- Ver indicadores críticos
SELECT codigo_identificatorio, nombre, responsable, fecha_ultima_actualizacion
FROM indicadores_pki 
WHERE criticidad = 'alta' AND estado = 'activo'
ORDER BY fecha_ultima_actualizacion DESC;