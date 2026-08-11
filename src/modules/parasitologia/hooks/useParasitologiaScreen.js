/**
 * ============================================================
 * HOOK DE PANTALLA DE PARASITOLOGIA
 * ============================================================
 *
 * Centraliza la logica del formulario, carga de opciones,
 * validaciones y registro local de parasitologias.
 *
 * Trabaja con SQLite para fincas, estanques y parasitologias.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useState } from "react";
import { useWindowDimensions } from "react-native";

import { useError } from "../../../shared/context/ErrorContext";
import { localApi } from "../../../database/local/localApi.service";
import useParasitologia from "./useParasitologia";

/*
============================================================
CONSTANTES
============================================================
*/

const STORAGE_COLABORADOR_ACTUAL = "caprocam_colaborador_actual";

const PARASITOS_RESPALDO = [
    { label: "Gregarina", value: "gregarina" },
    { label: "Nematodo", value: "nematodo" },
    { label: "Epicomensal", value: "epicomensal" },
    { label: "Protozoario", value: "protozoario" },
    { label: "Otro", value: "otro" },
];

const GRADOS_RESPALDO = [
    { label: "Bajo", value: "bajo" },
    { label: "Medio", value: "medio" },
    { label: "Alto", value: "alto" },
];

const METODOS_LOCAL_API = {
    obtenerTodos: ["obtenerTodos", "getAll", "listar"],
};

/*
============================================================
HELPERS DE FECHA
============================================================
*/

function obtenerFechaHoy() {
    const hoy = new Date();
    const dia = String(hoy.getDate()).padStart(2, "0");
    const mes = String(hoy.getMonth() + 1).padStart(2, "0");

    return `${dia}/${mes}/${hoy.getFullYear()}`;
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
            ["nombreFinca", "nombre_finca", "nombre", "codigoCBO", "codigoCbo", "codigo_cbo"],
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

function normalizarCatalogo(catalogo, respaldo = []) {
    if (!Array.isArray(catalogo) || catalogo.length === 0) {
        return respaldo;
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
                ["value", "valor", "codigo", "parasito", "grado", "nombre"],
                ""
            );

            const label = obtenerValor(
                item,
                ["label", "nombre", "nombreVisible"],
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

export default function useParasitologiaScreen() {
    const { width } = useWindowDimensions();
    const { mostrarError } = useError();

    const {
        catalogoParasitos,
        catalogoGrados,
        loading: loadingParasitologia,
        guardarRegistro,
    } = useParasitologia();

    const [fincas, setFincas] = useState([]);
    const [estanques, setEstanques] = useState([]);

    const [finca, setFinca] = useState("");
    const [estanque, setEstanque] = useState("");
    const [fechaReporte, setFechaReporte] = useState(obtenerFechaHoy());
    const [responsable, setResponsable] = useState("");
    const [parasito, setParasito] = useState("");
    const [gradoInfeccion, setGradoInfeccion] = useState("");
    const [observaciones, setObservaciones] = useState("");

    const [cargandoOpciones, setCargandoOpciones] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [mensaje, setMensaje] = useState("");
    const [tipoMensaje, setTipoMensaje] = useState("info");

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

                const [colaborador, fincasData, estanquesData] =
                    await Promise.all([
                        obtenerColaboradorActual(),
                        obtenerRegistrosLocales("fincas"),
                        obtenerRegistrosLocales("estanques"),
                    ]);

                if (!activo) {
                    return;
                }

                setResponsable(obtenerNombreResponsable(colaborador));
                setFincas(fincasData);
                setEstanques(estanquesData);
            } catch (error) {
                console.error("Error al cargar fincas y estanques locales", error);

                if (activo) {
                    setTipoMensaje("danger");
                    setMensaje(error.message || "Error al cargar opciones locales.");
                    mostrarError(error);
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

    const opcionesFincas = useMemo(() => {
        return fincas
            .map((item) => {
                const id = obtenerIdFinca(item);

                return {
                    label: String(obtenerNombreFinca(item, id)),
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
                    label: String(obtenerNombreEstanque(item, id)),
                    value: String(id),
                };
            })
            .filter((item) => {
                return Number(item.value) > 0;
            });
    }, [finca, estanques]);

    const opcionesParasitos = useMemo(() => {
        return normalizarCatalogo(catalogoParasitos, PARASITOS_RESPALDO);
    }, [catalogoParasitos]);

    const opcionesGrados = useMemo(() => {
        return normalizarCatalogo(catalogoGrados, GRADOS_RESPALDO);
    }, [catalogoGrados]);

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

    const placeholderParasito = opcionesParasitos.length > 0
        ? "Seleccione un parasito"
        : "No se encuentran opciones o valores";

    const placeholderGrado = opcionesGrados.length > 0
        ? "Seleccione el grado de infeccion"
        : "No se encuentran opciones o valores";

    const errorFinca = submitted && finca === "";
    const errorEstanque = submitted && estanque === "";
    const errorFechaReporte =
        submitted && validarFechaReporte(fechaReporte) !== "";
    const errorParasito = submitted && parasito === "";
    const errorGrado = submitted && gradoInfeccion === "";

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

    function cambiarParasito(value) {
        setParasito(String(value));
        limpiarMensaje();
    }

    function cambiarGradoInfeccion(value) {
        setGradoInfeccion(String(value));
        limpiarMensaje();
    }

    function cambiarObservaciones(value) {
        setObservaciones(value);
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

        if (!parasito) {
            return "Seleccione un parasito.";
        }

        if (!gradoInfeccion) {
            return "Seleccione el grado de infeccion.";
        }

        return "";
    }

    function limpiarFormulario() {
        setFinca("");
        setEstanque("");
        setFechaReporte(obtenerFechaHoy());
        setParasito("");
        setGradoInfeccion("");
        setObservaciones("");
        setSubmitted(false);
    }

    async function registrarParasitologia() {
        setSubmitted(true);
        setMensaje("");

        const errorValidacion = validarFormulario();

        if (errorValidacion) {
            setTipoMensaje("danger");
            setMensaje(errorValidacion);
            return;
        }

        const parasitologiaDTO = {
            fincaId: Number(finca),
            estanqueId: Number(estanque),
            fechaReporte: convertirFechaParaBackend(fechaReporte),
            responsable: responsable,
            parasito: parasito,
            gradoInfeccion: gradoInfeccion,
            observaciones: observaciones.trim() || null,
        };

        const nuevoRegistro = await guardarRegistro(parasitologiaDTO);

        if (!nuevoRegistro) {
            return;
        }

        setResponsable(nuevoRegistro.responsable ?? responsable);
        setTipoMensaje("success");
        setMensaje("Parasitologia registrada localmente.");
        limpiarFormulario();
    }

    return {
        finca,
        estanque,
        fechaReporte,
        responsable,
        parasito,
        gradoInfeccion,
        observaciones,

        opcionesFincas,
        opcionesEstanques,
        opcionesParasitos,
        opcionesGrados,

        placeholderFinca,
        placeholderEstanque,
        placeholderParasito,
        placeholderGrado,

        gridStyle,
        itemStyle,
        itemFullStyle,

        errorFinca,
        errorEstanque,
        errorFechaReporte,
        errorParasito,
        errorGrado,

        mensaje,
        tipoMensaje,
        loading: loadingParasitologia || cargandoOpciones,

        cambiarFinca,
        setEstanque: cambiarEstanque,
        setFechaReporte: cambiarFechaReporte,
        setParasito: cambiarParasito,
        setGradoInfeccion: cambiarGradoInfeccion,
        setObservaciones: cambiarObservaciones,
        registrarParasitologia,
    };
}