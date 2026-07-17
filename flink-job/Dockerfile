FROM maven:3.9-eclipse-temurin-11 AS build

WORKDIR /build
COPY pom.xml .
RUN mvn -B -q dependency:go-offline
COPY src ./src
RUN mvn -B -q package

FROM flink:1.19-scala_2.12-java11

WORKDIR /app
COPY --from=build /build/target/energy-flink-job.jar /app/energy-flink-job.jar
