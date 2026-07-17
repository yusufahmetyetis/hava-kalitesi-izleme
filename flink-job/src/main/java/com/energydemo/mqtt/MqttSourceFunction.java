package com.energydemo.mqtt;

import org.apache.flink.streaming.api.functions.source.SourceFunction;
import org.eclipse.paho.client.mqttv3.MqttClient;
import org.eclipse.paho.client.mqttv3.MqttConnectOptions;
import org.eclipse.paho.client.mqttv3.MqttException;
import org.eclipse.paho.client.mqttv3.MqttMessage;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.UUID;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

/**
 * Bridges an MQTT broker into the DataStream API. The paho callback thread pushes
 * payloads onto a queue; run() drains that queue under the checkpoint lock.
 * Non-parallel (single broker connection) and not checkpointed, matching the
 * at-least-effort semantics of the previous demo job.
 */
public class MqttSourceFunction implements SourceFunction<String> {

    private static final Logger LOG = LoggerFactory.getLogger(MqttSourceFunction.class);

    private final String broker;
    private final int port;
    private final String[] topicFilters;

    private transient volatile boolean running;
    private transient BlockingQueue<String> queue;
    private transient MqttClient client;

    public MqttSourceFunction(String broker, int port, String[] topicFilters) {
        this.broker = broker;
        this.port = port;
        this.topicFilters = topicFilters;
    }

    @Override
    public void run(SourceContext<String> ctx) throws Exception {
        running = true;
        queue = new LinkedBlockingQueue<>();
        connectWithRetry();

        while (running) {
            String payload = queue.poll(500, TimeUnit.MILLISECONDS);
            if (payload != null) {
                synchronized (ctx.getCheckpointLock()) {
                    ctx.collect(payload);
                }
            }
        }
    }

    private void connectWithRetry() throws InterruptedException {
        String clientId = "flink-mqtt-source-" + UUID.randomUUID();
        while (running) {
            try {
                client = new MqttClient("tcp://" + broker + ":" + port, clientId, new MemoryPersistence());
                client.setCallback(new SourceMqttCallback(queue));

                MqttConnectOptions options = new MqttConnectOptions();
                options.setCleanSession(true);
                options.setAutomaticReconnect(true);
                options.setConnectionTimeout(10);

                client.connect(options);
                for (String filter : topicFilters) {
                    client.subscribe(filter);
                }
                LOG.info("MQTT connected to {}:{}, subscribed to {}", broker, port, String.join(", ", topicFilters));
                return;
            } catch (MqttException e) {
                LOG.warn("MQTT connection failed, retrying in 2s: {}", e.getMessage());
                Thread.sleep(2000);
            }
        }
    }

    @Override
    public void cancel() {
        running = false;
        if (client != null) {
            try {
                client.disconnect();
                client.close();
            } catch (MqttException e) {
                LOG.warn("Error while closing MQTT client: {}", e.getMessage());
            }
        }
    }

    private static class SourceMqttCallback implements org.eclipse.paho.client.mqttv3.MqttCallback {
        private final BlockingQueue<String> queue;

        SourceMqttCallback(BlockingQueue<String> queue) {
            this.queue = queue;
        }

        @Override
        public void connectionLost(Throwable cause) {
            LOG.warn("MQTT connection lost: {}", cause.getMessage());
        }

        @Override
        public void messageArrived(String topic, MqttMessage message) {
            queue.offer(new String(message.getPayload()));
        }

        @Override
        public void deliveryComplete(org.eclipse.paho.client.mqttv3.IMqttDeliveryToken token) {
            // not used - we are a subscriber only
        }
    }
}
