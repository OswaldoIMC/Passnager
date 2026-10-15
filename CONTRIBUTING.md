# Guía de Contribución a Passnager

¡Gracias por tu interés en contribuir a **Passnager**! Para mantener la calidad del software, la seguridad criptográfica y la estabilidad del proyecto, solicitamos a todos los colaboradores seguir estas pautas.

---

## Flujo de Trabajo (Git Workflow)

1. **Fork y Clonar**:
   Haz un fork del repositorio en GitHub y clónalo en tu entorno local:
   ```bash
   git clone https://github.com/<tu-usuario>/Passnager.git
   cd Passnager
   ```

2. **Crear una rama para tu feature o fix**:
   Usa un nombre descriptivo para la rama:
   ```bash
   git checkout -b feature/nombre-funcionalidad
   # o para correcciones:
   git checkout -b fix/descripcion-del-bug
   ```

3. **Instalar dependencias y verificar entorno**:
   ```bash
   npm install
   npm test
   ```

4. **Hacer commits siguiendo la convención**:
   Consulta la sección de [Convención de Commits](#-convención-de-commits) más abajo.

5. **Asegurar que todas las comprobaciones pasen localmente**:
   ```bash
   npm run lint        # Debe pasar sin errores ni advertencias
   npx tsc --noEmit    # Debe compilar con 0 errores de TypeScript
   npm test            # Todos los tests deben pasar al 100%
   ```

6. **Crear un Pull Request**:
   Sube tu rama y abre un Pull Request contra la rama `main` del repositorio oficial. Describe claramente el cambio realizado, el problema que resuelve y las pruebas ejecutadas.

---

## Convención de Commits

Seguimos el estándar **Conventional Commits** para mantener un historial claro y comprensible:

| Prefijo | Propósito | Ejemplo |
| :--- | :--- | :--- |
| `feat:` | Nueva funcionalidad | `feat: Agregar generador de contraseñas aleatorias` |
| `fix:` | Corrección de un bug | `fix: Limpiar temporizador de portapapeles al desmontar` |
| `refactor:` | Refactorización de código sin cambio funcional | `refactor: Modularizar métodos de derivación de clave` |
| `test:` | Adición o corrección de pruebas | `test: Agregar tests unitarios para passwordService` |
| `docs:` | Actualización de documentación | `docs: Actualizar especificación de seguridad en SECURITY.md` |
| `style:` | Formato, espacios, linting o estilos visuales | `style: Ajustar espaciados según ESLint` |
| `ci:` | Cambios en workflows de CI o configuración | `ci: Configurar cache de npm en GitHub Actions` |

---

## Estándares de Código

### 1. TypeScript Estricto
* Toda nueva función, clase o componente debe contar con tipado explícito.
* Evita el uso de `any`; utiliza tipos discriminados, genéricos o `unknown` con type guards cuando corresponda.
* Reutiliza las interfaces definidas en `src/types/index.ts`.

### 2. Estilo y Calidad (ESLint)
* Respeta la configuración de `eslint-config-expo`.
* Cumple las reglas de React Hooks (`react-hooks/rules-of-hooks`, `react-hooks/exhaustive-deps`).
* Evita llamar `setState` sincrónicamente dentro de cuerpos de `useEffect` (usa el patrón de derivación de estado o banderas de cancelación para tareas asíncronas).

### 3. Seguridad y Manejo de Datos Sensibles
* **Prohibido agregar `console.log` con datos sensibles**: Nunca imprimas contraseñas, claves maestras, arrays `Uint8Array`, salts o ciphertext en la consola.
* Los únicos logs permitidos son `console.error` o `console.warn` para capturar objetos de error genéricos dentro de bloques `catch`.
* Asegúrate de limpiar siempre en memoria cualquier referencia a contraseñas descifradas en cuanto no se utilicen.

### 4. Pruebas Automatizadas
* Si agregas un nuevo método a `cryptoService`, `passwordService`, `storageService` o `clipboardService`, **debes acompañarlo de su respectivo test unitario** en `src/services/__tests__/`.
* No mockees la lógica de negocio; mockea únicamente APIs del sistema operativo o dependencias nativas externas.

### 5. Documentación Interna (JSDoc)
* Todo método público de un servicio debe documentarse con comentarios JSDoc explicando:
  * Qué hace.
  * `@param` esperados y sus restricciones.
  * `@returns` devuelto.
  * Posibles excepciones que puede lanzar.

---

## Integración Continua (CI)

Cada Pull Request disparará automáticamente el flujo de **GitHub Actions** (`ci.yml`), el cual validará:
1. `npm run lint`
2. `npx tsc --noEmit`
3. `npm test`

Un Pull Request solo podrá fusionarse si **todas las comprobaciones pasan en verde**.

---

## Acuerdo de Licencia de Contribuciones

Al enviar un Pull Request o aportar código al proyecto Passnager, aceptas y reconoces que:

1. **Derechos de explotación y distribución**: Concedes a **OswaldoIMC** (titular y mantenedor del proyecto) una licencia mundial, perpetua, irrevocable, libre de regalías, no exclusiva y transferible para usar, compilar, modificar, empaquetar, distribuir y comercializar tus contribuciones como parte integral de Passnager en cualquier plataforma, formato o tienda de aplicaciones (incluyendo Google Play Store, Apple App Store u otras).
2. **Autoría legítima**: Declaras y garantizas que el código aportado es de tu autoría original o que posees las autorizaciones legales necesarias para conceder dicha licencia sin infringir derechos de terceros ni patentes.
3. **Sujeción a la Licencia**: Todas las contribuciones aceptadas quedarán reguladas bajo los términos de la **Licencia Passnager Source-Available** descrita en el archivo [LICENSE](LICENSE).
