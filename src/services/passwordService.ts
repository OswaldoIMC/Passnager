// ----- SERVICIO PARA LA GESTION DE CREDENCIALES (CRUD) -----
/**
 * Implementa el CRUD de credenciales con cifrado en reposo
 *
 * 1. addPassword: Cifra la contraseña y agrega una nueva credencial con UUID
 * 2. getPasswords: Carga todas las credenciales guardadas en AsyncStorage
 * 3. deletePassword: Elimina una credencial por su ID
 * 4. updatePassword: Modifica la etiqueta y/o recifra la contraseña si cambia
 * 5. desencriptarContrasena: Descifra una contraseña usando la claveMaestra en RAM
 */

import uuid from "react-native-uuid";
import type { Credencial } from "../types";
import { cryptoService } from "./cryptoService";
import { storageService } from "./storageService";

export class PasswordService {
  /**
   * Agrega una nueva credencial cifrando la contraseña antes de guardar
   *
   * @param etiqueta Nombre o identificador del servicio
   * @param contrasenaTexto Contraseña en texto plano a cifrar y guardar
   * @param claveMaestra Clave derivada en RAM de 32 bytes
   * @returns La credencial creada con la contraseña ya cifrada
   */
  async addPassword(
    etiqueta: string,
    contrasenaTexto: string,
    claveMaestra: Uint8Array,
  ): Promise<Credencial> {
    if (!etiqueta.trim()) {
      throw new Error("La etiqueta no puede estar vacía.");
    }
    if (!contrasenaTexto) {
      throw new Error("La contraseña no puede estar vacía.");
    }
    if (!claveMaestra || claveMaestra.length !== 32) {
      throw new Error("Clave maestra inválida o no disponible en sesión.");
    }

    // Cifrar la contraseña con la clave maestra usando libsodium secretbox
    const contrasenaCifrada = await cryptoService.encriptarContrasena(
      contrasenaTexto,
      claveMaestra,
    );

    const ahora = Date.now();
    const id = String(uuid.v4());

    const nuevaCredencial: Credencial = {
      id,
      etiqueta: etiqueta.trim(),
      contrasena: contrasenaCifrada,
      fechaCreacion: ahora,
      ultimaModificacion: ahora,
    };

    // Obtener lista actual y añadir la nueva al principio
    const existentes = await storageService.cargarCredenciales();
    const actualizadas = [nuevaCredencial, ...existentes];

    // Persistir en AsyncStorage
    await storageService.guardarCredenciales(actualizadas);

    return nuevaCredencial;
  }

  /**
   * Obtiene todas las credenciales guardadas
   *
   * Nota: Las contraseñas devueltas permanecen cifradas en este array
   * para no exponer texto plano innecesariamente en el estado general
   */
  async getPasswords(): Promise<Credencial[]> {
    return await storageService.cargarCredenciales();
  }

  /**
   * Elimina una credencial por su ID
   *
   * @param id Identificador unico de la credencial a eliminar
   */
  async deletePassword(id: string): Promise<void> {
    const existentes = await storageService.cargarCredenciales();
    const filtradas = existentes.filter((cred) => cred.id !== id);
    await storageService.guardarCredenciales(filtradas);
  }

  /**
   * Actualiza una credencial existente
   *
   * @param id ID de la credencial a editar
   * @param nuevaEtiqueta Nuevo nombre o etiqueta
   * @param nuevaContrasenaTexto Nueva contraseña en texto plano (opcional, si se omite se mantiene la actual)
   * @param claveMaestra Clave derivada en RAM de 32 bytes
   */
  async updatePassword(
    id: string,
    nuevaEtiqueta: string,
    nuevaContrasenaTexto: string | undefined,
    claveMaestra: Uint8Array,
  ): Promise<Credencial> {
    const existentes = await storageService.cargarCredenciales();
    const index = existentes.findIndex((cred) => cred.id === id);

    if (index === -1) {
      throw new Error("Credencial no encontrada.");
    }

    const credencialActual = existentes[index];
    let contrasenaCifrada = credencialActual.contrasena;

    // Si el usuario proporciono una nueva contraseña, se cifra
    if (nuevaContrasenaTexto && nuevaContrasenaTexto.trim().length > 0) {
      if (!claveMaestra || claveMaestra.length !== 32) {
        throw new Error("Clave maestra requerida para recifrar la contraseña.");
      }
      contrasenaCifrada = await cryptoService.encriptarContrasena(
        nuevaContrasenaTexto,
        claveMaestra,
      );
    }

    const credencialActualizada: Credencial = {
      ...credencialActual,
      etiqueta: nuevaEtiqueta.trim() || credencialActual.etiqueta,
      contrasena: contrasenaCifrada,
      ultimaModificacion: Date.now(),
    };

    const actualizadas = [...existentes];
    actualizadas[index] = credencialActualizada;

    await storageService.guardarCredenciales(actualizadas);
    return credencialActualizada;
  }

  /**
   * Descifra la contraseña de una credencial "al vuelo"
   *
   * Se utiliza al momento de copiar al portapapeles o ver la contraseña en la tarjeta
   *
   * @param credencial La credencial que contiene la contraseña cifrada
   * @param claveMaestra La clave derivada en RAM (del login activo)
   * @returns La contraseña en texto plano
   */
  async desencriptarContrasena(
    credencial: Credencial,
    claveMaestra: Uint8Array,
  ): Promise<string> {
    if (!claveMaestra || claveMaestra.length !== 32) {
      throw new Error("No hay una sesión activa para descifrar.");
    }

    return await cryptoService.desencriptarContrasena(
      credencial.contrasena,
      claveMaestra,
    );
  }
}

// Exportamos singleton para toda la aplicación
export const passwordService = new PasswordService();
