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

const obtenerFechaActual = () => {
  const fecha = new Date();
  const dia = String(fecha.getDate()).padStart(2, "0");
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");

  return `${dia}/${mes}/${fecha.getFullYear()}`;
};

const convertirFechaParaBackend = (fecha) => {
  if (!fecha) return "";
  if (fecha.includes("-") && !fecha.includes("/")) return fecha.slice(0, 10);

  const [dia, mes, anio] = fecha.split("/");

  return dia && mes && anio ? `${anio}-${mes}-${dia}` : fecha;
};

const formatearFechaUI = (fecha) => {
  if (!fecha) return "";

  if (typeof fecha === "string" && /^\d{4}-\d{2}-\d{2}/.test(fecha)) {
    const [anio, mes, dia] = fecha.slice(0, 10).split("-");

    return `${dia}/${mes}/${anio}`;
  }

  return fecha;
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
  Number(obtenerValor(estanque, ["finca_id", "fincaId", "idFinca"], 0));

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

export default function useEditarEnfermedad(registroId, onGuardado) {
  const { width } = useWindowDimensions();

  const [finca, setFinca] = useState("");
  const [estanque, setEstanque] = useState("");
  const [fechaReporte, setFechaReporte] = useState(obtenerFechaActual());
  const [responsable, setResponsable] = useState("");
  const [enfermedad, setEnfermedad] = useState("");
  const [severidad, setSeveridad] = useState("");
  const [mortalidad, setMortalidad] = useState("");
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

        if (!activo) return;

        setResponsable(obtenerNombreResponsable(colaborador));
        setFincas(fincasData);
        setEstanques(estanquesData);
        setCatalogoEnf(enfermedadesCatalogo);
        setCatalogoSev(severidadesCatalogo);
      } catch (error) {
        console.error("Error al cargar opciones locales", error);
      } finally {
        if (activo) setCargandoOpciones(false);
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

        const registro = await EnfermedadesLocalService.getById(registroId);

        if (!activo || !registro) return;

        setFinca(String(obtenerValor(registro, ["fincaId", "finca_id"], "")));
        setEstanque(String(obtenerValor(registro, ["estanqueId", "estanque_id"], "")));
        setFechaReporte(formatearFechaUI(obtenerValor(registro, ["fechaReporte", "fecha_reporte", "fecha"], "")));
        setEnfermedad(obtenerValor(registro, ["enfermedad"], ""));
        setSeveridad(obtenerValor(registro, ["severidad"], ""));
        setResponsable(obtenerValor(registro, ["responsable"], responsable));
        setMortalidad(String(obtenerValor(registro, ["mortalidadRegistrada", "mortalidad_registrada", "mortalidad"], "")));
        setReporte(obtenerValor(registro, ["reporte"], ""));
      } catch (error) {
        console.error("Error al cargar enfermedad local", error);

        if (activo) {
          setTipoMensaje("danger");
          setMensaje("No se pudo cargar el registro local.");
        }
      } finally {
        if (activo) setCargandoRegistro(false);
      }
    }

    cargarRegistro();

    return () => {
      activo = false;
    };
  }, [registroId]);

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
    [estanques, finca]
  );

  const opcionesEnfermedades = useMemo(
    () => normalizarCatalogo(catalogoEnf),
    [catalogoEnf]
  );

  const opcionesSeveridades = useMemo(
    () => normalizarCatalogo(catalogoSev),
    [catalogoSev]
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

  async function guardarEnfermedad() {
    setSubmitted(true);
    setMensaje("");

    if (!validarFormulario()) {
      setTipoMensaje("danger");
      setMensaje("Rellene los datos requeridos correctamente.");
      return;
    }

    setLoading(true);

    try {
      await EnfermedadesLocalService.update(registroId, {
        fincaId: Number(finca),
        estanqueId: Number(estanque),
        fechaReporte: convertirFechaParaBackend(fechaReporte),
        enfermedad,
        severidad,
        mortalidadRegistrada: convertirNumero(mortalidad, 0),
        responsable,
        reporte: reporte.trim(),
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
    loading: loading || cargandoOpciones,
    cargandoRegistro,

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