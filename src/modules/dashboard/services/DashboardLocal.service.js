/*
//////////////////////////////////////////////////////////
CABEZA DE ARCHIVO
//////////////////////////////////////////////////////////
Archivo: DashboardLocal.service.js
Autor: Gerald
Fecha: 04/08/2026
Modulo: Dashboard
Descripcion:
Centraliza las consultas locales utilizadas por el Dashboard
leyendo los datos desde SQLite.
//////////////////////////////////////////////////////////
*/

import { localApi } from "../../../database/local/localApi.service";
import { getLecturasLocal } from "../../mantAgua/services/FisicoQuimicaLocalService";

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

const obtenerDataRespuesta = (respuesta) =>
  respuesta && Object.prototype.hasOwnProperty.call(respuesta, "data")
    ? respuesta.data
    : respuesta;

const obtenerListaSegura = (valor) => (Array.isArray(valor) ? valor : []);

const convertirNumero = (valor, valorDefecto = 0) => {
  const numero = Number(String(valor ?? "").replace(",", "."));

  return Number.isNaN(numero) ? valorDefecto : numero;
};

const convertirTexto = (valor, valorDefecto = "") =>
  valor === undefined || valor === null || String(valor).trim() === ""
    ? valorDefecto
    : String(valor).trim();

const capitalizar = (valor) => {
  const texto = convertirTexto(valor);

  return texto === "" ? "" : texto.charAt(0).toUpperCase() + texto.slice(1);
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
MAPEADORES LOCALES
//////////////////////////////////////////////////////////
*/

function mapearFinca(registro) {
  const servidorId = obtenerValor(registro, ["servidor_id", "servidorId"], null);

  const nombre = obtenerValor(
    registro,
    ["nombre", "nombre_finca", "nombreFinca"],
    "Finca sin nombre"
  );

  return {
    ...registro,
    id: obtenerValor(registro, ["id"], null),
    idLocal: obtenerValor(registro, ["id"], null),
    servidorId,
    servidor_id: servidorId,
    uuid: obtenerValor(registro, ["uuid"], ""),
    grupoDatos: obtenerValor(registro, ["grupo_datos", "grupoDatos"], null),
    grupo_datos: obtenerValor(registro, ["grupo_datos", "grupoDatos"], null),
    codigoCBO: obtenerValor(
      registro,
      ["codigo_cbo", "codigoCBO", "codigoCbo", "codigoInterno"],
      ""
    ),
    codigo_cbo: obtenerValor(
      registro,
      ["codigo_cbo", "codigoCBO", "codigoCbo", "codigoInterno"],
      ""
    ),
    nombre,
    nombreFinca: nombre,
    nombre_finca: nombre,
    canton: obtenerValor(registro, ["canton"], ""),
    provincia: obtenerValor(registro, ["provincia"], ""),
    areaTotal: convertirNumero(
      obtenerValor(registro, ["area_total", "areaTotal", "area"], 0),
      0
    ),
    area_total: convertirNumero(
      obtenerValor(registro, ["area_total", "areaTotal", "area"], 0),
      0
    ),
  };
}

function mapearEstanque(registro) {
  const servidorId = obtenerValor(registro, ["servidor_id", "servidorId"], null);

  const fincaId = obtenerValor(
    registro,
    ["finca_id", "fincaId", "idFinca"],
    null
  );

  const tipoEstanque = obtenerValor(
    registro,
    ["tipo_estanque", "tipoEstanque"],
    ""
  );

  const fuenteAgua = obtenerValor(
    registro,
    ["fuente_agua", "fuenteAgua"],
    ""
  );

  const fechaMantenimiento = obtenerValor(
    registro,
    ["fecha_mantenimiento", "fechaMantenimiento"],
    null
  );

  return {
    ...registro,
    id: obtenerValor(registro, ["id"], null),
    idLocal: obtenerValor(registro, ["id"], null),
    servidorId,
    servidor_id: servidorId,
    uuid: obtenerValor(registro, ["uuid"], ""),
    grupoDatos: obtenerValor(registro, ["grupo_datos", "grupoDatos"], null),
    grupo_datos: obtenerValor(registro, ["grupo_datos", "grupoDatos"], null),
    fincaId,
    idFinca: fincaId,
    finca_id: fincaId,
    codigo: obtenerValor(registro, ["codigo"], ""),
    tipoEstanque,
    tipo_estanque: tipoEstanque,
    estado: obtenerValor(registro, ["estado"], ""),
    largo: convertirNumero(obtenerValor(registro, ["largo"], 0), 0),
    ancho: convertirNumero(obtenerValor(registro, ["ancho"], 0), 0),
    profundidad: convertirNumero(
      obtenerValor(registro, ["profundidad"], 0),
      0
    ),
    fuenteAgua,
    fuente_agua: fuenteAgua,
    fechaMantenimiento,
    fecha_mantenimiento: fechaMantenimiento,
    precria: obtenerValor(registro, ["precria", "usaPrecria"], 0),
    usaPrecria: obtenerValor(registro, ["precria", "usaPrecria"], 0),
  };
}

function mapearAlimentacion(registro) {
  const fincaId = obtenerValor(
    registro,
    ["finca_id", "fincaId", "idFinca"],
    null
  );

  const estanqueId = obtenerValor(
    registro,
    ["estanque_id", "estanqueId", "idEstanque"],
    null
  );

  const cantidadKg = convertirNumero(
    obtenerValor(registro, ["cantidad_kg", "cantidadKg", "cantidad"], 0),
    0
  );

  const fecha = obtenerValor(
    registro,
    ["fecha", "fecha_registro", "fechaRegistro"],
    null
  );

  return {
    ...registro,
    id: obtenerValor(registro, ["id"], null),
    idLocal: obtenerValor(registro, ["id"], null),
    servidorId: obtenerValor(registro, ["servidor_id", "servidorId"], null),
    servidor_id: obtenerValor(registro, ["servidor_id", "servidorId"], null),
    fincaId,
    idFinca: fincaId,
    finca_id: fincaId,
    estanqueId,
    idEstanque: estanqueId,
    estanque_id: estanqueId,
    fecha,
    fechaRegistro: fecha,
    fecha_registro: fecha,
    cantidadKg,
    cantidad_kg: cantidadKg,
    cantidad: cantidadKg,
    hora: obtenerValor(registro, ["hora"], ""),
    timestamp: obtenerValor(
      registro,
      ["fecha_creacion", "fechaCreacion", "createdAt", "fecha"],
      fecha
    ),
  };
}

function mapearSiembra(registro) {
  const fincaId = obtenerValor(
    registro,
    ["finca_id", "fincaId", "idFinca"],
    null
  );

  const estanqueId = obtenerValor(
    registro,
    ["estanque_id", "estanqueId", "idEstanque"],
    null
  );

  const fechaSiembra = obtenerValor(
    registro,
    ["fecha_siembra", "fechaSiembra", "fecha"],
    null
  );

  const duracionCiclo = convertirNumero(
    obtenerValor(
      registro,
      ["duracion_ciclo", "duracionCiclo", "diasMaduracion", "duracionDias"],
      0
    ),
    0
  );

  return {
    ...registro,
    id: obtenerValor(registro, ["id"], null),
    idLocal: obtenerValor(registro, ["id"], null),
    servidorId: obtenerValor(registro, ["servidor_id", "servidorId"], null),
    servidor_id: obtenerValor(registro, ["servidor_id", "servidorId"], null),
    fincaId,
    idFinca: fincaId,
    finca_id: fincaId,
    estanqueId,
    idEstanque: estanqueId,
    estanque_id: estanqueId,
    fechaSiembra,
    fecha_siembra: fechaSiembra,
    duracionCiclo,
    duracion_ciclo: duracionCiclo,
    diasMaduracion: duracionCiclo,
    cantidadSembrada: convertirNumero(
      obtenerValor(registro, ["cantidad_sembrada", "cantidadSembrada"], 0),
      0
    ),
    cantidad_sembrada: convertirNumero(
      obtenerValor(registro, ["cantidad_sembrada", "cantidadSembrada"], 0),
      0
    ),
    densidadPoblacional: convertirNumero(
      obtenerValor(
        registro,
        ["densidad_poblacional", "densidadPoblacional"],
        0
      ),
      0
    ),
    densidad_poblacional: convertirNumero(
      obtenerValor(
        registro,
        ["densidad_poblacional", "densidadPoblacional"],
        0
      ),
      0
    ),
    estado: obtenerValor(registro, ["estado"], ""),
    timestamp: obtenerValor(
      registro,
      ["fecha_creacion", "fechaCreacion", "createdAt", "fechaSiembra"],
      fechaSiembra
    ),
  };
}

function mapearInventario(registro) {
  const productoId = obtenerValor(
    registro,
    ["producto_id", "productoId"],
    null
  );

  const proveedorId = obtenerValor(
    registro,
    ["proveedor_id", "proveedorId"],
    null
  );

  const nombre = obtenerValor(
    registro,
    ["nombre", "nombreProducto", "nombre_producto"],
    productoId ? `Producto ${productoId}` : "Producto sin nombre"
  );

  return {
    ...registro,
    id: obtenerValor(registro, ["id"], null),
    idLocal: obtenerValor(registro, ["id"], null),
    servidorId: obtenerValor(registro, ["servidor_id", "servidorId"], null),
    servidor_id: obtenerValor(registro, ["servidor_id", "servidorId"], null),
    productoId,
    producto_id: productoId,
    proveedorId,
    proveedor_id: proveedorId,
    nombre,
    nombreProducto: nombre,
    categoria: obtenerValor(registro, ["categoria"], "Sin categoria"),
    unidad: obtenerValor(registro, ["unidad"], "unidades"),
    cantidad: convertirNumero(obtenerValor(registro, ["cantidad"], 0), 0),
    stockMinimo: convertirNumero(
      obtenerValor(registro, ["stock_minimo", "stockMinimo"], 0),
      0
    ),
    stock_minimo: convertirNumero(
      obtenerValor(registro, ["stock_minimo", "stockMinimo"], 0),
      0
    ),
    precioUnidad: convertirNumero(
      obtenerValor(registro, ["precio_unidad", "precioUnidad"], 0),
      0
    ),
    precio_unidad: convertirNumero(
      obtenerValor(registro, ["precio_unidad", "precioUnidad"], 0),
      0
    ),
  };
}

function mapearEquipo(registro) {
  const fincaId = obtenerValor(
    registro,
    ["finca_id", "fincaId", "idFinca"],
    null
  );

  const estanqueId = obtenerValor(
    registro,
    ["estanque_id", "estanqueId", "idEstanque"],
    null
  );

  const nombre = obtenerValor(
    registro,
    ["nombre_equipo", "nombreEquipo", "nombre"],
    "Equipo"
  );

  const tipo = obtenerValor(
    registro,
    ["tipo_equipo", "tipoEquipo", "tipo"],
    "Otro"
  );

  const identificador = obtenerValor(
    registro,
    ["identificador", "serie"],
    ""
  );

  return {
    ...registro,
    id: obtenerValor(registro, ["id"], null),
    idLocal: obtenerValor(registro, ["id"], null),
    servidorId: obtenerValor(registro, ["servidor_id", "servidorId"], null),
    servidor_id: obtenerValor(registro, ["servidor_id", "servidorId"], null),
    fincaId,
    idFinca: fincaId,
    finca_id: fincaId,
    estanqueId,
    idEstanque: estanqueId,
    estanque_id: estanqueId,
    nombre,
    nombreEquipo: nombre,
    nombre_equipo: nombre,
    tipo,
    tipoEquipo: tipo,
    tipo_equipo: tipo,
    identificador,
    serie: identificador,
    horasMantenimiento: convertirNumero(
      obtenerValor(
        registro,
        ["horas_mantenimiento", "horasMantenimiento"],
        0
      ),
      0
    ),
    horas_mantenimiento: convertirNumero(
      obtenerValor(
        registro,
        ["horas_mantenimiento", "horasMantenimiento"],
        0
      ),
      0
    ),
    horasActuales: convertirNumero(
      obtenerValor(registro, ["horas_actuales", "horasActuales"], 0),
      0
    ),
    horas_actuales: convertirNumero(
      obtenerValor(registro, ["horas_actuales", "horasActuales"], 0),
      0
    ),
  };
}

function mapearEnfermedad(registro) {
  const fincaId = obtenerValor(
    registro,
    ["finca_id", "fincaId", "idFinca"],
    null
  );

  const estanqueId = obtenerValor(
    registro,
    ["estanque_id", "estanqueId", "idEstanque"],
    null
  );

  const fechaReporte = obtenerValor(
    registro,
    ["fecha_reporte", "fechaReporte", "fecha"],
    null
  );

  const enfermedad = obtenerValor(
    registro,
    ["enfermedad"],
    "Enfermedad registrada"
  );

  const severidad = obtenerValor(registro, ["severidad"], "");

  return {
    ...registro,
    id: obtenerValor(registro, ["id"], null),
    idLocal: obtenerValor(registro, ["id"], null),
    servidorId: obtenerValor(registro, ["servidor_id", "servidorId"], null),
    servidor_id: obtenerValor(registro, ["servidor_id", "servidorId"], null),
    fincaId,
    idFinca: fincaId,
    finca_id: fincaId,
    estanqueId,
    idEstanque: estanqueId,
    estanque_id: estanqueId,
    fechaReporte,
    fecha_reporte: fechaReporte,
    enfermedad,
    enfermedadNombre: capitalizar(enfermedad),
    severidad,
    severidadNombre: capitalizar(severidad),
    responsable: obtenerValor(registro, ["responsable"], ""),
    reporte: obtenerValor(registro, ["reporte"], ""),
    timestamp: obtenerValor(
      registro,
      ["fecha_creacion", "fechaCreacion", "createdAt", "fechaReporte"],
      fechaReporte
    ),
  };
}

function mapearParasitologia(registro) {
  const fincaId = obtenerValor(
    registro,
    ["finca_id", "fincaId", "idFinca"],
    null
  );

  const estanqueId = obtenerValor(
    registro,
    ["estanque_id", "estanqueId", "idEstanque"],
    null
  );

  const fechaReporte = obtenerValor(
    registro,
    ["fecha_reporte", "fechaReporte", "fecha"],
    null
  );

  const parasito = obtenerValor(registro, ["parasito"], "otro");

  const gradoInfeccion = obtenerValor(
    registro,
    ["grado_infeccion", "gradoInfeccion"],
    ""
  );

  return {
    ...registro,
    id: obtenerValor(registro, ["id"], null),
    idLocal: obtenerValor(registro, ["id"], null),
    servidorId: obtenerValor(registro, ["servidor_id", "servidorId"], null),
    servidor_id: obtenerValor(registro, ["servidor_id", "servidorId"], null),
    fincaId,
    idFinca: fincaId,
    finca_id: fincaId,
    estanqueId,
    idEstanque: estanqueId,
    estanque_id: estanqueId,
    fechaReporte,
    fecha_reporte: fechaReporte,
    parasito,
    parasitoNombre: capitalizar(parasito),
    gradoInfeccion,
    grado_infeccion: gradoInfeccion,
    nombreGrado: capitalizar(gradoInfeccion),
    responsable: obtenerValor(registro, ["responsable"], ""),
    observaciones: obtenerValor(registro, ["observaciones"], ""),
    timestamp: obtenerValor(
      registro,
      ["fecha_creacion", "fechaCreacion", "createdAt", "fechaReporte"],
      fechaReporte
    ),
  };
}

function mapearFisicoQuimico(registro) {
  const fincaId = obtenerValor(
    registro,
    ["finca_id", "fincaId", "idFinca"],
    null
  );

  const estanqueId = obtenerValor(
    registro,
    ["estanque_id", "estanqueId", "idEstanque"],
    null
  );

  const fecha = obtenerValor(
    registro,
    ["fecha", "fecha_registro", "fechaRegistro"],
    null
  );

  return {
    ...registro,
    id: obtenerValor(registro, ["id"], null),
    idLocal: obtenerValor(registro, ["id"], null),
    servidorId: obtenerValor(registro, ["servidor_id", "servidorId"], null),
    servidor_id: obtenerValor(registro, ["servidor_id", "servidorId"], null),
    fincaId,
    idFinca: fincaId,
    finca_id: fincaId,
    estanqueId,
    idEstanque: estanqueId,
    estanque_id: estanqueId,
    fecha,
    ph: obtenerValor(registro, ["ph"], []),
    salinidad: obtenerValor(registro, ["salinidad"], []),
    temperatura: obtenerValor(registro, ["temperatura"], []),
    oxigenoDisuelto: obtenerValor(
      registro,
      ["oxigenoDisuelto", "oxigeno_disuelto"],
      []
    ),
    oxigeno_disuelto: obtenerValor(
      registro,
      ["oxigenoDisuelto", "oxigeno_disuelto"],
      []
    ),
    timestamp: obtenerValor(
      registro,
      ["fecha_creacion", "fechaCreacion", "createdAt", "fecha"],
      fecha
    ),
  };
}

/*
//////////////////////////////////////////////////////////
RESUMENES LOCALES
//////////////////////////////////////////////////////////
*/

function contarFrecuencias(registros, campoPrincipal, campoAlterno = null) {
  const acumulado = registros.reduce((total, item) => {
    const valor = obtenerValor(
      item,
      campoAlterno ? [campoPrincipal, campoAlterno] : [campoPrincipal],
      ""
    );

    if (!valor) return total;

    total[valor] = total[valor] ? total[valor] + 1 : 1;

    return total;
  }, {});

  return Object.keys(acumulado)
    .map((valor) => ({
      valor,
      nombre: capitalizar(valor),
      cantidad: acumulado[valor],
      casos: acumulado[valor],
      total: acumulado[valor],
    }))
    .sort((a, b) => b.cantidad - a.cantidad);
}

async function getResumenEnfermedades() {
  const registros = await getEnfermedades();

  return {
    totalCasos: registros.length,
    totalRegistros: registros.length,
    enfermedadesFrecuentes: contarFrecuencias(registros, "enfermedad"),
    severidadesFrecuentes: contarFrecuencias(registros, "severidad"),
  };
}

async function getResumenParasitologias() {
  const registros = await getParasitologias();

  return {
    totalRegistros: registros.length,
    parasitosFrecuentes: contarFrecuencias(registros, "parasito"),
    gradosFrecuentes: contarFrecuencias(
      registros,
      "grado_infeccion",
      "gradoInfeccion"
    ),
  };
}

/*
//////////////////////////////////////////////////////////
CONSULTAS LOCALES
//////////////////////////////////////////////////////////
*/

async function getFincas() {
  const registros = await obtenerRegistrosLocales("fincas");

  return registros.map(mapearFinca);
}

async function getEstanques() {
  const registros = await obtenerRegistrosLocales("estanques");

  return registros.map(mapearEstanque);
}

async function getAlimentaciones() {
  const registros = await obtenerRegistrosLocales("alimentaciones");

  return registros.map(mapearAlimentacion);
}

async function getSiembras() {
  const registros = await obtenerRegistrosLocales("siembras");

  return registros.map(mapearSiembra);
}

async function getInventario() {
  const registros = await obtenerRegistrosLocales("inventario");

  return registros.map(mapearInventario);
}

async function getEquipos() {
  const registros = await obtenerRegistrosLocales("equipos");

  return registros.map(mapearEquipo);
}

async function getEnfermedades() {
  const registros = await obtenerRegistrosLocales("enfermedades");

  return registros.map(mapearEnfermedad);
}

async function getParasitologias() {
  const registros = await obtenerRegistrosLocales("parasitologias");

  return registros.map(mapearParasitologia);
}

async function getFisicoQuimicos() {
  const registros = await getLecturasLocal();

  return registros.map(mapearFisicoQuimico);
}

/*
//////////////////////////////////////////////////////////
EXPORT
//////////////////////////////////////////////////////////
*/

const DashboardLocalService = {
  getFincas,
  getEstanques,
  getAlimentaciones,
  getSiembras,
  getInventario,
  getEquipos,
  getEnfermedades,
  getResumenEnfermedades,
  getParasitologias,
  getResumenParasitologias,
  getFisicoQuimicos,
};

export default DashboardLocalService;