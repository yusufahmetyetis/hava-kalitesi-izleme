package com.aqipipeline.process;

import com.aqipipeline.model.AqiReading;
import org.apache.flink.api.common.state.ValueState;
import org.apache.flink.api.common.state.ValueStateDescriptor;
import org.apache.flink.configuration.Configuration;
import org.apache.flink.streaming.api.functions.KeyedProcessFunction;
import org.apache.flink.util.Collector;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Istasyon basina en son gorulen measured_at'i state'te tutar; ayni ya da daha eski measured_at'li
 * mesajlari DUSURUR.
 *
 * WAQI ayni fiziksel olcumu her poll turunda (~5 dk'da bir, WAQI saatlik guncelledigi icin saatte
 * ~12 kez) ayni measured_at ile yeniden yayinliyor. Tekillestirme fan-out'tan ONCE yapilir ki uc
 * tuketici de (raw-readings sink, pencere agregasyonu, anomali dedektoru) temiz akis gorsun:
 *   - Anomali dedektoru: EMA'yi ayni degerle defalarca guncellemez (belgelenen coklu-ornekli
 *     yumusatma boylece gercekten calisir), mukerrer anomali side-output'u uretmez.
 *   - AnomalySink: ayni olcum icin mukerrer aqi_anomalies satiri yazilmaz.
 *
 * Not: RawReadingsSink zaten ON CONFLICT (station_id, measured_at) DO NOTHING kullaniyordu; bu
 * operator o mukerrerlerin kaynaga hic ulasmamasini saglar, ON CONFLICT geriye guvenlik agi olur.
 *
 * Flink checkpointing kapali (bkz. PROD-HAZIRLIK 3.1): job restart'inda state sifirlanir, o an
 * gecerli measured_at bir kez daha gecebilir. Bunu AnomalySink'in idempotent insert'i (WHERE NOT
 * EXISTS) ve RawReadingsSink'in ON CONFLICT'i yakalar — tekillestirme + DB backstop birlikte.
 */
public class MeasuredAtDeduplicator extends KeyedProcessFunction<Integer, AqiReading, AqiReading> {

    private static final Logger LOG = LoggerFactory.getLogger(MeasuredAtDeduplicator.class);

    private transient ValueState<Long> lastMeasuredAtMillis;

    @Override
    public void open(Configuration parameters) {
        lastMeasuredAtMillis = getRuntimeContext().getState(
                new ValueStateDescriptor<>("lastMeasuredAtMillis", Long.class));
    }

    @Override
    public void processElement(AqiReading reading, Context ctx, Collector<AqiReading> out) throws Exception {
        if (reading.getMeasuredAt() == null) {
            // Parser measured_at'siz kayitlari zaten dusuruyor; guvenlik icin burada da atla.
            return;
        }
        long millis = reading.getMeasuredAt().toEpochMilli();
        Long last = lastMeasuredAtMillis.value();
        if (last != null && millis <= last) {
            LOG.debug("duplicate dropped station={} measured_at={}",
                    reading.getStationId(), reading.getMeasuredAt());
            return;
        }
        lastMeasuredAtMillis.update(millis);
        out.collect(reading);
    }
}
