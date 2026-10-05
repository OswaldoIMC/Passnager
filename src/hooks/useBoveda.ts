// ----- HOOK PARA CENTRALIZAR LA LOGICA DE LA BOVEDA -----

import { useState, useCallback } from "react";
import { cryptoService } from "../services/cryptoService";
import { storageService } from "../services/storageService";

// ----- Constantes -----

/** Maximo de intentos de login antes de bloquear */
const MAX_INTENTOS = 5;

// ----- Tipos -----

export interface EstadoSesion {
  /** La sesion esta activa */
  estaDesbloqueada: boolean;

  /**
   * La clave derivada de 32 bytes en memoria
   * Solo esta disponible cuando estaDesbloqueada === true
   * La usaran passwordService para cifrar/descifrar credenciales
   */
  claveMaestra: Uint8Array | null;

  /** Cuantos intentos de login han fallado en esta sesion */
  intentosFallidos: number;

  /** Si llegamos al limite de intentos */
  estaBloqueada: boolean;

  /** Si hay una operacion async en curso para mostrar loading */
  cargando: boolean;
}

export interface AccionesBoveda {
  /**
   * Crea la boveda por primera vez
   * Deriva la clave, crea el hash maestro, lo guarda en storage
   * @returns true si se guardo correctamente
   */

  configurarBoveda: (contrasena: string) => Promise<boolean>;

  /**
   * Intenta desbloquear la boveda con la contraseña ingresada
   * @returns true si la contraseña es correcta, false si es incorrecta
   */

  intentarLogin: (contrasena: string) => Promise<boolean>;

  /**
   * Cierra la sesion: borra la clave de memoria y resetea el estado
   * La clave maestra desaparece de la RAM
   */

  cerrarSesion: () => void;
}

// ----- Hook -----

export function useBoveda(): EstadoSesion & AccionesBoveda {
  const [estaDesbloqueada, setEstaDesbloqueada] = useState(false);
  const [claveMaestra, setClaveMaestra] = useState<Uint8Array | null>(null);
  const [intentosFallidos, setIntentosFallidos] = useState(0);
  const [cargando, setCargando] = useState(false);

  const estaBloqueada = intentosFallidos >= MAX_INTENTOS;

  // --------------------------------------------------------------------------
  // configurarBoveda
  //
  // Llamado desde SetupBoveda cuando el usuario crea su contraseña maestra
  //
  //   1. Llama cryptoService.crearHashMaestro(contrasena)
  //        genera salt aleatorio, deriva clave con Argon2id, cifra el
  //        texto de verificación, devuelve {salt, verificationTag}
  //   2. Llama storageService.guardarHashMaestro(datos)
  //        persiste {salt, verificationTag} en AsyncStorage
  //   3. Retorna true si todo fue bien, false si hubo error
  // --------------------------------------------------------------------------

  const configurarBoveda = useCallback(
    async (contrasena: string): Promise<boolean> => {
      setCargando(true);
      try {
        const datos = await cryptoService.crearHashMaestro(contrasena);
        await storageService.guardarHashMaestro(datos);
        return true;
      } catch (e) {
        console.error("[useBoveda] Error en configurarBoveda:", e);
        return false;
      } finally {
        setCargando(false);
      }
    },
    [],
  );

  // --------------------------------------------------------------------------
  // intentarLogin
  //
  // Llamado desde LoginBoveda cuando el usuario ingresa su contraseña
  //
  //   1. Bloquea si ya alcanzamos MAX_INTENTOS
  //   2. Lee {salt, verificationTag} del storage
  //   3. Llama cryptoService.verificarContrasena(contrasena, salt, tag)
  //        re-deriva la clave con Argon2id usando el salt guardado
  //        intenta descifrar el verificationTag con esa clave
  //        si descifra OK: contraseña correcta
  //   4a. Si OK: guarda la clave en estado (claveMaestra), desbloquea
  //   4b. Si falla: incrementa intentosFallidos
  //   5. Retorna true/false para que LoginBoveda actualice la UI
  // --------------------------------------------------------------------------

  const intentarLogin = useCallback(
    async (contrasena: string): Promise<boolean> => {
      if (estaBloqueada) return false;

      setCargando(true);
      try {
        // Cargar datos del setup desde storage
        const hashDatos = await storageService.cargarHashMaestro();
        if (!hashDatos) {
          // La bóveda no está configurada (no debería pasar)
          return false;
        }

        // Verificar la contraseña
        const resultado = await cryptoService.verificarContrasena(
          contrasena,
          hashDatos.salt,
          hashDatos.verificationTag,
        );

        if (resultado.ok) {
          // Contraseña correcta: guardamos la clave en memoria y desbloqueamos
          setClaveMaestra(resultado.clave);
          setEstaDesbloqueada(true);
          setIntentosFallidos(0); // Resetear contador
          return true;
        } else {
          // Contraseña incorrecta: incrementar contador
          setIntentosFallidos((prev) => prev + 1);
          return false;
        }
      } catch (e) {
        console.error("[useBoveda] Error en intentarLogin:", e);
        setIntentosFallidos((prev) => prev + 1);
        return false;
      } finally {
        setCargando(false);
      }
    },
    [estaBloqueada],
  );

  // --------------------------------------------------------------------------
  // cerrarSesion
  //
  // Limpia la clave de la memoria RAM y resetea el estado de sesión
  // La clave derivada desaparece y ya no se puede acceder al la boveda
  //
  // Al setear claveMaestra(null), React elimina la referencia al Uint8Array
  // JavaScript/V8 marcará esa memoria para el garbage collector
  // Sin la clave, nadie puede descifrar las contraseñas guardadas en storage
  // --------------------------------------------------------------------------

  const cerrarSesion = useCallback((): void => {
    setClaveMaestra(null);
    setEstaDesbloqueada(false);
    // NO resetear intentosFallidos aqui para evitar que el usuario haga logout para resetear los intentos
  }, []);

  return {
    // Estado
    estaDesbloqueada,
    claveMaestra,
    intentosFallidos,
    estaBloqueada,
    cargando,
    // Acciones
    configurarBoveda,
    intentarLogin,
    cerrarSesion,
  };
}
