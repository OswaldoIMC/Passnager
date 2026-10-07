// ----- FUNCIONES DE VALIDACION CENTRALIZADAS -----
/**
 * Utilidades de validacion reutilizadas en:
 * - SetupBoveda (indicador de fuerza de contraseña maestra)
 * - ModalCredencial (indicador de fuerza al agregar/editar)
 */

import { COLORS } from "../constants/colors";

// ----- Fuerza de contraseña -----

export type FuerzaNivel = "vacia" | "debil" | "media" | "fuerte";

/**
 * Calcula el nivel de fuerza de una contraseña basandose en:
 * - Longitud minima de 8 caracteres
 * - Presencia de minusculas, mayusculas, numeros y caracteres especiales
 */
export function calcularFuerza(password: string): FuerzaNivel {
  if (password.length === 0) return "vacia";
  if (password.length < 8) return "debil";

  let puntos = 0;
  if (/[a-z]/.test(password)) puntos++; // minusculas
  if (/[A-Z]/.test(password)) puntos++; // mayusculas
  if (/[0-9]/.test(password)) puntos++; // numeros
  if (/[^a-zA-Z0-9]/.test(password)) puntos++; // especiales

  if (puntos <= 1) return "debil";
  if (puntos === 2 || puntos === 3) return "media";
  return "fuerte";
}

/**
 * Configuracion visual para cada nivel de fuerza:
 * etiqueta, color y numero de barras a iluminar
 */
export const FUERZA_CONFIG: Record<
  FuerzaNivel,
  { label: string; color: string; barras: number }
> = {
  vacia: { label: "", color: COLORS.border, barras: 0 },
  debil: { label: "Débil", color: COLORS.danger, barras: 1 },
  media: { label: "Media", color: COLORS.warning, barras: 2 },
  fuerte: { label: "Fuerte", color: COLORS.success, barras: 3 },
};
