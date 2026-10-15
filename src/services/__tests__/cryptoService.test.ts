import {
  cryptoService,
  bytesToBase64,
  base64ToBytes,
  utf8ToBytes,
  bytesToUtf8,
  utf8ToBase64,
  base64ToUtf8,
} from "../cryptoService";

describe("cryptoService (Unit Tests)", () => {
  describe("Helpers de codificación y conversión", () => {
    it("convierte strings UTF-8 a bytes y viceversa", () => {
      const texto = "Passnager! 123456";
      const bytes = utf8ToBytes(texto);
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBeGreaterThan(0);
      const decodificado = bytesToUtf8(bytes);
      expect(decodificado).toBe(texto);
    });

    it("convierte bytes a Base64 y viceversa", () => {
      const original = new Uint8Array([0, 15, 255, 128, 42, 99]);
      const b64 = bytesToBase64(original);
      expect(typeof b64).toBe("string");
      const recuperado = base64ToBytes(b64);
      expect(Array.from(recuperado)).toEqual(Array.from(original));
    });

    it("convierte UTF-8 directo a Base64 y viceversa", () => {
      const mensaje = "Hola, Passnager!";
      const b64 = utf8ToBase64(mensaje);
      const texto = base64ToUtf8(b64);
      expect(texto).toBe(mensaje);
    });
  });

  describe("Test generación de random", () => {
    it("genera contraseñas aleatorias de la longitud especificada", async () => {
      const pass1 = await cryptoService.generarContrasenaAleatoria(16);
      const pass2 = await cryptoService.generarContrasenaAleatoria(24);
      expect(pass1).toHaveLength(16);
      expect(pass2).toHaveLength(24);
      expect(pass1).not.toBe(pass2);
    });

    it("utiliza 20 caracteres por defecto", async () => {
      const pass = await cryptoService.generarContrasenaAleatoria();
      expect(pass).toHaveLength(20);
    });
  });

  describe("Test derivación de contraseña", () => {
    it("deriva una clave de 32 bytes y genera un salt aleatorio nuevo", async () => {
      const { clave, saltB64 } = await cryptoService.derivarClave(
        "MiSuperPassword123!",
      );
      expect(clave).toBeInstanceOf(Uint8Array);
      expect(clave.length).toBe(32);
      expect(typeof saltB64).toBe("string");
      expect(saltB64.length).toBeGreaterThan(0);
    });

    it("re-deriva la misma clave cuando se proporciona el mismo salt", async () => {
      const res1 = await cryptoService.derivarClave("MiPassword");
      const res2 = await cryptoService.derivarClave("MiPassword", res1.saltB64);
      expect(Array.from(res2.clave)).toEqual(Array.from(res1.clave));
      expect(res2.saltB64).toBe(res1.saltB64);
    });

    it("deriva claves distintas para contraseñas diferentes con el mismo salt", async () => {
      const res1 = await cryptoService.derivarClave("PasswordA");
      const res2 = await cryptoService.derivarClave("PasswordB", res1.saltB64);
      expect(Array.from(res2.clave)).not.toEqual(Array.from(res1.clave));
    });
  });

  describe("Test encriptación / desencriptación", () => {
    it("encripta y desencripta correctamente una contraseña individual", async () => {
      const { clave } = await cryptoService.derivarClave("ClaveMaestraTest");
      const textoPlano = "PasswordSecreto_#2026";

      const encriptado = await cryptoService.encriptarContrasena(
        textoPlano,
        clave,
      );
      expect(typeof encriptado).toBe("string");
      expect(encriptado).toContain(".");
      expect(encriptado).not.toContain(textoPlano);

      const descifrado = await cryptoService.desencriptarContrasena(
        encriptado,
        clave,
      );
      expect(descifrado).toBe(textoPlano);
    });

    it("falla al intentar descifrar con una clave incorrecta", async () => {
      const { clave: clave1 } =
        await cryptoService.derivarClave("ClaveCorrecta");
      const { clave: clave2 } =
        await cryptoService.derivarClave("ClaveEquivocada");

      const encriptado = await cryptoService.encriptarContrasena(
        "DatosPrivados",
        clave1,
      );

      await expect(
        cryptoService.desencriptarContrasena(encriptado, clave2),
      ).rejects.toThrow();
    });

    it("falla al desencriptar si el formato del ciphertext es inválido", async () => {
      const { clave } = await cryptoService.derivarClave("ClaveTest");
      await expect(
        cryptoService.desencriptarContrasena("formatoInvalidoSinPunto", clave),
      ).rejects.toThrow("Formato de cifrado inválido");
    });
  });

  describe("Test verificación de hash maestro", () => {
    it("crea el hash maestro con salt y verificationTag", async () => {
      const datosHash = await cryptoService.crearHashMaestro(
        "MiClaveMaestraSegura",
      );
      expect(datosHash).toHaveProperty("salt");
      expect(datosHash).toHaveProperty("verificationTag");
      expect(datosHash.verificationTag).toContain(".");
    });

    it("verifica exitosamente la contraseña correcta", async () => {
      const pass = "ContraseñaDePrueba123";
      const datosHash = await cryptoService.crearHashMaestro(pass);

      const resultado = await cryptoService.verificarContrasena(
        pass,
        datosHash.salt,
        datosHash.verificationTag,
      );

      expect(resultado.ok).toBe(true);
      if (resultado.ok) {
        expect(resultado.clave).toBeInstanceOf(Uint8Array);
        expect(resultado.clave.length).toBe(32);
      }
    });

    it("falla la verificación cuando la contraseña es incorrecta", async () => {
      const datosHash =
        await cryptoService.crearHashMaestro("ContraseñaOriginal");

      const resultado = await cryptoService.verificarContrasena(
        "ContraseñaIncorrecta",
        datosHash.salt,
        datosHash.verificationTag,
      );

      expect(resultado.ok).toBe(false);
    });
  });
});
