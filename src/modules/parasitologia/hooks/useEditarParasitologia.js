/**
 * ============================================================
 * HOOK DE EDICION DE PARASITOLOGIA
 * ============================================================
 *
 * Centraliza la logica para editar registros locales de
 * parasitologia usando SQLite.
 *
 * Carga fincas, estanques, catalogos y el registro seleccionado
 * desde la base local.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useState } from "react";

import { useError } from "../../../shared/context/ErrorContext";
import { localApi } from "../../../database/local/localApi.service";
import ParasitologiaLocalService from "../services/ParasitologiaLocal.service";

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

const obtenerDataRespuesta = (respuesta) =>
  respuesta && Object.prototype.hasOwnProperty.call(respuesta, "data")
    ? respuesta.data
    : respuesta;

const convertirNumero = (valor, valorDefecto = 0) => {
  const numero = Number(valor);

  return Number.isNaN(numero) ? valorDefecto : numero;
};

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
    obtenerValor(estanque, ["finca_id", "fincaId", "idFinca"], null) ??
      estanque?.finca?.id ??
      0
  );

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

const obtenerNombreEstanque = (item, id) =>
  obtenerValor(item, ["codigo", "nombre"], "") || `Estanque ${id}`;

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
HOOK PRINCIPAL
============================================================
*/

export default function useEditarParasitologia(registroId, onGuardado) {
  const { mostrarError } = useError();

  const [finca, setFinca] = useState("");
  const [estanque, setEstanque] = useState("");
  const [fechaReporte, setFechaReporte] = useState("");
  const [responsable, setResponsable] = useState("");
  const [parasito, setParasito] = useState("");
  const [camaronesMuestreados, setCamaronesMuestreados] = useState("");
  const [camaronesInfectados, setCamaronesInfectados] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const [fincas, setFincas] = useState([]);
  const [estanques, setEstanques] = useState([]);
  const [catalogo, setCatalogo] = useState([]);

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

        const [colaborador, fincasData, estanquesData, catalogoData] =
          await Promise.all([
            obtenerColaboradorActual(),
            obtenerRegistrosLocales("fincas"),
            obtenerRegistrosLocales("estanques"),
            ParasitologiaLocalService.getCatalogo(),
          ]);

        if (!activo) return;

        setResponsable(obtenerNombreResponsable(colaborador));
        setFincas(fincasData);
        setEstanques(estanquesData);
        setCatalogo(Array.isArray(catalogoData) ? catalogoData : []);
      } catch (error) {
        console.error("Error al cargar opciones locales de parasitologia", error);
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

  useEffect(() => {
    if (!registroId) {
      setCargandoRegistro(false);
      return;
    }

    let activo = true;

    async function cargarRegistro() {
      try {
        setCargandoRegistro(true);

        const registro = await ParasitologiaLocalService.getById(registroId);

        if (!activo || !registro) return;

        setFinca(String(registro.fincaId ?? ""));
        setEstanque(String(registro.estanqueId ?? ""));
        setFechaReporte(formatearFechaUI(registro.fechaReporte ?? ""));
        setResponsable(registro.responsable ?? "");
        setParasito(registro.parasito ?? "");
        setCamaronesMuestreados(String(registro.camaronesMuestreados ?? ""));
        setCamaronesInfectados(String(registro.camaronesInfectados ?? ""));
        setObservaciones(registro.observaciones ?? "");
      } catch (error) {
        console.error("Error al cargar parasitologia local", error);
        setTipoMensaje("danger");
        setMensaje("No se pudo cargar el registro.");
        mostrarError(error);
      } finally {
        if (activo) setCargandoRegistro(false);
      }
    }

    cargarRegistro();

    return () => {
      activo = false;
    };
  }, [registroId]);

  const muestreadosN = Number(camaronesMuestreados) || 0;
  const infectadosN = Number(camaronesInfectados) || 0;

  const porcentajeCalculado = muestreadosN > 0
    ? ((infectadosN / muestreadosN) * 100).toFixed(1)
    : "0.0";

  const porcentajeNum = Number(porcentajeCalculado)

  const nombreGrado =
    porcentajeNum >= 50 ? "Alto" :
      porcentajeNum >= 20 ? "Medio" :
        "Bajo";

  const descripcionGrado =
    porcentajeNum >= 50 ? "El nivel de infeccion requiere atencion inmediata." :
      porcentajeNum >= 20 ? "El nivel de infeccion requiere monitoreo cercano." :
        "El nivel de infeccion esta dentro de un rango aceptable.";

  const colorGrado =
    porcentajeNum >= 50 ? COLORS.error :
      porcentajeNum >= 20 ? COLORS.warning :
        COLORS.success;

  const gradoCalculado = {
    porcentaje: porcentajeCalculado,
    nombre: nombreGrado,
    descripcion: descripcionGrado,
  };

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
    () =>
      finca
        ? estanques
            .filter((item) => obtenerFincaIdEstanque(item) === Number(finca))
            .map((item) => {
              const id = obtenerIdEstanque(item);

              return {
                label: String(obtenerNombreEstanque(item, id)),
                value: String(id),
              };
            })
            .filter((item) => Number(item.value) > 0)
        : [],
    [estanques, finca]
  );

  const opcionesParasitos = useMemo(
    () => normalizarCatalogoParasitos(catalogo),
    [catalogo]
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

  const cambiarFinca = (value) => {
    setFinca(String(value));
    setEstanque("");
    setMensaje("");
  };

  const cambiarEstanque = (value) => {
    setEstanque(String(value));
    setMensaje("");
  };

  const cambiarFechaReporte = (value) => {
    setFechaReporte(value);
    setMensaje("");
  };

  const cambiarParasito = (value) => {
    setParasito(String(value));
    setMensaje("");
  };

  const cambiarCamaronesMuestreados = (value) => {
    setCamaronesMuestreados(String(value));
    setMensaje("");
  };

  const cambiarCamaronesInfectados = (value) => {
    setCamaronesInfectados(String(value));
    setMensaje("");
  };

  const cambiarObservaciones = (value) => {
    setObservaciones(value);
    setMensaje("");
  };

  const validarFormulario = () =>
    Boolean(
      finca &&
        estanque &&
        fechaReporte &&
        parasito &&
        camaronesMuestreados.trim() !== "" &&
        camaronesInfectados.trim() !== "" &&
        muestreadosN > 0 &&
        infectadosN >= 0 &&
        infectadosN <= muestreadosN
    );

  const registrarParasitologia = async () => {
    setSubmitted(true);
    setMensaje("");

    if (!validarFormulario()) {
      if (
        camaronesMuestreados.trim() !== "" &&
        camaronesInfectados.trim() !== "" &&
        infectadosN > muestreadosN
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

    setLoading(true);

    try {
      await ParasitologiaLocalService.update(registroId, {
        fincaId: Number(finca),
        estanqueId: Number(estanque),
        fechaReporte: convertirFechaParaBackend(fechaReporte),
        responsable,
        parasito,
        camaronesMuestreados: muestreadosN,
        camaronesInfectados: infectadosN,
        observaciones: observaciones.trim() || null,
      });

      setTipoMensaje("success");
      setMensaje("Parasitologia actualizada localmente.");

      if (typeof onGuardado === "function") {
        onGuardado();
      }
    } catch (error) {
      console.error("Error al actualizar parasitologia local", error);
      setTipoMensaje("danger");
      setMensaje(
        error?.message || "No se pudo actualizar la parasitologia local."
      );
      mostrarError(error);
    } finally {
      setLoading(false);
    }
  };

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

    gridStyle: undefined,
    itemStyle: undefined,
    itemFullStyle: undefined,

    errorFinca: submitted && !finca,
    errorEstanque: submitted && !estanque,
    errorFechaReporte: submitted && !fechaReporte,
    errorParasito: submitted && !parasito,
    errorMuestreados: submitted && Number(camaronesMuestreados) <= 0,
    errorInfectados:
      submitted &&
      (camaronesInfectados.trim() === "" ||
        Number(camaronesInfectados) < 0 ||
        Number(camaronesInfectados) > Number(camaronesMuestreados)),

    mensaje,
    tipoMensaje,

    loading: loading || cargandoOpciones,
    cargandoRegistro,

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