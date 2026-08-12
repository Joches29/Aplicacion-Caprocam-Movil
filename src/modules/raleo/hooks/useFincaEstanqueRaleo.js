/**
 * ============================================================
 * HOOK USEFINCAESTANQUERALEO
 * ============================================================
 *
 * Carga de opciones de finca y estanque transformando datos para
 * el Select del form.
 *
 * Trabaja con SQLite para fincas y estanques (localApi.fincas /
 * localApi.estanques), no con el backend HTTP directamente.
 *
 * RECONECTADO: la version "web" de este hook usaba fincaService /
 * estanqueService (HTTP). Se restaura el patron local (localApi +
 * ejecutarMetodoLocal), igual que el resto del modulo de Raleo,
 * ya que la app debe poder registrar/editar raleos sin conexion.
 */
import { useEffect, useMemo, useState } from "react";
import { localApi } from "../../../database/local/localApi.service";

/*
============================================================
CONSTANTES
============================================================
*/

const METODOS_LOCAL_API = {
  obtenerTodos: ["obtenerTodos", "getAll", "listar"],
};

/*
============================================================
HELPERS GENERALES
============================================================
*/

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
HOOK PRINCIPAL
============================================================
*/

export function useFincaEstanqueRaleo(
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
          ejecutarMetodoLocal("fincas", "obtenerTodos"),
          ejecutarMetodoLocal("estanques", "obtenerTodos"),
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
      } catch (error) {
        console.error("Error cargando fincas y estanques:", error);
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
              obtenerNombreFinca(finca, id),
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
export default useFincaEstanqueRaleo;