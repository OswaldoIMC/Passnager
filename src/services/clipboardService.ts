// ----- SERVICIO CENTRALIZADO DE PORTAPAPELES SEGURO -----
/**
 * Gestiona el copiado seguro de contraseñas al portapapeles con:
 * 1. Temporizador de borrado automatico (por defecto 30 segundos)
 * 2. Soporte para ciclo de vida de la app (AppState): si la app se suspende en
 *    segundo plano y regresa, verifica si ya expiro el tiempo y limpia de inmediato
 * 3. Limpieza manual inmediata (al bloquear la boveda o cerrar sesion)
 */

import { AppState, AppStateStatus } from "react-native";
import * as Clipboard from "expo-clipboard";

interface CopiaInfo {
  texto: string;
  timestamp: number;
  duracionMs: number;
}

class ClipboardService {
  private ultimaCopia: CopiaInfo | null = null;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private listenerRegistrado = false;

  constructor() {
    this.iniciarListenerAppState();
  }

  private iniciarListenerAppState() {
    if (this.listenerRegistrado) return;
    this.listenerRegistrado = true;

    AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (nextState === "active") {
        this.verificarExpiracionAlReanudar();
      }
    });
  }

  /**
   * Verifica si el tiempo expiro mientras la app estaba en segundo plano
   */
  private async verificarExpiracionAlReanudar() {
    if (!this.ultimaCopia) return;

    const tiempoTranscurrido = Date.now() - this.ultimaCopia.timestamp;

    if (tiempoTranscurrido >= this.ultimaCopia.duracionMs) {
      await this.limpiarPortapapeles();
    } else {
      // Re-programar el tiempo restante
      const tiempoRestante = this.ultimaCopia.duracionMs - tiempoTranscurrido;
      this.cancelarTimer();
      this.timeoutId = setTimeout(() => {
        this.limpiarPortapapeles();
      }, tiempoRestante);
    }
  }

  private cancelarTimer() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  /**
   * Copia una contraseña al portapapeles y programa su borrado automatico tras segundos
   */
  async copiarContrasena(
    contrasena: string,
    segundos: number = 30,
  ): Promise<void> {
    this.cancelarTimer();

    const duracionMs = segundos * 1000;
    this.ultimaCopia = {
      texto: contrasena,
      timestamp: Date.now(),
      duracionMs,
    };

    // Copiar al portapapeles
    await Clipboard.setStringAsync(contrasena);

    // Programar borrado en primer plano
    this.timeoutId = setTimeout(() => {
      this.limpiarPortapapeles();
    }, duracionMs);
  }

  /**
   * Limpia el portapapeles de inmediato y descarta el estado de copia
   */
  async limpiarPortapapeles(): Promise<void> {
    this.cancelarTimer();
    this.ultimaCopia = null;

    try {
      if (typeof (Clipboard as any).clearAsync === "function") {
        await (Clipboard as any).clearAsync();
      } else {
        await Clipboard.setStringAsync("");
      }
    } catch (e) {
      console.warn("[ClipboardService] No se pudo limpiar el portapapeles:", e);
    }
  }
}

export const clipboardService = new ClipboardService();
