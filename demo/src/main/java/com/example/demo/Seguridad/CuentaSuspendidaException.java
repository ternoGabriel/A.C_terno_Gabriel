package com.example.demo.Seguridad;

/* cuenta suspendida con datos correctos */
public class CuentaSuspendidaException extends RuntimeException {

    public static final String MENSAJE = "Tu cuenta está suspendida. Comunícate con el administrador.";

    public CuentaSuspendidaException() {
        super(MENSAJE);
    }
}
