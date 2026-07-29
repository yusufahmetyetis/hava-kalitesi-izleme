# build context artık repo kökü (docker-compose.yml'de context: .), çünkü bu job
# flink-common modülüne bağımlı ve Docker context dışındaki dosyaları kopyalayamıyor.
FROM maven:3.9-eclipse-temurin-11 AS build

WORKDIR /build

# Önce sadece pom'lar: bağımlılık katmanı src değişince yeniden indirilmesin.
# energy olmayan modülün pom'u da gerekiyor, çünkü parent onu <modules> içinde listeliyor
# ve Maven reaktörü eksik modül pom'uyla açılmıyor.
COPY pom.xml .
COPY flink-common/pom.xml flink-common/
COPY flink-job/pom.xml flink-job/
COPY aqi-flink-job/pom.xml aqi-flink-job/
RUN mvn -B -q -pl flink-job -am dependency:go-offline

COPY flink-common/src flink-common/src
COPY flink-job/src flink-job/src
RUN mvn -B -q -pl flink-job -am package

FROM flink:1.19-scala_2.12-java11

WORKDIR /app
COPY --from=build /build/flink-job/target/energy-flink-job.jar /app/energy-flink-job.jar
