/**
 * ============================================================
 * HOOK USEFINCAESTANQUERALEO
 * ============================================================
 *
 * carga de opciones de finca y estanque transformando datos para el Select del form
 *
 * Trabaja con SQLite para fincas, estanques y raleo.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useState } from "react";
import { localApi } from "../../../database/local/localApi.service";

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
HELPERS GENERALES
============================================================
*/

const primeraMayuscula = (texto) =>
  texto ? texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase() : "";

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

export function useFincaEstanqueDensidad(
  idFincaSeleccionada
) {
  const [fincas, setFincas] = useState([]);
  const [estanques, setEstanques] = useState([]);
  const [loadingCatalogos, setLoadingCatalogos] = useState(true);
  const [errorCatalogos, setErrorCatalogos] = useState(null);

  /*
  ============================================================
  CARGA INICIAL DE SQLITE
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
          respuestaFincas,
          respuestaEstanques,
        ] = await Promise.all([
        ejecutarMetodoLocal("fincas","obtenerTodos"),
        ejecutarMetodoLocal("estanques","obtenerTodos"),
        ]);
        const fincasLocales = obtenerDataRespuesta(respuestaFincas);
        const estanquesLocales = obtenerDataRespuesta(respuestaEstanques);

        if (!activo) return;
        setFincas(
          Array.isArray(fincasLocales)
            ? fincasLocales
            : []
        );
        setEstanques(
          Array.isArray(estanquesLocales)
            ? estanquesLocales
            : []
        );
      } catch(error) {
        console.error("Error cargando fincas y estanques:",error);
        if (activo) {
        setErrorCatalogos("No se pudieron cargar fincas y estanques.");
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
  OPCIONES PARA SELECT FINCAS
  ============================================================
  */
  const fincasOptions = useMemo(
    () =>
      fincas
        .map((finca) => {
          const id =
            obtenerIdFinca(finca);
          return {
            label:
              obtenerNombreFinca(finca,id),
            value:
              String(id),
          };
        })
        .filter(
          (item) =>
            Number(item.value) > 0
        ),
    [fincas]
  );
  /*
  ============================================================
  OPCIONES PARA SELECT ESTANQUES
  ============================================================
  */
  const estanquesOptions = useMemo(
    () => {
      if (!idFincaSeleccionada) {
        return [];
      }
      return estanques
        .filter((estanque) => {
          return (
            obtenerFincaIdEstanque(estanque)
            ===
            Number(idFincaSeleccionada)
          );
        })
        .map((estanque) => {
          const id =
            obtenerIdEstanque(estanque);
          return {
            label:
              obtenerNombreEstanque(
                estanque,
                id
              ),
            value:
              String(id),
          };
        })
        .filter(
          (item) =>
            Number(item.value) > 0
        );
    },
    [
      estanques,
      idFincaSeleccionada
    ]
  );
  return {
    fincasOptions,
    estanquesOptions,
    loadingCatalogos,
    errorCatalogos,
  };
}
export default useFincaEstanqueDensidad;