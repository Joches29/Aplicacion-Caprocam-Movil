/*
//////////////////////////////////////////////////////////
CABEZA DE ARCHIVO
//////////////////////////////////////////////////////////
Archivo: testLocalDb.service.js
Autor: Gerald Andres Alfaro Solorzano
Fecha: 03/08/2026
Modulo: Database Local
Descripcion:
Archivo temporal para probar la inicializacion y consultas
basicas de SQLite local en la app movil.
//////////////////////////////////////////////////////////
*/

/*
//////////////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////////////
*/

import { localApi } from "./localApi.service";

/*
//////////////////////////////////////////////////////////
FUNCIONES PRINCIPALES
//////////////////////////////////////////////////////////
*/

/**
 * Prueba la base local SQLite.
 * @returns {Promise<object>} Resultado de prueba.
 */
export const probarBaseLocal = async () => {
    try {
        console.log("Iniciando prueba de SQLite local...");

        const inicializacion = await localApi.inicializar();
        console.log("Inicializacion:", inicializacion);

        const grupo = await localApi.gruposDatos.crear({
            codigo: 1001,
            nombre: "Grupo Demo Movil",
            descripcion: "Grupo creado para prueba local",
            acceso_global: 0
        });

        console.log("Grupo creado:", grupo);

        const rol = await localApi.roles.crear({
            nombre: "colaborador_movil",
            descripcion: "Rol demo para app movil",
            acceso_global: 0
        });

        console.log("Rol creado:", rol);

        const colaborador = await localApi.colaboradores.crear({
            grupo_datos: 1001,
            finca_id: null,
            rol_id: rol.data.id,
            nombre: "Gerald",
            apellidos: "Alfaro",
            cedula: "000000000",
            telefono: "88888888",
            email: "gerald.demo@caprocam.local",
            nombre_usuario: "gerald_demo",
            pin_hash: "hash_demo_temporal",
            tipo_colaborador: "external_collab",
            creado_por_colaborador_id: null
        });

        console.log("Colaborador creado:", colaborador);

        const finca = await localApi.fincas.crear({
            grupo_datos: 1001,
            propietario_usuario_id: null,
            codigo_cbo: "F001",
            nombre_finca: "Finca Demo Movil",
            provincia: "Puntarenas",
            canton: "Central",
            distrito: "Chomes",
            otras_senas: "Prueba local",
            propietario_responsable: "Responsable Demo",
            telefono: "88888888",
            area_total: 10,
            espejos_agua: 8,
            creado_por_colaborador_id: colaborador.data.id
        });

        console.log("Finca creada:", finca);

        const estanque = await localApi.estanques.crear({
            grupo_datos: 1001,
            finca_id: finca.data.id,
            codigo: "EST-001",
            tipo_estanque: "Engorde",
            estado: "Activo",
            largo: 20,
            ancho: 10,
            profundidad: 1.5,
            fuente_agua: "Pozo",
            fecha_mantenimiento: null,
            precria: 0,
            creado_por_colaborador_id: colaborador.data.id
        });

        console.log("Estanque creado:", estanque);

        const productoBodega = await localApi.productos.crear({
            codigo: "P-0001",
            nombre: "Balanceado Premium",
            categoria: "Alimento",
            unidad: "Saco",
            precio_unidad: 12500,
            proveedor_id: null,
            fecha_ingreso: "2026-08-03",
            fecha_caducidad: "2026-12-31",
            estado: "ACTIVO",
            grupo_datos: 1001,
            creado_por_colaborador_id: colaborador.data.id
        });

        console.log("Producto creado:", productoBodega);

        const inventario = await localApi.inventario.crear({
            grupo_datos: 1001,
            producto_id: productoBodega.data.id,
            proveedor_id: null,
            cantidad: 24,
            stock_minimo: 6,
            creado_por_colaborador_id: colaborador.data.id
        });

        console.log("Inventario creado:", inventario);

        const alimentacion = await localApi.alimentaciones.crear({
            grupo_datos: 1001,
            finca_id: finca.data.id,
            estanque_id: estanque.data.id,
            colaborador_id: colaborador.data.id,
            proveedor_id: null,
            producto_id: null,
            fecha: "2026-08-03",
            hora: "07:00",
            metodo: "Manual",
            cantidad_kg: 25,
            presentacion: "Saco",
            proveedor: "Proveedor Demo",
            tipo_alimento: "Alimento demo",
            observaciones: "Registro creado offline",
            creado_por_colaborador_id: colaborador.data.id
        });

        console.log("Alimentacion creada:", alimentacion);

        const estanques = await localApi.estanques.obtenerTodos({
            finca_id: finca.data.id
        });

        console.log("Estanques consultados:", estanques);

        const pendientes = await localApi.sync.obtenerPendientes();
        console.log("Pendientes sync:", pendientes);

        return {
            success: true,
            message: "Prueba SQLite local finalizada correctamente.",
            data: {
                grupo: grupo.data,
                rol: rol.data,
                colaborador: colaborador.data,
                finca: finca.data,
                estanque: estanque.data,
                productoBodega: productoBodega.data,
                inventario: inventario.data,
                alimentacion: alimentacion.data,
                pendientes: pendientes.data
            }
        };
    } catch (error) {
        console.log("Error en prueba SQLite local:", error);

        return {
            success: false,
            message: "Error en prueba SQLite local.",
            error: error.message
        };
    }
};