import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { StackScreenProps } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../types";
import { COLORS } from "../constants/colors";
import { useBoveda } from "../context/BovedaContext";

// ----- Tipos -----
type Props = StackScreenProps<RootStackParamList, "LoginBoveda">;

const MAX_INTENTOS = 5;
const { width } = Dimensions.get("window");

export default function LoginBoveda({ navigation }: Props) {
  const [contrasena, setContrasena] = useState("");
  const [mostrarPass, setMostrarPass] = useState(false);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  // useBoveda da la logica de verificacion y el estado de sesion
  const { intentarLogin, intentosFallidos, estaBloqueada, cargando } =
    useBoveda();

  const intentosRestantes = MAX_INTENTOS - intentosFallidos;

  // Manejar intento de login
  async function handleLogin() {
    if (estaBloqueada || cargando) return;
    if (!contrasena.trim()) {
      setMensajeError("Ingresa tu contraseña maestra.");
      return;
    }

    setMensajeError(null);
    const exitoso = await intentarLogin(contrasena);

    if (exitoso) {
      // Contraseña correcta -> ir al Vault
      // replace() para que el usuario no pueda volver al Login con el boton de regresar
      navigation.replace("Vault");
    } else {
      // Contraseña incorrecta
      setContrasena(""); // Limpiar campo por seguridad
      if (intentosFallidos + 1 >= MAX_INTENTOS) {
        setMensajeError("Bóveda bloqueada. Has agotado tus 5 intentos.");
      } else {
        setMensajeError(
          `Contraseña incorrecta. Te quedan ${intentosRestantes - 1} intento(s).`,
        );
      }
    }
  }

  // ----- Renderizado -----
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.container}>
        {/* Fondo decorativo */}
        <View style={styles.circle} />

        {/* Encabezado */}
        <View style={styles.header}>
          <Ionicons name="lock-closed" size={64} color={COLORS.primary} />
          <Text style={styles.titulo}>Tu Bóveda</Text>
          <Text style={styles.subtitulo}>
            Ingresa tu contraseña maestra para acceder
          </Text>
        </View>

        {/* Formulario */}
        <View style={styles.form}>
          {/* Input contraseña */}
          <Text style={styles.label}>Contraseña maestra</Text>
          <View
            style={[
              styles.inputWrapper,
              estaBloqueada && styles.inputBloqueado,
            ]}
          >
            <Ionicons
              name="key-outline"
              size={20}
              color={COLORS.textMuted}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              value={contrasena}
              onChangeText={(t) => {
                setContrasena(t);
                setMensajeError(null);
              }}
              placeholder="Tu contraseña maestra"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry={!mostrarPass}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!estaBloqueada && !cargando}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              testID="input-contrasena-login"
            />
            <TouchableOpacity
              onPress={() => setMostrarPass((v) => !v)}
              style={styles.ojito}
              disabled={estaBloqueada}
              testID="toggle-mostrar-login"
            >
              <Ionicons
                name={mostrarPass ? "eye-off-outline" : "eye-outline"}
                size={22}
                color={COLORS.textMuted}
              />
            </TouchableOpacity>
          </View>

          {/* Indicador de intentos */}
          {intentosFallidos > 0 && !estaBloqueada && (
            <View style={styles.intentosRow}>
              {[...Array(MAX_INTENTOS)].map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.intentoDot,
                    {
                      backgroundColor:
                        i < intentosFallidos ? COLORS.danger : COLORS.border,
                    },
                  ]}
                />
              ))}
              <Text style={styles.intentosTexto}>
                {intentosRestantes} intento(s) restante(s)
              </Text>
            </View>
          )}

          {/* Mensaje de error / bloqueo */}
          {mensajeError ? (
            <View
              style={[
                styles.errorBox,
                estaBloqueada && styles.errorBoxBloqueado,
              ]}
            >
              <Ionicons
                name={estaBloqueada ? "lock-closed" : "warning"}
                size={16}
                color={estaBloqueada ? COLORS.warning : COLORS.danger}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.errorTexto,
                  estaBloqueada && { color: COLORS.warning },
                ]}
              >
                {mensajeError}
              </Text>
            </View>
          ) : null}

          {/* Boton entrar */}
          <TouchableOpacity
            style={[
              styles.boton,
              (estaBloqueada || cargando) && styles.botonDisabled,
            ]}
            onPress={handleLogin}
            disabled={estaBloqueada || cargando}
            activeOpacity={0.8}
            testID="btn-entrar"
          >
            {cargando ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.botonTexto}>
                {estaBloqueada ? "Bóveda bloqueada" : "Entrar"}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Aviso de seguridad */}
        <View style={styles.aviso}>
          <Ionicons
            name="information-circle-outline"
            size={14}
            color={COLORS.textMuted}
            style={{ marginRight: 6 }}
          />
          <Text style={styles.avisoTexto}>
            Si olvidaste tu contraseña, no hay forma de recuperarla.
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ----- Estilos -----
const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },

  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
    alignItems: "center",
  },

  // Decoración
  circle: {
    position: "absolute",
    width: width * 1.4,
    height: width * 1.4,
    borderRadius: width * 0.7,
    backgroundColor: COLORS.primary,
    opacity: 0.05,
    top: -width * 0.5,
  },

  // Encabezado
  header: {
    alignItems: "center",
    marginBottom: 48,
  },

  titulo: {
    fontSize: 30,
    fontWeight: "700",
    color: COLORS.white,
    marginTop: 16,
  },

  subtitulo: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
  },

  // Formulario
  form: { width: "100%" },

  label: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textMuted,
    marginBottom: 8,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },

  inputWrapper: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    alignItems: "center",
    paddingHorizontal: 14,
  },

  inputBloqueado: {
    borderColor: COLORS.warning,
    opacity: 0.6,
  },

  inputIcon: { marginRight: 10 },

  input: {
    flex: 1,
    height: 54,
    color: COLORS.white,
    fontSize: 16,
  },

  ojito: { padding: 6 },

  // Indicador de intentos
  intentosRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 6,
  },

  intentoDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  intentosTexto: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginLeft: 4,
  },

  // Error
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(248, 81, 73, 0.1)",
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
  },

  errorBoxBloqueado: {
    backgroundColor: "rgba(210, 153, 34, 0.1)",
    borderColor: COLORS.warning,
  },

  errorTexto: {
    color: COLORS.danger,
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },

  // Botón
  boton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },

  botonDisabled: { opacity: 0.5 },

  botonTexto: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.4,
  },

  // Aviso
  aviso: {
    flexDirection: "row",
    alignItems: "center",
    position: "absolute",
    bottom: 40,
    paddingHorizontal: 24,
  },

  avisoTexto: {
    color: COLORS.textMuted,
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
});
