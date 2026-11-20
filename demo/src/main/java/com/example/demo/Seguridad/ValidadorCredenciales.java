package com.example.demo.Seguridad;

import java.util.List;
import java.util.regex.Pattern;

/* reglas del correo y la contrasena de acceso */
public final class ValidadorCredenciales {

    /* correo gmail sin puntos */
    public static final String REGEX_CORREO = "(?i)(?=.{1,50}$)[a-z0-9]+([._+-][a-z0-9]+)*@gmail\\.com";

    /* mas de 8 caracteres */
    public static final String REGEX_CONTRASENA = "(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)\\S{9,72}";

    public static final String EJEMPLO_CONTRASENA = "Luna7Cafe42";

    public static final String MENSAJE_CORREO = "Correo inválido: debe terminar en @gmail.com y no tener puntos de más. Ejemplo: nombre@gmail.com";
    public static final String MENSAJE_CONTRASENA =
        "La contraseña debe tener más de 8 caracteres e incluir mayúsculas, minúsculas y números, sin espacios. Ejemplo: " + EJEMPLO_CONTRASENA;
    public static final String MENSAJE_CONTRASENA_FACIL =
        "Contraseña muy fácil de adivinar: no uses palabras comunes (admin, clave, password…), números seguidos (1234) ni caracteres repetidos (aaa). Ejemplo: "
            + EJEMPLO_CONTRASENA;

    private static final List<String> PALABRAS_FACILES = List.of(
        "admin", "password", "passw0rd", "contrasena", "contraseña", "clave", "qwerty", "asdf", "zxcv",
        "empleado", "usuario", "gabriel", "terno", "peru", "lima", "abc123", "letmein", "welcome");

    private static final Pattern CORREO = Pattern.compile(REGEX_CORREO);
    private static final Pattern CONTRASENA = Pattern.compile(REGEX_CONTRASENA);

    private ValidadorCredenciales() {
    }

    public static boolean correoValido(String correo) {
        return correo != null && CORREO.matcher(correo.trim()).matches();
    }

    /* cumple el formato y ademas no es una contrasena facil */
    public static boolean contrasenaSegura(String contrasena) {
        return contrasena != null && CONTRASENA.matcher(contrasena).matches() && !esFacil(contrasena);
    }

    /* mensaje segun el tipo de error */
    public static String mensajeContrasena(String contrasena) {
        boolean formato = contrasena != null && CONTRASENA.matcher(contrasena).matches();
        return formato ? MENSAJE_CONTRASENA_FACIL : MENSAJE_CONTRASENA;
    }

    /* contrasena facil palabra comun o secuencia */
    static boolean esFacil(String contrasena) {
        String c = contrasena.toLowerCase();
        for (String palabra : PALABRAS_FACILES) {
            if (c.contains(palabra)) return true;
        }
        int iguales = 1;
        int sube = 1;
        int baja = 1;
        for (int i = 1; i < c.length(); i++) {
            int dif = c.charAt(i) - c.charAt(i - 1);
            iguales = dif == 0 ? iguales + 1 : 1;
            sube = dif == 1 ? sube + 1 : 1;
            baja = dif == -1 ? baja + 1 : 1;
            if (iguales >= 3 || sube >= 4 || baja >= 4) return true;
        }
        return false;
    }
}
