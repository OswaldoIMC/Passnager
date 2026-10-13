// ----- MODAL DE ALERTA PERSONALIZADO -----
/**
 * - Icono y color de acento configurables
 * - Multiples botones con variantes (cancel, destructive, primary)
 * - Checkbox opcional "No volver a mostrar"
 * - Animacion de entrada/salida
 */

import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/colors";

// ----- Tipos -----

export type AlertButtonStyle = "cancel" | "destructive" | "primary";

export interface AlertButton {
  text: string;
  style?: AlertButtonStyle;
  /** Si devuelve una promesa, se muestra un spinner mientras resuelve */
  onPress?: () => void | Promise<void>;
}

export interface CustomAlertProps {
  visible: boolean;
  onClose: () => void;

  title: string; // Titulo de la alerta
  message: string; // Mensaje de la alerta
  icon?: keyof typeof Ionicons.glyphMap; // Nombre del icono Ionicons a mostrar en la cabecera
  accentColor?: string; // Color de acento para el icono y el fondo del contenedor de icono
  buttons?: AlertButton[]; // Botones de accion. Por defecto muestra un solo "Aceptar"
  showDontAskAgain?: boolean; // Mostrar checkbox "No volver a mostrar"
  onDontAskAgainChange?: (checked: boolean) => void; // Callback cuando cambia el estado del checkbox
}

export default function CustomAlert({
  visible,
  onClose,
  title,
  message,
  icon,
  accentColor = COLORS.primary,
  buttons,
  showDontAskAgain = false,
  onDontAskAgainChange,
}: CustomAlertProps) {
  const [scaleAnim] = useState(() => new Animated.Value(0.85));
  const [opacityAnim] = useState(() => new Animated.Value(0));
  const [presionando, setPresionando] = useState<number | null>(null);
  const [dontAskChecked, setDontAskChecked] = useState(false);

  // Animar entrada/salida cuando cambia la visibilidad
  useEffect(() => {
    if (visible) {
      // Reset directo en los valores animados (no setState)
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
    }
  }, [visible, scaleAnim, opacityAnim]);

  // Reset estados al abrir
  const prevVisible = useRef(false);
  useEffect(() => {
    if (visible && !prevVisible.current) {
      setDontAskChecked(false);
      setPresionando(null);
    }
    prevVisible.current = visible;
  }, [visible]);

  const resolvedButtons: AlertButton[] =
    buttons && buttons.length > 0
      ? buttons
      : [{ text: "Aceptar", style: "primary" }];

  async function handlePress(btn: AlertButton, index: number) {
    if (presionando !== null) return;

    if (btn.onPress) {
      setPresionando(index);
      try {
        await btn.onPress();
      } finally {
        setPresionando(null);
      }
    }

    onClose();
  }

  function handleToggleDontAsk() {
    const next = !dontAskChecked;
    setDontAskChecked(next);
    onDontAskAgainChange?.(next);
  }

  function getButtonStyle(style?: AlertButtonStyle) {
    switch (style) {
      case "destructive":
        return {
          container: {
            backgroundColor: COLORS.danger,
          },
          text: {
            color: COLORS.white,
            fontWeight: "700" as const,
          },
        };
      case "cancel":
        return {
          container: {
            backgroundColor: "transparent",
            borderWidth: 1,
            borderColor: COLORS.border,
          },
          text: {
            color: COLORS.textMuted,
            fontWeight: "600" as const,
          },
        };
      case "primary":
      default:
        return {
          container: {
            backgroundColor: COLORS.primary,
          },
          text: {
            color: COLORS.white,
            fontWeight: "700" as const,
          },
        };
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Icono decorativo */}
          {icon && (
            <View
              style={[
                styles.iconCircle,
                {
                  backgroundColor: `${accentColor}18`,
                  borderColor: `${accentColor}40`,
                },
              ]}
            >
              <Ionicons name={icon} size={30} color={accentColor} />
            </View>
          )}

          {/* Titulo */}
          <Text style={styles.title}>{title}</Text>

          {/* Mensaje */}
          <Text style={styles.message}>{message}</Text>

          {/* Checkbox "No volver a mostrar" */}
          {showDontAskAgain && (
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={handleToggleDontAsk}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.checkbox,
                  dontAskChecked && styles.checkboxChecked,
                ]}
              >
                {dontAskChecked && (
                  <Ionicons name="checkmark" size={14} color={COLORS.white} />
                )}
              </View>
              <Text style={styles.checkboxLabel}>No volver a mostrar</Text>
            </TouchableOpacity>
          )}

          {/* Botones de accion */}
          <View
            style={[
              styles.buttonsRow,
              resolvedButtons.length === 1 && styles.buttonsRowSingle,
            ]}
          >
            {resolvedButtons.map((btn, idx) => {
              const bStyle = getButtonStyle(btn.style);
              const isLoading = presionando === idx;

              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.button,
                    bStyle.container,
                    resolvedButtons.length > 1 && styles.buttonFlex,
                    isLoading && { opacity: 0.7 },
                  ]}
                  onPress={() => handlePress(btn, idx)}
                  disabled={presionando !== null}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator
                      size="small"
                      color={
                        btn.style === "cancel" ? COLORS.textMuted : COLORS.white
                      }
                    />
                  ) : (
                    <Text style={[styles.buttonText, bStyle.text]}>
                      {btn.text}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ----- Estilos -----
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },

  container: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 16,
  },

  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.white,
    textAlign: "center",
    marginBottom: 10,
  },

  message: {
    fontSize: 13.5,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 22,
  },

  // Checkbox
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginBottom: 20,
    paddingHorizontal: 2,
  },

  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  checkboxLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
  },

  // Botones
  buttonsRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },

  buttonsRowSingle: {
    justifyContent: "center",
  },

  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },

  buttonFlex: {
    flex: 1,
  },

  buttonText: {
    fontSize: 14,
  },
});
