import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import { COLORS } from "../constants/colors";
import { Ionicons } from "@expo/vector-icons";

// ----- Tipos -----
type Props = StackScreenProps<RootStackParamList, "Vault">;

// ----- Componente -----
export default function VaultScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <Ionicons name="shield-checkmark" size={80} color={COLORS.success} />
      <Text style={styles.titulo}>Bóveda Desbloqueada</Text>
      <Text style={styles.subtitulo}>
        Sesión iniciada correctamente. Aquí se listarán tus contraseñas.
      </Text>

      <TouchableOpacity
        style={styles.boton}
        onPress={() => navigation.replace("LoginBoveda")}
      >
        <Text style={styles.botonTexto}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

// ----- Estilos -----
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  titulo: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.white,
    marginTop: 20,
    marginBottom: 8,
  },
  subtitulo: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 32,
  },
  boton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  botonTexto: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },
});
