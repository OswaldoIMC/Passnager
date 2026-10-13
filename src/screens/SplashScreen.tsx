import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
} from "react-native";
import { StackScreenProps } from "@react-navigation/stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RootStackParamList } from "../types";
import { COLORS } from "../constants/colors";
import { storageService } from "../services/storageService";

// ----- Tipos -----
type Props = StackScreenProps<RootStackParamList, "Splash">;

const { width } = Dimensions.get("window");

// Verificar si la bóveda ya está configurada en AsyncStorage
async function bovedaEstaConfigurada(): Promise<boolean> {
  return storageService.bovedaEstaConfigurada();
}

// ----- Componente -----
export default function SplashScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  // Animaciones
  const [logoOpacity] = React.useState(() => new Animated.Value(0));
  const [logoScale] = React.useState(() => new Animated.Value(0.7));
  const [textOpacity] = React.useState(() => new Animated.Value(0));

  useEffect(() => {
    // 1. Animar logo de entrada
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Animar el texto un poco después
    Animated.timing(textOpacity, {
      toValue: 1,
      duration: 600,
      delay: 500,
      useNativeDriver: true,
    }).start();

    // 3. Después de 2.5 seg decidir a qué pantalla navegar
    const timer = setTimeout(async () => {
      const configurada = await bovedaEstaConfigurada();
      navigation.replace(configurada ? "LoginBoveda" : "SetupBoveda");
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      {/* Fondo con circulo decorativo */}
      <View style={styles.circle} />

      {/* Icono / logo */}
      <Animated.View
        style={[
          styles.logoContainer,
          { opacity: logoOpacity, transform: [{ scale: logoScale }] },
        ]}
      >
        <Image
          source={require("../../assets/passnager_logo_1024.png")}
          style={styles.logoImage}
          resizeMode="cover"
        />
      </Animated.View>

      {/* Nombre de la app */}
      <Animated.View style={{ opacity: textOpacity }}>
        <Text style={styles.appName}>Passnager</Text>
        <Text style={styles.tagline}>Tu gestor de contraseñas seguro</Text>
      </Animated.View>

      {/* Version en la parte inferior */}
      <Text
        style={[styles.version, { bottom: Math.max(insets.bottom + 16, 28) }]}
      >
        v0.1.4
      </Text>
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
  },

  // Círculo decorativo de fondo
  circle: {
    position: "absolute",
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: width * 0.6,
    backgroundColor: COLORS.primary,
    opacity: 0.08,
    top: -width * 0.3,
  },

  // Contenedor del icono con efecto de tarjeta
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
    // Sombra (iOS)
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    // Sombra (Android)
    elevation: 12,
  },

  logoImage: {
    width: 120,
    height: 120,
    borderRadius: 28,
  },

  appName: {
    fontSize: 36,
    fontWeight: "700",
    color: COLORS.white,
    textAlign: "center",
    letterSpacing: 1,
  },

  tagline: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 6,
    letterSpacing: 0.4,
  },

  version: {
    position: "absolute",
    bottom: 36,
    fontSize: 12,
    color: COLORS.textMuted,
  },
});
