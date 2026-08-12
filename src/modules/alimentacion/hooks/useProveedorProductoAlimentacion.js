/**
 * ============================================================
 * HOOK USEPROVEEDORPRODUCTOALIMENTACION
 * ============================================================
 *
 * Carga proveedores y productos desde SQLite local.
 *
 * Mantiene el mismo patrón usado por: useFincaEstanqueAlimentacion.
 *
 * - Trae todos los proveedores y productos una sola vez.
 * - proveedoresOptions solo incluye proveedores cuyo tipo_producto
 *   sea "Alimento" (columna real en la tabla local `proveedores`),
 *   para que el Select de Proveedor en Alimentación solo muestre
 *   proveedores de alimento balanceado. Se conserva este filtro de
 *   la version "web", adaptado al nombre de columna snake_case que
 *   devuelve SQLite.
 * - Productos se filtran por proveedor seleccionado.
 * - Retorna opciones listas para Select.
 *
 * RECONECTADO: la version "web" de este hook usaba getProveedores /
 * productoService (HTTP). Se restaura localApi.proveedores /
 * localApi.productos (SQLite).
 */
import { useEffect, useMemo, useState } from "react";
import { localApi } from "../../../database/local/localApi.service";
/*
============================================================
HELPERS
============================================================
*/
const obtenerDataRespuesta = (respuesta) =>
    respuesta &&
    Object.prototype.hasOwnProperty.call(respuesta, "data")
        ? respuesta.data
        : respuesta;
function obtenerValor(
    objeto,
    llaves,
    valorDefecto = null
) {
    if (!objeto) {
        return valorDefecto;
    }
    for (let i = 0; i < llaves.length; i++) {
        const llave = llaves[i];
        if (
            Object.prototype.hasOwnProperty.call(
                objeto,
                llave
            )
            &&
            objeto[llave] !== undefined
            &&
            objeto[llave] !== null
        ) {
            return objeto[llave];
        }
    }
    return valorDefecto;
}
/*
============================================================
HOOK PRINCIPAL
============================================================
*/


export function useProveedorProductoAlimentacion(
    idProveedorSeleccionado
) {

    const [
        proveedores,
        setProveedores
    ] = useState([]);

    const [
        productos,
        setProductos
    ] = useState([]);

    const [
        loadingCatalogos,
        setLoadingCatalogos
    ] = useState(true);

    const [
        errorCatalogos,
        setErrorCatalogos
    ] = useState(null);

    /*
    ============================================================
    CARGA INICIAL SQLITE
    ============================================================
    */

    useEffect(() => {

        let activo = true;

        async function cargarOpciones() {
            try {
                setLoadingCatalogos(true);
                setErrorCatalogos(null);

                await localApi.inicializar();

                const [
                    respuestaProveedores,
                    respuestaProductos
                ] = await Promise.all([
                    localApi.proveedores.obtenerTodos(),
                    localApi.productos.obtenerTodos()
                ]);

                const proveedoresLocales =
                    obtenerDataRespuesta(
                        respuestaProveedores
                    );

                const productosLocales =
                    obtenerDataRespuesta(
                        respuestaProductos
                    );

                if (!activo) return;
                setProveedores(
                    Array.isArray(proveedoresLocales)
                        ? proveedoresLocales
                        : []
                );
                setProductos(
                    Array.isArray(productosLocales)
                        ? productosLocales
                        : []
                );
            } catch(error) {
                console.error(
                    "Error cargando proveedores y productos:",
                    error
                );
                if (activo) {
                    setErrorCatalogos(
                        "No se pudieron cargar proveedores y productos."
                    );
                }
            } finally {
                if (activo) {
                    setLoadingCatalogos(false);
                }
            }
        }
        cargarOpciones();
        return () => {
            activo = false;
        };
    }, []);
    /*
    ============================================================
    OPCIONES PROVEEDORES
    ============================================================
    */
    const proveedoresOptions = useMemo(
        () =>
            proveedores
                .filter((proveedor) => {
                    const tipoProducto =
                        obtenerValor(
                            proveedor,
                            ["tipo_producto", "tipoProducto"],
                            null
                        );
                    return tipoProducto === "Alimento";
                })
                .map((proveedor) => {
                    const id =
                        obtenerValor(
                        proveedor,
                        [
                            "id",
                            "proveedorId",
                            "proveedor_id"
                        ],"");
                    const nombre =
                        obtenerValor(
                        proveedor,
                        [
                            "nombre_empresa",
                            "nombre",
                            "nombreProveedor",
                            "nombre_proveedor"
                        ],"Proveedor"
                        );
                    return {label: nombre,value: String(id)
                    };
                })
                .filter(
                    (item) =>
                        Number(item.value) > 0
                ),
        [proveedores]
    );
    /*
    ============================================================
    OPCIONES PRODUCTOS
    ============================================================
    */
    const productosOptions = useMemo(() => {

        if (!idProveedorSeleccionado) {
            return [];
        }

        return productos
            .filter((producto) => {
                const proveedorId =
                    obtenerValor(
                        producto,
                        [
                            "proveedorId",
                            "proveedor_id",
                            "idProveedor"
                        ],
                        0
                    );
                return (Number(proveedorId)=== Number(idProveedorSeleccionado));
            })
            .map((producto) => {
                const id =
                    obtenerValor(
                        producto,
                        [
                            "id",
                            "productoId",
                            "producto_id"
                        ],
                        ""
                    );



                const nombre =
                    obtenerValor(
                        producto,
                        [
                            "nombre",
                            "descripcion"
                        ],
                        "Producto"
                    );
                return {
                    label: nombre, value: String(id)};
            })
            .filter(
                (item) =>
                    Number(item.value) > 0
            );
    }, [productos, idProveedorSeleccionado]);

    return {
        proveedoresOptions,
        productosOptions,
        loadingCatalogos,
        errorCatalogos,
    };
}

export default useProveedorProductoAlimentacion;