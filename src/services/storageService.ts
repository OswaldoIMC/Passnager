// ----- SERVICIO PARA LA COMUNICACION CON ASYNCSTORAGE -----
/**
 * KEYS.HASH_DATOS ->  { salt: string, verificationTag: string }
 *   El salt y el tag de verificación creados en el setup
 *   NO contienen la contraseña ni la clave directamente
 *
 * KEYS.CREDENCIALES  ->  Credencial[]  (array JSON)
 *   La lista de credenciales con la contraseña YA CIFRADA dentro de cada una
 *   Solo se puede leer con la clave maestra.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Credencial } from "../types";
import type { DatosHash } from "./cryptoService";

// ----- Claves de AsyncStorage -----

const KEYS = {
  /** Datos del hash maestro: { salt, verificationTag } */
  HASH_DATOS: "@passnager/hash_datos",

  /** Lista de credenciales encriptadas */
  CREDENCIALES: "@passnager/credenciales",
} as const;

// ----- StorageService -----
export class StorageService {
  // HASH MAESTRO (Setup / Login)

  /**
   * Guarda el salt y el verificationTag generados en el setup
   *
   * Se llama solo una vez, cuando el usuario crea su bóveda por primera vez
   *
   * Guarda:
   *     salt: bytes aleatorios necesarios para re-derivar la clave al login
   *     verificationTag: texto cifrado usado para verificar contraseñas
   */

  async guardarHashMaestro(datos: DatosHash): Promise<void> {
    await AsyncStorage.setItem(KEYS.HASH_DATOS, JSON.stringify(datos));
  }

  /**
   * Lee los datos del hash maestro guardados en el setup
   *
   * En SplashScreen: para saber si la boveda ya está configurada
   * En LoginBoveda: para obtener salt y verificationTag y verificar la contraseña
   *
   * @returns DatosHash si existe, null si la boveda no está configurada todavía
   */

  async cargarHashMaestro(): Promise<DatosHash | null> {
    const json = await AsyncStorage.getItem(KEYS.HASH_DATOS);
    if (!json) return null;
    return JSON.parse(json) as DatosHash;
  }

  /**
   * Verifica si existe el hash maestro en storage
   * Se usa en SplashScreen para decidir a que pantalla redirigir
   */

  async bovedaEstaConfigurada(): Promise<boolean> {
    const datos = await this.cargarHashMaestro();
    return datos !== null;
  }

  // ----- CREDENCIALES -----

  /**
   * Guarda la lista completa de credenciales encriptadas
   *
   * IMPORTANTE: Las contraseñas dentro de cada Credencial YA vienen cifradas
   * (el cifrado lo hace passwordService antes de llamar aquí)
   * Este método solo serializa a JSON y guarda
   *
   * @param credenciales Array completo de credenciales a guardar
   */

  async guardarCredenciales(credenciales: Credencial[]): Promise<void> {
    await AsyncStorage.setItem(KEYS.CREDENCIALES, JSON.stringify(credenciales));
  }

  /**
   * Lee la lista de credenciales encriptadas del storage
   *
   * @returns Array de credenciales (con contraseñas aun cifradas),
   *          o array vacio si no hay ninguna guardada
   */
  async cargarCredenciales(): Promise<Credencial[]> {
    const json = await AsyncStorage.getItem(KEYS.CREDENCIALES);
    if (!json) return [];
    return JSON.parse(json) as Credencial[];
  }

  // ----- LIMPIEZA -----

  /**
   * Elimina TODOS los datos de la app del storage
   *
   * Función de olvide mi contraseña (borra todo y permite setup nuevo)
   * Debugging / tests
   *
   * IMPORTANTE: el usuario perderá todas sus contraseñas guardadas
   */

  async limpiarTodo(): Promise<void> {
    await AsyncStorage.removeItem(KEYS.HASH_DATOS);
    await AsyncStorage.removeItem(KEYS.CREDENCIALES);
  }
}

// Exportamos singleton para toda la app
export const storageService = new StorageService();
