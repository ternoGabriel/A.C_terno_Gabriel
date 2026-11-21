package com.example.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

/* activa el cache en memoria */
@EnableCaching
@SpringBootApplication
public class DemoApplication {

	public static void main(String[] args) {
		/* misma zona horaria que el navegador del usuario */
		java.util.TimeZone.setDefault(java.util.TimeZone.getTimeZone("America/Lima"));
		SpringApplication.run(DemoApplication.class, args);
	}

}
