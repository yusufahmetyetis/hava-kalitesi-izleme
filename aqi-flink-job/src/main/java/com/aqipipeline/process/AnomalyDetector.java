package com.aqipipeline.process;

import com.aqipipeline.model.AnomalyEvent;
import com.aqipipeline.model.AqiReading;
import org.apache.flink.api.common.state.ValueState;
import org.apache.flink.api.common.state.ValueStateDescriptor;
import org.apache.flink.configuration.Configuration;
import org.apache.flink.streaming.api.functions.KeyedProcessFunction;
import org.apache.flink.util.Collector;
import org.apache.flink.util.OutputTag;

/**
 * Keeps an exponential moving average of AQI per station. Readings that deviate
 * from that average by more than WARNING_THRESHOLD (or CRITICAL_THRESHOLD) are
 * emitted to the anomaly side output; every reading (anomalous or not) updates
 * the moving average.
 */
public class AnomalyDetector extends KeyedProcessFunction<Integer, AqiReading, AqiReading> {

    public static final OutputTag<AnomalyEvent> ANOMALY_TAG = new OutputTag<AnomalyEvent>("anomalies") {
    };

    private static final double EMA_ALPHA = 0.2;
    private static final double WARNING_THRESHOLD = 0.3; // 30%
    private static final double CRITICAL_THRESHOLD = 0.5; // 50%
    private static final int MIN_SAMPLES_BEFORE_DETECTION = 3;

    private transient ValueState<Double> movingAverageState;
    private transient ValueState<Integer> sampleCountState;

    @Override
    public void open(Configuration parameters) {
        movingAverageState = getRuntimeContext().getState(
                new ValueStateDescriptor<>("movingAverage", Double.class));
        sampleCountState = getRuntimeContext().getState(
                new ValueStateDescriptor<>("sampleCount", Integer.class));
    }

    @Override
    public void processElement(AqiReading reading, Context ctx, Collector<AqiReading> out) throws Exception {
        Double movingAverage = movingAverageState.value();
        Integer sampleCount = sampleCountState.value();
        if (sampleCount == null) {
            sampleCount = 0;
        }

        if (movingAverage != null && sampleCount >= MIN_SAMPLES_BEFORE_DETECTION && movingAverage > 0) {
            double deviation = Math.abs(reading.getAqi() - movingAverage) / movingAverage;
            if (deviation > WARNING_THRESHOLD) {
                String severity = deviation > CRITICAL_THRESHOLD ? "CRITICAL" : "WARNING";
                ctx.output(ANOMALY_TAG, new AnomalyEvent(
                        reading.getStationId(),
                        reading.getStationName(),
                        reading.getMeasuredAt(),
                        reading.getAqi(),
                        movingAverage,
                        deviation * 100.0,
                        severity));
            }
        }

        double updatedAverage = movingAverage == null
                ? reading.getAqi()
                : EMA_ALPHA * reading.getAqi() + (1 - EMA_ALPHA) * movingAverage;
        movingAverageState.update(updatedAverage);
        sampleCountState.update(sampleCount + 1);

        out.collect(reading);
    }
}
