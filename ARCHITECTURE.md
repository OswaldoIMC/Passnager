# Arquitectura de Passnager

Este documento describe la arquitectura de software, los patrones de diseño y los diagramas de flujo de **Passnager**.

---

## Principios de Diseño

1. **Local-First & Offline**: La aplicación no depende de ninguna conexión a internet, servidor externo o backend. Toda la base de datos reside localmente en el dispositivo.
2. **Zero-Knowledge Architecture**: La aplicación nunca almacena ni conoce la contraseña maestra del usuario. Solo se almacena el material criptográfico necesario para validar el descifrado autenticado.
3. **Separación de Responsabilidades (SoC)**: La interfaz de usuario (pantallas y componentes) no ejecuta operaciones criptográficas directas; delega todas las tareas de datos en capas de servicio dedicadas.
4. **Mínimo Privilegio de Memoria**: La clave derivada de 32 bytes solo reside en memoria RAM durante la sesión activa y se borra inmediatamente al cerrar sesión.

---

## Estructura de Carpetas

```text
Passnager/
├── .github/
│   └── workflows/
│       └── ci.yml               # Pipeline de integración continua (Lint, Typecheck, Tests)
├── assets/                      # Iconos, splash screens e imágenes estáticas
├── patches/                     # Parches locales aplicados mediante patch-package
├── src/
│   ├── components/              # Componentes de presentación y modales reutilizables
│   │   ├── CustomAlert.tsx      # Modal de confirmación y advertencias personalizadas
│   │   ├── ModalCredencial.tsx  # Bottom-sheet para agregar y editar credenciales
│   │   └── PasswordCard.tsx     # Tarjeta de credencial individual (copiar, revelar, editar, eliminar)
│   ├── constants/
│   │   └── colors.js            # Tokens de diseño y paleta de colores Dark Mode
│   ├── context/
│   │   └── BovedaContext.tsx    # Contexto global para la sesión en memoria (RAM)
│   ├── screens/                 # Vistas y pantallas principales de navegación
│   │   ├── SplashScreen.tsx     # Pantalla de carga y decisión de ruta inicial
│   │   ├── SetupBoveda.tsx      # Flujo de bienvenida y creación de contraseña maestra
│   │   ├── LoginBoveda.tsx      # Autenticación y desbloqueo de la bóveda
│   │   └── VaultScreen.tsx      # Pantalla principal con lista y buscador de credenciales
│   ├── services/                # Capa de servicios y lógica pura desacoplada
│   │   ├── __tests__/           # Pruebas unitarias automatizadas con Jest
│   │   │   ├── cryptoService.test.ts
│   │   │   └── passwordService.test.ts
│   │   ├── clipboardService.ts  # Manejo y auto-limpieza segura del portapapeles
│   │   ├── cryptoService.ts     # Wrapper sobre react-native-sodium (Argon2id, XSalsa20-Poly1305)
│   │   ├── passwordService.ts   # CRUD de credenciales con cifrado por ítem
│   │   └── storageService.ts    # Persistencia y serialización en AsyncStorage
│   ├── types/
│   │   └── index.ts             # Modelos de datos TypeScript y rutas de React Navigation
│   └── utils/
│       └── validation.ts        # Cálculo de fuerza de contraseñas y validadores de formato
├── App.tsx                      # Componente raíz con NavigationContainer y Stack Navigator
├── jest.setup.js                # Mocks de testing para AsyncStorage y Sodium en Node
└── package.json                 # Metadatos del proyecto, dependencias y scripts
```

---

## Patrones de Diseño Utilizados

### 1. Service Layer Pattern (Capa de Servicios)
Toda la lógica de negocio y operaciones criptográficas están aisladas en clases singleton de servicio:
* `CryptoService`: Primitivas criptográficas puras (derivación, encriptación, descifrado, generación de bytes aleatorios).
* `PasswordService`: Orquestación del CRUD (genera UUIDs, cifra con la clave maestra en RAM y persiste vía `storageService`).
* `StorageService`: Abstracción única sobre `AsyncStorage` para serializar y deserializar modelos JSON.
* `ClipboardService`: Gestión de copiado al portapapeles con temporizador atómico de autodestrucción.

### 2. Context & State Management Pattern (React Context)
El estado de la sesión activa se administra en `BovedaContext`:
* Mantiene en memoria RAM la `claveMaestra` (`Uint8Array | null`).
* Expone acciones puras (`configurarBoveda`, `intentarLogin`, `cerrarSesion`).
* Protege contra ataques de fuerza bruta manteniendo el contador de `intentosFallidos`.

### 3. Virtualized List Rendering (Rendimiento)
En `VaultScreen`, la visualización de las credenciales se realiza mediante `FlatList` con virtualización nativa:
* Cada tarjeta (`PasswordCard`) gestiona su propio estado local de copiado y revelado temporal.
* Las contraseñas se descifran bajo demanda (Lazy Decryption): nunca se descifran todas las contraseñas de la lista al cargar la pantalla.

---

## Diagramas de Flujo

### 1. Inicialización y Setup de Bóveda (Primera Vez)

```mermaid
sequenceDiagram
    autonumber
    actor Usuario
    participant SetupScreen as SetupBoveda
    participant Crypto as CryptoService (Argon2id)
    participant Storage as StorageService (AsyncStorage)

    Usuario->>SetupScreen: Ingresa contraseña maestra (>= 8 caracteres)
    SetupScreen->>Crypto: derivarClave(password)
    Crypto->>Crypto: Genera salt aleatorio (16 bytes)
    Crypto->>Crypto: Deriva clave de 32 bytes con Argon2id
    Crypto->>Crypto: Cifra texto de verificación con nonce (24 bytes)
    Crypto-->>SetupScreen: Retorna { salt, verificationTag }
    SetupScreen->>Storage: guardarHashMaestro(salt, verificationTag)
    SetupScreen->>Usuario: Bóveda configurada -> Redirige a Login
```

---

### 2. Desbloqueo y Validación de Login

```mermaid
sequenceDiagram
    autonumber
    actor Usuario
    participant LoginScreen as LoginBoveda
    participant BovedaCtx as BovedaContext
    participant Crypto as CryptoService
    participant Storage as StorageService

    Usuario->>LoginScreen: Ingresa contraseña
    LoginScreen->>BovedaCtx: intentarLogin(password)
    BovedaCtx->>Storage: cargarHashMaestro()
    Storage-->>BovedaCtx: Retorna { salt, verificationTag }
    BovedaCtx->>Crypto: verificarContrasena(password, salt, verificationTag)
    Crypto->>Crypto: Deriva clave tentativa con Argon2id + salt
    Crypto->>Crypto: Intenta descifrar verificationTag
    alt Descifrado exitoso (Clave Correcta)
        Crypto-->>BovedaCtx: { ok: true, clave }
        BovedaCtx->>BovedaCtx: Guarda clave en RAM (Uint8Array)
        BovedaCtx->>BovedaCtx: Reset intentos = 0, estaDesbloqueada = true
        BovedaCtx-->>LoginScreen: true -> Navega a VaultScreen
    else Error de autenticación (Clave Incorrecta)
        Crypto-->>BovedaCtx: { ok: false }
        BovedaCtx->>BovedaCtx: intentosFallidos++
        BovedaCtx-->>LoginScreen: false -> Muestra error visual
    end
```

---

### 3. Flujo de Guardado de Credencial (Cifrado Individual)

```mermaid
sequenceDiagram
    autonumber
    actor Usuario
    participant Modal as ModalCredencial
    participant PwService as PasswordService
    participant Crypto as CryptoService (XSalsa20)
    participant Storage as StorageService

    Usuario->>Modal: Ingresa Etiqueta ("GitHub") y Contraseña
    Modal->>PwService: addPassword(etiqueta, passwordPlano, claveMaestraRAM)
    PwService->>Crypto: encriptarContrasena(passwordPlano, claveMaestraRAM)
    Crypto->>Crypto: Genera nonce aleatorio (24 bytes)
    Crypto->>Crypto: Cifra con crypto_secretbox_easy
    Crypto-->>PwService: Retorna "nonce.cipher"
    PwService->>PwService: Crea objeto Credencial con UUID y timestamps
    PwService->>Storage: guardarCredenciales(listaActualizada)
    Storage-->>PwService: OK
    PwService-->>Modal: Credencial persistida
    Modal-->>Usuario: Cierra modal y actualiza lista
```

---

### 4. Flujo de Portapapeles y Limpieza de Memoria

```mermaid
sequenceDiagram
    autonumber
    actor Usuario
    participant Card as PasswordCard
    participant PwService as PasswordService
    participant Clipboard as ClipboardService
    participant SO as Sistema Operativo

    Usuario->>Card: Clic en botón "Copiar"
    Card->>PwService: desencriptarContrasena(credencial, claveMaestraRAM)
    PwService-->>Card: Contraseña en texto plano
    Card->>Clipboard: copiarConAutolimpieza(textoPlano, duracion = 30s)
    Clipboard->>SO: Clipboard.setStringAsync(textoPlano)
    Clipboard->>Clipboard: Inicia temporizador setTimeout (30s)
    Note over Clipboard,SO: Tras 30 segundos
    Clipboard->>SO: Clipboard.setStringAsync("") (Limpia portapapeles)
    Clipboard->>Clipboard: Descarta estado interno de copia
```
