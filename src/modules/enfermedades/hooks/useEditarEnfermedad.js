/**
 * ============================================================
 * HOOK DE EDICION DE ENFERMEDADES
 * ============================================================
 *
 * Centraliza la logica para editar registros locales de
 * enfermedades usando SQLite.
 *
 * Mantiene la misma API de pantalla para que EditarEnfermedadScreen
 * no tenga que cambiar.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useState } from "react";
import { useWindowDimensions } from "react-native";

import { localApi } from "../../../database/local/localApi.service";
import EnfermedadesLocalService from "../services/EnfermedadesLocal.service";

/*
============================================================
CONSTANTES
============================================================
*/

const STORAGE_COLABORADOR_ACTUAL = "caprocam_colaborador_actual";

const METODOS_LOCAL_API = {
    obtenerTodos: ["obtenerTodos", "getAll", "listar"],
};

/*
============================================================
HELPERS DE FECHA
============================================================
*/

function obtenerFechaActual() {
    const fecha = new Date();
    const dia = String(fecha.getDate()).padStart(2, "0");
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");

    return `${dia}/${mes}/${fecha.getFullYear()}`;
}

function convertirFechaParaBackend(fecha) {
    if (!fecha) {
        return "";
    }

    if (String(fecha).includes("-") && !String(fecha).includes("/")) {
        return String(fecha).slice(0, 10);
    }

    const [dia, mes, anio] = String(fecha).split("/");

    if (dia && mes && anio) {
        return `${anio}-${mes}-${dia}`;
    }

    return fecha;
}

function formatearFechaUI(fecha) {
    if (!fecha) {
        return "";
    }

    if (typeof fecha === "string" && /^\d{4}-\d{2}-\d{2}/.test(fecha)) {
        const [anio, mes, dia] = fecha.slice(0, 10).split("-");

        return `${dia}/${mes}/${anio}`;
    }

    return fecha;
}

function obtenerFechaValida(fecha) {
    const texto = String(fecha ?? "").trim();
    let dia;
    let mes;
    let anio;

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(texto)) {
        [dia, mes, anio] = texto.split("/").map(Number);
    } else if (/^\d{4}-\d{2}-\d{2}/.test(texto)) {
        [anio, mes, dia] = texto.slice(0, 10).split("-").map(Number);
    } else {
        return null;
    }

    const fechaValidada = new Date(anio, mes - 1, dia);
    fechaValidada.setHours(0, 0, 0, 0);

    if (
        fechaValidada.getFullYear() !== anio ||
        fechaValidada.getMonth() !== mes - 1 ||
        fechaValidada.getDate() !== dia
    ) {
        return null;
    }

    return fechaValidada;
}

function validarFechaReporte(fecha) {
    if (!String(fecha ?? "").trim()) {
        return "Seleccione la fecha del reporte.";
    }

    const fechaValidada = obtenerFechaValida(fecha);

    if (!fechaValidada) {
        return "La fecha del reporte no es valida.";
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    if (fechaValidada > hoy) {
        return "La fecha del reporte no puede ser futura.";
    }

    return "";
}

/*
============================================================
HELPERS GENERALES
============================================================
*/

function primeraMayuscula(texto) {
    if (!texto) {
        return "";
    }

    return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
}

const obtenerDataRespuesta = (respuesta) => {
    if (respuesta && Object.prototype.hasOwnProperty.call(respuesta, "data")) {
        return respuesta.data;
    }

    return respuesta;
};

function obtenerValor(objeto, llaves, valorDefecto = null) {
    if (!objeto) {
        return valorDefecto;
    }

    for (let i = 0; i < llaves.length; i += 1) {
        const llave = llaves[i];

        if (
            Object.prototype.hasOwnProperty.call(objeto, llave) &&
            objeto[llave] !== undefined &&
            objeto[llave] !== null
        ) {
            return objeto[llave];
        }
    }

    return valorDefecto;
}

async function obtenerColaboradorActual() {
    try {
        const valor = await AsyncStorage.getItem(STORAGE_COLABORADOR_ACTUAL);

        if (!valor) {
            return null;
        }

        return JSON.parse(valor);
    } catch (error) {
        console.error("Error al obtener colaborador actual", error);
        return null;
    }
}

function obtenerNombreResponsable(colaborador) {
    if (!colaborador) {
        return "No disponible";
    }

    const nombreCompleto = obtenerValor(
        colaborador,
        ["nombreCompleto", "nombre_completo"],
        null
    );

    if (nombreCompleto) {
        return String(nombreCompleto).trim();
    }

    const nombre = obtenerValor(colaborador, ["nombre"], "");
    const apellidos = obtenerValor(colaborador, ["apellidos", "apellido"], "");
    const responsable = `${nombre} ${apellidos}`.trim();

    return (
        responsable ||
        obtenerValor(
            colaborador,
            ["usuario", "username", "nombre_usuario"],
            "No disponible"
        )
    );
}

/*
============================================================
HELPERS DE LOCAL API
============================================================
*/

async function ejecutarMetodoLocal(seccion, tipoMetodo, argumentos = []) {
    const apiSeccion = localApi[seccion];

    if (!apiSeccion) {
        throw new Error(`localApi.${seccion} no esta disponible.`);
    }

    const nombres = METODOS_LOCAL_API[tipoMetodo] || [];

    for (let i = 0; i < nombres.length; i += 1) {
        const nombreMetodo = nombres[i];

        if (typeof apiSeccion[nombreMetodo] === "function") {
            return await apiSeccion[nombreMetodo](...argumentos);
        }
    }

    throw new Error(`No existe metodo local ${tipoMetodo} para ${seccion}.`);
}

async function obtenerRegistrosLocales(seccion) {
    const respuesta = await ejecutarMetodoLocal(seccion, "obtenerTodos");
    const data = obtenerDataRespuesta(respuesta);

    if (Array.isArray(data)) {
        return data;
    }

    return [];
}

/*
============================================================
HELPERS DE FINCAS Y ESTANQUES
============================================================
*/

function obtenerIdFinca(finca) {
    return Number(
        obtenerValor(
            finca,
            ["servidor_id", "servidorId", "id", "fincaId", "idFinca", "finca_id"],
            0
        )
    );
}

function obtenerIdEstanque(estanque) {
    return Number(
        obtenerValor(
            estanque,
            [
                "servidor_id",
                "servidorId",
                "id",
                "estanqueId",
                "idEstanque",
                "estanque_id",
            ],
            0
        )
    );
}

function obtenerFincaIdEstanque(estanque) {
    return Number(
        obtenerValor(
            estanque,
            ["finca_id", "fincaId", "idFinca"],
            0
        )
    );
}

function obtenerNombreFinca(item, id) {
    return (
        obtenerValor(
            item,
            ["nombreFinca", "nombre_finca", "nombre", "codigoCBO", "codigo_cbo"],
            ""
        ) || `Finca ${id}`
    );
}

function obtenerNombreEstanque(item, id) {
    return obtenerValor(item, ["codigo", "nombre"], "") || `Estanque ${id}`;
}

/*
============================================================
HELPERS DE CATALOGOS
============================================================
*/

function normalizarCatalogo(catalogo) {
    if (!Array.isArray(catalogo)) {
        return [];
    }

    return catalogo
        .map((item) => {
            if (typeof item === "string") {
                return {
                    label: primeraMayuscula(item),
                    value: item,
                };
            }

            const value = obtenerValor(
                item,
                ["value", "valor", "codigo", "nombre"],
                ""
            );

            const label = obtenerValor(
                item,
                ["label", "nombre"],
                primeraMayuscula(String(value))
            );

            return {
                label: String(label),
                value: String(value),
            };
        })
        .filter((item) => {
            return item.value !== "";
        });
}

/*
============================================================
HOOK PRINCIPAL
============================================================
*/

export default function useEditarEnfermedad(registroId, onGuardado) {
    const { width } = useWindowDimensions();

    const [finca, setFinca] = useState("");
    const [estanque, setEstanque] = useState("");
    const [fechaReporte, setFechaReporte] = useState(obtenerFechaActual());
    const [responsable, setResponsable] = useState("");
    const [enfermedad, setEnfermedad] = useState("");
    const [severidad, setSeveridad] = useState("");
    const [reporte, setReporte] = useState("");

    const [fincas, setFincas] = useState([]);
    const [estanques, setEstanques] = useState([]);
    const [catalogoEnf, setCatalogoEnf] = useState([]);
    const [catalogoSev, setCatalogoSev] = useState([]);

    const [submitted, setSubmitted] = useState(false);
    const [mensaje, setMensaje] = useState("");
    const [tipoMensaje, setTipoMensaje] = useState("info");
    const [loading, setLoading] = useState(false);
    const [cargandoRegistro, setCargandoRegistro] = useState(true);
    const [cargandoOpciones, setCargandoOpciones] = useState(true);

    useEffect(() => {
        if (!mensaje) {
            return undefined;
        }

        const duracion = tipoMensaje === "success" ? 3000 : 6000;

        const timer = setTimeout(() => {
            setMensaje("");
            setTipoMensaje("info");
        }, duracion);

        return () => {
            clearTimeout(timer);
        };
    }, [mensaje, tipoMensaje]);

    useEffect(() => {
        let activo = true;

        async function cargarOpciones() {
            try {
                setCargandoOpciones(true);

                await localApi.inicializar();

                const [
                    colaborador,
                    fincasData,
                    estanquesData,
                    enfermedadesCatalogo,
                    severidadesCatalogo,
                ] = await Promise.all([
                    obtenerColaboradorActual(),
                    obtenerRegistrosLocales("fincas"),
                    obtenerRegistrosLocales("estanques"),
                    EnfermedadesLocalService.getCatalogo(),
                    EnfermedadesLocalService.getCatalogoSeveridades(),
                ]);

                if (!activo) {
                    return;
                }

                setResponsable(obtenerNombreResponsable(colaborador));
                setFincas(fincasData);
                setEstanques(estanquesData);
                setCatalogoEnf(enfermedadesCatalogo);
                setCatalogoSev(severidadesCatalogo);
            } catch (error) {
                console.error("Error al cargar opciones locales", error);

                if (activo) {
                    setTipoMensaje("danger");
                    setMensaje(error.message || "Error al cargar opciones locales.");
                }
            } finally {
                if (activo) {
                    setCargandoOpciones(false);
                }
            }
        }

        cargarOpciones();

        return () => {
            activo = false;
        };
    }, []);

    useEffect(() => {
        let activo = true;

        async function cargarRegistro() {
            if (!registroId) {
                setCargandoRegistro(false);
                return;
            }

            try {
                setCargandoRegistro(true);

                await localApi.inicializar();

                const registro = await EnfermedadesLocalService.getById(
                    registroId
                );

                if (!activo || !registro) {
                    return;
                }

                setFinca(
                    String(
                        obtenerValor(
                            registro,
                            ["fincaId", "finca_id"],
                            ""
                        )
                    )
                );

                setEstanque(
                    String(
                        obtenerValor(
                            registro,
                            ["estanqueId", "estanque_id"],
                            ""
                        )
                    )
                );

                setFechaReporte(
                    formatearFechaUI(
                        obtenerValor(
                            registro,
                            ["fechaReporte", "fecha_reporte", "fecha"],
                            ""
                        )
                    )
                );

                setEnfermedad(
                    obtenerValor(
                        registro,
                        ["enfermedad"],
                        ""
                    )
                );

                setSeveridad(
                    obtenerValor(
                        registro,
                        ["severidad"],
                        ""
                    )
                );

                const responsableRegistro = obtenerValor(
                    registro,
                    ["responsable"],
                    ""
                );

                if (responsableRegistro) {
                    setResponsable(responsableRegistro);
                }

                setReporte(
                    obtenerValor(
                        registro,
                        ["reporte"],
                        ""
                    ) || ""
                );
            } catch (error) {
                console.error("Error al cargar enfermedad local", error);

                if (activo) {
                    setTipoMensaje("danger");
                    setMensaje("No se pudo cargar el registro local.");
                }
            } finally {
                if (activo) {
                    setCargandoRegistro(false);
                }
            }
        }

        cargarRegistro();

        return () => {
            activo = false;
        };
    }, [registroId]);

    const opcionesFincas = useMemo(() => {
        return fincas
            .map((item) => {
                const id = obtenerIdFinca(item);

                return {
                    label: obtenerNombreFinca(item, id),
                    value: String(id),
                };
            })
            .filter((item) => {
                return Number(item.value) > 0;
            });
    }, [fincas]);

    const opcionesEstanques = useMemo(() => {
        if (!finca) {
            return [];
        }

        return estanques
            .filter((item) => {
                return obtenerFincaIdEstanque(item) === Number(finca);
            })
            .map((item) => {
                const id = obtenerIdEstanque(item);

                return {
                    label: obtenerNombreEstanque(item, id),
                    value: String(id),
                };
            })
            .filter((item) => {
                return Number(item.value) > 0;
            });
    }, [estanques, finca]);

    const opcionesEnfermedades = useMemo(() => {
        return normalizarCatalogo(catalogoEnf);
    }, [catalogoEnf]);

    const opcionesSeveridades = useMemo(() => {
        return normalizarCatalogo(catalogoSev);
    }, [catalogoSev]);

    const esTablet = width >= 768;

    const gridStyle = useMemo(() => {
        return {
            width: "100%",
            flexDirection: esTablet ? "row" : "column",
            flexWrap: esTablet ? "wrap" : "nowrap",
            gap: 12,
        };
    }, [esTablet]);

    const itemStyle = useMemo(() => {
        return {
            width: esTablet ? "48.5%" : "100%",
        };
    }, [esTablet]);

    const itemFullStyle = useMemo(() => {
        return {
            width: "100%",
        };
    }, []);

    const placeholderFinca = cargandoOpciones
        ? "Cargando fincas..."
        : opcionesFincas.length > 0
            ? "Seleccione una finca"
            : "No se encuentran opciones o valores";

    const placeholderEstanque = !finca
        ? "Seleccione primero una finca"
        : opcionesEstanques.length > 0
            ? "Seleccione un estanque"
            : "No se encuentran opciones o valores";

    const placeholderEnfermedad = opcionesEnfermedades.length > 0
        ? "Seleccione una enfermedad"
        : "No se encuentran opciones o valores";

    const placeholderSeveridad = opcionesSeveridades.length > 0
        ? "Seleccione la severidad"
        : "No se encuentran opciones o valores";

    const errorFinca = submitted && finca === "";
    const errorEstanque = submitted && estanque === "";
    const errorFechaReporte =
        submitted && validarFechaReporte(fechaReporte) !== "";
    const errorEnfermedad = submitted && enfermedad === "";
    const errorSeveridad = submitted && severidad === "";

    function limpiarMensaje() {
        setMensaje("");
        setTipoMensaje("info");
    }

    function cambiarFinca(value) {
        setFinca(String(value));
        setEstanque("");
        limpiarMensaje();
    }

    function cambiarEstanque(value) {
        setEstanque(String(value));
        limpiarMensaje();
    }

    function cambiarFechaReporte(value) {
        setFechaReporte(value);
        limpiarMensaje();
    }

    function cambiarEnfermedad(value) {
        setEnfermedad(String(value));
        limpiarMensaje();
    }

    function cambiarSeveridad(value) {
        setSeveridad(String(value));
        limpiarMensaje();
    }

    function cambiarReporte(value) {
        setReporte(value);
        limpiarMensaje();
    }

    function validarFormulario() {
        if (!finca) {
            return "Seleccione una finca.";
        }

        if (!estanque) {
            return "Seleccione un estanque.";
        }

        const errorFecha = validarFechaReporte(fechaReporte);

        if (errorFecha) {
            return errorFecha;
        }

        if (!enfermedad) {
            return "Seleccione una enfermedad.";
        }

        if (!severidad) {
            return "Seleccione la severidad.";
        }

        return "";
    }

    async function guardarEnfermedad() {
        setSubmitted(true);
        setMensaje("");

        const errorValidacion = validarFormulario();

        if (errorValidacion) {
            setTipoMensaje("danger");
            setMensaje(errorValidacion);
            return;
        }

        setLoading(true);

        try {
            await EnfermedadesLocalService.update(registroId, {
                fincaId: Number(finca),
                estanqueId: Number(estanque),
                fechaReporte: convertirFechaParaBackend(fechaReporte),
                responsable: responsable,
                enfermedad: enfermedad,
                severidad: severidad,
                reporte: reporte.trim() || null,
            });

            setTipoMensaje("success");
            setMensaje("Enfermedad actualizada localmente.");

            if (typeof onGuardado === "function") {
                onGuardado();
            }
        } catch (error) {
            console.error("Error al actualizar enfermedad local", error);
            setTipoMensaje("danger");
            setMensaje("No se pudo actualizar el registro local.");
        } finally {
            setLoading(false);
        }
    }

    return {
        finca,
        estanque,
        fechaReporte,
        responsable,
        enfermedad,
        severidad,
        reporte,

        opcionesFincas,
        opcionesEstanques,
        opcionesEnfermedades,
        opcionesSeveridades,

        placeholderFinca,
        placeholderEstanque,
        placeholderEnfermedad,
        placeholderSeveridad,

        gridStyle,
        itemStyle,
        itemFullStyle,

        errorFinca,
        errorEstanque,
        errorFechaReporte,
        errorEnfermedad,
        errorSeveridad,

        mensaje,
        tipoMensaje,
        loading: loading || cargandoOpciones,
        cargandoRegistro,

        cambiarFinca,
        cambiarEstanque,
        cambiarFechaReporte,
        cambiarEnfermedad,
        cambiarSeveridad,
        cambiarReporte,
        guardarEnfermedad,
    };
}