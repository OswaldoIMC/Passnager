// ----- PANTALLA PRINCIPAL DE LA BOVEDA -----

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StackScreenProps } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList, Credencial } from "../types";
import { COLORS } from "../constants/colors";
import { useBoveda } from "../context/BovedaContext";
import { passwordService } from "../services/passwordService";
import PasswordCard from "../components/PasswordCard";
import ModalCredencial from "../components/ModalCredencial";

type Props = StackScreenProps<RootStackParamList, "Vault">;

export default function VaultScreen({ navigation }: Props) {
  const { claveMaestra, estaDesbloqueada, cerrarSesion } = useBoveda();

  // Estados principales
  const [credenciales, setCredenciales] = useState<Credencial[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  // Estado para toast flotante de copiado
  const [toastMensaje, setToastMensaje] = useState<string | null>(null);
  const toastAnim = useState(new Animated.Value(0))[0];

  // Estado para el modal de agregar/editar credenciales
  const [modalVisible, setModalVisible] = useState(false);
  const [credencialEditando, setCredencialEditando] =
    useState<Credencial | null>(null);

  // Redirigir a Login si la boveda no esta desbloqueada o no hay clave
  useEffect(() => {
    if (!estaDesbloqueada || !claveMaestra) {
      navigation.replace("LoginBoveda");
    }
  }, [estaDesbloqueada, claveMaestra]);

  // ----- Cargar credenciales desde storage -----
  const cargarCredenciales = useCallback(async () => {
    try {
      const lista = await passwordService.getPasswords();
      setCredenciales(lista);
    } catch (e) {
      console.error("[VaultScreen] Error cargando credenciales:", e);
      Alert.alert("Error", "No se pudieron cargar las contraseñas.");
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, []);

  useEffect(() => {
    cargarCredenciales();
  }, [cargarCredenciales]);

  const onRefresh = useCallback(() => {
    setRefrescando(true);
    cargarCredenciales();
  }, [cargarCredenciales]);

  // ----- Filtrado en tiempo real por busqueda -----
  const credencialesFiltradas = useMemo(() => {
    if (!busqueda.trim()) return credenciales;
    const q = busqueda.trim().toLowerCase();
    return credenciales.filter((c) => c.etiqueta.toLowerCase().includes(q));
  }, [credenciales, busqueda]);

  // ----- Feedback Toast al copiar -----
  function mostrarToast(etiqueta: string) {
    setToastMensaje(`Contraseña de "${etiqueta}" copiada`);
    Animated.sequence([
      Animated.timing(toastAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.delay(2200),
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setToastMensaje(null));
  }

  // ----- Eliminar credencial con confirmacion -----
  function handleEliminar(id: string, etiqueta: string) {
    Alert.alert(
      "Eliminar credencial",
      `¿Deseas eliminar la contraseña de "${etiqueta}"? Esta acción no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await passwordService.deletePassword(id);
              setCredenciales((prev) => prev.filter((c) => c.id !== id));
            } catch {
              Alert.alert("Error", "No se pudo eliminar la credencial.");
            }
          },
        },
      ],
    );
  }

  // ----- Cerrar sesion -----
  function handleCerrarSesion() {
    Alert.alert(
      "Cerrar sesión",
      "¿Seguro que deseas bloquear la bóveda y salir?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Bloquear Bóveda",
          style: "destructive",
          onPress: () => {
            cerrarSesion();
            navigation.replace("LoginBoveda");
          },
        },
      ],
    );
  }

  // ----- Editar credencial -----
  function handleEditar(credencial: Credencial) {
    setCredencialEditando(credencial);
    setModalVisible(true);
  }

  // ----- Callback cuando el modal guarda exitosamente -----
  function handleModalSaved(credencial: Credencial, esEdicion: boolean) {
    if (esEdicion) {
      // Reemplazar la credencial actualizada en la lista local
      setCredenciales((prev) =>
        prev.map((c) => (c.id === credencial.id ? credencial : c)),
      );
    } else {
      // Agregar la nueva credencial al inicio de la lista
      setCredenciales((prev) => [credencial, ...prev]);
    }
  }

  // ----- Render -----
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header superior */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={styles.logoBadge}>
            <Ionicons
              name="shield-checkmark"
              size={20}
              color={COLORS.primary}
            />
          </View>
          <View>
            <Text style={styles.titulo}>Mi Bóveda</Text>
            <Text style={styles.subtitulo}>
              {credenciales.length === 1
                ? "1 credencial guardada"
                : `${credenciales.length} credenciales guardadas`}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.cerrarSesionBtn}
          onPress={handleCerrarSesion}
          activeOpacity={0.7}
          testID="btn-cerrar-sesion"
        >
          <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
        </TouchableOpacity>
      </View>

      {/* Buscador */}
      <View style={styles.searchWrapper}>
        <Ionicons
          name="search-outline"
          size={18}
          color={COLORS.textMuted}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="Buscar por servicio o etiqueta..."
          placeholderTextColor={COLORS.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          testID="input-search-vault"
        />
        {busqueda.length > 0 && (
          <TouchableOpacity
            onPress={() => setBusqueda("")}
            style={styles.clearSearchBtn}
          >
            <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Lista de contraseñas */}
      {cargando ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Desbloqueando bóveda...</Text>
        </View>
      ) : (
        <FlatList
          data={credencialesFiltradas}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PasswordCard
              credencial={item}
              onDelete={handleEliminar}
              onEdit={handleEditar}
              onCopiedFeedback={mostrarToast}
            />
          )}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refrescando}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBg}>
                <Ionicons
                  name={busqueda ? "search" : "key-outline"}
                  size={46}
                  color={COLORS.primary}
                />
              </View>
              <Text style={styles.emptyTitle}>
                {busqueda ? "Sin resultados" : "Tu bóveda está vacía"}
              </Text>
              <Text style={styles.emptySub}>
                {busqueda
                  ? `No se encontró ninguna credencial con "${busqueda}"`
                  : "Toca el botón '+' abajo para guardar tu primera contraseña cifrada."}
              </Text>
            </View>
          }
        />
      )}

      {/* Boton flotante para agregar contraseña */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          setCredencialEditando(null);
          setModalVisible(true);
        }}
        activeOpacity={0.85}
        testID="btn-fab-agregar"
      >
        <Ionicons name="add" size={32} color={COLORS.white} />
      </TouchableOpacity>

      {/* Toast flotante de confirmacion de copiado */}
      {toastMensaje && (
        <Animated.View
          style={[
            styles.toast,
            {
              opacity: toastAnim,
              transform: [
                {
                  translateY: toastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Ionicons
            name="checkmark-circle"
            size={18}
            color={COLORS.success}
            style={{ marginRight: 8 }}
          />
          <Text style={styles.toastText}>{toastMensaje}</Text>
        </Animated.View>
      )}

      {/* Modal para agregar/editar credenciales */}
      <ModalCredencial
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setCredencialEditando(null);
        }}
        onSaved={handleModalSaved}
        credencialEditar={credencialEditando}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },

  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "rgba(45, 152, 176, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(45, 152, 176, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  titulo: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.white,
  },

  subtitulo: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  cerrarSesionBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(248, 81, 73, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(248, 81, 73, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },

  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 12,
    height: 46,
  },

  searchIcon: {
    marginRight: 8,
  },

  searchInput: {
    flex: 1,
    color: COLORS.white,
    fontSize: 14,
    height: "100%",
  },

  clearSearchBtn: {
    padding: 4,
  },

  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 90,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },

  loadingText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },

  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingHorizontal: 30,
  },

  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(45, 152, 176, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.white,
    marginBottom: 8,
  },

  emptySub: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 19,
  },

  fab: {
    position: "absolute",
    right: 22,
    bottom: 26,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },

  toast: {
    position: "absolute",
    bottom: 96,
    alignSelf: "center",
    backgroundColor: "rgba(22, 27, 34, 0.95)",
    borderWidth: 1,
    borderColor: COLORS.success,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },

  toastText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "600",
  },
});
