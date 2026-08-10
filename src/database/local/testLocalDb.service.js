/*
//////////////////////////////////////////////////////////
CABEZA DE ARCHIVO
//////////////////////////////////////////////////////////
Archivo: testLocalDb.service.js
Autor: Gerald Andres Alfaro Solorzano
Fecha: 10/08/2026
Modulo: Database Local
Descripcion:
Archivo temporal para probar la inicializacion, limpieza y
consultas basicas de SQLite local en la app movil.
//////////////////////////////////////////////////////////
*/

/*
//////////////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////////////
*/

import { localApi } from "./localApi.service";
import { eliminarBaseLocal } from "./sqlite.database";
import bcrypt from "bcryptjs";

bcrypt.setRandomFallback((len) => {
    const buf = new Uint8Array(len);

    for (let i = 0; i < len; i++) {
        buf[i] = Math.floor(Math.random() * 256);
    }

    return buf;
});

/*
//////////////////////////////////////////////////////////
FUNCIONES SECUNDARIAS
//////////////////////////////////////////////////////////
*/

/**
 * Valida una respuesta local y lanza error si falla.
 * @param {object} respuesta - Respuesta local.
 * @param {string} mensaje - Mensaje de error.
 * @returns {object} Respuesta validada.
 */
const validarRespuestaLocal = (respuesta, mensaje) => {
    if (!respuesta || !respuesta.success) {
        throw new Error(respuesta?.message || mensaje);
    }

    return respuesta;
};

/*
//////////////////////////////////////////////////////////
FUNCIONES PRINCIPALES
//////////////////////////////////////////////////////////
*/

/**
 * Prueba la base local SQLite.
 * @returns {Promise} Resultado de prueba.
 */
export const probarBaseLocal = async () => {
    try {
        console.log("Iniciando prueba de SQLite local...");

        try {
            await eliminarBaseLocal();
            console.log("Base local eliminada para prueba limpia.");
        } catch (error) {
            console.log("No se pudo eliminar la base local previa:", error);
        }

        const inicializacion = await localApi.inicializar();
        console.log("Inicializacion:", inicializacion);

        validarRespuestaLocal(
            inicializacion,
            "No se pudo inicializar la base local."
        );

        const grupo = validarRespuestaLocal(
            await localApi.gruposDatos.crear({
                codigo: 1001,
                nombre: "Grupo Demo Movil",
                descripcion: "Grupo creado para prueba local",
                acceso_global: 0,
            }),
            "No se pudo crear el grupo local."
        );

        console.log("Grupo creado:", grupo);

        const pinHashDemo = bcrypt.hashSync("1234", 10);

        const colaborador = validarRespuestaLocal(
            await localApi.colaboradores.crear({
                grupo_datos: 1001,
                finca_id: null,
                nombre: "Gerald",
                apellidos: "Alfaro",
                cedula: "000000000",
                telefono: "88888888",
                email: "gerald.demo@caprocam.local",
                nombre_usuario: "gerald_demo",
                pin_hash: pinHashDemo,
                tipo_colaborador: "external_collab",
                creado_por_usuario_id: null,
            }),
            "No se pudo crear el colaborador local."
        );

        console.log("Colaborador creado:", colaborador);

        const finca = validarRespuestaLocal(
            await localApi.fincas.crear({
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
                creado_por_usuario_id: null,
            }),
            "No se pudo crear la finca local."
        );

        console.log("Finca creada:", finca);

        const estanqueUno = validarRespuestaLocal(
            await localApi.estanques.crear({
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
                creado_por_usuario_id: null,
                creado_por_colaborador_id: colaborador.data.id,
            }),
            "No se pudo crear el estanque 1."
        );

        console.log("Estanque 1 creado:", estanqueUno);

        const estanqueDos = validarRespuestaLocal(
            await localApi.estanques.crear({
                grupo_datos: 1001,
                finca_id: finca.data.id,
                codigo: "EST-002",
                tipo_estanque: "Precria",
                estado: "Activo",
                largo: 15,
                ancho: 8,
                profundidad: 1.2,
                fuente_agua: "Canal",
                fecha_mantenimiento: null,
                precria: 1,
                creado_por_usuario_id: null,
                creado_por_colaborador_id: colaborador.data.id,
            }),
            "No se pudo crear el estanque 2."
        );

        console.log("Estanque 2 creado:", estanqueDos);

        const proveedor = validarRespuestaLocal(
            await localApi.proveedores.crear({
                grupo_datos: 1001,
                nombre_empresa: "Proveedor Demo",
                tipo_producto: "Alimento",
                telefono: "88887777",
                correo_electronico: "proveedor.demo@caprocam.local",
                direccion: "Puntarenas, Costa Rica",
                notas: "Proveedor de prueba local",
                creado_por_usuario_id: null,
                creado_por_colaborador_id: colaborador.data.id,
            }),
            "No se pudo crear el proveedor local."
        );

        console.log("Proveedor creado:", proveedor);

        const productoBodega = validarRespuestaLocal(
            await localApi.productos.crear({
                codigo: "P-0001",
                nombre: "Balanceado Premium",
                categoria: "Alimento",
                unidad: "Saco",
                precio_unidad: 12500,
                proveedor_id: proveedor.data.id,
                fecha_ingreso: "2026-08-03",
                fecha_caducidad: "2026-12-31",
                estado: "ACTIVO",
                grupo_datos: 1001,
                creado_por_usuario_id: null,
                creado_por_colaborador_id: colaborador.data.id,
            }),
            "No se pudo crear el producto local."
        );

        console.log("Producto creado:", productoBodega);

        const inventario = validarRespuestaLocal(
            await localApi.inventario.crear({
                grupo_datos: 1001,
                producto_id: productoBodega.data.id,
                proveedor_id: proveedor.data.id,
                cantidad: 24,
                stock_minimo: 6,
                creado_por_usuario_id: null,
                creado_por_colaborador_id: colaborador.data.id,
            }),
            "No se pudo crear el inventario local."
        );

        console.log("Inventario creado:", inventario);

        const movimientoInventario = validarRespuestaLocal(
            await localApi.movimientosInventario.crear({
                grupo_datos: 1001,
                inventario_id: inventario.data.id,
                producto_id: productoBodega.data.id,
                tipo_movimiento: "Entrada",
                cantidad: 24,
                observacion: "Ingreso inicial de prueba",
                fecha_movimiento: "2026-08-03 07:00:00",
                creado_por_usuario_id: null,
                creado_por_colaborador_id: colaborador.data.id,
            }),
            "No se pudo crear el movimiento de inventario local."
        );

        console.log("Movimiento inventario creado:", movimientoInventario);

        const alimentacion = validarRespuestaLocal(
            await localApi.alimentaciones.crear({
                grupo_datos: 1001,
                finca_id: finca.data.id,
                estanque_id: estanqueUno.data.id,
                proveedor_id: proveedor.data.id,
                producto_id: productoBodega.data.id,
                fecha: "2026-08-03",
                hora: "07:00",
                metodo: "Manual",
                cantidad_kg: 25,
                presentacion: "Saco",
                proveedor: "Proveedor Demo",
                tipo_alimento: "Alimento demo",
                observaciones: "Registro creado offline",
                creado_por_usuario_id: null,
                creado_por_colaborador_id: colaborador.data.id,
            }),
            "No se pudo crear la alimentacion local."
        );

        console.log("Alimentacion creada:", alimentacion);

        const comprador = validarRespuestaLocal(
            await localApi.compradores.crear({
                grupo_datos: 1001,
                nombre: "Distribuidora del Mar R.L.",
                cedula: "3101998877",
                telefono: "87654321",
                correo: "compras@distribuidoradelmar.com",
                direccion: "San Jose, Costa Rica",
                notas: "Comprador de camaron",
                estado: "ACTIVO",
                creado_por_usuario_id: null,
                creado_por_colaborador_id: colaborador.data.id,
            }),
            "No se pudo crear el comprador local."
        );

        console.log("Comprador creado:", comprador);

        const venta = validarRespuestaLocal(
            await localApi.ventas.crear({
                grupo_datos: 1001,
                finca_id: finca.data.id,
                estanque_id: estanqueUno.data.id,
                comprador_id: comprador.data.id,
                peso_promedio: 15.4,
                cantidad_vendida: 100,
                precio_kilo: 2800,
                total: 280000,
                fecha: "2026-08-04",
                creado_por_usuario_id: null,
                creado_por_colaborador_id: colaborador.data.id,
            }),
            "No se pudo crear la venta local."
        );

        console.log("Venta creada:", venta);

        const crecimiento = validarRespuestaLocal(
            await localApi.crecimientos.crear({
                grupo_datos: 1001,
                finca_id: finca.data.id,
                estanque_id: estanqueUno.data.id,
                fecha_registro: "2026-08-04",
                peso_actual: 15.4,
                creado_por_usuario_id: null,
                creado_por_colaborador_id: colaborador.data.id,
            }),
            "No se pudo crear el crecimiento local."
        );

        console.log("Crecimiento creado:", crecimiento);

        const calculoCrecimientoUno = validarRespuestaLocal(
            await localApi.calculosCrecimiento.crear({
                grupo_datos: 1001,
                crecimiento_id: crecimiento.data.id,
                cantidad_individuos: 30,
                peso_total: 462,
                peso_promedio_individual: 15.4,
                creado_por_usuario_id: null,
                creado_por_colaborador_id: colaborador.data.id,
            }),
            "No se pudo crear el calculo de crecimiento 1."
        );

        console.log("Calculo crecimiento 1 creado:", calculoCrecimientoUno);

        const calculoCrecimientoDos = validarRespuestaLocal(
            await localApi.calculosCrecimiento.crear({
                grupo_datos: 1001,
                crecimiento_id: crecimiento.data.id,
                cantidad_individuos: 25,
                peso_total: 390,
                peso_promedio_individual: 15.6,
                creado_por_usuario_id: null,
                creado_por_colaborador_id: colaborador.data.id,
            }),
            "No se pudo crear el calculo de crecimiento 2."
        );

        console.log("Calculo crecimiento 2 creado:", calculoCrecimientoDos);

        const parasitologia = validarRespuestaLocal(
            await localApi.parasitologias.crear({
                grupo_datos: 1001,
                finca_id: finca.data.id,
                estanque_id: estanqueUno.data.id,
                tipo_registro: "parasitologia",
                fecha_reporte: "2026-08-05",
                responsable: "Gerald Alfaro",
                parasito: "gregarina",
                grado_infeccion: "bajo",
                observaciones: "Registro de prueba local",
                creado_por_usuario_id: null,
                creado_por_colaborador_id: colaborador.data.id,
            }),
            "No se pudo crear la parasitologia local."
        );

        console.log("Parasitologia creada:", parasitologia);

        const enfermedad = validarRespuestaLocal(
            await localApi.enfermedades.crear({
                grupo_datos: 1001,
                finca_id: finca.data.id,
                estanque_id: estanqueUno.data.id,
                tipo_registro: "enfermedad",
                fecha_reporte: "2026-08-05",
                responsable: "Gerald Alfaro",
                enfermedad: "AHPND - Necrosis hepatopancreatica aguda",
                severidad: "alto",
                reporte: "Registro de prueba local",
                creado_por_usuario_id: null,
                creado_por_colaborador_id: colaborador.data.id,
            }),
            "No se pudo crear la enfermedad local."
        );

        console.log("Enfermedad creada:", enfermedad);

        const densidad = validarRespuestaLocal(
            await localApi.densidadPoblacional.crear({
                grupo_datos: 1001,
                finca_id: finca.data.id,
                estanque_id: estanqueUno.data.id,
                fecha: "2026-08-06",
                cantidad_siembra: 120000,
                area_estanque: 10000,
                total_camarones_muestra: 350,
                tiros_atarraya: 20,
                area_atarraya: 2.5,
                area_muestreada: 50,
                promedio_por_tiro: 17.5,
                poblacion_estimada: 70000,
                sobrevivencia: 58.33,
                densidad: 7,
                notas_conteo: "Densidad de prueba local",
                creado_por_usuario_id: null,
                creado_por_colaborador_id: colaborador.data.id,
            }),
            "No se pudo crear la densidad poblacional local."
        );

        console.log("Densidad creada:", densidad);

        const detalleTiroUno = validarRespuestaLocal(
            await localApi.densidadDetalleTiros.crear({
                grupo_datos: 1001,
                densidad_id: densidad.data.id,
                numero_tiro: 1,
                cantidad_camarones: 20,
                creado_por_usuario_id: null,
                creado_por_colaborador_id: colaborador.data.id,
            }),
            "No se pudo crear el detalle de tiro 1."
        );

        console.log("Detalle tiro 1 creado:", detalleTiroUno);

        const detalleTiroDos = validarRespuestaLocal(
            await localApi.densidadDetalleTiros.crear({
                grupo_datos: 1001,
                densidad_id: densidad.data.id,
                numero_tiro: 2,
                cantidad_camarones: 15,
                creado_por_usuario_id: null,
                creado_por_colaborador_id: colaborador.data.id,
            }),
            "No se pudo crear el detalle de tiro 2."
        );

        console.log("Detalle tiro 2 creado:", detalleTiroDos);

        const raleo = validarRespuestaLocal(
            await localApi.raleos.crear({
                grupo_datos: 1001,
                finca_id: finca.data.id,
                estanque_id: estanqueUno.data.id,
                siembra_id: null,
                fecha: "2026-08-07",
                porcentaje: 50,
                kg_retirados: 1000,
                biomasa_restante: 1000,
                biomasa_estimada: 2000,
                observaciones: "Raleo de prueba local",
                creado_por_usuario_id: null,
                creado_por_colaborador_id: colaborador.data.id,
            }),
            "No se pudo crear el raleo local."
        );

        console.log("Raleo creado:", raleo);

        const fisicoQuimico = validarRespuestaLocal(
            await localApi.fisicoQuimico.crear({
                grupo_datos: 1001,
                finca_id: finca.data.id,
                estanque_id: estanqueUno.data.id,
                fecha_registro: "2026-08-07",
                creado_por_usuario_id: null,
                creado_por_colaborador_id: colaborador.data.id,
            }),
            "No se pudo crear el fisico quimico local."
        );

        console.log("Fisico quimico creado:", fisicoQuimico);

        const fisicoQuimicoDetalle = validarRespuestaLocal(
            await localApi.fisicoQuimicoDetalle.crear({
                lectura_id: fisicoQuimico.data.id,
                tipo_medicion: "ph",
                etiqueta: "manana",
                valor: 7.6,
                creado_por_usuario_id: null,
                creado_por_colaborador_id: colaborador.data.id,
            }),
            "No se pudo crear el detalle fisico quimico local."
        );

        console.log("Fisico quimico detalle creado:", fisicoQuimicoDetalle);

        const trazabilidad = validarRespuestaLocal(
            await localApi.trazabilidad.crear({
                grupo_datos: 1001,
                finca_id: finca.data.id,
                estanque_origen_id: estanqueDos.data.id,
                estanque_destino_id: estanqueUno.data.id,
                fecha: "2026-08-08",
                tamano: 12.5,
                dias: 30,
                pl: 12,
                tipo_movimiento: "Traslado de prueba",
                creado_por_usuario_id: null,
                creado_por_colaborador_id: colaborador.data.id,
            }),
            "No se pudo crear la trazabilidad local."
        );

        console.log("Trazabilidad creada:", trazabilidad);

        const estanques = validarRespuestaLocal(
            await localApi.estanques.obtenerTodos({
                finca_id: finca.data.id,
            }),
            "No se pudieron consultar los estanques."
        );

        console.log("Estanques consultados:", estanques);

        const pendientes = validarRespuestaLocal(
            await localApi.sync.obtenerPendientes(),
            "No se pudieron consultar los pendientes de sincronizacion."
        );

        console.log("Pendientes sync:", pendientes);

        return {
            success: true,
            message: "Prueba SQLite local finalizada correctamente.",
            data: {
                grupo: grupo.data,
                colaborador: colaborador.data,
                finca: finca.data,
                estanqueUno: estanqueUno.data,
                estanqueDos: estanqueDos.data,
                proveedor: proveedor.data,
                productoBodega: productoBodega.data,
                inventario: inventario.data,
                movimientoInventario: movimientoInventario.data,
                alimentacion: alimentacion.data,
                comprador: comprador.data,
                venta: venta.data,
                crecimiento: crecimiento.data,
                calculoCrecimientoUno: calculoCrecimientoUno.data,
                calculoCrecimientoDos: calculoCrecimientoDos.data,
                parasitologia: parasitologia.data,
                enfermedad: enfermedad.data,
                densidad: densidad.data,
                detalleTiroUno: detalleTiroUno.data,
                detalleTiroDos: detalleTiroDos.data,
                raleo: raleo.data,
                fisicoQuimico: fisicoQuimico.data,
                fisicoQuimicoDetalle: fisicoQuimicoDetalle.data,
                trazabilidad: trazabilidad.data,
                estanques: estanques.data,
                pendientes: pendientes.data,
            },
        };
    } catch (error) {
        console.log("Error en prueba SQLite local:", error);

        return {
            success: false,
            message: "Error en prueba SQLite local.",
            error: error.message,
        };
    }
};