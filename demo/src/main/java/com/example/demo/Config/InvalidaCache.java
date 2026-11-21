package com.example.demo.Config;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import org.springframework.cache.annotation.CacheEvict;

/* borra todos los caches al cambiar datos las listas comparten prendas y clientes */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@CacheEvict(cacheNames = {
    NombresCache.PRENDAS, NombresCache.CLIENTES, NombresCache.BOLETAS, NombresCache.CONFECCIONES,
    NombresCache.PENALIDADES, NombresCache.CONFIGURACION, NombresCache.METODOS_PAGO
}, allEntries = true)
public @interface InvalidaCache {
}
