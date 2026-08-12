/**
 * ============================================================
 * HOOK USEDATOSBASEESTANQUE
 * ============================================================
 *
 * Rellena solo el formulario de Densidad Poblacional en cuanto el
 * usuario elige un estanque: trae del SQLite local el área del
 * estanque (en hectáreas) y la cantidad de siembra por m², y de
 * paso la cantidad de tiros recomendada y el área de atarraya
 * sugerida.
 *
 * RECONECTADO: la version "web" llamaba a
 * densidadPoblacionalService.getDatosBaseEstanque(idEstanque), un
 * endpoint HTTP que no tiene equivalente local. Ahora llama a
 * DensidadPoblacionalLocalService.obtenerDatosBaseEstanque(idEstanque),
 * que calcula lo mismo consultando SQLite directamente
 * (localApi.estanques + localApi.siembras): el área sale de
 * largo × ancho del estanque, la siembra por m² de la siembra
 * activa de ese estanque. La interfaz de este hook (parametros,
 * retorno, comportamiento de omitirPrimerValor) no cambia, asi que
 * useDensidadPoblacional.js / useEditarDensidad.js no necesitan
 * tocarse por este cambio.
 *
 * Los campos son de solo lectura en la pantalla. Si el estanque no
 * tiene una siembra real registrada, `cantidadSiembra` llega como
 * null y el formulario queda bloqueado para guardar hasta que exista
 * una siembra real.
 *
 * Sobre la pantalla de edición:
 * Al abrir un registro guardado, `estanque` se llena con el valor
 * que traía el registro. Ese primer valor NO debe disparar la
 * precarga, porque sobrescribiría el área y la siembra con las que
 * realmente se guardó el conteo (el estanque pudo haber cambiado de
 * siembra desde entonces). Para eso está `omitirPrimerValor`.
 *
 * Parámetros:
 * - estanque: id del estanque seleccionado (o null).
 * - alAplicar: callback que recibe los datos base calculados localmente.
 * - opciones.omitirPrimerValor: true en la pantalla de edición.
 *
 * Retorna:
 * - cargandoDatosBase: true mientras consulta SQLite.
 * - errorDatosBase: mensaje si la consulta falló, si no null.
 *
 * Ejemplo:
 * useDatosBaseEstanque(estanque, (datos) => {
 *   setAreaEstanque(String(datos.areaEstanque));
 * });
 */

import { useEffect, useRef, useState } from "react";
import DensidadPoblacionalLocalService from "../services/DensidadPoblacionalLocal.service";
import { localApi } from "../../../database/local/localApi.service";

export function useDatosBaseEstanque(estanque, alAplicar, opciones = {}) {
  const { omitirPrimerValor = false } = opciones;

  const [cargandoDatosBase, setCargandoDatosBase] = useState(false);
  const [errorDatosBase, setErrorDatosBase] = useState(null);

  /*
  El callback se guarda en un ref porque casi siempre llega como
  función inline: si entrara en las dependencias del useEffect,
  cambiaría de identidad en cada render y volvería a consultar SQLite
  una y otra vez.
  */
  const alAplicarRef = useRef(alAplicar);
  alAplicarRef.current = alAplicar;

  /*
  En edición, el primer estanque que llega es el del registro que se
  está abriendo. Se marca como ya procesado para no pisarle los
  valores guardados.
  */
  const primerValorProcesado = useRef(!omitirPrimerValor);

  useEffect(() => {
    if (!estanque) {
      return;
    }

    if (!primerValorProcesado.current) {
      primerValorProcesado.current = true;
      return;
    }

    let activo = true;

    setCargandoDatosBase(true);
    setErrorDatosBase(null);

    // Limpia los datos del estanque anterior mientras se calculan los nuevos.
    alAplicarRef.current?.({
      areaEstanque: null,
      cantidadSiembra: null,
      areaAtarrayaSugerida: null,
      tirosRecomendados: null,
    });

    (async () => {
      try {
        await localApi.inicializar();

        const datos = await DensidadPoblacionalLocalService.obtenerDatosBaseEstanque(estanque);

        if (!activo || !datos) return;

        const tieneSiembraReal =
          datos.cantidadSiembra !== null &&
          datos.cantidadSiembra !== undefined &&
          Number(datos.cantidadSiembra) > 0;

        if (!tieneSiembraReal) {
          setErrorDatosBase(
            "El estanque seleccionado no tiene una siembra real registrada. " +
            "Debe registrar una siembra antes de guardar la densidad poblacional."
          );
        }

        alAplicarRef.current?.(datos);
      } catch (error) {
        /*
        Si falla la precarga, los campos quedan vacios y el guardado
        se bloquea. El usuario debe volver a seleccionar el estanque
        o corregir el problema de los datos base.
        */
        if (activo) {
          setErrorDatosBase(
            error?.message || "No se pudieron cargar los datos del estanque."
          );
        }
      } finally {
        if (activo) setCargandoDatosBase(false);
      }
    })();

    return () => {
      activo = false;
    };
  }, [estanque]);

  return { cargandoDatosBase, errorDatosBase };
}

export default useDatosBaseEstanque;