// ----- COMPONENTE TARJETA DE CREDENCIAL -----

import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Credencial } from "../types";
import { COLORS } from "../constants/colors";
import { useBoveda } from "../context/BovedaContext";
import { passwordService } from "../services/passwordService";
import { clipboardService } from "../services/clipboardService";
import CustomAlert from "./CustomAlert";

interface Props {
  credencial: Credencial;
  onDelete: (id: string, etiqueta: string) => void;
  onEdit?: (credencial: Credencial) => void;
  onCopiedFeedback?: (etiqueta: string) => void;
}

export default function PasswordCard({
  credencial,
  onDelete,
  onEdit,
  onCopiedFeedback,
}: Props) {
  const { claveMaestra } = useBoveda();

  // Estados locales de la tarjeta
  const [copiado, setCopiado] = useState(false);
  const [revelado, setRevelado] = useState(false);
  const [textoDescifrado, setTextoDescifrado] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  // Animaciones para feedback de copiado
  const [escalaAnim] = useState(() => new Animated.Value(1));
  const timeoutOcultarRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Estado para el aviso de seguridad del portapapeles
  const [avisoVisible, setAvisoVisible] = useState(false);
  const copiaPendienteRef = useRef<(() => Promise<void>) | null>(null);

  // Clave para AsyncStorage
  const AVISO_CLIPBOARD_KEY = "@passnager/aviso_clipboard_visto";

  useEffect(() => {
    return () => {
      if (timeoutOcultarRef.current) clearTimeout(timeoutOcultarRef.current);
    };
  }, []);

  // Formatear fecha
  function formatearFecha(timestamp: number): string {
    const fecha = new Date(timestamp);
    return fecha.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  // ----- Copiar contraseña al portapapeles -----
  const SEGUNDOS_BORRADO = 30;

  async function ejecutarCopia() {
    if (!claveMaestra) return;

    try {
      setCargando(true);
      // Descifrar contraseña al vuelo
      const contrasenaPlana = await passwordService.desencriptarContrasena(
        credencial,
        claveMaestra,
      );

      // Copiar con el servicio seguro (con timer y soporte de AppState en segundo plano)
      await clipboardService.copiarContrasena(contrasenaPlana, SEGUNDOS_BORRADO);

      // Feedback visual y animacion
      setCopiado(true);
      Animated.sequence([
        Animated.timing(escalaAnim, {
          toValue: 1.15,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.spring(escalaAnim, {
          toValue: 1,
          friction: 4,
          useNativeDriver: true,
        }),
      ]).start();

      if (onCopiedFeedback) {
        onCopiedFeedback(credencial.etiqueta);
      }

      // Regresar el boton a estado normal tras 2.2 segundos
      setTimeout(() => {
        setCopiado(false);
      }, 2200);
    } catch (e) {
      console.error("[PasswordCard] Error al copiar:", e);
    } finally {
      setCargando(false);
    }
  }

  async function handleCopiar() {
    try {
      const yaVisto = await AsyncStorage.getItem(AVISO_CLIPBOARD_KEY);
      if (yaVisto === "true") {
        // Ya acepto el aviso, copiar directamente
        await ejecutarCopia();
      } else {
        // Mostrar aviso de seguridad por primera vez
        copiaPendienteRef.current = ejecutarCopia;
        setAvisoVisible(true);
      }
    } catch {
      // Si falla la lectura, copiar directamente
      await ejecutarCopia();
    }
  }

  async function handleAvisoAceptar() {
    setAvisoVisible(false);
    if (copiaPendienteRef.current) {
      await copiaPendienteRef.current();
      copiaPendienteRef.current = null;
    }
  }

  async function handleAvisoDontShowAgain(checked: boolean) {
    if (checked) {
      await AsyncStorage.setItem(AVISO_CLIPBOARD_KEY, "true");
    } else {
      await AsyncStorage.removeItem(AVISO_CLIPBOARD_KEY);
    }
  }

  // ----- Revelar u ocultar temporalmente la contraseña -----
  async function handleToggleRevelar() {
    if (revelado) {
      setRevelado(false);
      setTextoDescifrado(null);
      if (timeoutOcultarRef.current) clearTimeout(timeoutOcultarRef.current);
      return;
    }

    if (!claveMaestra) return;

    try {
      setCargando(true);
      const contrasenaPlana = await passwordService.desencriptarContrasena(
        credencial,
        claveMaestra,
      );
      setTextoDescifrado(contrasenaPlana);
      setRevelado(true);

      // Ocultar automaticamente a los 10 segundos por privacidad
      if (timeoutOcultarRef.current) clearTimeout(timeoutOcultarRef.current);
      timeoutOcultarRef.current = setTimeout(() => {
        setRevelado(false);
        setTextoDescifrado(null);
      }, 10000);
    } catch (e) {
      console.error("[PasswordCard] Error al revelar:", e);
    } finally {
      setCargando(false);
    }
  }

  const letraInicial =
    credencial.etiqueta.trim().charAt(0).toUpperCase() || "🔑";

  // ----- Renderizado -----
  return (
    <View style={styles.card}>
      {/* Fila superior: Icono, etiqueta y acciones */}
      <View style={styles.topRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{letraInicial}</Text>
        </View>

        <View style={styles.infoCol}>
          <Text style={styles.etiqueta} numberOfLines={1}>
            {credencial.etiqueta}
          </Text>
          <Text style={styles.fecha}>
            Modificado: {formatearFecha(credencial.ultimaModificacion)}
          </Text>
        </View>

        <View style={styles.topActions}>
          {onEdit && (
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => onEdit(credencial)}
              activeOpacity={0.7}
              testID={`btn-edit-${credencial.id}`}
            >
              <Ionicons
                name="create-outline"
                size={18}
                color={COLORS.textMuted}
              />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => onDelete(credencial.id, credencial.etiqueta)}
            activeOpacity={0.7}
            testID={`btn-delete-${credencial.id}`}
          >
            <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Fila inferior: Contraseña enmascarada y botones */}
      <View style={styles.bottomRow}>
        <View style={styles.passBox}>
          <Text
            style={[styles.passText, revelado && styles.passTextRevelado]}
            numberOfLines={1}
          >
            {revelado && textoDescifrado ? textoDescifrado : "••••••••••••••••"}
          </Text>

          <TouchableOpacity
            onPress={handleToggleRevelar}
            style={styles.ojitoBtn}
            disabled={cargando}
            activeOpacity={0.7}
            testID={`btn-toggle-pass-${credencial.id}`}
          >
            <Ionicons
              name={revelado ? "eye-off-outline" : "eye-outline"}
              size={18}
              color={COLORS.textMuted}
            />
          </TouchableOpacity>
        </View>

        {/* Boton copiar con animacion de escala y cambio de color */}
        <Animated.View style={{ transform: [{ scale: escalaAnim }] }}>
          <TouchableOpacity
            style={[styles.copiarBtn, copiado && styles.copiarBtnExito]}
            onPress={handleCopiar}
            disabled={cargando}
            activeOpacity={0.8}
            testID={`btn-copy-${credencial.id}`}
          >
            {cargando ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Ionicons
                  name={copiado ? "checkmark-circle" : "copy-outline"}
                  size={16}
                  color={COLORS.white}
                  style={{ marginRight: 5 }}
                />
                <Text style={styles.copiarBtnText}>
                  {copiado ? "¡Copiada!" : "Copiar"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Aviso de seguridad del portapapeles (primera vez) */}
      <CustomAlert
        visible={avisoVisible}
        onClose={() => {
          setAvisoVisible(false);
          copiaPendienteRef.current = null;
        }}
        title="Aviso de seguridad"
        message={`Al copiar la contraseña, el teclado o el sistema de tu teléfono podría guardarla en texto plano. Se intentará borrar en ${SEGUNDOS_BORRADO} segundos, pero el historial podría conservarla. Para mayor seguridad, puedes desactivar el historial del portapapeles en los ajustes de tu teclado.`}
        icon="shield-half-outline"
        accentColor={COLORS.warning}
        buttons={[
          {
            text: "Cancelar",
            style: "cancel",
          },
          {
            text: "Entendido, copiar",
            style: "primary",
            onPress: handleAvisoAceptar,
          },
        ]}
        showDontAskAgain
        onDontAskAgainChange={handleAvisoDontShowAgain}
      />
    </View>
  );
}

// ----- Estilos -----
const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(45, 152, 176, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(45, 152, 176, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  avatarText: {
    color: COLORS.primaryLight,
    fontSize: 18,
    fontWeight: "700",
  },

  infoCol: {
    flex: 1,
  },

  etiqueta: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.white,
    marginBottom: 3,
  },

  fecha: {
    fontSize: 12,
    color: COLORS.textMuted,
  },

  topActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  iconBtn: {
    padding: 7,
    borderRadius: 8,
  },

  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  passBox: {
    flex: 1,
    height: 42,
    backgroundColor: "rgba(13, 17, 23, 0.6)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(48, 54, 61, 0.7)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    justifyContent: "space-between",
  },

  passText: {
    color: COLORS.textMuted,
    fontSize: 15,
    letterSpacing: 2,
    flex: 1,
  },

  passTextRevelado: {
    color: COLORS.white,
    letterSpacing: 0.5,
    fontSize: 14,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },

  ojitoBtn: {
    padding: 4,
    marginLeft: 6,
  },

  copiarBtn: {
    height: 42,
    paddingHorizontal: 14,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 92,
  },

  copiarBtnExito: {
    backgroundColor: COLORS.success,
  },

  copiarBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "700",
  },
});
