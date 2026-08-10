/*
//////////////////////////////////////////////////////////
CABEZA DE ARCHIVO
//////////////////////////////////////////////////////////
Archivo: sqlite.schema.js
Autor: Gerald Andres Alfaro Solorzano
Fecha: 10/08/2026
Modulo: Database Local
Descripcion:
Define el esquema local SQLite para la app movil de
Caprocam. Incluye las tablas necesarias para trabajar sin
conexion y preparar sincronizacion futura con MySQL.
//////////////////////////////////////////////////////////
*/

/*
//////////////////////////////////////////////////////////
COLUMNAS BASE
//////////////////////////////////////////////////////////
*/

const COLUMNAS_BASE = [
    "id INTEGER PRIMARY KEY AUTOINCREMENT",
    "servidor_id INTEGER NULL",
    "uuid TEXT NOT NULL UNIQUE"
];

const COLUMNAS_AUDITORIA_SYNC = [
    "activo INTEGER NOT NULL DEFAULT 1",
    "fecha_creacion TEXT NOT NULL DEFAULT (datetime('now'))",
    "fecha_actualizacion TEXT NOT NULL DEFAULT (datetime('now'))",
    "deleted_at TEXT NULL",
    "version INTEGER NOT NULL DEFAULT 1",
    "sincronizado INTEGER NOT NULL DEFAULT 0",
    "pendiente_sync INTEGER NOT NULL DEFAULT 1",
    "accion_sync TEXT NULL",
    "fecha_sync TEXT NULL"
];

/*
//////////////////////////////////////////////////////////
TABLAS LOCALES
//////////////////////////////////////////////////////////
*/

export const ESQUEMA_TABLAS = {
    grupos_datos: [
        ...COLUMNAS_BASE,
        "codigo INTEGER NOT NULL",
        "nombre TEXT NOT NULL",
        "descripcion TEXT NULL",
        "acceso_global INTEGER NOT NULL DEFAULT 0",
        ...COLUMNAS_AUDITORIA_SYNC
    ],

    usuarios: [
        ...COLUMNAS_BASE,
        "grupo_datos INTEGER NOT NULL",
        "nombre TEXT NOT NULL",
        "apellidos TEXT NOT NULL",
        "email TEXT NOT NULL",
        "nombre_usuario TEXT NOT NULL",
        "password_hash TEXT NOT NULL",
        ...COLUMNAS_AUDITORIA_SYNC
    ],

    fincas: [
        ...COLUMNAS_BASE,
        "grupo_datos INTEGER NOT NULL",
        "propietario_usuario_id INTEGER NULL",
        "codigo_cbo TEXT NOT NULL",
        "nombre_finca TEXT NOT NULL",
        "provincia TEXT NULL",
        "canton TEXT NULL",
        "distrito TEXT NULL",
        "otras_senas TEXT NULL",
        "propietario_responsable TEXT NULL",
        "telefono TEXT NULL",
        "area_total REAL NULL",
        "espejos_agua REAL NULL",
        "creado_por_usuario_id INTEGER NULL",
        ...COLUMNAS_AUDITORIA_SYNC
    ],

    colaboradores: [
        ...COLUMNAS_BASE,
        "grupo_datos INTEGER NOT NULL",
        "finca_id INTEGER NULL",
        "nombre TEXT NOT NULL",
        "apellidos TEXT NOT NULL",
        "cedula TEXT NULL",
        "telefono TEXT NULL",
        "email TEXT NULL",
        "nombre_usuario TEXT NOT NULL",
        "pin_hash TEXT NOT NULL",
        "tipo_colaborador TEXT NOT NULL DEFAULT 'external_collab'",
        "creado_por_usuario_id INTEGER NULL",
        ...COLUMNAS_AUDITORIA_SYNC
    ],

    estanques: [
        ...COLUMNAS_BASE,
        "grupo_datos INTEGER NOT NULL",
        "finca_id INTEGER NOT NULL",
        "codigo TEXT NOT NULL",
        "tipo_estanque TEXT NOT NULL",
        "estado TEXT NOT NULL DEFAULT 'Activo'",
        "largo REAL NOT NULL",
        "ancho REAL NOT NULL",
        "profundidad REAL NOT NULL",
        "fuente_agua TEXT NULL",
        "fecha_mantenimiento TEXT NULL",
        "precria INTEGER NOT NULL DEFAULT 0",
        "creado_por_usuario_id INTEGER NULL",
        "creado_por_colaborador_id INTEGER NULL",
        ...COLUMNAS_AUDITORIA_SYNC
    ],

    equipos: [
        ...COLUMNAS_BASE,
        "grupo_datos INTEGER NOT NULL",
        "identificador TEXT NOT NULL",
        "nombre_equipo TEXT NOT NULL",
        "descripcion TEXT NOT NULL",
        "tipo_equipo TEXT NOT NULL",
        "fecha_instalacion TEXT NOT NULL",
        "funcion_equipo TEXT NOT NULL",
        "estanque_id INTEGER NULL",
        "horas_mantenimiento INTEGER NULL",
        "horas_actuales REAL NOT NULL DEFAULT 0",
        "estado_operativo TEXT NOT NULL",
        "estado TEXT NOT NULL",
        "creado_por_usuario_id INTEGER NULL",
        "creado_por_colaborador_id INTEGER NULL",
        ...COLUMNAS_AUDITORIA_SYNC
    ],

    tareas: [
        ...COLUMNAS_BASE,
        "grupo_datos INTEGER NOT NULL",
        "codigo_tarea TEXT NOT NULL",
        "nombre TEXT NOT NULL",
        "descripcion TEXT NULL",
        "categoria TEXT NULL",
        "horas REAL NULL",
        "creado_por_usuario_id INTEGER NULL",
        "creado_por_colaborador_id INTEGER NULL",
        ...COLUMNAS_AUDITORIA_SYNC
    ],

    mantenimiento_equipo: [
        ...COLUMNAS_BASE,
        "grupo_datos INTEGER NOT NULL",
        "codigo_ticket TEXT NOT NULL",
        "equipo_id INTEGER NOT NULL",
        "creado_por_usuario_id INTEGER NULL",
        "creado_por_colaborador_id INTEGER NULL",
        "fecha_mantenimiento TEXT NOT NULL",
        "titulo_ticket TEXT NOT NULL",
        "descripcion_ticket TEXT NOT NULL",
        "tipo_personal TEXT NULL",
        "costo_mano_obra REAL NOT NULL DEFAULT 0",
        "costo_productos REAL NOT NULL DEFAULT 0",
        "costo_total_estimado REAL NOT NULL DEFAULT 0",
        "estado_ticket TEXT NOT NULL DEFAULT 'En espera'",
        "estado_equipo TEXT NOT NULL DEFAULT 'Mantenimiento'",
        ...COLUMNAS_AUDITORIA_SYNC
    ],

    mantenimiento_equipo_tareas: [
        ...COLUMNAS_BASE,
        "grupo_datos INTEGER NOT NULL",
        "mantenimiento_equipo_id INTEGER NOT NULL",
        "tarea_id INTEGER NOT NULL",
        "estado_tarea TEXT NOT NULL DEFAULT 'Pendiente'",
        "creado_por_usuario_id INTEGER NULL",
        "creado_por_colaborador_id INTEGER NULL",
        ...COLUMNAS_AUDITORIA_SYNC
    ],

    proveedores: [
        ...COLUMNAS_BASE,
        "grupo_datos INTEGER NOT NULL",
        "nombre_empresa TEXT NOT NULL",
        "tipo_producto TEXT NOT NULL DEFAULT 'Otro'",
        "telefono TEXT NULL",
        "correo_electronico TEXT NULL",
        "direccion TEXT NULL",
        "notas TEXT NULL",
        "creado_por_usuario_id INTEGER NULL",
        "creado_por_colaborador_id INTEGER NULL",
        ...COLUMNAS_AUDITORIA_SYNC
    ],

    productos: [
        ...COLUMNAS_BASE,
        "codigo TEXT NOT NULL",
        "nombre TEXT NOT NULL",
        "categoria TEXT NOT NULL",
        "unidad TEXT NULL",
        "precio_unidad REAL NULL",
        "proveedor_id INTEGER NULL",
        "fecha_ingreso TEXT NULL",
        "fecha_caducidad TEXT NULL",
        "estado TEXT NOT NULL DEFAULT 'ACTIVO'",
        "grupo_datos INTEGER NOT NULL",
        "creado_por_usuario_id INTEGER NULL",
        "creado_por_colaborador_id INTEGER NULL",
        ...COLUMNAS_AUDITORIA_SYNC
    ],

    mantenimiento_equipo_productos: [
        ...COLUMNAS_BASE,
        "grupo_datos INTEGER NOT NULL",
        "mantenimiento_equipo_id INTEGER NOT NULL",
        "producto_id INTEGER NOT NULL",
        "cantidad REAL NOT NULL DEFAULT 1",
        "costo_unitario REAL NOT NULL DEFAULT 0",
        "subtotal REAL NOT NULL DEFAULT 0",
        "creado_por_usuario_id INTEGER NULL",
        "creado_por_colaborador_id INTEGER NULL",
        ...COLUMNAS_AUDITORIA_SYNC
    ],

    inventario: [
        ...COLUMNAS_BASE,
        "grupo_datos INTEGER NOT NULL",
        "producto_id INTEGER NOT NULL",
        "proveedor_id INTEGER NULL",
        "cantidad REAL NOT NULL DEFAULT 0",
        "stock_minimo REAL NOT NULL DEFAULT 0",
        "creado_por_usuario_id INTEGER NULL",
        "creado_por_colaborador_id INTEGER NULL",
        ...COLUMNAS_AUDITORIA_SYNC
    ],

    movimientos_inventario: [
        ...COLUMNAS_BASE,
        "grupo_datos INTEGER NOT NULL",
        "inventario_id INTEGER NOT NULL",
        "producto_id INTEGER NOT NULL",
        "tipo_movimiento TEXT NOT NULL",
        "cantidad REAL NOT NULL",
        "observacion TEXT NULL",
        "fecha_movimiento TEXT NOT NULL DEFAULT (datetime('now'))",
        "creado_por_usuario_id INTEGER NULL",
        "creado_por_colaborador_id INTEGER NULL",
        ...COLUMNAS_AUDITORIA_SYNC
    ],

    laboratorios: [
        ...COLUMNAS_BASE,
        "grupo_datos INTEGER NOT NULL",
        "nombre TEXT NOT NULL",
        "descripcion TEXT NULL",
        "creado_por_usuario_id INTEGER NULL",
        "creado_por_colaborador_id INTEGER NULL",
        ...COLUMNAS_AUDITORIA_SYNC
    ],

    procedencias: [
        ...COLUMNAS_BASE,
        "grupo_datos INTEGER NOT NULL",
        "nombre TEXT NOT NULL",
        "descripcion TEXT NULL",
        "creado_por_usuario_id INTEGER NULL",
        "creado_por_colaborador_id INTEGER NULL",
        ...COLUMNAS_AUDITORIA_SYNC
    ],

    proveedores_larva: [
        ...COLUMNAS_BASE,
        "grupo_datos INTEGER NOT NULL",
        "nombre TEXT NOT NULL",
        "descripcion TEXT NULL",
        "creado_por_usuario_id INTEGER NULL",
        "creado_por_colaborador_id INTEGER NULL",
        ...COLUMNAS_AUDITORIA_SYNC
    ],

    lotes_larva: [
        ...COLUMNAS_BASE,
        "grupo_datos INTEGER NOT NULL",
        "codigo_lote TEXT NOT NULL",
        "proveedor_larva_id INTEGER NULL",
        "laboratorio_id INTEGER NULL",
        "procedencia_id INTEGER NULL",
        "certificado_larva TEXT NULL",
        "pl_inicial INTEGER NULL",
        "cantidad_inicial INTEGER NOT NULL",
        "fecha_ingreso TEXT NOT NULL",
        "estado_lote TEXT NOT NULL DEFAULT 'Disponible'",
        "creado_por_usuario_id INTEGER NULL",
        "creado_por_colaborador_id INTEGER NULL",
        ...COLUMNAS_AUDITORIA_SYNC
    ],

    precrias: [
        ...COLUMNAS_BASE,
        "grupo_datos INTEGER NOT NULL",
        "lote_larva_id INTEGER NOT NULL",
        "finca_id INTEGER NOT NULL",
        "estanque_id INTEGER NOT NULL",
        "fecha_inicio TEXT NOT NULL",
        "fecha_fin TEXT NULL",
        "duracion_dias INTEGER NULL",
        "cantidad_inicial INTEGER NULL",
        "cantidad_final INTEGER NULL",
        "pl_inicial INTEGER NULL",
        "pl_final INTEGER NULL",
        "estado TEXT NOT NULL DEFAULT 'Activa'",
        "creado_por_usuario_id INTEGER NULL",
        "creado_por_colaborador_id INTEGER NULL",
        ...COLUMNAS_AUDITORIA_SYNC
    ],

    siembras: [
        ...COLUMNAS_BASE,
        "grupo_datos INTEGER NOT NULL",
        "lote_larva_id INTEGER NOT NULL",
        "precria_id INTEGER NULL",
        "finca_id INTEGER NOT NULL",
        "estanque_id INTEGER NOT NULL",
        "fecha_siembra TEXT NOT NULL",
        "tecnica_cultivo TEXT NULL",
        "densidad_poblacional REAL NULL",
        "cantidad_sembrada INTEGER NOT NULL",
        "pl_siembra INTEGER NULL",
        "duracion_ciclo INTEGER NULL",
        "produccion_kg REAL NOT NULL DEFAULT 0",
        "estado TEXT NOT NULL DEFAULT 'Activa'",
        "creado_por_usuario_id INTEGER NULL",
        "creado_por_colaborador_id INTEGER NULL",
        ...COLUMNAS_AUDITORIA_SYNC
    ],

    crecimientos: [
        ...COLUMNAS_BASE,
        "grupo_datos INTEGER NOT NULL",
        "finca_id INTEGER NOT NULL",
        "estanque_id INTEGER NOT NULL",
        "fecha_registro TEXT NOT NULL",
        "peso_actual REAL NOT NULL",
        "creado_por_usuario_id INTEGER NULL",
        "creado_por_colaborador_id INTEGER NULL",
        ...COLUMNAS_AUDITORIA_SYNC
    ],

    calculos_crecimiento: [
        ...COLUMNAS_BASE,
        "grupo_datos INTEGER NOT NULL",
        "crecimiento_id INTEGER NOT NULL",
        "cantidad_individuos INTEGER NOT NULL",
        "peso_total REAL NOT NULL",
        "peso_promedio_individual REAL NOT NULL",
        "creado_por_usuario_id INTEGER NULL",
        "creado_por_colaborador_id INTEGER NULL",
        ...COLUMNAS_AUDITORIA_SYNC
    ],

    compradores: [
        ...COLUMNAS_BASE,
        "grupo_datos INTEGER NOT NULL",
        "nombre TEXT NOT NULL",
        "cedula TEXT NULL",
        "telefono TEXT NULL",
        "correo TEXT NULL",
        "direccion TEXT NULL",
        "notas TEXT NULL",
        "estado TEXT NOT NULL DEFAULT 'ACTIVO'",
        "creado_por_usuario_id INTEGER NULL",
        "creado_por_colaborador_id INTEGER NULL",
        ...COLUMNAS_AUDITORIA_SYNC
    ],

    ventas: [
        ...COLUMNAS_BASE,
        "grupo_datos INTEGER NOT NULL",
        "finca_id INTEGER NOT NULL",
        "estanque_id INTEGER NOT NULL",
        "comprador_id INTEGER NULL",
        "peso_promedio REAL NULL",
        "cantidad_vendida REAL NOT NULL",
        "precio_kilo REAL NOT NULL",
        "total REAL NOT NULL",
        "fecha TEXT NOT NULL",
        "creado_por_usuario_id INTEGER NULL",
        "creado_por_colaborador_id INTEGER NULL",
        ...COLUMNAS_AUDITORIA_SYNC
    ],

    parasitologias: [
        ...COLUMNAS_BASE,
        "grupo_datos INTEGER NOT NULL",
        "finca_id INTEGER NOT NULL",
        "estanque_id INTEGER NOT NULL",
        "tipo_registro TEXT NOT NULL",
        "fecha_reporte TEXT NOT NULL",
        "responsable TEXT NULL",
        "parasito TEXT NOT NULL",
        "grado_infeccion TEXT NOT NULL",
        "observaciones TEXT NULL",
        "creado_por_usuario_id INTEGER NULL",
        "creado_por_colaborador_id INTEGER NULL",
        ...COLUMNAS_AUDITORIA_SYNC
    ],

    enfermedades: [
        ...COLUMNAS_BASE,
        "grupo_datos INTEGER NOT NULL",
        "finca_id INTEGER NOT NULL",
        "estanque_id INTEGER NOT NULL",
        "tipo_registro TEXT NOT NULL",
        "fecha_reporte TEXT NOT NULL",
        "responsable TEXT NULL",
        "enfermedad TEXT NOT NULL",
        "severidad TEXT NOT NULL",
        "reporte TEXT NULL",
        "creado_por_usuario_id INTEGER NULL",
        "creado_por_colaborador_id INTEGER NULL",
        ...COLUMNAS_AUDITORIA_SYNC
    ],

    alimentaciones: [
        ...COLUMNAS_BASE,
        "grupo_datos INTEGER NOT NULL",
        "finca_id INTEGER NOT NULL",
        "estanque_id INTEGER NOT NULL",
        "proveedor_id INTEGER NULL",
        "producto_id INTEGER NULL",
        "fecha TEXT NOT NULL",
        "hora TEXT NULL",
        "metodo TEXT NULL",
        "cantidad_kg REAL NOT NULL",
        "presentacion TEXT NULL",
        "proveedor TEXT NULL",
        "tipo_alimento TEXT NULL",
        "observaciones TEXT NULL",
        "creado_por_usuario_id INTEGER NULL",
        "creado_por_colaborador_id INTEGER NULL",
        ...COLUMNAS_AUDITORIA_SYNC
    ],

    densidad_poblacional: [
        ...COLUMNAS_BASE,
        "grupo_datos INTEGER NOT NULL",
        "finca_id INTEGER NOT NULL",
        "estanque_id INTEGER NOT NULL",
        "fecha TEXT NOT NULL",
        "cantidad_siembra INTEGER NULL",
        "area_estanque REAL NULL",
        "total_camarones_muestra INTEGER NULL",
        "tiros_atarraya INTEGER NULL",
        "area_atarraya REAL NULL",
        "area_muestreada REAL NULL",
        "promedio_por_tiro REAL NULL",
        "poblacion_estimada INTEGER NULL",
        "sobrevivencia REAL NULL",
        "densidad REAL NULL",
        "notas_conteo TEXT NULL",
        "creado_por_usuario_id INTEGER NULL",
        "creado_por_colaborador_id INTEGER NULL",
        ...COLUMNAS_AUDITORIA_SYNC
    ],

    densidad_detalle_tiros: [
        ...COLUMNAS_BASE,
        "grupo_datos INTEGER NOT NULL",
        "densidad_id INTEGER NOT NULL",
        "numero_tiro INTEGER NOT NULL",
        "cantidad_camarones INTEGER NOT NULL",
        "creado_por_usuario_id INTEGER NULL",
        "creado_por_colaborador_id INTEGER NULL",
        ...COLUMNAS_AUDITORIA_SYNC
    ],

    raleos: [
        ...COLUMNAS_BASE,
        "grupo_datos INTEGER NOT NULL",
        "finca_id INTEGER NOT NULL",
        "estanque_id INTEGER NOT NULL",
        "siembra_id INTEGER NULL",
        "fecha TEXT NOT NULL",
        "porcentaje REAL NULL",
        "kg_retirados REAL NULL",
        "biomasa_restante REAL NULL",
        "biomasa_estimada REAL NULL",
        "observaciones TEXT NULL",
        "creado_por_usuario_id INTEGER NULL",
        "creado_por_colaborador_id INTEGER NULL",
        ...COLUMNAS_AUDITORIA_SYNC
    ],

    fisico_quimico: [
        ...COLUMNAS_BASE,
        "grupo_datos INTEGER NOT NULL",
        "finca_id INTEGER NOT NULL",
        "estanque_id INTEGER NOT NULL",
        "fecha_registro TEXT NOT NULL",
        "creado_por_usuario_id INTEGER NULL",
        "creado_por_colaborador_id INTEGER NULL",
        ...COLUMNAS_AUDITORIA_SYNC
    ],

    fisico_quimico_detalle: [
        ...COLUMNAS_BASE,
        "lectura_id INTEGER NOT NULL",
        "tipo_medicion TEXT NOT NULL",
        "etiqueta TEXT NOT NULL",
        "valor REAL NOT NULL",
        "creado_por_usuario_id INTEGER NULL",
        "creado_por_colaborador_id INTEGER NULL",
        ...COLUMNAS_AUDITORIA_SYNC
    ],

    trazabilidad: [
        ...COLUMNAS_BASE,
        "grupo_datos INTEGER NOT NULL",
        "finca_id INTEGER NOT NULL",
        "estanque_origen_id INTEGER NULL",
        "estanque_destino_id INTEGER NULL",
        "fecha TEXT NOT NULL",
        "tamano REAL NULL",
        "dias INTEGER NULL",
        "pl REAL NULL",
        "tipo_movimiento TEXT NULL",
        "creado_por_usuario_id INTEGER NULL",
        "creado_por_colaborador_id INTEGER NULL",
        ...COLUMNAS_AUDITORIA_SYNC
    ],

    configuracion_local: [
        ...COLUMNAS_BASE,
        "clave TEXT NOT NULL",
        "valor TEXT NULL",
        "descripcion TEXT NULL",
        ...COLUMNAS_AUDITORIA_SYNC
    ],

    alertas_locales: [
        ...COLUMNAS_BASE,
        "grupo_datos INTEGER NOT NULL",
        "tipo TEXT NOT NULL",
        "titulo TEXT NOT NULL",
        "mensaje TEXT NOT NULL",
        "origen_tabla TEXT NULL",
        "origen_id INTEGER NULL",
        "prioridad TEXT NULL",
        "leida INTEGER NOT NULL DEFAULT 0",
        "descartada INTEGER NOT NULL DEFAULT 0",
        ...COLUMNAS_AUDITORIA_SYNC
    ]
};

/*
//////////////////////////////////////////////////////////
TABLAS
//////////////////////////////////////////////////////////
*/

export const TABLAS_SOLO_LOCALES = [
    "configuracion_local",
    "alertas_locales"
];

export const TABLAS_LOCALES = Object.keys(ESQUEMA_TABLAS);

export const TABLAS_SINCRONIZABLES = TABLAS_LOCALES.filter((tabla) => {
    return !TABLAS_SOLO_LOCALES.includes(tabla);
});

/*
//////////////////////////////////////////////////////////
FUNCIONES SECUNDARIAS
//////////////////////////////////////////////////////////
*/

/**
 * Obtiene el nombre de una columna desde una definicion SQL.
 * @param {string} definicion - Definicion SQL de columna.
 * @returns {string} Nombre de columna.
 */
const obtenerNombreColumna = (definicion) => {
    return definicion.trim().split(/\s+/)[0];
};

/**
 * Crea la sentencia SQL para una tabla local.
 * @param {string} tabla - Nombre de tabla.
 * @param {Array<string>} columnas - Columnas SQL.
 * @returns {string} Sentencia CREATE TABLE.
 */
const crearSentenciaTabla = (tabla, columnas) => {
    return `
        CREATE TABLE IF NOT EXISTS ${tabla} (
            ${columnas.join(",\n            ")}
        );
    `;
};

/**
 * Valida si una tabla contiene una columna.
 * @param {string} tabla - Nombre de tabla.
 * @param {string} columna - Nombre de columna.
 * @returns {boolean} Resultado de validacion.
 */
const tablaTieneColumna = (tabla, columna) => {
    return DEFINICIONES_TABLAS[tabla].includes(columna);
};

/**
 * Crea indices generales para una tabla.
 * @param {string} tabla - Nombre de tabla.
 * @returns {Array<string>} Sentencias de indices.
 */
const crearIndicesGeneralesTabla = (tabla) => {
    const indices = [
        `CREATE INDEX IF NOT EXISTS idx_${tabla}_servidor_id ON ${tabla}(servidor_id);`,
        `CREATE INDEX IF NOT EXISTS idx_${tabla}_pendiente_sync ON ${tabla}(pendiente_sync);`,
        `CREATE INDEX IF NOT EXISTS idx_${tabla}_activo_deleted ON ${tabla}(activo, deleted_at);`
    ];

    if (tablaTieneColumna(tabla, "grupo_datos")) {
        indices.push(`CREATE INDEX IF NOT EXISTS idx_${tabla}_grupo_datos ON ${tabla}(grupo_datos);`);
    }

    if (tablaTieneColumna(tabla, "finca_id")) {
        indices.push(`CREATE INDEX IF NOT EXISTS idx_${tabla}_finca_id ON ${tabla}(finca_id);`);
    }

    if (tablaTieneColumna(tabla, "estanque_id")) {
        indices.push(`CREATE INDEX IF NOT EXISTS idx_${tabla}_estanque_id ON ${tabla}(estanque_id);`);
    }

    if (tablaTieneColumna(tabla, "creado_por_usuario_id")) {
        indices.push(`CREATE INDEX IF NOT EXISTS idx_${tabla}_creado_usuario ON ${tabla}(creado_por_usuario_id);`);
    }

    if (tablaTieneColumna(tabla, "creado_por_colaborador_id")) {
        indices.push(`CREATE INDEX IF NOT EXISTS idx_${tabla}_creado_colaborador ON ${tabla}(creado_por_colaborador_id);`);
    }

    return indices;
};

/*
//////////////////////////////////////////////////////////
DEFINICIONES EXPORTABLES
//////////////////////////////////////////////////////////
*/

export const DEFINICIONES_TABLAS = Object.keys(ESQUEMA_TABLAS).reduce((acumulador, tabla) => {
    acumulador[tabla] = ESQUEMA_TABLAS[tabla].map((columna) => {
        return obtenerNombreColumna(columna);
    });

    return acumulador;
}, {});

const SENTENCIAS_TABLAS = Object.keys(ESQUEMA_TABLAS).map((tabla) => {
    return crearSentenciaTabla(tabla, ESQUEMA_TABLAS[tabla]);
});

const SENTENCIAS_INDICES_GENERALES = TABLAS_LOCALES.flatMap((tabla) => {
    return crearIndicesGeneralesTabla(tabla);
});

const SENTENCIAS_INDICES_ESPECIFICOS = [
    "CREATE INDEX IF NOT EXISTS idx_colaboradores_login ON colaboradores(grupo_datos, nombre_usuario, activo, deleted_at);",
    "CREATE INDEX IF NOT EXISTS idx_estanques_codigo_finca ON estanques(finca_id, codigo);",
    "CREATE INDEX IF NOT EXISTS idx_productos_codigo_grupo ON productos(grupo_datos, codigo);",
    "CREATE INDEX IF NOT EXISTS idx_inventario_producto_grupo ON inventario(grupo_datos, producto_id);",
    "CREATE INDEX IF NOT EXISTS idx_movimientos_inventario_id ON movimientos_inventario(inventario_id);",
    "CREATE INDEX IF NOT EXISTS idx_mantenimiento_equipo_id ON mantenimiento_equipo(equipo_id);",
    "CREATE INDEX IF NOT EXISTS idx_mant_tareas_ticket ON mantenimiento_equipo_tareas(mantenimiento_equipo_id);",
    "CREATE INDEX IF NOT EXISTS idx_mant_productos_ticket ON mantenimiento_equipo_productos(mantenimiento_equipo_id);",
    "CREATE INDEX IF NOT EXISTS idx_fq_estanque_fecha ON fisico_quimico(estanque_id, fecha_registro);",
    "CREATE INDEX IF NOT EXISTS idx_fq_detalle_lectura ON fisico_quimico_detalle(lectura_id);",
    "CREATE INDEX IF NOT EXISTS idx_fq_detalle_tipo ON fisico_quimico_detalle(tipo_medicion);",
    "CREATE INDEX IF NOT EXISTS idx_trazabilidad_origen ON trazabilidad(estanque_origen_id);",
    "CREATE INDEX IF NOT EXISTS idx_trazabilidad_destino ON trazabilidad(estanque_destino_id);",
    "CREATE INDEX IF NOT EXISTS idx_ventas_comprador ON ventas(comprador_id);",
    "CREATE INDEX IF NOT EXISTS idx_raleos_siembra ON raleos(siembra_id);",
    "CREATE INDEX IF NOT EXISTS idx_densidad_detalle_tiros_densidad ON densidad_detalle_tiros(densidad_id);",
    "CREATE INDEX IF NOT EXISTS idx_detalle_tiros_sync ON densidad_detalle_tiros(uuid, version);",
    "CREATE INDEX IF NOT EXISTS idx_calculos_crecimiento_crecimiento_id ON calculos_crecimiento(crecimiento_id);",
    "CREATE INDEX IF NOT EXISTS idx_alertas_descartadas ON alertas_locales(descartada, leida);"
];

export const SENTENCIAS_SCHEMA = [
    ...SENTENCIAS_TABLAS,
    ...SENTENCIAS_INDICES_GENERALES,
    ...SENTENCIAS_INDICES_ESPECIFICOS
];