package com.example.demo.Controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/* rutas privadas exigen haber iniciado sesion */
@RestController
@RequestMapping("/privado")
public class PrivateController {

    @GetMapping("/home")
    public String home() {
        return "Vista Privada de Marcos Web";
    }

    /* acceso solo al rol admin */
    @GetMapping("/admin")
    @PreAuthorize("hasAuthority('ADMIN')")
    public String admin() {
        return "Vista Admin de Marcos Web";
    }
}
