/**
 * ============================================================
 * HOOK DE PANTALLA DE PARASITOLOGIA
 * ============================================================
 *
 * Centraliza la logica del formulario, carga de opciones,
 * validaciones, calculos y registro local de parasitologias.
 *
 * Trabaja con SQLite para fincas, estanques y parasitologias.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useState } from "react";
import { useWindowDimensions } from "react-native";

import { useError } from "../../../shared/context/ErrorContext";
import { localApi } from "../../../database/local/localApi.service";
import useParasitologia from "./useParasitologia";

import { COLORS } from "../../../theme/colors";

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

const METODOS_LOCAL_API = {
  obtenerTodos: ["obtenerTodos", "getAll", "listar"],
};

/*
============================================================
HELPERS DE FECHA
============================================================
*/

const obtenerFechaHoy = () => {
  const hoy = new Date();
  const dia = String(hoy.getDate()).padStart(2, "0");
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");

  return `${dia}/${mes}/${hoy.getFullYear()}`;
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

const obtenerDataRespuesta = (respuesta) =>
  respuesta && Object.prototype.hasOwnProperty.call(respuesta, "data")
    ? respuesta.data
    : respuesta;

const convertirNumero = (valor, valorDefecto = 0) => {
  const numero = Number(String(valor ?? "").replace(",", "."));

  return Number.isNaN(numero) ? valorDefecto : numero;
};

function obtenerValor(objeto, llaves, valorDefecto = null) {
  if (!objeto) return valorDefecto;

  for (let i = 0; i < llaves.length; i += 1) {
    const llave = llaves[i];

    if (
      Object.prototype.hasOwnProperty.call(objeto, llave) &&
      objeto[llave] !== undefined &&
      objeto[llave] !== null &&
      String(objeto[llave]).trim() !== ""
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
HELPERS DE FINCAS
============================================================
*/

function obtenerIdLocalFinca(finca) {
  return convertirNumero(
    obtenerValor(
      finca,
      ["id", "idLocal", "id_local"],
      0
    )
  );
}

function obtenerServidorIdFinca(finca) {
  return convertirNumero(
    obtenerValor(
      finca,
      ["servidor_id", "servidorId", "idServidor"],
      0
    )
  );
}

function obtenerIdFinca(finca) {
  const idLocal = obtenerIdLocalFinca(finca);
  const servidorId = obtenerServidorIdFinca(finca);

  if (idLocal > 0) {
    return idLocal;
  }

  return servidorId;
}

function obtenerIdsValidosFinca(finca, fincaSeleccionada = null) {
  const ids = [
    convertirNumero(fincaSeleccionada),
    obtenerIdLocalFinca(finca),
    obtenerServidorIdFinca(finca),
  ];

  return ids.filter(function (id, index, arreglo) {
    return id > 0 && arreglo.indexOf(id) === index;
  });
}

function fincaCoincideConSeleccion(finca, fincaSeleccionada) {
  const idsValidos = obtenerIdsValidosFinca(finca, fincaSeleccionada);

  return idsValidos.includes(convertirNumero(fincaSeleccionada));
}

function obtenerIdsValidosDeFincaSeleccionada(fincas, fincaSeleccionada) {
  const fincaActual = fincas.find(function (fincaItem) {
    return fincaCoincideConSeleccion(fincaItem, fincaSeleccionada);
  });

  return obtenerIdsValidosFinca(fincaActual, fincaSeleccionada);
}

const obtenerNombreFinca = (item, id) =>
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
    ""
  ) || `Finca ${id}`;

/*
============================================================
HELPERS DE ESTANQUES
============================================================
*/

function obtenerIdLocalEstanque(estanque) {
  return convertirNumero(
    obtenerValor(
      estanque,
      ["id", "idLocal", "id_local"],
      0
    )
  );
}

function obtenerServidorIdEstanque(estanque) {
  return convertirNumero(
    obtenerValor(
      estanque,
      ["servidor_id", "servidorId", "idServidor"],
      0
    )
  );
}

function obtenerIdEstanque(estanque) {
  const idLocal = obtenerIdLocalEstanque(estanque);
  const servidorId = obtenerServidorIdEstanque(estanque);

  if (idLocal > 0) {
    return idLocal;
  }

  return servidorId;
}

function obtenerFincaIdEstanque(estanque) {
  return convertirNumero(
    obtenerValor(
      estanque,
      ["finca_id", "fincaId", "idFinca", "id_finca"],
      estanque?.finca?.id ?? 0
    )
  );
}

function estanquePerteneceAFinca(estanque, idsValidosFinca) {
  const fincaIdEstanque = obtenerFincaIdEstanque(estanque);

  return idsValidosFinca.includes(fincaIdEstanque);
}

const obtenerNombreEstanque = (item, id) =>
  obtenerValor(item, ["codigo", "nombre", "estanqueCodigo"], "") || `Estanque ${id}`;

/*
============================================================
HELPERS DE CATALOGOS
============================================================
*/

function normalizarCatalogoParasitos(catalogo) {
  return Array.isArray(catalogo) && catalogo.length > 0
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
            ["value", "codigo", "parasito", "nombre"],
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
        .filter((item) => item.value !== "")
    : PARASITOS_RESPALDO;
}

/*
============================================================
HELPERS DE CALCULO
============================================================
*/

const calcularGrado = (muestreadosValor, infectadosValor) => {
  const muestreados = convertirNumero(muestreadosValor, 0);
  const infectados = convertirNumero(infectadosValor, 0);

  const porcentaje =
    muestreados > 0 && infectados >= 0 && infectados <= muestreados
      ? Number(((infectados / muestreados) * 100).toFixed(2))
      : 0;

  if (porcentaje >= 60) {
    return {
      codigo: "alto",
      nombre: "Alto",
      porcentaje,
      descripcion: "El nivel de infeccion requiere atencion inmediata.",
    };
  }

  if (porcentaje >= 30) {
    return {
      codigo: "medio",
      nombre: "Medio",
      porcentaje,
      descripcion: "El nivel de infeccion requiere seguimiento.",
    };
  }

  return {
    codigo: "bajo",
    nombre: "Bajo",
    porcentaje,
    descripcion:
      porcentaje === 0
        ? "Sin camarones infectados."
        : "El nivel de infeccion se encuentra en un rango bajo.",
  };
};

const obtenerColorGrado = (grado) =>
  grado.codigo === "alto"
    ? COLORS.error
    : grado.codigo === "medio"
      ? COLORS.warning
      : COLORS.success;

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
  const [camaronesMuestreados, setCamaronesMuestreados] = useState("");
  const [camaronesInfectados, setCamaronesInfectados] = useState("");
  const [observaciones, setObservaciones] = useState("");

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
        mostrarError(error);
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
    [fincas]
  );

  const opcionesEstanques = useMemo(
    () => {
      if (!finca) {
        return [];
      }

      const idsValidosFinca = obtenerIdsValidosDeFincaSeleccionada(
        fincas,
        finca
      );

      return estanques
        .filter(function (item) {
          return estanquePerteneceAFinca(item, idsValidosFinca);
        })
        .map(function (item) {
          const id = obtenerIdEstanque(item);

          return {
            label: String(obtenerNombreEstanque(item, id)),
            value: String(id),
          };
        })
        .filter(function (item) {
          return Number(item.value) > 0;
        });
    },
    [finca, fincas, estanques]
  );

  const opcionesParasitos = useMemo(
    () => normalizarCatalogoParasitos(catalogoParasitos),
    [catalogoParasitos]
  );

  const gradoCalculado = useMemo(
    () => calcularGrado(camaronesMuestreados, camaronesInfectados),
    [camaronesMuestreados, camaronesInfectados]
  );

  const colorGrado = useMemo(
    () => obtenerColorGrado(gradoCalculado),
    [gradoCalculado]
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

  const placeholderParasito =
    opcionesParasitos.length > 0
      ? "Seleccione un parasito"
      : "No se encuentran opciones o valores";

  const errorFinca = submitted && finca === "";
  const errorEstanque = submitted && estanque === "";
  const errorFechaReporte = submitted && fechaReporte.trim() === "";
  const errorParasito = submitted && parasito === "";
  const errorMuestreados = submitted && Number(camaronesMuestreados) <= 0;

  const errorInfectados =
    submitted &&
    (camaronesInfectados.trim() === "" ||
      Number(camaronesInfectados) < 0 ||
      Number(camaronesInfectados) > Number(camaronesMuestreados));

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

  const cambiarCamaronesMuestreados = (value) => {
    setCamaronesMuestreados(String(value));
    limpiarMensaje();
  };

  const cambiarCamaronesInfectados = (value) => {
    setCamaronesInfectados(String(value));
    limpiarMensaje();
  };

  const cambiarObservaciones = (value) => {
    setObservaciones(value);
    limpiarMensaje();
  };

  const validarFormulario = () => {
    const muestreados = Number(camaronesMuestreados);
    const infectados = Number(camaronesInfectados);

    return Boolean(
      finca &&
        estanque &&
        fechaReporte &&
        parasito &&
        camaronesMuestreados.trim() !== "" &&
        camaronesInfectados.trim() !== "" &&
        muestreados > 0 &&
        infectados >= 0 &&
        infectados <= muestreados
    );
  };

  function limpiarFormulario() {
    setFinca("");
    setEstanque("");
    setFechaReporte(obtenerFechaHoy());
    setParasito("");
    setCamaronesMuestreados("");
    setCamaronesInfectados("");
    setObservaciones("");
    setSubmitted(false);
  }

  async function registrarParasitologia() {
    setSubmitted(true);
    setMensaje("");

    if (!validarFormulario()) {
      const muestreados = Number(camaronesMuestreados);
      const infectados = Number(camaronesInfectados);

      if (
        camaronesMuestreados.trim() !== "" &&
        camaronesInfectados.trim() !== "" &&
        infectados > muestreados
      ) {
        setTipoMensaje("danger");
        setMensaje(
          "El numero de infectados no puede ser mayor que el numero de muestreados."
        );
        return;
      }

      setTipoMensaje("danger");
      setMensaje("Rellene los datos requeridos correctamente.");
      return;
    }

    const muestreados = Number(camaronesMuestreados);
    const infectados = Number(camaronesInfectados);

    const parasitologiaDTO = {
      fincaId: Number(finca),
      estanqueId: Number(estanque),
      fechaReporte: convertirFechaParaBackend(fechaReporte),
      responsable,
      parasito,
      camaronesMuestreados: muestreados,
      camaronesInfectados: infectados,
      observaciones: observaciones.trim() || null,
    };

    const nuevoRegistro = await guardarRegistro(parasitologiaDTO);

    if (!nuevoRegistro) return;

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
    camaronesMuestreados,
    camaronesInfectados,
    observaciones,

    opcionesFincas,
    opcionesEstanques,
    opcionesParasitos,

    placeholderFinca,
    placeholderEstanque,
    placeholderParasito,

    gradoCalculado,
    colorGrado,
    gridStyle,
    itemStyle,
    itemFullStyle,

    errorFinca,
    errorEstanque,
    errorFechaReporte,
    errorParasito,
    errorMuestreados,
    errorInfectados,

    mensaje,
    tipoMensaje,
    loading: loadingParasitologia || cargandoOpciones,

    cambiarFinca,
    setEstanque: cambiarEstanque,
    setFechaReporte: cambiarFechaReporte,
    setParasito: cambiarParasito,
    setCamaronesMuestreados: cambiarCamaronesMuestreados,
    setCamaronesInfectados: cambiarCamaronesInfectados,
    setObservaciones: cambiarObservaciones,
    registrarParasitologia,
  };
}