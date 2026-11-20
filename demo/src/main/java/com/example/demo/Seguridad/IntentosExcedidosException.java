package com.example.demo.Seguridad;

/* se lanza cuando un usuario supera el maximo de intentos */
public class IntentosExcedidosException extends RuntimeException {

    public IntentosExcedidosException(String mensaje) {
        super(mensaje);
    }
}
