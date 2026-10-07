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
import type { Credencial } from "../types";
import { COLORS } from "../constants/colors";
import { useBoveda } from "../context/BovedaContext";
import { passwordService } from "../services/passwordService";
import { clipboardService } from "../services/clipboardService";

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
  async function handleCopiar() {
    if (!claveMaestra) return;

    try {
      setCargando(true);
      // Descifrar contraseña al vuelo
      const contrasenaPlana = await passwordService.desencriptarContrasena(
        credencial,
        claveMaestra,
      );

      // Copiar con el servicio seguro (con timer y soporte de AppState en segundo plano)
      await clipboardService.copiarContrasena(contrasenaPlana, 30);

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
