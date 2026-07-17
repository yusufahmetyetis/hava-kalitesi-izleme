package com.energydemo.process;

import com.energydemo.model.EnergyReading;
import com.energydemo.model.ReadingType;
import com.energydemo.model.WindowAggregate;
import org.apache.flink.api.common.functions.AggregateFunction;
import org.apache.flink.streaming.api.functions.windowing.ProcessWindowFunction;
import org.apache.flink.streaming.api.windowing.windows.TimeWindow;
import org.apache.flink.util.Collector;

import java.io.Serializable;
import java.time.Instant;

/**
 * Sums/averages consumption per key (household + device/usage_type) inside a
 * 1-minute tumbling event-time window.
 */
public class WindowAggregator {

    public static class Accumulator implements Serializable {
        String householdCode;
        String metricKey;
        ReadingType readingType;
        double sum;
        long count;
    }

    public static class Aggregate implements AggregateFunction<EnergyReading, Accumulator, Accumulator> {

        @Override
        public Accumulator createAccumulator() {
            return new Accumulator();
        }

        @Override
        public Accumulator add(EnergyReading reading, Accumulator acc) {
            if (acc.metricKey == null) {
                acc.householdCode = reading.getHouseholdCode();
                acc.metricKey = reading.getMetricKey();
                acc.readingType = reading.getReadingType();
            }
            acc.sum += reading.getValue();
            acc.count += 1;
            return acc;
        }

        @Override
        public Accumulator getResult(Accumulator acc) {
            return acc;
        }

        @Override
        public Accumulator merge(Accumulator a, Accumulator b) {
            a.sum += b.sum;
            a.count += b.count;
            return a;
        }
    }

    public static class ToWindowAggregate extends ProcessWindowFunction<Accumulator, WindowAggregate, String, TimeWindow> {

        @Override
        public void process(String key, Context context, Iterable<Accumulator> elements, Collector<WindowAggregate> out) {
            Accumulator acc = elements.iterator().next();
            double avg = acc.count == 0 ? 0.0 : acc.sum / acc.count;
            out.collect(new WindowAggregate(
                    acc.householdCode,
                    acc.metricKey,
                    acc.readingType,
                    Instant.ofEpochMilli(context.window().getStart()),
                    Instant.ofEpochMilli(context.window().getEnd()),
                    acc.sum,
                    avg,
                    acc.count));
        }
    }
}
