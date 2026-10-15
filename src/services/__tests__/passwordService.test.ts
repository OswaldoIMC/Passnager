import { passwordService } from "../passwordService";
import { cryptoService } from "../cryptoService";
import { storageService } from "../storageService";

describe("passwordService (Unit Tests)", () => {
  let claveMaestra: Uint8Array;

  beforeEach(async () => {
    // Limpiar almacenamiento antes de cada test
    await storageService.limpiarTodo();
    // Derivar clave de prueba
    const res = await cryptoService.derivarClave("ClaveMaestraDeTest");
    claveMaestra = res.clave;
  });

  describe("addPassword y getPasswords", () => {
    it("agrega una credencial encriptando la contraseña y asignando UUID y fecha", async () => {
      const credencial = await passwordService.addPassword(
        "GitHub",
        "mi_password_secreto",
        claveMaestra
      );

      expect(credencial).toHaveProperty("id");
      expect(credencial.etiqueta).toBe("GitHub");
      // La contraseña almacenada debe estar cifrada y no contener el texto plano
      expect(credencial.contrasena).not.toBe("mi_password_secreto");
      expect(credencial.contrasena).toContain(".");
      expect(credencial.fechaCreacion).toBeGreaterThan(0);
      expect(credencial.ultimaModificacion).toBe(credencial.fechaCreacion);

      // Debe persistir en getPasswords
      const lista = await passwordService.getPasswords();
      expect(lista).toHaveLength(1);
      expect(lista[0].id).toBe(credencial.id);
      expect(lista[0].etiqueta).toBe("GitHub");
    });

    it("agrega múltiples credenciales ordenadas (la más reciente primero)", async () => {
      await passwordService.addPassword("Google", "pass1", claveMaestra);
      await passwordService.addPassword("Netflix", "pass2", claveMaestra);

      const lista = await passwordService.getPasswords();
      expect(lista).toHaveLength(2);
      expect(lista[0].etiqueta).toBe("Netflix");
      expect(lista[1].etiqueta).toBe("Google");
    });

    it("lanza error si la etiqueta está vacía o solo espacios", async () => {
      await expect(
        passwordService.addPassword("   ", "pass", claveMaestra)
      ).rejects.toThrow("La etiqueta no puede estar vacía.");
    });

    it("lanza error si la contraseña está vacía", async () => {
      await expect(
        passwordService.addPassword("Twitter", "", claveMaestra)
      ).rejects.toThrow("La contraseña no puede estar vacía.");
    });

    it("lanza error si la clave maestra es inválida", async () => {
      const claveInvalida = new Uint8Array(10); // Debe ser de 32 bytes
      await expect(
        passwordService.addPassword("Twitter", "pass", claveInvalida)
      ).rejects.toThrow("Clave maestra inválida");
    });
  });

  describe("desencriptarContrasena", () => {
    it("desencripta correctamente la contraseña de una credencial con la clave maestra", async () => {
      const textoOriginal = "SuperPasswordSeguro#99";
      const credencial = await passwordService.addPassword(
        "Banco",
        textoOriginal,
        claveMaestra
      );

      const descifrada = await passwordService.desencriptarContrasena(
        credencial,
        claveMaestra
      );
      expect(descifrada).toBe(textoOriginal);
    });
  });

  describe("updatePassword", () => {
    it("actualiza únicamente la etiqueta manteniendo la contraseña existente", async () => {
      const credencial = await passwordService.addPassword(
        "Spotify Original",
        "mi_clave_spotify",
        claveMaestra
      );

      const actualizada = await passwordService.updatePassword(
        credencial.id,
        "Spotify Premium",
        undefined,
        claveMaestra
      );

      expect(actualizada.etiqueta).toBe("Spotify Premium");
      expect(actualizada.contrasena).toBe(credencial.contrasena);
      expect(actualizada.ultimaModificacion).toBeGreaterThanOrEqual(credencial.fechaCreacion);

      const lista = await passwordService.getPasswords();
      expect(lista[0].etiqueta).toBe("Spotify Premium");
    });

    it("actualiza la contraseña re-encriptándola", async () => {
      const credencial = await passwordService.addPassword(
        "Amazon",
        "clave_vieja",
        claveMaestra
      );

      const actualizada = await passwordService.updatePassword(
        credencial.id,
        "Amazon",
        "clave_nueva_2026",
        claveMaestra
      );

      expect(actualizada.contrasena).not.toBe(credencial.contrasena);

      const descifrada = await passwordService.desencriptarContrasena(
        actualizada,
        claveMaestra
      );
      expect(descifrada).toBe("clave_nueva_2026");
    });

    it("lanza error si la credencial a editar no existe", async () => {
      await expect(
        passwordService.updatePassword("id_inexistente", "Nueva", undefined, claveMaestra)
      ).rejects.toThrow("Credencial no encontrada.");
    });
  });

  describe("deletePassword", () => {
    it("elimina una credencial por su ID", async () => {
      const c1 = await passwordService.addPassword("Servicio 1", "pass1", claveMaestra);
      const c2 = await passwordService.addPassword("Servicio 2", "pass2", claveMaestra);

      let lista = await passwordService.getPasswords();
      expect(lista).toHaveLength(2);

      await passwordService.deletePassword(c1.id);

      lista = await passwordService.getPasswords();
      expect(lista).toHaveLength(1);
      expect(lista[0].id).toBe(c2.id);
    });
  });
});
