FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY demo/pom.xml .
COPY demo/src ./src
RUN mvn -B -DskipTests clean package

FROM eclipse-temurin:21-jre
WORKDIR /app
RUN useradd --system --no-create-home spring
COPY --from=build /app/target/demo-0.0.1-SNAPSHOT.jar app.jar
RUN mkdir -p /app/logs && chown -R spring:spring /app
USER spring

ENV JAVA_OPTS="-XX:MaxRAMPercentage=70 -XX:+UseSerialGC -Xss512k"
ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]