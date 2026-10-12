/**
 * ============================================================
 * HOOK: useDetalleReporte (LOCAL / SQLite)
 * ============================================================
 * Carga catalogos y filtros desde localApi.
 * Inicializa SQLite, mapea ids y nombres de finca/estanque.
 */

import { useEffect, useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";

import { localApi } from "../../../database/local/localApi.service";
import { obtenerDetalleReporte } from "../services/detalleReporte.service";
import { TIPOS_AUTOGESTIONADOS } from "../constants/tipoReporte.js";

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

async function obtenerRegistrosLocales(seccion) {
  const apiSeccion = localApi[seccion];

  if (!apiSeccion || typeof apiSeccion.obtenerTodos !== "function") {
    throw new Error(`localApi.${seccion}.obtenerTodos no esta disponible.`);
  }

  const respuesta = await apiSeccion.obtenerTodos();
  const data = obtenerDataRespuesta(respuesta);

  return Array.isArray(data) ? data : [];
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
      ["idLocal", "id_local", "id", "value"],
      0
    )
  );
}

function obtenerServidorIdFinca(finca) {
  return obtenerNumero(
    obtenerValor(
      finca,
      ["servidorId", "servidor_id", "idServidor"],
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

function obtenerNombreFinca(item, id) {
  return obtenerTexto(
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
    ),
    `Finca ${id}`
  );
}

/*
============================================================
HELPERS DE ESTANQUES
============================================================
*/

function obtenerIdLocalEstanque(estanque) {
  return obtenerNumero(
    obtenerValor(
      estanque,
      ["idLocal", "id_local", "id", "value"],
      0
    )
  );
}

function obtenerServidorIdEstanque(estanque) {
  return obtenerNumero(
    obtenerValor(
      estanque,
      ["servidorId", "servidor_id", "idServidor"],
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

function obtenerIdsValidosEstanque(estanque, estanqueSeleccionado = null) {
  const ids = [
    obtenerNumero(estanqueSeleccionado),
    obtenerIdLocalEstanque(estanque),
    obtenerServidorIdEstanque(estanque),
  ];

  return ids.filter(function (id, index, arreglo) {
    return id > 0 && arreglo.indexOf(id) === index;
  });
}

function estanqueCoincideConSeleccion(estanque, estanqueSeleccionado) {
  const idsValidos = obtenerIdsValidosEstanque(
    estanque,
    estanqueSeleccionado
  );

  return idsValidos.includes(obtenerNumero(estanqueSeleccionado));
}

function obtenerFincaIdEstanque(estanque) {
  return obtenerNumero(
    obtenerValor(
      estanque,
      ["fincaId", "finca_id", "idFinca", "id_finca"],
      0
    )
  );
}

function estanquePerteneceAFinca(estanque, idsValidosFinca) {
  const fincaIdEstanque = obtenerFincaIdEstanque(estanque);

  return idsValidosFinca.includes(fincaIdEstanque);
}

function obtenerNombreEstanque(item, id) {
  return obtenerTexto(
    obtenerValor(
      item,
      ["codigo", "nombre", "codigoEstanque", "estanqueCodigo"],
      ""
    ),
    `Estanque ${id}`
  );
}

/*
============================================================
HELPERS DE COLABORADORES
============================================================
*/

function obtenerIdColaborador(colaborador) {
  const idLocal = obtenerNumero(
    obtenerValor(
      colaborador,
      ["id", "idLocal", "id_local"],
      0
    )
  );

  const servidorId = obtenerNumero(
    obtenerValor(
      colaborador,
      ["servidor_id", "servidorId", "idServidor"],
      0
    )
  );

  if (idLocal > 0) {
    return idLocal;
  }

  return servidorId;
}

function obtenerNombreColaborador(item, id) {
  const nombre = obtenerTexto(obtenerValor(item, ["nombre"], ""));
  const apellidos = obtenerTexto(obtenerValor(item, ["apellidos", "apellido"], ""));
  const completo = `${nombre} ${apellidos}`.trim();

  return completo ||
    obtenerTexto(
      obtenerValor(item, ["nombreUsuario", "nombre_usuario"], ""),
      `Colaborador ${id}`
    );
}

/*
============================================================
HELPERS PARA RELACIONAR REGISTROS
============================================================
*/

function obtenerFincaIdRegistro(registro) {
  return obtenerNumero(
    obtenerValor(
      registro,
      ["finca_id", "fincaId", "idFinca", "finca"],
      0
    )
  );
}

function obtenerEstanqueIdRegistro(registro) {
  return obtenerNumero(
    obtenerValor(
      registro,
      ["estanque_id", "estanqueId", "idEstanque", "estanque"],
      0
    )
  );
}

function obtenerColaboradorIdRegistro(registro) {
  return obtenerNumero(
    obtenerValor(
      registro,
      ["colaborador_id", "colaboradorId", "idColaborador", "creado_por_colaborador_id"],
      0
    )
  );
}

function buscarFincaPorRegistro(fincas, registro) {
  const fincaIdRegistro = obtenerFincaIdRegistro(registro);

  return fincas.find(function (finca) {
    const idsValidos = obtenerIdsValidosFinca(finca);

    return idsValidos.includes(fincaIdRegistro);
  });
}

function buscarEstanquePorRegistro(estanques, registro) {
  const estanqueIdRegistro = obtenerEstanqueIdRegistro(registro);

  return estanques.find(function (estanque) {
    const idsValidos = obtenerIdsValidosEstanque(estanque);

    return idsValidos.includes(estanqueIdRegistro);
  });
}

function buscarColaboradorPorRegistro(colaboradores, registro) {
  const colaboradorIdRegistro = obtenerColaboradorIdRegistro(registro);

  return colaboradores.find(function (colaborador) {
    return Number(colaborador.value) === colaboradorIdRegistro;
  });
}

/*
============================================================
HOOK PRINCIPAL
============================================================
*/

export function useDetalleReporte() {
  const router = useRouter();
  const { alert: alertParam } = useLocalSearchParams();

  const [registroTipo, setRegistroTipo] = useState(null);

  const [finca, setFinca] = useState(null);
  const [estanque, setEstanque] = useState(null);

  const [fincas, setFincas] = useState([]);
  const [estanques, setEstanques] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [estanquesFiltrados, setEstanquesFiltrados] = useState([]);

  const [alert, setAlert] = useState(null);
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cargandoCatalogos, setCargandoCatalogos] = useState(true);

  const filtrosCompletos = !!registroTipo && !!finca && !!estanque;

  /*
  ============================================================
  ALERTA DESDE PARAMETRO
  ============================================================
  */

  useEffect(() => {
    if (alertParam === "edited") {
      setAlert("edited");
      router.setParams({
        alert: undefined,
      });
    }
  }, [alertParam, router]);

  /*
  ============================================================
  CARGA DE CATALOGOS
  ============================================================
  */

  useEffect(() => {
    let activo = true;

    async function cargarCatalogos() {
      try {
        setCargandoCatalogos(true);

        if (typeof localApi.inicializar === "function") {
          await localApi.inicializar();
        }

        const [
          fincasData,
          estanquesData,
          colaboradoresData,
        ] = await Promise.all([
          obtenerRegistrosLocales("fincas"),
          obtenerRegistrosLocales("estanques"),
          obtenerRegistrosLocales("colaboradores"),
        ]);

        if (!activo) {
          return;
        }

        const fincasOptions = fincasData
          .map(function (item) {
            const id = obtenerIdFinca(item);

            return {
              label: obtenerNombreFinca(item, id),
              value: String(id),
              id,
              idLocal: obtenerIdLocalFinca(item),
              servidorId: obtenerServidorIdFinca(item),
              data: item,
            };
          })
          .filter(function (item) {
            return Number(item.value) > 0;
          });

        const estanquesOptions = estanquesData
          .map(function (item) {
            const id = obtenerIdEstanque(item);

            return {
              label: obtenerNombreEstanque(item, id),
              value: String(id),
              id,
              idLocal: obtenerIdLocalEstanque(item),
              servidorId: obtenerServidorIdEstanque(item),
              fincaId: obtenerFincaIdEstanque(item),
              data: item,
            };
          })
          .filter(function (item) {
            return Number(item.value) > 0;
          });

        const colaboradoresOptions = colaboradoresData
          .map(function (item) {
            const id = obtenerIdColaborador(item);

            return {
              value: String(id),
              label: obtenerNombreColaborador(item, id),
              id,
              data: item,
            };
          })
          .filter(function (item) {
            return Number(item.value) > 0;
          });

        setFincas(fincasOptions);
        setEstanques(estanquesOptions);
        setColaboradores(colaboradoresOptions);
      } catch (error) {
        if (activo) {
          setFincas([]);
          setEstanques([]);
          setColaboradores([]);
        }
      } finally {
        if (activo) {
          setCargandoCatalogos(false);
        }
      }
    }

    cargarCatalogos();

    return () => {
      activo = false;
    };
  }, []);

  /*
  ============================================================
  FILTRO DE ESTANQUES POR FINCA
  ============================================================
  */

  useEffect(() => {
    if (!finca) {
      setEstanquesFiltrados([]);
      setEstanque(null);
      return;
    }

    const idsValidosFinca = obtenerIdsValidosDeFincaSeleccionada(
      fincas,
      finca
    );

    const filtrados = estanques.filter(function (item) {
      return estanquePerteneceAFinca(item, idsValidosFinca);
    });

    setEstanquesFiltrados(filtrados);
    setEstanque(null);
  }, [finca, fincas, estanques]);

  /*
  ============================================================
  CARGA DE REGISTROS
  ============================================================
  */

  useEffect(() => {
    let activo = true;

    async function cargarRegistros() {
      if (!filtrosCompletos) {
        setRegistros([]);
        return;
      }

      if (TIPOS_AUTOGESTIONADOS.includes(registroTipo)) {
        setRegistros([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const registrosData = await obtenerDetalleReporte({
          tipoRegistro: registroTipo,
          fincaId: finca,
          estanqueId: estanque,
        });

        if (!activo) {
          return;
        }

        const registrosConNombres = (registrosData || []).map(function (registro) {
          const fincaEncontrada = buscarFincaPorRegistro(fincas, registro);
          const estanqueEncontrado = buscarEstanquePorRegistro(estanques, registro);
          const colaboradorEncontrado = buscarColaboradorPorRegistro(
            colaboradores,
            registro
          );

          return {
            ...registro,
            nombreFinca: fincaEncontrada?.label ?? "No encontrada",
            codigoEstanque: estanqueEncontrado?.label ?? "No encontrado",
            nombreColaborador: colaboradorEncontrado?.label ?? "No encontrado",
          };
        });

        setRegistros(registrosConNombres);
      } catch (error) {
        if (activo) {
          setRegistros([]);
        }
      } finally {
        if (activo) {
          setLoading(false);
        }
      }
    }

    cargarRegistros();

    return () => {
      activo = false;
    };
  }, [
    registroTipo,
    finca,
    estanque,
    fincas,
    estanques,
    colaboradores,
    filtrosCompletos,
  ]);

  return {
    registroTipo,

    finca,
    estanque,

    fincas,
    estanques,
    colaboradores,
    estanquesFiltrados,

    registros,
    loading,
    cargandoCatalogos,

    filtrosCompletos,

    setRegistroTipo,
    setFinca,
    setEstanque,

    alert,
    setAlert,
  };
}