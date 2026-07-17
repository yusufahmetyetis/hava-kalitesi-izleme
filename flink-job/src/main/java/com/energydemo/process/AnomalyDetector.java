package com.energydemo.process;

import com.energydemo.model.AnomalyEvent;
import com.energydemo.model.EnergyReading;
import org.apache.flink.api.common.state.ValueState;
import org.apache.flink.api.common.state.ValueStateDescriptor;
import org.apache.flink.configuration.Configuration;
import org.apache.flink.streaming.api.functions.KeyedProcessFunction;
import org.apache.flink.util.Collector;
import org.apache.flink.util.OutputTag;

/**
 * Keeps an exponential moving average of consumption per key (household + device/usage_type).
 * Readings that deviate from that average by more than DEVIATION_THRESHOLD are emitted to the
 * anomaly side output; every reading (anomalous or not) updates the moving average.
 */
public class AnomalyDetector extends KeyedProcessFunction<String, EnergyReading, EnergyReading> {

    public static final OutputTag<AnomalyEvent> ANOMALY_TAG = new OutputTag<AnomalyEvent>("anomalies") {
    };

    private static final double EMA_ALPHA = 0.3;
    private static final double DEVIATION_THRESHOLD = 0.5; // 50%
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
    public void processElement(EnergyReading reading, Context ctx, Collector<EnergyReading> out) throws Exception {
        Double movingAverage = movingAverageState.value();
        Integer sampleCount = sampleCountState.value();
        if (sampleCount == null) {
            sampleCount = 0;
        }

        if (movingAverage != null && sampleCount >= MIN_SAMPLES_BEFORE_DETECTION && movingAverage > 0) {
            double deviation = Math.abs(reading.getValue() - movingAverage) / movingAverage;
            if (deviation > DEVIATION_THRESHOLD) {
                ctx.output(ANOMALY_TAG, new AnomalyEvent(
                        reading.getHouseholdCode(),
                        reading.getMetricKey(),
                        reading.getReadingType(),
                        reading.getMeasuredAt(),
                        reading.getValue(),
                        movingAverage,
                        deviation * 100.0));
            }
        }

        double updatedAverage = movingAverage == null
                ? reading.getValue()
                : EMA_ALPHA * reading.getValue() + (1 - EMA_ALPHA) * movingAverage;
        movingAverageState.update(updatedAverage);
        sampleCountState.update(sampleCount + 1);

        out.collect(reading);
    }
}
