/**
 * ============================================================
 * COMPONENTE RangeTrack
 * ============================================================
 *
 * Descripción:
 * Componente presentacional para barra de rango dinámica con slider
 * interactivo (PanResponder), zonas de indicación visual y alineación
 * dinámica de etiquetas de ticks (mínimo alineado a la derecha debajo de la barra).
 *
 * @dependencies RangeTrackStyles, COLORS, Text
 * @validations Restringe valores al rango min-max y aplica formato decimal.
 * @navigation N/A
 */

import { useMemo, useRef, useState } from 'react';
import { View, PanResponder } from 'react-native';
import Text from '../../../shared/components/Text';
import { COLORS } from '../../../theme/colors';
import { styles } from '../styles/RangeTrackStyles';

// Espacio minimo en pixeles entre dos etiquetas de tick para que no
// se pisen. Los extremos (min y max) siempre se muestran; las
// etiquetas del medio se ocultan si no alcanza el espacio.
const ESPACIO_MINIMO_TICK_PX = 28;

/**
 * Filtra los ticks del medio que quedarian demasiado cerca de otro
 * ya mostrado (o del ultimo tick), para evitar que las etiquetas de
 * texto se superpongan visualmente.
 * @param {Array<{pct:number,label:string}>} ticks - Ticks originales.
 * @param {number} anchoPx - Ancho medido de la barra en pixeles.
 * @returns {Array<{pct:number,label:string}>} Ticks a renderizar.
 */
function filtrarTicksSinColision(ticks, anchoPx) {
  if (!anchoPx || !ticks || ticks.length <= 2) {
    return ticks;
  }

  const ordenados = [...ticks].sort((a, b) => a.pct - b.pct);
  const posicionUltimoPx = ordenados[ordenados.length - 1].pct * anchoPx;

  const resultado = [];
  let posicionUltimoMostradoPx = -Infinity;

  ordenados.forEach((tick, indice) => {
    const posicionActualPx = tick.pct * anchoPx;
    const esPrimero = indice === 0;
    const esUltimo = indice === ordenados.length - 1;

    const espacioDesdeAnterior = posicionActualPx - posicionUltimoMostradoPx;
    const espacioHastaUltimo = esUltimo ? Infinity : posicionUltimoPx - posicionActualPx;

    const hayEspacio =
      espacioDesdeAnterior >= ESPACIO_MINIMO_TICK_PX &&
      espacioHastaUltimo >= ESPACIO_MINIMO_TICK_PX;

    if (esPrimero || esUltimo || hayEspacio) {
      resultado.push(tick);
      posicionUltimoMostradoPx = posicionActualPx;
    }
  });

  return resultado;
}

export default function RangeTrack({
  value,
  min,
  max,
  decimals = 1,
  zones = [],
  ticks = [],
  badgeColor = COLORS.primary,
  badgeText,
  onChange,
}) {
  const widthRef = useRef(0);
  const valueRef = useRef(value);
  const startValueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  valueRef.current = value;
  onChangeRef.current = onChange;

  // Ancho medido, en estado (ademas del ref) solo para poder
  // recalcular los ticks visibles cuando el layout esta listo.
  const [anchoBarra, setAnchoBarra] = useState(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startValueRef.current = valueRef.current;
      },
      onPanResponderMove: (_evt, gestureState) => {
        if (widthRef.current <= 0) return;
        const rango = max - min;
        const deltaValor = (gestureState.dx / widthRef.current) * rango;
        let siguiente = startValueRef.current + deltaValor;
        siguiente = Math.min(Math.max(siguiente, min), max);
        siguiente = parseFloat(siguiente.toFixed(decimals));
        onChangeRef.current?.(siguiente);
      },
    })
  ).current;

  const pct = Math.min(Math.max((value - min) / (max - min || 1), 0), 1);

  const ticksVisibles = useMemo(
    () => filtrarTicksSinColision(ticks, anchoBarra),
    [ticks, anchoBarra]
  );

  return (
    <View style={styles.container}>
      <View
        style={styles.trackWrapper}
        onLayout={(e) => {
          widthRef.current = e.nativeEvent.layout.width;
          setAnchoBarra(e.nativeEvent.layout.width);
        }}
      >
        <View style={styles.trackBackground}>
          {zones.map((z, i) => (
            <View
              key={i}
              style={[
                styles.zoneSegment,
                {
                  left: `${z.left * 100}%`,
                  width: `${z.width * 100}%`,
                  backgroundColor: z.color,
                },
              ]}
            />
          ))}
        </View>

        <View pointerEvents="none" style={[styles.badgeContainer, { left: `${pct * 100}%` }]}>
          <View style={[styles.badgeBox, { backgroundColor: badgeColor }]}>
            <Text size={12} color={COLORS.white} weight="700">{badgeText}</Text>
          </View>
          <View style={[styles.badgePointer, { borderTopColor: badgeColor }]} />
        </View>

        <View
          {...panResponder.panHandlers}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          style={[styles.thumb, { left: `${pct * 100}%`, borderColor: badgeColor }]}
        />
      </View>

      <View style={styles.ticksContainer}>
        {ticksVisibles.map((t, i) => {
          let translateX = '-50%';
          if (t.pct === 0) translateX = '0%';
          else if (t.pct === 1) translateX = '-100%';

          return (
            <Text
              key={i}
              size={10}
              color={COLORS.textQuaternary}
              style={[
                styles.tickText,
                { left: `${t.pct * 100}%`, transform: [{ translateX }] },
              ]}
            >
              {t.label}
            </Text>
          );
        })}
      </View>
    </View>
  );
}