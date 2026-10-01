import React from "react";
import { View, Text, StyleSheet } from "react-native";

/**
 * LoginBoveda - Placeholder.
 * Aquí va: input de contraseña maestra, validación con hash guardado,
 * contador de intentos fallidos y navegación a VaultScreen.
 */
export default function LoginBoveda() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Login Bóveda</Text>
      <Text style={styles.sub}>Próximamente</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D1117",
    alignItems: "center",
    justifyContent: "center",
  },
  text: { fontSize: 28, color: "#FFFFFF", fontWeight: "700" },
  sub: { fontSize: 14, color: "#8B949E", marginTop: 8 },
});
