# Política y Especificación de Seguridad de Passnager

La seguridad y la privacidad son los pilares fundamentales sobre los cuales se concibió **Passnager**. Este documento detalla nuestro modelo de amenazas, cómo se protegen los datos en reposo y en tránsito, y las limitaciones conocidas de seguridad.

---

## 1. Filosofía Zero-Knowledge

Passnager opera bajo un modelo estricto de **conocimiento cero (Zero-Knowledge)**:
* **Sin servidores ni telemetría**: La aplicación no tiene dependencias de servidores en la nube, bases de datos remotas ni analíticas externas.
* **Tú tienes la única llave**: Tu contraseña maestra es el único secreto capaz de derivar la clave que descifra tu bóveda. Nadie (ni los desarrolladores de Passnager ni terceros) puede descifrar tus contraseñas sin ella.
* **Sin puerta trasera (Backdoor-Free)**: No existe mecanismo de *"recuperación de contraseña"* o *"reset por email"*. Si olvidas tu contraseña maestra, los datos son irrecuperables por diseño matemático.

---

## 2. Cómo Guardamos Datos

Toda la información de la aplicación se almacena localmente en el dispositivo utilizando `AsyncStorage`. Los registros se dividen en dos claves aisladas:

### A. Datos del Hash Maestro (`@passnager/hash_datos`)
Al configurar la bóveda por primera vez en el setup, **nunca se almacena la contraseña maestra**. En su lugar, se guarda únicamente:
1. `salt`: Cadena en Base64 de 16 bytes generados aleatoriamente por hardware criptográfico (`Sodium.randombytes_buf`).
2. `verificationTag`: Cadena con formato `${nonce}.${cipher}` en Base64. Corresponde al cifrado autenticado de una constante de verificación interna (`"boveda-verificacion-ok"`) cifrada con la clave derivada.

> **Propósito**: Durante el inicio de sesión, la app toma la contraseña ingresada por el usuario, re-deriva la clave con el `salt` guardado e intenta descifrar el `verificationTag`. Si el descifrado autenticado tiene éxito, la contraseña es correcta y se retiene la clave derivada en RAM; de lo contrario, se rechaza sin exponer ningún secreto.

### B. Lista de Credenciales (`@passnager/credenciales`)
Array JSON serializado donde cada objeto `Credencial` almacena:
```typescript
{
  id: string;               // UUID v4 único
  etiqueta: string;         // Nombre del servicio (ej. "GitHub", "Gmail")
  contrasena: string;       // Formato: "${nonceB64}.${cipherB64}" (YA CIFRADA)
  fechaCreacion: number;    // Timestamp Unix
  ultimaModificacion: number;
}
```

---

## 3. Qué Está Encriptado y Algoritmos Utilizados

| Componente | Algoritmo / Primitiva | Biblioteca | Parámetros de Seguridad |
| :--- | :--- | :--- | :--- |
| **Derivación de Clave (KDF)** | **Argon2id** (`crypto_pwhash`) | `react-native-sodium` (libsodium nativo) | Clave de 32 bytes (256 bits), salt aleatorio de 16 bytes, `OPSLIMIT_MIN`, `MEMLIMIT_MIN` |
| **Cifrado Simétrico** | **XSalsa20-Poly1305** (`crypto_secretbox`) | `react-native-sodium` (libsodium nativo) | Cifrado autenticado (AEAD), nonces únicos de 24 bytes por credencial |
| **Generador de Números Pseudoaleatorios (CSPRNG)** | `randombytes_buf` | `react-native-sodium` / kernel OS | Hardware entropy del sistema operativo |

### Aislamiento por Credencial
Cada contraseña se cifra con un **nonce nuevo e irrepetible de 24 bytes**. Incluso si dos credenciales tienen exactamente la misma contraseña, sus cadenas cifradas resultantes serán completamente distintas, previniendo ataques de análisis de patrones y tablas arcoíris.

---

## 4. Manejo de Memoria y Mitigaciones en RAM

* **Clave Maestra en RAM**: La clave de 32 bytes (`Uint8Array`) solo reside en el estado de React (`BovedaContext`) mientras la bóveda está desbloqueada.
* **Destrucción de Clave al Cerrar Sesión**: Al presionar *"Cerrar Sesión"*, la referencia a la clave se reasigna a `null` y el estado pasa a `estaDesbloqueada = false`.
* **Revelado Temporal (Auto-Hide)**: Al pulsar el botón de revelar contraseña en una tarjeta, se muestra el texto plano en pantalla y se activa un temporizador que a los **10 segundos** oculta automáticamente la contraseña y purga el string descifrado en memoria.
* **Auto-Limpieza del Portapapeles (Clipboard Wipe)**: Cuando el usuario copia una contraseña, `clipboardService` programa una tarea que borra el portapapeles tras **30 segundos**, reduciendo la ventana de exposición ante aplicaciones espía con acceso al portapapeles del sistema operativo.
* **Límite de Intentos Fallidos**: Se bloquea el acceso tras **5 intentos fallidos** consecutivos para evitar ataques de fuerza bruta automatizados directamente en la pantalla de login.

---

## 5. Limitaciones Conocidas y Responsabilidades del Usuario

Ningún sistema de seguridad es absoluto. Como usuario o auditor de Passnager, ten en cuenta las siguientes consideraciones:

1. **Dispositivos Rooteados o con Jailbreak**:
   Si el dispositivo está rooteado (Android) o con jailbreak (iOS), el aislamiento de procesos del sistema operativo (sandbox) se encuentra comprometido. Aplicaciones con permisos de superusuario podrían leer la memoria de cualquier proceso.
2. **Teclados de Terceros**:
   Si utilizas teclados no oficiales o con funciones en la nube (cloud predictive text), estos podrían registrar las pulsaciones de teclas (keylogging) a nivel del sistema operativo. Se recomienda utilizar el teclado predeterminado del fabricante.
3. **Pérdida de la Contraseña Maestra**:
   No existe soporte técnico ni mecanismo de recuperación. Es responsabilidad del usuario memorizar o respaldar en un lugar físico seguro su contraseña maestra.
4. **Respaldos de Datos**:
   Al desinstalar la aplicación o limpiar los datos del almacenamiento de la app en los ajustes del sistema operativo, la base de datos local de contraseñas se eliminará permanentemente.

---

## Divulgación Responsable de Vulnerabilidades

Si descubres una posible vulnerabilidad o fallo de seguridad en Passnager, por favor **no abras un issue público** en GitHub.

Envía un reporte detallado con los pasos de reproducción al correo del mantenedor del proyecto o contacta de forma privada al equipo a través del repositorio en GitHub. Responderemos y trabajaremos en una solución con la máxima prioridad.
