/*
//////////////////////////////////////////////////////////
CABEZA DE ARCHIVO
//////////////////////////////////////////////////////////
Archivo: FisicoQuimicaCatalogosLocal.service.js
Autor: Brandon Valdelomar
Fecha: 03/08/2026
Modulo: Fisico Quimica
Descripcion:
Carga las opciones locales de fincas y estanques desde
SQLite para el formulario de Fisico Quimica.
//////////////////////////////////////////////////////////
*/

import { localApi } from "../../../database/local/localApi.service";

/*
//////////////////////////////////////////////////////////
CONSTANTES
//////////////////////////////////////////////////////////
*/

const METODOS_LOCAL_API = {
  obtenerTodos: ["obtenerTodos", "getAll", "listar"],
};

/*
//////////////////////////////////////////////////////////
HELPERS GENERALES
//////////////////////////////////////////////////////////
*/

function obtenerDataRespuesta(respuesta) {
  if (
    respuesta &&
    Object.prototype.hasOwnProperty.call(respuesta, "data")
  ) {
    return respuesta.data;
  }

  return respuesta;
}

function obtenerListaSegura(valor) {
  return Array.isArray(valor) ? valor : [];
}

function obtenerValor(objeto, llaves, valorDefecto = null) {
  if (!objeto) {
    return valorDefecto;
  }

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

async function ejecutarMetodoLocal(seccion, tipoMetodo, argumentos = []) {
  const apiSeccion = localApi[seccion];

  if (!apiSeccion) {
    return [];
  }

  const nombres = METODOS_LOCAL_API[tipoMetodo] || [];

  for (let i = 0; i < nombres.length; i += 1) {
    const nombreMetodo = nombres[i];

    if (typeof apiSeccion[nombreMetodo] === "function") {
      return await apiSeccion[nombreMetodo](...argumentos);
    }
  }

  return [];
}

async function obtenerRegistrosLocales(seccion) {
  await localApi.inicializar();

  const respuesta = await ejecutarMetodoLocal(seccion, "obtenerTodos");
  const data = obtenerDataRespuesta(respuesta);

  return obtenerListaSegura(data);
}

/*
//////////////////////////////////////////////////////////
HELPERS DE FINCAS
//////////////////////////////////////////////////////////
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

function obtenerIdsValidosDeFincaSeleccionada(
  fincas,
  fincaSeleccionada
) {
  const fincaActual = obtenerListaSegura(fincas).find(function (finca) {
    return (
      obtenerIdLocalFinca(finca) ===
      obtenerNumero(fincaSeleccionada)
    );
  });

  if (!fincaActual) {
    return [];
  }

  return [
    obtenerIdLocalFinca(fincaActual),
  ];
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
//////////////////////////////////////////////////////////
HELPERS DE ESTANQUES
//////////////////////////////////////////////////////////
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

function obtenerNombreEstanque(estanque, id) {
  const codigo = obtenerTexto(
    obtenerValor(
      estanque,
      ["codigo", "nombre", "estanqueCodigo"],
      ""
    ),
    `Estanque ${id}`
  );

  const tipo = obtenerTexto(
    obtenerValor(
      estanque,
      ["tipoEstanque", "tipo_estanque"],
      ""
    )
  );

  return tipo !== "" ? `${codigo} (${tipo})` : codigo;
}

function estanquePerteneceAFinca(estanque, idsValidosFinca) {
  const fincaIdEstanque = obtenerFincaIdEstanque(estanque);

  return idsValidosFinca.includes(fincaIdEstanque);
}

/*
//////////////////////////////////////////////////////////
FUNCIONES EXPORTADAS
//////////////////////////////////////////////////////////
*/

export async function obtenerOpcionesFincasLocal() {
  const fincas = await obtenerRegistrosLocales("fincas");

  return fincas
    .map(function (finca) {
      const id = obtenerIdFinca(finca);

      return {
        label: obtenerNombreFinca(finca, id),
        value: String(id),
        id,
        idLocal: obtenerIdLocalFinca(finca),
        servidorId: obtenerServidorIdFinca(finca),
        data: finca,
      };
    })
    .filter(function (item) {
      return Number(item.value) > 0;
    });
}

export async function obtenerEstanquesPorFincaLocal(fincaId) {
  if (!fincaId) {
    return [];
  }

  await localApi.inicializar();

  const [fincas, estanques] = await Promise.all([
    obtenerRegistrosLocales("fincas"),
    obtenerRegistrosLocales("estanques"),
  ]);

  const idsValidosFinca = obtenerIdsValidosDeFincaSeleccionada(
    fincas,
    fincaId
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
        id,
        fincaId: obtenerFincaIdEstanque(estanque),
        data: estanque,
      };
    })
    .filter(function (item) {
      return Number(item.value) > 0;
    });
}

const FisicoQuimicaCatalogosLocalService = {
  obtenerOpcionesFincasLocal,
  obtenerEstanquesPorFincaLocal,
};

export default FisicoQuimicaCatalogosLocalService;