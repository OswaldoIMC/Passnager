import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/colors";
import { useBoveda } from "../context/BovedaContext";
import { calcularFuerza, FUERZA_CONFIG, FuerzaNivel } from "../utils/validation";

// ----- Tipos -----
type Props = StackScreenProps<RootStackParamList, "SetupBoveda">;

// ----- Sub-componente: Indicador de fuerza -----
function IndicadorFuerza({ nivel }: { nivel: FuerzaNivel }) {
  const config = FUERZA_CONFIG[nivel];
  if (nivel === "vacia") return null;

  return (
    <View style={styles.fuerzaContainer}>
      <View style={styles.fuerzaBarras}>
        {[1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              styles.fuerzaBarra,
              {
                backgroundColor:
                  i <= config.barras ? config.color : COLORS.border,
              },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.fuerzaLabel, { color: config.color }]}>
        {config.label}
      </Text>
    </View>
  );
}

// ----- Componente principal -----
export default function SetupBoveda({ navigation }: Props) {
  const [contrasena, setContrasena] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [mostrarPass, setMostrarPass] = useState(false);
  const [mostrarConf, setMostrarConf] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hook que maneja la criptografia y el storage
  const { configurarBoveda, cargando } = useBoveda();

  const fuerza = calcularFuerza(contrasena);

  // ----- Validaciones -----
  function validar(): boolean {
    if (contrasena.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return false;
    }
    if (fuerza === "debil") {
      setError(
        "La contraseña es demasiado débil. Agrega números o caracteres especiales.",
      );
      return false;
    }
    if (contrasena !== confirmacion) {
      setError("Las contraseñas no coinciden.");
      return false;
    }
    setError(null);
    return true;
  }

  // ----- Crear boveda -----
  async function handleCrearBoveda() {
    if (!validar()) return;

    // configurarBoveda: deriva la clave con Argon2id y guarda el hash en storage
    const ok = await configurarBoveda(contrasena);

    if (ok) {
      // replace() para que el usuario no pueda volver con el regresar
      navigation.replace("LoginBoveda");
    } else {
      Alert.alert("Error", "No se pudo crear la bóveda. Inténtalo de nuevo.");
    }
  }

  // ----- Render -----
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Encabezado */}
        <View style={styles.header}>
          <Ionicons name="key" size={74} color={COLORS.primary} />
          <Text style={styles.titulo}>Crea tu Bóveda</Text>
          <Text style={styles.subtitulo}>
            Esta será tu contraseña maestra. Elige una que sea segura y que
            puedas recordar, NO la podrás recuperar.
          </Text>
        </View>

        {/* Formulario */}
        <View style={styles.form}>
          {/* Campo: Contraseña maestra */}
          <Text style={styles.label}>Contraseña maestra</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={contrasena}
              onChangeText={(t) => {
                setContrasena(t);
                setError(null);
              }}
              placeholder="Mínimo 8 caracteres"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry={!mostrarPass}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              testID="input-contrasena"
            />
            <TouchableOpacity
              onPress={() => setMostrarPass((v) => !v)}
              style={styles.ojito}
              testID="toggle-contrasena"
            >
              <Ionicons
                name={mostrarPass ? "eye-off-outline" : "eye-outline"}
                size={24}
                color={COLORS.textMuted}
                style={styles.ojitoText}
              />
            </TouchableOpacity>
          </View>

          {/* Indicador de fuerza */}
          <IndicadorFuerza nivel={fuerza} />

          {/* Campo: Confirmacion */}
          <Text style={[styles.label, { marginTop: 20 }]}>
            Confirmar contraseña
          </Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={confirmacion}
              onChangeText={(t) => {
                setConfirmacion(t);
                setError(null);
              }}
              placeholder="Repite la contraseña"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry={!mostrarConf}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleCrearBoveda}
              testID="input-confirmacion"
            />
            <TouchableOpacity
              onPress={() => setMostrarConf((v) => !v)}
              style={styles.ojito}
              testID="toggle-confirmacion"
            >
              <Ionicons
                name={mostrarConf ? "eye-off-outline" : "eye-outline"}
                size={24}
                color={COLORS.textMuted}
                style={styles.ojitoText}
              />
            </TouchableOpacity>
          </View>

          {/* Mensaje de error */}
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>
                <Ionicons name="warning" style={styles.errorText} /> {error}
              </Text>
            </View>
          ) : null}

          {/* Boton principal */}
          <TouchableOpacity
            style={[styles.boton, cargando && styles.botonDisabled]}
            onPress={handleCrearBoveda}
            disabled={cargando}
            activeOpacity={0.8}
            testID="btn-crear-boveda"
          >
            {cargando ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.botonTexto}>
                Crear Bóveda{" "}
                <Ionicons name="lock-closed" style={styles.botonTexto} />
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Aviso de seguridad */}
        <View style={styles.aviso}>
          <Text style={styles.avisoTexto}>
            <Ionicons name="shield" style={styles.avisoTexto} /> Tu contraseña
            maestra nunca se guarda en texto plano. Solo tú la conoces.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ----- Estilos -----
const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },

  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },

  // Encabezado
  header: { alignItems: "center", marginBottom: 36 },

  titulo: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.white,
    marginBottom: 10,
  },

  subtitulo: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },

  // Formulario
  form: { width: "100%" },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textMuted,
    marginBottom: 8,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  inputWrapper: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    alignItems: "center",
    paddingHorizontal: 16,
  },

  input: {
    flex: 1,
    height: 52,
    color: COLORS.white,
    fontSize: 16,
  },

  ojito: { padding: 6 },

  ojitoText: { fontSize: 20 },

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

  // Error
  errorBox: {
    backgroundColor: "rgba(248, 81, 73, 0.12)",
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
  },

  errorText: {
    color: COLORS.danger,
    fontSize: 13,
    lineHeight: 18,
  },

  // Boton
  boton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 28,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },

  botonDisabled: { opacity: 0.6 },

  botonTexto: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  // Aviso de seguridad
  aviso: {
    marginTop: 32,
    backgroundColor: "rgba(45, 152, 176, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(45, 152, 176, 0.3)",
    borderRadius: 12,
    padding: 14,
  },

  avisoTexto: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
});
