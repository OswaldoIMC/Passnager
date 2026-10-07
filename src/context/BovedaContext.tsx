// ----- CONTEXTO GLOBAL PARA LA SESION DE LA BOVEDA -----
/**
 * Mantiene el estado de la sesion activa en memoria RAM:
 * - estaDesbloqueada: boolean
 * - claveMaestra: Uint8Array | null (NUNCA se almacena)
 * - intentosFallidos / estaBloqueada
 *
 * Permite que LoginBoveda guarde la claveMaestra al autenticarse,
 * y que VaultScreen y PasswordService la usen para descifrar contraseñas
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react";
import { cryptoService } from "../services/cryptoService";
import { storageService } from "../services/storageService";

// ----- Constantes -----
const MAX_INTENTOS = 5;

// ----- Tipos -----
export interface EstadoSesion {
  estaDesbloqueada: boolean; // Sesion activa
  claveMaestra: Uint8Array | null; // Clave derivada de 32 bytes en RAM
  intentosFallidos: number; // Intentos fallidos del login
  estaBloqueada: boolean; // Bloqueo por limite de intentos
  cargando: boolean; // Estado de carga de operaciones asincronas de criptografia
}

export interface AccionesBoveda {
  /**
   * Crea la boveda por primera vez
   * Deriva la clave con Argon2id y guarda el hash/salt en AsyncStorage
   */
  configurarBoveda: (contrasena: string) => Promise<boolean>;

  /**
   * Intenta autenticar al usuario y desbloquear la boveda
   * Si es exitoso, guarda la claveMaestra en RAM
   */
  intentarLogin: (contrasena: string) => Promise<boolean>;

  /**
   * Cierra la sesion activa: elimina la claveMaestra de la RAM
   * y restablece estaDesbloqueada a false
   */
  cerrarSesion: () => void;
}

export type BovedaContextType = EstadoSesion & AccionesBoveda;

const BovedaContext = createContext<BovedaContextType | null>(null);

// ----- Provider -----
export function BovedaProvider({ children }: { children: React.ReactNode }) {
  const [estaDesbloqueada, setEstaDesbloqueada] = useState(false);
  const [claveMaestra, setClaveMaestra] = useState<Uint8Array | null>(null);
  const [intentosFallidos, setIntentosFallidos] = useState(0);
  const [cargando, setCargando] = useState(false);

  const estaBloqueada = intentosFallidos >= MAX_INTENTOS;

  const configurarBoveda = useCallback(
    async (contrasena: string): Promise<boolean> => {
      setCargando(true);
      try {
        const datos = await cryptoService.crearHashMaestro(contrasena);
        await storageService.guardarHashMaestro(datos);
        return true;
      } catch (e) {
        console.error("[BovedaContext] Error en configurarBoveda:", e);
        return false;
      } finally {
        setCargando(false);
      }
    },
    [],
  );

  const intentarLogin = useCallback(
    async (contrasena: string): Promise<boolean> => {
      if (estaBloqueada) return false;

      setCargando(true);
      try {
        const hashDatos = await storageService.cargarHashMaestro();
        if (!hashDatos) {
          return false;
        }

        const resultado = await cryptoService.verificarContrasena(
          contrasena,
          hashDatos.salt,
          hashDatos.verificationTag,
        );

        if (resultado.ok) {
          setClaveMaestra(resultado.clave);
          setEstaDesbloqueada(true);
          setIntentosFallidos(0);
          return true;
        } else {
          setIntentosFallidos((prev) => prev + 1);
          return false;
        }
      } catch (e) {
        console.error("[BovedaContext] Error en intentarLogin:", e);
        setIntentosFallidos((prev) => prev + 1);
        return false;
      } finally {
        setCargando(false);
      }
    },
    [estaBloqueada],
  );

  const cerrarSesion = useCallback((): void => {
    setClaveMaestra(null);
    setEstaDesbloqueada(false);
  }, []);

  const value = useMemo(
    () => ({
      estaDesbloqueada,
      claveMaestra,
      intentosFallidos,
      estaBloqueada,
      cargando,
      configurarBoveda,
      intentarLogin,
      cerrarSesion,
    }),
    [
      estaDesbloqueada,
      claveMaestra,
      intentosFallidos,
      estaBloqueada,
      cargando,
      configurarBoveda,
      intentarLogin,
      cerrarSesion,
    ],
  );

  return (
    <BovedaContext.Provider value={value}>{children}</BovedaContext.Provider>
  );
}

// ----- Hook de consumo -----
export function useBoveda(): BovedaContextType {
  const context = useContext(BovedaContext);
  if (!context) {
    throw new Error("useBoveda debe ser usado dentro de un BovedaProvider");
  }
  return context;
}
