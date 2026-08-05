/**
 * devSeed.js — SOLO PARA PRUEBAS LOCALES
 * Inserta un colaborador de prueba en SQLite con un PIN conocido,
 * para poder probar el flujo de login offline sin depender del sync real.
 *
 * ⚠️ Borrar este archivo (y cualquier botón que lo invoque) antes de mergear.
 */

import bcrypt from 'bcryptjs';
import { localApi } from './localApi.service';

export const sembrarColaboradorPrueba = async () => {
  await localApi.inicializar();

  const pinHash = bcrypt.hashSync('1234', 10); // PIN de prueba: 1234

  const resultado = await localApi.colaboradores.crear({
    grupo_datos: 1,
    finca_id: null,
    rol_id: 1,
    nombre: 'Juan',
    apellidos: 'Pérez',
    cedula: '123456789',
    telefono: '88888888',
    email: 'juan@test.com',
    nombre_usuario: 'jperez',
    pin_hash: pinHash,
    tipo_colaborador: 'caprocam_collab',
  });

  console.log('Colaborador de prueba creado:', resultado);
  return resultado;
};