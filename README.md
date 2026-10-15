# Passnager

> **Gestor de contraseñas seguro, offline y local-first desarrollado con React Native y Expo.**

Passnager es una bóveda de contraseñas móvil diseñada bajo la filosofía **Zero-Knowledge**: tus datos nunca salen de tu dispositivo, no se envían a ningún servidor externo y permanecen cifrados con estándares criptográficos de grado militar (**libsodium / Argon2id / XSalsa20-Poly1305**).

---

## Características Principales

* **Arquitectura Zero-Knowledge**: Solo tú conoces tu contraseña maestra. Tu clave nunca se almacena en disco ni viaja por la red.
* **Criptografía Robusta (libsodium)**:
  * Derivación de clave con **Argon2id** y salt aleatorio de 16 bytes.
  * Cifrado simétrico autenticado con **XSalsa20-Poly1305** y nonces únicos de 24 bytes por cada credencial.
* **Portapapeles Seguro**: Las contraseñas copiadas al portapapeles se borran automáticamente a los 30 segundos.
* **Revelado Temporal**: Las contraseñas descifradas en pantalla se auto-ocultan tras 10 segundos por privacidad.
* **Protección contra Fuerza Bruta**: Bloqueo automático de la interfaz tras 5 intentos fallidos consecutivos.
* **Búsqueda en Tiempo Real**: Filtrado instantáneo de cuentas y servicios sin descifrar masivamente los datos.
* **Diseño Dark Mode Premium**: Interfaz moderna y minimalista con paleta Obsidian/Slate, animaciones fluidas y componentes accesibles.
* **Cobertura de Pruebas & CI**: Suite completa de tests unitarios con Jest y validación continua mediante GitHub Actions.

---

## Requisitos Previos

Antes de comenzar, asegúrate de contar con:

* **Node.js**: Versión `20.x` o superior (se recomienda Node 20 LTS).
* **npm**: Versión `10.x` o superior.
* **Expo Go** o un dispositivo físico / emulador (Android Studio o Xcode).

---

## Instalación y Puesta en Marcha

1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/OswaldoIMC/Passnager.git
   cd Passnager
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```
   *(Nota: `patch-package` se ejecutará automáticamente tras la instalación para aplicar los parches nativos requeridos por `react-native-sodium` y `expo-clipboard`)*.

3. **Iniciar el servidor de desarrollo de Expo**:
   ```bash
   npx expo start
   ```

4. **Ejecutar en tu dispositivo o emulador**:
   * Presiona `a` en la terminal para abrir en un emulador **Android**.
   * Presiona `i` para abrir en el simulador de **iOS**.
   * O escanea el código QR desde la aplicación **Expo Go** en tu teléfono móvil.

---

## Comandos Disponibles

| Comando | Descripción |
| :--- | :--- |
| `npm start` | Inicia el bundler Metro de Expo |
| `npm run android` | Inicia la app directamente orientada a Android |
| `npm run ios` | Inicia la app directamente orientada a iOS |
| `npm run lint` | Ejecuta ESLint (`npx expo lint`) para validar calidad de código |
| `npx tsc --noEmit` | Ejecuta el validador estricto de tipos de TypeScript |
| `npm test` | Ejecuta la suite de pruebas unitarias en Jest |

---

## Arquitectura General

Passnager sigue un patrón por capas desacoplado:

```
src/
├── components/   # Componentes visuales reutilizables (PasswordCard, ModalCredencial, CustomAlert)
├── constants/    # Variables de diseño y paleta de colores
├── context/      # Estado global de sesión y autenticación en memoria (BovedaContext)
├── screens/      # Pantallas principales (Splash, Setup, Login, Vault)
├── services/     # Servicios core con lógica pura (cryptoService, passwordService, storageService, clipboardService)
├── types/        # Definiciones de TypeScript e interfaces de navegación
└── utils/        # Utilidades de validación y cálculo de fuerza
```

Para más detalles sobre diagramas de flujo y patrones de diseño, consulta [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Seguridad y Criptografía

Toda la seguridad de Passnager se apoya en tres principios innegociables:
1. **Nunca almacenar contraseñas en texto plano**.
2. **Nunca almacenar la clave maestra en disco**.
3. **Cada credencial se cifra de forma independiente**.

Consulta la especificación completa, vectores de ataque considerados y advertencias en [SECURITY.md](SECURITY.md).

---

## Contribuciones

¿Quieres colaborar con el proyecto? ¡Eres bienvenido! Lee nuestra guía de contribución y estándares de código en [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Licencia

Este proyecto está bajo la **Licencia Passnager Source-Available** (código abierto para auditoría de seguridad y uso estrictamente personal y no comercial). Queda prohibida la redistribución o explotación comercial no autorizada. Consulta el archivo [LICENSE](LICENSE) para más detalles.
