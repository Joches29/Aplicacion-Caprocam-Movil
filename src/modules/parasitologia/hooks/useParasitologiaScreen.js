/**
 * ============================================================
 * HOOK DE PANTALLA DE PARASITOLOGIA
 * ============================================================
 *
 * Centraliza la logica del formulario, carga de opciones,
 * validaciones y registro local de parasitologias.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useState } from "react";
import { useWindowDimensions } from "react-native";

import { useError } from "../../../shared/context/ErrorContext";
import { localApi } from "../../../database/local/localApi.service";

import useParasitologia from "./useParasitologia";

const STORAGE_COLABORADOR_ACTUAL = "caprocam_colaborador_actual";

const PARASITOS_RESPALDO = [
  { label: "Gregarina", value: "gregarina" },
  { label: "Nematodo", value: "nematodo" },
  { label: "Epicomensal", value: "epicomensal" },
  { label: "Protozoario", value: "protozoario" },
  { label: "Otro", value: "otro" },
];

const GRADOS_INFECCION = [
  { label: "Bajo", value: "bajo" },
  { label: "Medio", value: "medio" },
  { label: "Alto", value: "alto" },
];

const METODOS_LOCAL_API = {
  obtenerTodos: ["obtenerTodos", "getAll", "listar"],
};

function obtenerFechaHoy() {
  const hoy = new Date();
  const dia = String(hoy.getDate()).padStart(2, "0");
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");

  return `${dia}/${mes}/${hoy.getFullYear()}`;
}

function convertirFechaParaBackend(fecha) {
  if (!fecha) return "";
  if (fecha.includes("-")) return fecha.slice(0, 10);

  const [dia, mes, anio] = fecha.split("/");

  return dia && mes && anio ? `${anio}-${mes}-${dia}` : fecha;
}

function obtenerFechaValida(fecha) {
  const texto = String(fecha ?? "").trim();
  let dia, mes, anio;

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
  ) return null;

  return fechaValidada;
}

function validarFechaReporte(fecha) {
  if (!String(fecha ?? "").trim())
    return "Seleccione la fecha del reporte.";

  const fechaValidada = obtenerFechaValida(fecha);

  if (!fechaValidada)
    return "La fecha del reporte no es valida.";

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  if (fechaValidada > hoy)
    return "La fecha del reporte no puede ser futura.";

  return "";
}

function primeraMayuscula(texto) {
  return texto
    ? texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase()
    : "";
}

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

function normalizarTexto(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function obtenerDataRespuesta(respuesta) {
  return respuesta &&
    Object.prototype.hasOwnProperty.call(respuesta, "data")
    ? respuesta.data
    : respuesta;
}

async function obtenerColaboradorActual() {
  try {
    const valor = await AsyncStorage.getItem(
      STORAGE_COLABORADOR_ACTUAL,
    );

    return valor ? JSON.parse(valor) : null;
  } catch {
    return null;
  }
}

function obtenerNombreResponsable(colaborador) {
  if (!colaborador) return "No disponible";

  const nombreCompleto = obtenerValor(
    colaborador,
    ["nombreCompleto", "nombre_completo"],
    null,
  );

  if (nombreCompleto)
    return String(nombreCompleto).trim();

  const nombre = obtenerValor(colaborador, ["nombre"], "");
  const apellidos = obtenerValor(
    colaborador,
    ["apellidos", "apellido"],
    "",
  );

  const responsable = `${nombre} ${apellidos}`.trim();

  return (
    responsable ||
    obtenerValor(
      colaborador,
      ["usuario", "username", "nombre_usuario"],
      "No disponible",
    )
  );
}

async function ejecutarMetodoLocal(
  seccion,
  tipoMetodo,
  argumentos = [],
) {
  const apiSeccion = localApi[seccion];

  if (!apiSeccion)
    throw new Error(`localApi.${seccion} no esta disponible.`);

  const nombres = METODOS_LOCAL_API[tipoMetodo] || [];

  for (let i = 0; i < nombres.length; i += 1) {
    const nombreMetodo = nombres[i];

    if (typeof apiSeccion[nombreMetodo] === "function")
      return apiSeccion[nombreMetodo](...argumentos);
  }

  throw new Error(
    `No existe metodo local ${tipoMetodo} para ${seccion}.`,
  );
}

async function obtenerRegistrosLocales(seccion) {
  const respuesta = await ejecutarMetodoLocal(
    seccion,
    "obtenerTodos",
  );

  const data = obtenerDataRespuesta(respuesta);

  return Array.isArray(data) ? data : [];
}

function obtenerIdLocalFinca(finca) {
  return Number(
    obtenerValor(finca, ["id", "idLocal", "id_local"], 0),
  );
}

function obtenerServidorIdFinca(finca) {
  return Number(
    obtenerValor(
      finca,
      ["servidor_id", "servidorId", "idServidor"],
      0,
    ),
  );
}

function obtenerIdFinca(finca) {
  const idLocal = obtenerIdLocalFinca(finca);
  const servidorId = obtenerServidorIdFinca(finca);

  return idLocal > 0 ? idLocal : servidorId;
}

function obtenerIdsValidosFinca(
  finca,
  fincaSeleccionada = null,
) {
  const ids = [
    Number(fincaSeleccionada),
    obtenerIdLocalFinca(finca),
    obtenerServidorIdFinca(finca),
  ];

  return ids.filter(
    (id, index, arreglo) =>
      id > 0 && arreglo.indexOf(id) === index,
  );
}

function fincaCoincideConSeleccion(
  finca,
  fincaSeleccionada,
) {
  return obtenerIdsValidosFinca(
    finca,
    fincaSeleccionada,
  ).includes(Number(fincaSeleccionada));
}

function obtenerIdsFincaSeleccionada(
  fincas,
  fincaSeleccionada,
) {
  const fincaActual = fincas.find((item) =>
    fincaCoincideConSeleccion(item, fincaSeleccionada),
  );

  return obtenerIdsValidosFinca(
    fincaActual,
    fincaSeleccionada,
  );
}

function obtenerIdLocalEstanque(estanque) {
  return Number(
    obtenerValor(estanque, ["id", "idLocal", "id_local"], 0),
  );
}

function obtenerServidorIdEstanque(estanque) {
  return Number(
    obtenerValor(
      estanque,
      ["servidor_id", "servidorId", "idServidor"],
      0,
    ),
  );
}

function obtenerIdEstanque(estanque) {
  const idLocal = obtenerIdLocalEstanque(estanque);
  const servidorId = obtenerServidorIdEstanque(estanque);

  return idLocal > 0 ? idLocal : servidorId;
}

function obtenerIdsValidosEstanque(estanque) {
  const ids = [
    obtenerIdLocalEstanque(estanque),
    obtenerServidorIdEstanque(estanque),
  ];

  return ids.filter(
    (id, index, arreglo) =>
      id > 0 && arreglo.indexOf(id) === index,
  );
}

function obtenerFincaIdEstanque(estanque) {
  return Number(
    obtenerValor(
      estanque,
      ["finca_id", "fincaId", "idFinca", "id_finca"],
      0,
    ),
  );
}

function obtenerIdEstanqueSiembra(siembra) {
  return Number(
    obtenerValor(
      siembra,
      ["estanque_id", "estanqueId", "idEstanque"],
      0,
    ),
  );
}

function estanqueEstaActivo(estanque) {
  return (
    normalizarTexto(
      obtenerValor(estanque, ["estado"], ""),
    ) === "activo"
  );
}

function siembraEstaActiva(siembra) {
  const activo = obtenerValor(siembra, ["activo"], 1);
  const estado = normalizarTexto(
    obtenerValor(siembra, ["estado"], ""),
  );

  if (
    activo === false ||
    activo === 0 ||
    activo === "0" ||
    normalizarTexto(activo) === "false"
  ) return false;

  return estado === "activa" || estado === "activo";
}

function estanqueTieneSiembraActiva(estanque, siembras) {
  const idsEstanque = obtenerIdsValidosEstanque(estanque);

  return siembras.some((siembra) => {
    return (
      idsEstanque.includes(obtenerIdEstanqueSiembra(siembra)) &&
      siembraEstaActiva(siembra)
    );
  });
}

function buscarEstanque(estanques, estanqueId) {
  return (
    estanques.find((item) =>
      obtenerIdsValidosEstanque(item).includes(
        Number(estanqueId),
      ),
    ) ?? null
  );
}

function validarEstanqueParaRegistro(
  estanqueId,
  estanques,
  siembras,
) {
  const estanque = buscarEstanque(estanques, estanqueId);

  if (!estanque)
    return "Seleccione un estanque valido.";

  if (!estanqueEstaActivo(estanque))
    return "El estanque seleccionado no esta activo.";

  if (!estanqueTieneSiembraActiva(estanque, siembras))
    return "El estanque seleccionado no tiene una siembra activa.";

  return "";
}

function obtenerNombreFinca(item, id) {
  return (
    obtenerValor(
      item,
      [
        "nombreFinca",
        "nombre_finca",
        "nombre",
        "codigoCBO",
        "codigoCbo",
        "codigo_cbo",
      ],
      "",
    ) || `Finca ${id}`
  );
}

function obtenerNombreEstanque(item, id) {
  return (
    obtenerValor(
      item,
      ["codigo", "nombre", "estanqueCodigo"],
      "",
    ) || `Estanque ${id}`
  );
}

function normalizarCatalogoParasitos(catalogo) {
  if (!Array.isArray(catalogo) || catalogo.length === 0)
    return PARASITOS_RESPALDO;

  return catalogo
    .map((item) => {
      if (typeof item === "string")
        return {
          label: primeraMayuscula(item),
          value: item,
        };

      const value = obtenerValor(
        item,
        ["value", "codigo", "parasito", "nombre"],
        "",
      );

      const label = obtenerValor(
        item,
        ["label", "nombre", "nombreVisible"],
        primeraMayuscula(String(value)),
      );

      return {
        label: String(label),
        value: String(value),
      };
    })
    .filter((item) => item.value !== "");
}

export default function useParasitologiaScreen() {
  const { width } = useWindowDimensions();
  const { mostrarError } = useError();

  const {
    catalogoParasitos,
    loading: loadingParasitologia,
    guardarRegistro,
  } = useParasitologia();

  const [fincas, setFincas] = useState([]);
  const [estanques, setEstanques] = useState([]);
  const [siembras, setSiembras] = useState([]);

  const [finca, setFinca] = useState("");
  const [estanque, setEstanque] = useState("");
  const [fechaReporte, setFechaReporte] =
    useState(obtenerFechaHoy());
  const [responsable, setResponsable] = useState("");
  const [parasito, setParasito] = useState("");
  const [gradoInfeccion, setGradoInfeccion] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const [cargandoOpciones, setCargandoOpciones] =
    useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState("info");

  useEffect(() => {
    if (!mensaje) return undefined;

    const duracion =
      tipoMensaje === "success" ? 3000 : 6000;

    const timer = setTimeout(() => {
      setMensaje("");
      setTipoMensaje("info");
    }, duracion);

    return () => clearTimeout(timer);
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
          siembrasData,
        ] = await Promise.all([
          obtenerColaboradorActual(),
          obtenerRegistrosLocales("fincas"),
          obtenerRegistrosLocales("estanques"),
          obtenerRegistrosLocales("siembras"),
        ]);

        if (!activo) return;

        setResponsable(
          obtenerNombreResponsable(colaborador),
        );
        setFincas(fincasData);
        setEstanques(estanquesData);
        setSiembras(siembrasData);
      } catch (error) {
        mostrarError(error);
      } finally {
        if (activo) setCargandoOpciones(false);
      }
    }

    cargarOpciones();

    return () => {
      activo = false;
    };
  }, [mostrarError]);

  const opcionesFincas = useMemo(
    () =>
      fincas
        .map((item) => {
          const id = obtenerIdFinca(item);

          return {
            label: String(obtenerNombreFinca(item, id)),
            value: String(id),
          };
        })
        .filter((item) => Number(item.value) > 0),
    [fincas],
  );

  const opcionesEstanques = useMemo(() => {
    if (!finca) return [];

    const idsFinca = obtenerIdsFincaSeleccionada(
      fincas,
      finca,
    );

    return estanques
      .filter((item) => {
        return (
          idsFinca.includes(obtenerFincaIdEstanque(item)) &&
          estanqueEstaActivo(item) &&
          estanqueTieneSiembraActiva(item, siembras)
        );
      })
      .map((item) => {
        const id = obtenerIdEstanque(item);

        return {
          label: String(obtenerNombreEstanque(item, id)),
          value: String(id),
        };
      })
      .filter((item) => Number(item.value) > 0);
  }, [finca, fincas, estanques, siembras]);

  const opcionesParasitos = useMemo(
    () => normalizarCatalogoParasitos(catalogoParasitos),
    [catalogoParasitos],
  );

  const esTablet = width >= 768;

  const gridStyle = useMemo(
    () => ({
      width: "100%",
      flexDirection: esTablet ? "row" : "column",
      flexWrap: esTablet ? "wrap" : "nowrap",
      gap: 12,
    }),
    [esTablet],
  );

  const itemStyle = useMemo(
    () => ({
      width: esTablet ? "48.5%" : "100%",
    }),
    [esTablet],
  );

  const itemFullStyle = useMemo(
    () => ({
      width: "100%",
    }),
    [],
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
      : "No hay estanques activos con siembra activa";

  const placeholderParasito =
    opcionesParasitos.length > 0
      ? "Seleccione un parasito"
      : "No se encuentran opciones o valores";

  const placeholderGrado =
    "Seleccione el grado de infeccion";

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

  const cambiarParasito = (value) => {
    setParasito(String(value));
    limpiarMensaje();
  };

  const cambiarGradoInfeccion = (value) => {
    setGradoInfeccion(String(value));
    limpiarMensaje();
  };

  const cambiarObservaciones = (value) => {
    setObservaciones(value);
    limpiarMensaje();
  };

  function validarFormulario() {
    if (!finca) return "Seleccione una finca.";
    if (!estanque) return "Seleccione un estanque.";

    const errorEstanqueOperativo =
      validarEstanqueParaRegistro(
        estanque,
        estanques,
        siembras,
      );

    if (errorEstanqueOperativo)
      return errorEstanqueOperativo;

    const errorFecha =
      validarFechaReporte(fechaReporte);

    if (errorFecha) return errorFecha;
    if (!parasito) return "Seleccione un parasito.";

    if (!gradoInfeccion)
      return "Seleccione el grado de infeccion.";

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
      fechaReporte:
        convertirFechaParaBackend(fechaReporte),
      responsable,
      parasito,
      gradoInfeccion,
      observaciones: observaciones.trim() || null,
    };

    const nuevoRegistro =
      await guardarRegistro(parasitologiaDTO);

    if (!nuevoRegistro) return;

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
    opcionesGrados: GRADOS_INFECCION,

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
    loading:
      loadingParasitologia || cargandoOpciones,

    cambiarFinca,
    setEstanque: cambiarEstanque,
    setFechaReporte: cambiarFechaReporte,
    setParasito: cambiarParasito,
    setGradoInfeccion: cambiarGradoInfeccion,
    setObservaciones: cambiarObservaciones,

    registrarParasitologia,
  };
}