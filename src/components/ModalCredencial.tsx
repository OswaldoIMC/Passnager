// ----- MODAL REUTILIZABLE PARA AGREGAR / EDITAR CREDENCIALES -----
/**
 * Componente modal bottom-sheet para:
 * - Agregar una nueva contraseña (credencialEditar = null)
 * - Editar una credencial existente (credencialEditar = Credencial)
 *
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/colors";
import { useBoveda } from "../context/BovedaContext";
import { passwordService } from "../services/passwordService";
import { calcularFuerza, FUERZA_CONFIG } from "../utils/validation";
import type { Credencial } from "../types";

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Se llama cuando se guarda con exito, con la credencial y si fue edicion */
  onSaved: (credencial: Credencial, esEdicion: boolean) => void;
  /** Si se proporciona, el modal entra en modo edicion */
  credencialEditar?: Credencial | null;
}

export default function ModalCredencial({
  visible,
  onClose,
  onSaved,
  credencialEditar,
}: Props) {
  const insets = useSafeAreaInsets();
  const { claveMaestra } = useBoveda();

  const esEdicion = !!credencialEditar;

  // Estados del formulario
  const [etiqueta, setEtiqueta] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [mostrarPass, setMostrarPass] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Reiniciar formulario cuando el modal se abre o cambia de modo
  useEffect(() => {
    if (visible) {
      if (credencialEditar) {
        // Modo edicion: pre-llenar etiqueta, contraseña vacia
        setEtiqueta(credencialEditar.etiqueta);
        setContrasena("");
      } else {
        // Modo agregar: todo vacio
        setEtiqueta("");
        setContrasena("");
      }
      setMostrarPass(false);
    }
  }, [visible, credencialEditar]);

  const fuerza = calcularFuerza(contrasena);

  // ----- Guardar (crear o actualizar) -----
  async function handleGuardar() {
    if (!etiqueta.trim()) {
      Alert.alert(
        "Campo requerido",
        "Por favor ingresa una etiqueta o servicio.",
      );
      return;
    }
    if (!esEdicion && !contrasena.trim()) {
      Alert.alert("Campo requerido", "Por favor ingresa la contraseña.");
      return;
    }
    if (!claveMaestra) return;

    try {
      setGuardando(true);

      if (esEdicion && credencialEditar) {
        // Actualizar credencial existente
        const actualizada = await passwordService.updatePassword(
          credencialEditar.id,
          etiqueta.trim(),
          contrasena.trim() || undefined, // undefined mantiene la contraseña actual
          claveMaestra,
        );
        onSaved(actualizada, true);
      } else {
        // Crear nueva credencial
        const creada = await passwordService.addPassword(
          etiqueta.trim(),
          contrasena,
          claveMaestra,
        );
        onSaved(creada, false);
      }

      handleCerrar();
    } catch (e) {
      console.error("[ModalCredencial] Error al guardar:", e);
      Alert.alert("Error", "No se pudo guardar la contraseña.");
    } finally {
      setGuardando(false);
    }
  }

  function handleCerrar() {
    setEtiqueta("");
    setContrasena("");
    setMostrarPass(false);
    onClose();
  }

  // ----- Render -----
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleCerrar}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={[
            styles.modalContent,
            {
              paddingBottom: Math.max(
                insets.bottom + 16,
                Platform.OS === "ios" ? 40 : 26,
              ),
            },
          ]}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {esEdicion ? "Editar Contraseña" : "Nueva Contraseña"}
            </Text>
            <TouchableOpacity
              onPress={handleCerrar}
              style={styles.modalCloseBtn}
            >
              <Ionicons name="close" size={22} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalSub}>
            {esEdicion
              ? "Modifica la etiqueta o la contraseña de esta credencial."
              : "Se guardará cifrada con tu clave maestra en el almacenamiento seguro."}
          </Text>

          {/* Input Etiqueta */}
          <Text style={styles.modalLabel}>Servicio o Etiqueta</Text>
          <View style={styles.modalInputWrapper}>
            <Ionicons
              name="globe-outline"
              size={18}
              color={COLORS.textMuted}
              style={{ marginRight: 10 }}
            />
            <TextInput
              style={styles.modalInput}
              value={etiqueta}
              onChangeText={setEtiqueta}
              placeholder="Ej: Google, Netflix, GitHub"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="sentences"
              autoCorrect={false}
            />
          </View>

          {/* Input Contraseña */}
          <Text style={[styles.modalLabel, { marginTop: 16 }]}>Contraseña</Text>
          <View style={styles.modalInputWrapper}>
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color={COLORS.textMuted}
              style={{ marginRight: 10 }}
            />
            <TextInput
              style={styles.modalInput}
              value={contrasena}
              onChangeText={setContrasena}
              placeholder={
                esEdicion
                  ? "Dejar vacío para mantener la actual"
                  : "Contraseña a proteger"
              }
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry={!mostrarPass}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              onPress={() => setMostrarPass((v) => !v)}
              style={{ padding: 4 }}
            >
              <Ionicons
                name={mostrarPass ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={COLORS.textMuted}
              />
            </TouchableOpacity>
          </View>

          {/* Indicador de fuerza (solo si se esta escribiendo contraseña) */}
          {contrasena.length > 0 && fuerza !== "vacia" && (
            <View style={styles.fuerzaContainer}>
              <View style={styles.fuerzaBarras}>
                {[1, 2, 3].map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.fuerzaBarra,
                      {
                        backgroundColor:
                          i <= FUERZA_CONFIG[fuerza].barras
                            ? FUERZA_CONFIG[fuerza].color
                            : COLORS.border,
                      },
                    ]}
                  />
                ))}
              </View>
              <Text
                style={[
                  styles.fuerzaLabel,
                  { color: FUERZA_CONFIG[fuerza].color },
                ]}
              >
                {FUERZA_CONFIG[fuerza].label}
              </Text>
            </View>
          )}

          {/* Botones de accion */}
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={handleCerrar}
              disabled={guardando}
            >
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modalGuardarBtn,
                guardando && styles.modalBtnDisabled,
              ]}
              onPress={handleGuardar}
              disabled={guardando}
            >
              {guardando ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <Text style={styles.modalGuardarText}>
                  {esEdicion ? "Actualizar" : "Guardar"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ----- Estilos -----
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },

  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 26,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },

  modalTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: COLORS.white,
  },

  modalCloseBtn: {
    padding: 6,
  },

  modalSub: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 20,
    lineHeight: 18,
  },

  modalLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },

  modalInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
  },

  modalInput: {
    flex: 1,
    color: COLORS.white,
    fontSize: 15,
  },

  // Indicador de fuerza
  fuerzaContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 10,
  },

  fuerzaBarras: { flexDirection: "row", gap: 5 },

  fuerzaBarra: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },

  fuerzaLabel: {
    fontSize: 12,
    fontWeight: "600",
  },

  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 26,
  },

  modalCancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
  },

  modalCancelText: {
    color: COLORS.textMuted,
    fontSize: 15,
    fontWeight: "600",
  },

  modalGuardarBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    minWidth: 95,
    alignItems: "center",
    justifyContent: "center",
  },

  modalBtnDisabled: {
    opacity: 0.6,
  },

  modalGuardarText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "700",
  },
});
