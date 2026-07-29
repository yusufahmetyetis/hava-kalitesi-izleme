#!/usr/bin/env bash
#
# Her iki Flink job container'ının ortak giriş noktası.
#
# Kullanım: submit-job.sh <ana-sınıf> <jar-yolu> <job-adı>
#
# Neden var: compose'daki `flink run` + `restart: on-failure` ikilisi tek başına şu tuzağı
# üretiyordu — container yeniden yaratıldığında (örn. `docker compose up -d --build` sonrası)
# cluster'daki ESKİ job çalışmaya devam ediyor ve slot'u tutuyor; yeni container ikinci bir
# kopya submit etmeye çalışıp "NoResourceAvailableException: Could not acquire the minimum
# required resources" alıyor, exit ediyor, restart politikası tekrar deniyor ve bu sonsuza
# kadar sürüyor. Sonuç: rebuild yapılmasına rağmen cluster eski jar'ı çalıştırmaya devam
# ediyor ve bu sessizce oluyor (container "restarting", job "RUNNING" göründüğü için).
#
# Çözüm: submit'ten önce aynı ada sahip çalışan job'lar iptal edilir, böylece deploy
# idempotent olur. Job'lar checkpoint'li değil (MqttSourceFunction "at-least-effort"),
# dolayısıyla iptal edilip yeniden başlatılmasında kaybedilen kalıcı durum yok.
set -euo pipefail

JOB_CLASS="$1"
JAR_PATH="$2"
JOB_NAME="$3"

JM_HOST="${FLINK_JOBMANAGER_HOST:-flink-jobmanager}"
JM_PORT="${FLINK_JOBMANAGER_PORT:-8081}"
JM="${JM_HOST}:${JM_PORT}"

wait_for() {
    local host="$1" port="$2" label="$3"
    echo "[submit-job] ${label} (${host}:${port}) bekleniyor..."
    until (exec 3<>"/dev/tcp/${host}/${port}") 2>/dev/null; do sleep 1; done
    echo "[submit-job] ${label} hazır."
}

# Sabit `sleep 15` yerine gerçek hazır-olma beklemesi: timescaledb DNS/bağlantısı hazır
# olmadan submit edilen job UnknownHostException ile FAILED oluyordu.
wait_for "${DB_HOST:-timescaledb}" "${DB_PORT:-5432}" "TimescaleDB"
wait_for "${JM_HOST}" "${JM_PORT}" "Flink JobManager"

# `flink list -r` satır formatı:
#   29.07.2026 09:51:08 : ee596bdbe631b14daff6f28e0c7790ee : AQI MQTT to TimescaleDB Job (RUNNING)
# job id 4. alan. Ada göre eşleşirken " : " ve "(" ile sınırlıyoruz ki başka bir job'ın
# adı bunu kapsıyorsa yanlışlıkla onu iptal etmeyelim.
# grep hiçbir şey bulamazsa 1 döner; `set -e` altında pipeline'ı düşürmemesi için `|| true`.
STALE_IDS="$(flink list -r -m "${JM}" 2>/dev/null | grep -F " : ${JOB_NAME} (" | awk '{print $4}' || true)"

for id in ${STALE_IDS}; do
    echo "[submit-job] Eski '${JOB_NAME}' job'u bulundu (${id}), iptal ediliyor..."
    flink cancel -m "${JM}" "${id}" || echo "[submit-job] ${id} iptal edilemedi, devam ediliyor."
done

echo "[submit-job] '${JOB_NAME}' submit ediliyor (${JOB_CLASS})"
exec flink run -m "${JM}" -c "${JOB_CLASS}" "${JAR_PATH}"
