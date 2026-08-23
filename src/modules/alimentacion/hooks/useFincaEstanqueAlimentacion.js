/**
 * ============================================================
 * HOOK USEFINCAESTANQUEALIMENTACION
 * ============================================================
 *
 * Carga de opciones de finca y estanque transformando datos
 * para el Select del formulario.
 *
 * Trabaja con SQLite para fincas, estanques y alimentacion.
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
      objeto[llave] !== null &&
      String(objeto[llave]).trim() !== ""
    ) {
      return objeto[llave];
    }
  }

  return valorDefecto;
}

function obtenerNumero(valor, valorDefecto = 0) {
  const numero = Number(String(valor ?? "").replace(",", "."));

  return Number.isNaN(numero) ? valorDefecto : numero;
}

function obtenerTexto(valor, valorDefecto = "") {
  if (
    valor === undefined ||
    valor === null ||
    String(valor).trim() === ""
  ) {
    return valorDefecto;
  }

  return String(valor).trim();
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
HELPERS DE FINCAS
============================================================
*/

function obtenerIdLocalFinca(finca) {
  return obtenerNumero(
    obtenerValor(
      finca,
      ["id", "idLocal", "id_local"],
      0
    )
  );
}

function obtenerServidorIdFinca(finca) {
  return obtenerNumero(
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
    obtenerNumero(fincaSeleccionada),
    obtenerIdLocalFinca(finca),
    obtenerServidorIdFinca(finca),
  ];

  return ids.filter(function (id, index, arreglo) {
    return id > 0 && arreglo.indexOf(id) === index;
  });
}

function fincaCoincideConSeleccion(finca, fincaSeleccionada) {
  const idsValidos = obtenerIdsValidosFinca(finca, fincaSeleccionada);

  return idsValidos.includes(obtenerNumero(fincaSeleccionada));
}

function obtenerIdsValidosDeFincaSeleccionada(fincas, fincaSeleccionada) {
  const fincaActual = fincas.find(function (finca) {
    return fincaCoincideConSeleccion(finca, fincaSeleccionada);
  });

  return obtenerIdsValidosFinca(fincaActual, fincaSeleccionada);
}

function obtenerNombreFinca(finca, id) {
  return obtenerTexto(
    obtenerValor(
      finca,
      [
        "nombreFinca",
        "nombre_finca",
        "nombre",
        "codigoCBO",
        "codigoCbo",
        "codigo_cbo",
      ],
      ""
    ),
    `Finca ${id}`
  );
}

/*
============================================================
HELPERS DE ESTANQUES
============================================================
*/

function obtenerIdEstanque(estanque) {
  const idLocal = obtenerNumero(
    obtenerValor(
      estanque,
      ["id", "idLocal", "id_local"],
      0
    )
  );

  const servidorId = obtenerNumero(
    obtenerValor(
      estanque,
      ["servidor_id", "servidorId", "idServidor"],
      0
    )
  );

  if (idLocal > 0) {
    return idLocal;
  }

  return servidorId;
}

function obtenerFincaIdEstanque(estanque) {
  return obtenerNumero(
    obtenerValor(
      estanque,
      ["finca_id", "fincaId", "idFinca", "id_finca"],
      0
    )
  );
}

function estanquePerteneceAFinca(estanque, idsValidosFinca) {
  const fincaIdEstanque = obtenerFincaIdEstanque(estanque);

  return idsValidosFinca.includes(fincaIdEstanque);
}

function obtenerNombreEstanque(estanque, id) {
  return obtenerTexto(
    obtenerValor(
      estanque,
      ["codigo", "nombre", "estanqueCodigo"],
      ""
    ),
    `Estanque ${id}`
  );
}

/*
============================================================
HOOK PRINCIPAL
============================================================
*/

export function useFincaEstanqueAlimentacion(idFincaSeleccionada) {
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
        .map(function (finca) {
          const id = obtenerIdFinca(finca);

          return {
            label: obtenerNombreFinca(finca, id),
            value: String(id),
          };
        })
        .filter(function (item) {
          return Number(item.value) > 0;
        }),
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

      const idsValidosFinca = obtenerIdsValidosDeFincaSeleccionada(
        fincas,
        idFincaSeleccionada
      );

      return estanques
        .filter(function (estanque) {
          return estanquePerteneceAFinca(estanque, idsValidosFinca);
        })
        .map(function (estanque) {
          const id = obtenerIdEstanque(estanque);

          return {
            label: obtenerNombreEstanque(estanque, id),
            value: String(id),
          };
        })
        .filter(function (item) {
          return Number(item.value) > 0;
        });
    },
    [
      fincas,
      estanques,
      idFincaSeleccionada,
    ]
  );

  return {
    fincasOptions,
    estanquesOptions,
    loadingCatalogos,
    errorCatalogos,
  };
}

export default useFincaEstanqueAlimentacion;