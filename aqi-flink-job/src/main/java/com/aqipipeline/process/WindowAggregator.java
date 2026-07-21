package com.aqipipeline.process;

import com.aqipipeline.model.AqiReading;
import com.aqipipeline.model.WindowAggregate;
import org.apache.flink.api.common.functions.AggregateFunction;
import org.apache.flink.streaming.api.functions.windowing.ProcessWindowFunction;
import org.apache.flink.streaming.api.windowing.windows.TimeWindow;
import org.apache.flink.util.Collector;

import java.io.Serializable;
import java.time.Instant;

/**
 * Averages AQI/PM2.5/PM10 per station inside a 5-minute tumbling event-time window
 * (matches the WAQI feed's ~5 minute update cadence).
 */
public class WindowAggregator {

    public static class Accumulator implements Serializable {
        int stationId;
        String stationName;
        double aqiSum;
        double pm25Sum;
        long pm25Count;
        double pm10Sum;
        long pm10Count;
        int maxAqi = Integer.MIN_VALUE;
        long count;
    }

    public static class Aggregate implements AggregateFunction<AqiReading, Accumulator, Accumulator> {

        @Override
        public Accumulator createAccumulator() {
            return new Accumulator();
        }

        @Override
        public Accumulator add(AqiReading reading, Accumulator acc) {
            if (acc.count == 0) {
                acc.stationId = reading.getStationId();
                acc.stationName = reading.getStationName();
            }
            acc.aqiSum += reading.getAqi();
            acc.maxAqi = Math.max(acc.maxAqi, reading.getAqi());
            if (reading.getPm25() != null) {
                acc.pm25Sum += reading.getPm25();
                acc.pm25Count += 1;
            }
            if (reading.getPm10() != null) {
                acc.pm10Sum += reading.getPm10();
                acc.pm10Count += 1;
            }
            acc.count += 1;
            return acc;
        }

        @Override
        public Accumulator getResult(Accumulator acc) {
            return acc;
        }

        @Override
        public Accumulator merge(Accumulator a, Accumulator b) {
            a.aqiSum += b.aqiSum;
            a.pm25Sum += b.pm25Sum;
            a.pm25Count += b.pm25Count;
            a.pm10Sum += b.pm10Sum;
            a.pm10Count += b.pm10Count;
            a.maxAqi = Math.max(a.maxAqi, b.maxAqi);
            a.count += b.count;
            return a;
        }
    }

    public static class ToWindowAggregate extends ProcessWindowFunction<Accumulator, WindowAggregate, Integer, TimeWindow> {

        @Override
        public void process(Integer key, Context context, Iterable<Accumulator> elements, Collector<WindowAggregate> out) {
            Accumulator acc = elements.iterator().next();
            double avgAqi = acc.count == 0 ? 0.0 : acc.aqiSum / acc.count;
            Double avgPm25 = acc.pm25Count == 0 ? null : acc.pm25Sum / acc.pm25Count;
            Double avgPm10 = acc.pm10Count == 0 ? null : acc.pm10Sum / acc.pm10Count;
            out.collect(new WindowAggregate(
                    acc.stationId,
                    acc.stationName,
                    Instant.ofEpochMilli(context.window().getStart()),
                    Instant.ofEpochMilli(context.window().getEnd()),
                    avgAqi,
                    avgPm25,
                    avgPm10,
                    acc.maxAqi,
                    acc.count));
        }
    }
}
