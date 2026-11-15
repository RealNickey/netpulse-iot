# NetPulse IoT 🌐⚡
> **Real-Time Data Center Environmental Event Logging & Notification Platform**  
> *A Computer Networks (CN) Capstone Project built with Bun, MQTT, SQLite, and React + shadcn/ui.*

[![Bun](https://img.shields.io/badge/Bun-v1.3+-black?logo=bun)](https://bun.sh)
[![MQTT](https://img.shields.io/badge/MQTT-TCP%201883-purple)](https://mqtt.org)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev)
[![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-Radix-black)](https://ui.shadcn.com)
[![SQLite](https://img.shields.io/badge/SQLite-bun%3Asqlite%20WAL-lightblue?logo=sqlite)](https://sqlite.org)

---

## 📌 1. Project Overview

**NetPulse IoT** is an end-to-end event logging and notification platform engineered to monitor critical physical and environmental infrastructure within a modern server room / data center.

The platform simulates multiple edge IoT nodes streaming sensor telemetries over **MQTT (TCP port 1883)**, processes data through a high-performance **Bun backend** running an embedded MQTT broker and rule evaluation engine, persists all logs to **SQLite**, and broadcasts real-time telemetry and incident alerts to a **React dashboard** over **WebSockets**.

---

## 🏗️ 2. System Architecture

```mermaid
flowchart TD
    subgraph IoT_Nodes ["Simulated IoT Sensor Network (TCP/IP)"]
        Node1["Rack 01: Compute Cluster Alpha (Temp / Fan / CPU)"]
        Node2["Rack 02: SAN Storage Matrix (Temp / Vibration)"]
        Node3["Rack 03: AI Inference Blade (Temp / Power)"]
        Node4["Rack 04: Core Fiber Switch (Temp / Packet Loss)"]
        Node5["PDU Main: Schneider Power Unit (Watts / Volts / Amps)"]
        Node6["HVAC 01: In-Row Precision Chiller (Airflow / Temp)"]
        Node7["Sec Entry: Vault Access Controller (Magnetic Reed / PIR)"]
    end

    subgraph Bun_Backend ["Bun Backend Engine (Port 3001)"]
        MQTT_Broker["Embedded Aedes MQTT Broker (TCP Port 1883)"]
        Eval_Engine["Rule & Anomaly Evaluator"]
        SQLite_DB[("SQLite Database (bun:sqlite WAL)")]
        WS_Relay["Full-Duplex WebSocket Server (/ws)"]
        Static_Server["Vite SPA Static File Server"]
    end

    subgraph React_Dashboard ["React + Vite Dashboard (Port 5173 / 3001)"]
        Overview["Infrastructure Topology & Sensor Gauges"]
        NetMonitor["Protocol Sniffer & Network Metrics"]
        EventLog["Persistent Log Viewer & CSV Export"]
        ChaosStudio["Interactive Anomaly & Chaos Studio"]
        AudioAlarm["Web Audio API Sound Synthesizer"]
    end

    IoT_Nodes -->|MQTT Publish (QoS 0/1)| MQTT_Broker
    MQTT_Broker --> Eval_Engine
    Eval_Engine --> SQLite_DB
    Eval_Engine --> WS_Relay
    WS_Relay <-->|Persistent Duplex Frame Stream| React_Dashboard
    ChaosStudio -.->|HTTP REST Anomaly Injection| Bun_Backend
```

---

## 🎯 3. Computer Networks (CN) Concepts Demonstrated

1. **Application Layer Protocol Comparison**:
   - **MQTT vs HTTP**: Demonstrates how MQTT's **2-byte fixed header** dramatically outperforms HTTP's 500–1000 byte request overhead in constrained IoT environments.
   - **WebSockets vs HTTP Polling**: Evaluates how persistent bi-directional WebSocket frames eliminate repeated TCP 3-way handshake delays.

2. **Transport Layer Guarantees (TCP Port 1883)**:
   - Evaluates TCP reliability (sliding windows, segment sequencing, and connection keep-alive pings) under simulated network loads.

3. **Quality of Service (QoS) Dynamics**:
   - **QoS 0 (At Most Once)**: Low latency, fire-and-forget, zero confirmation packet.
   - **QoS 1 (At Least Once)**: Guaranteed delivery via `PUBLISH` ➔ `PUBACK` verification handshake.

4. **Network Traffic & Telemetry Metrics**:
   - Real-time packet throughput (packets/sec).
   - Data transfer rate (KB/s and cumulative MB).
   - Socket round-trip transport latency (sub-5ms on localhost).
   - Embedded mini-Wireshark packet stream for live packet inspection.

---

## ⚡ 4. Key Platform Features

- **Data Center Infrastructure Monitoring**: 7 interactive IoT edge nodes (Racks 01–04, Main PDU, Precision Chiller, and Security Vault).
- **Incident Detection & Alerting**:
  - 🔥 **Thermal Runaway**: Racks exceeding 40°C trigger immediate Critical alerts.
  - ⚡ **Power Overload**: PDU power spikes exceeding 3800W trigger breaker overload alerts.
  - 🚨 **Physical Security Breach**: Unauthorized vault door openings dispatch intrusion alerts.
  - 💥 **Storage Vibration**: Excessive disk chassis vibration (>7.0g) triggers structural warnings.
  - 📡 **Network Degradation**: Switch packet loss > 15% triggers congestion alerts.
- **Web Audio API Sound Synthesizer**: Pure browser-native dual-tone warning chimes and critical siren klaxons with mute and volume controls.
- **Persistent SQLite Storage**: High-speed write-ahead logging (WAL) storing raw events, incident records, and CSV report export.
- **1-Click Chaos & Anomaly Studio**: Instant anomaly buttons to demonstrate real-time alert dispatching and recovery.
- **UI Design**: Scaffolding with official shadcn/ui components (`b1Vq9FrO` preset) with Oxanium typography and Dark/Light modes.

---

## 🚀 5. Getting Started

### Prerequisites
- [Bun](https://bun.sh) (v1.3+)

### Installation
```bash
# Clone the repository
git clone https://github.com/RealNickey/netpulse-iot.git
cd netpulse-iot

# Install dependencies
bun install
```

### Running the System
You can run the entire platform with one command:

```bash
# 1. Build the frontend
bun run build

# 2. Start the unified backend (MQTT Broker + WebSockets + SQLite + Web Dashboard)
bun run server
```

Now open **http://localhost:3001** in your browser!

> **For Active Development (Hot Reload):**
> Run the backend in one terminal: `bun run server`  
> Run the Vite dev server in another: `bun run dev` (opens http://localhost:5173)

---

## 🧪 6. Live Demo Walkthrough (For Viva Presentation)

1. **Normal Baseline**:
   - Open **Infrastructure** tab: All 7 nodes display green `NORMAL` status (temps around 24–27°C, power nominal).
   - Open **Network & Protocols** tab: Observe live packet rate (~5–10 pkts/s) and sub-5ms latency.
2. **Inject HVAC Chiller Failure**:
   - Switch to the **Chaos Simulator** tab.
   - Click **"Inject Thermal Runaway"**.
   - Watch the audio alarm sound, toast notifications pop up, and Rack cards glow red as temperatures climb above 45°C!
3. **Inspect the Incident in the Logs**:
   - Switch to **Event Log & Audit** tab.
   - Click **"Triggered Incident Alerts"** to inspect the evaluated thermal alerts.
   - Click **"Export CSV Report"** to download the audit trail.
4. **Restore Conditions**:
   - Go back to **Chaos Simulator** and click **"Restore Normal Baseline"**.
   - Observe temperatures smoothly cooling down and returning to nominal state.

---

## 🎓 7. Computer Networks Viva Q&A Cheat Sheet

| Question | Answer |
| :--- | :--- |
| **Why use MQTT instead of HTTP for IoT?** | MQTT has a 2-byte fixed header vs HTTP's 500–1000 byte headers. It uses a publish/subscribe model that decouples data producers from consumers. |
| **What transport layer protocol does MQTT use?** | Standard MQTT runs over **TCP on port 1883**. TCP guarantees in-order, error-checked packet delivery. |
| **What is the difference between QoS 0 and QoS 1?** | QoS 0 is fire-and-forget (no ACK). QoS 1 guarantees delivery by requiring a `PUBACK` packet from the receiver before completing the transaction. |
| **Why use WebSockets for the React frontend?** | WebSockets provide full-duplex persistent framing on a single TCP connection, eliminating the latency and overhead of HTTP polling. |
| **How does the rule evaluator detect anomalies?** | The backend parses incoming JSON payloads from MQTT topics and checks values against pre-configured thresholds (temperature, wattage, door state, packet drop) before persisting to SQLite. |

---

## 📜 8. License
MIT License. Built for Computer Networks Laboratory Demonstration.
