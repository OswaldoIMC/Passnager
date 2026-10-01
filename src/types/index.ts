// ----- ESTRUCTURA DE DATOS DE LA APP -----

// Interfaz de credenciales
export interface Credencial {
  id: string;
  etiqueta: string;
  contrasena: string;
  fechaCreacion: number;
  ultimaModificacion: number;
}

// Interfaz del estado de la boveda
export interface EstadoBoveda {
  estaConfigurada: boolean;
  estaDesbloqueada: boolean;
  credenciales: Credencial[];
  intentosFallidos: number;
}

// ----- TIPOS DE NAVEGACIÓN -----

// Parámetros de cada ruta del Stack Navigator
export type RootStackParamList = {
  Splash: undefined;
  SetupBoveda: undefined;
  LoginBoveda: undefined;
  Vault: undefined;
  AddPassword: undefined;
};
