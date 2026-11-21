package com.example.demo.Config;

import java.time.Duration;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.cache.transaction.TransactionAwareCacheManagerProxy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import com.github.benmanes.caffeine.cache.Caffeine;

@Configuration
public class CacheConfig {

    /* cache en la memoria del servidor sin servicios externos */
    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager gestor = new CaffeineCacheManager(NombresCache.TODOS);
        gestor.setCaffeine(Caffeine.newBuilder()
            /* red de seguridad si alguien cambia la base por fuera */
            .expireAfterWrite(Duration.ofMinutes(10))
            /* si falta memoria el sistema libera el cache en vez de caerse */
            .softValues());
        /* el borrado se aplica solo despues de confirmar la transaccion */
        return new TransactionAwareCacheManagerProxy(gestor);
    }
}
