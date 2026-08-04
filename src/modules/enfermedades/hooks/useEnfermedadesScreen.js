/**
 * ============================================================
 * HOOK DE PANTALLA DE ENFERMEDADES
 * ============================================================
 *
 * Centraliza la logica del formulario, carga de opciones,
 * validaciones y registro local de enfermedades.
 *
 * Trabaja con SQLite para fincas, estanques y enfermedades.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useState } from "react";
import { useWindowDimensions } from "react-native";

import { useError } from "../../../shared/context/ErrorContext";
import { localApi } from "../../../database/local/localApi.service";

import useEnfermedades from "./useEnfermedades";

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

const obtenerFechaActual = () => {
  const fecha = new Date();
  const dia = String(fecha.getDate()).padStart(2, "0");
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");

  return `${dia}/${mes}/${fecha.getFullYear()}`;
};

const convertirFechaParaBackend = (fecha) => {
  if (!fecha) return "";
  if (fecha.includes("-")) return fecha.slice(0, 10);

  const [dia, mes, anio] = fecha.split("/");

  return dia && mes && anio ? `${anio}-${mes}-${dia}` : fecha;
};

/*
============================================================
HELPERS GENERALES
============================================================
*/

const primeraMayuscula = (texto) =>
  texto ? texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase() : "";

const convertirNumero = (valor, valorDefecto = 0) => {
  const numero = Number(valor);

  return Number.isNaN(numero) ? valorDefecto : numero;
};

const obtenerDataRespuesta = (respuesta) =>
  respuesta && Object.prototype.hasOwnProperty.call(respuesta, "data")
    ? respuesta.data
    : respuesta;

function obtenerValor(objeto, llaves, valorDefecto = null) {
  if (!objeto) return valorDefecto;

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

    return valor ? JSON.parse(valor) : null;
  } catch (error) {
    console.error("Error al obtener colaborador actual", error);
    return null;
  }
}

const obtenerNombreResponsable = (colaborador) => {
  const nombre = obtenerValor(colaborador, ["nombre"], "");
  const apellidos = obtenerValor(colaborador, ["apellidos"], "");

  return `${nombre} ${apellidos}`.trim();
};

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

  return Array.isArray(data) ? data : [];
}

/*
============================================================
HELPERS DE FINCAS Y ESTANQUES
============================================================
*/

const obtenerIdFinca = (finca) =>
  Number(
    obtenerValor(
      finca,
      ["id", "fincaId", "idFinca", "finca_id", "servidor_id", "servidorId"],
      0
    )
  );

const obtenerIdEstanque = (estanque) =>
  Number(
    obtenerValor(
      estanque,
      [
        "id",
        "estanqueId",
        "idEstanque",
        "estanque_id",
        "servidor_id",
        "servidorId",
      ],
      0
    )
  );

const obtenerFincaIdEstanque = (estanque) =>
  Number(
    obtenerValor(
      estanque,
      ["finca_id", "fincaId", "idFinca"],
      0
    )
  );

const obtenerNombreFinca = (item, id) =>
  obtenerValor(
    item,
    ["nombreFinca", "nombre_finca", "nombre", "codigoCBO", "codigo_cbo"],
    ""
  ) || `Finca ${id}`;

const obtenerNombreEstanque = (item, id) =>
  obtenerValor(item, ["codigo", "nombre"], "") || `Estanque ${id}`;

/*
============================================================
HELPERS DE CATALOGOS
============================================================
*/

function normalizarCatalogo(catalogo) {
  return Array.isArray(catalogo)
    ? catalogo
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
      .filter((item) => item.value !== "")
    : [];
}

/*
============================================================
HOOK PRINCIPAL
============================================================
*/

export default function useEnfermedadesScreen() {
  const { width } = useWindowDimensions();
  const { mostrarError } = useError();

  const {
    catalogoEnfermedades,
    catalogoSeveridades,
    loading: loadingEnfermedades,
    guardarEnfermedad: guardarEnfermedadLocal,
  } = useEnfermedades();

  const [fincas, setFincas] = useState([]);
  const [estanques, setEstanques] = useState([]);

  const [finca, setFinca] = useState("");
  const [estanque, setEstanque] = useState("");
  const [fechaReporte, setFechaReporte] = useState(obtenerFechaActual());
  const [responsable, setResponsable] = useState("");
  const [enfermedad, setEnfermedad] = useState("");
  const [severidad, setSeveridad] = useState("");
  const [mortalidad, setMortalidad] = useState("");
  const [reporte, setReporte] = useState("");

  const [cargandoOpciones, setCargandoOpciones] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState("info");

  useEffect(() => {
    let activo = true;

    async function cargarOpciones() {
      try {
        setCargandoOpciones(true);

        await localApi.inicializar();

        const [colaborador, fincasData, estanquesData] = await Promise.all([
          obtenerColaboradorActual(),
          obtenerRegistrosLocales("fincas"),
          obtenerRegistrosLocales("estanques"),
        ]);

        if (!activo) return;

        setResponsable(obtenerNombreResponsable(colaborador));
        setFincas(fincasData);
        setEstanques(estanquesData);
      } catch (error) {
        console.error("Error al cargar opciones locales", error);
        mostrarError(error);
      } finally {
        if (activo) setCargandoOpciones(false);
      }
    }

    cargarOpciones();

    return () => {
      activo = false;
    };
  }, []);

  const opcionesFincas = useMemo(
    () =>
      fincas
        .map((item) => {
          const id = obtenerIdFinca(item);

          return {
            label: obtenerNombreFinca(item, id),
            value: String(id),
          };
        })
        .filter((item) => Number(item.value) > 0),
    [fincas]
  );

  const opcionesEstanques = useMemo(
    () =>
      finca
        ? estanques
          .filter((item) => obtenerFincaIdEstanque(item) === Number(finca))
          .map((item) => {
            const id = obtenerIdEstanque(item);

            return {
              label: obtenerNombreEstanque(item, id),
              value: String(id),
            };
          })
          .filter((item) => Number(item.value) > 0)
        : [],
    [finca, estanques]
  );

  const opcionesEnfermedades = useMemo(
    () => normalizarCatalogo(catalogoEnfermedades),
    [catalogoEnfermedades]
  );

  const opcionesSeveridades = useMemo(
    () => normalizarCatalogo(catalogoSeveridades),
    [catalogoSeveridades]
  );

  const esTablet = width >= 768;

  const gridStyle = useMemo(
    () => ({
      width: "100%",
      flexDirection: esTablet ? "row" : "column",
      flexWrap: esTablet ? "wrap" : "nowrap",
      gap: 12,
    }),
    [esTablet]
  );

  const itemStyle = useMemo(
    () => ({
      width: esTablet ? "48.5%" : "100%",
    }),
    [esTablet]
  );

  const itemFullStyle = useMemo(
    () => ({
      width: "100%",
    }),
    []
  );

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
  const errorFechaReporte = submitted && fechaReporte.trim() === "";
  const errorEnfermedad = submitted && enfermedad === "";
  const errorSeveridad = submitted && severidad === "";
  const errorReporte = submitted && reporte.trim() === "";

  function limpiarMensaje() {
    setMensaje("");
    setTipoMensaje("info");
  }

  const cambiarFinca = (value) => {
    setFinca(String(value));
    setEstanque("");
    limpiarMensaje();
  };

  const cambiarEstanque = (value) => {
    setEstanque(String(value));
    limpiarMensaje();
  };

  const cambiarFechaReporte = (value) => {
    setFechaReporte(value);
    limpiarMensaje();
  };

  const cambiarEnfermedad = (value) => {
    setEnfermedad(String(value));
    limpiarMensaje();
  };

  const cambiarSeveridad = (value) => {
    setSeveridad(String(value));
    limpiarMensaje();
  };

  const cambiarMortalidad = (value) => {
    setMortalidad(String(value));
    limpiarMensaje();
  };

  const cambiarReporte = (value) => {
    setReporte(value);
    limpiarMensaje();
  };

  const validarFormulario = () => {
    const mortalidadNumero = convertirNumero(mortalidad, 0);

    return Boolean(
      finca &&
      estanque &&
      fechaReporte &&
      enfermedad &&
      severidad &&
      reporte.trim() &&
      mortalidadNumero >= 0
    );
  };

  function limpiarFormulario() {
    setFinca("");
    setEstanque("");
    setFechaReporte(obtenerFechaActual());
    setEnfermedad("");
    setSeveridad("");
    setMortalidad("");
    setReporte("");
    setSubmitted(false);
  }

  async function guardarEnfermedad() {
    setSubmitted(true);
    setMensaje("");

    if (!validarFormulario()) {
      setTipoMensaje("danger");
      setMensaje("Rellene los datos requeridos correctamente.");
      return;
    }

    const enfermedadDTO = {
      fincaId: Number(finca),
      estanqueId: Number(estanque),
      fechaReporte: convertirFechaParaBackend(fechaReporte),
      enfermedad: enfermedad,
      severidad: severidad,
      mortalidadRegistrada: convertirNumero(mortalidad, 0),
      responsable: responsable,
      reporte: reporte.trim(),
    };

    const nuevaEnfermedad = await guardarEnfermedadLocal(enfermedadDTO);

    if (!nuevaEnfermedad) return;

    setTipoMensaje("success");
    setMensaje("Enfermedad registrada localmente.");
    limpiarFormulario();
  }

  return {
    finca,
    estanque,
    fechaReporte,
    responsable,
    enfermedad,
    severidad,
    mortalidad,
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
    errorReporte,

    mensaje,
    tipoMensaje,
    loading: loadingEnfermedades || cargandoOpciones,

    cambiarFinca,
    cambiarEstanque,
    cambiarFechaReporte,
    cambiarEnfermedad,
    cambiarSeveridad,
    cambiarMortalidad,
    cambiarReporte,
    guardarEnfermedad,
  };
}