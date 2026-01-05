# Sơ đồ Dataflow Module IoT

**Phiên bản:** 1.0  
**Ngày cập nhật:** 05/01/2026

---

## 1. Tổng quan Dataflow

```
┌─────────────────────────────────────────────────────────────────────┐
│                     THIẾT BỊ SẢN XUẤT                               │
├─────────────────────────────────────────────────────────────────────┤
│  [Sensor]    [PLC]     [Gateway]    [Camera]    [Power Meter]       │
│     │          │           │            │             │             │
└─────┼──────────┼───────────┼────────────┼─────────────┼─────────────┘
      │          │           │            │             │
      └──────────┴───────────┴────────────┴─────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  PROTOCOL LAYER   │
                    │  MQTT | OPC-UA    │
                    │  Modbus | HTTP    │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │  CONNECTION       │
                    │  SERVICE          │
                    │  iotConnection    │
                    │  Service.ts       │
                    └─────────┬─────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  DATA PROCESS   │ │  ALARM CHECK    │ │  DEVICE STATUS  │
│  iotSensor      │ │  Check against  │ │  Update health  │
│  Service.ts     │ │  thresholds     │ │  score & status │
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             │
                   ┌─────────▼─────────┐
                   │    DATABASE       │
                   │  iot_device_data  │
                   │  iot_alarms       │
                   │  iot_devices      │
                   └─────────┬─────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  SSE EVENTS     │ │  SPC MODULE     │ │  NOTIFICATION   │
│  Real-time      │ │  CPK/SPC        │ │  Email/SMS      │
│  Dashboard      │ │  Analysis       │ │  Telegram       │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

---

## 2. Chi tiết Luồng Thu thập Dữ liệu

### 2.1 MQTT Protocol Flow

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   MQTT       │    │   MQTT       │    │   IoT        │
│   Sensor     │───▶│   Broker     │───▶│   Service    │
│   Device     │    │   (Mosquitto)│    │              │
└──────────────┘    └──────────────┘    └──────┬───────┘
                                               │
Topic: factory/line1/sensors/temperature       │
Payload: {"value": 25.5, "unit": "C"}         │
                                               │
                                        ┌──────▼───────┐
                                        │   Parse &    │
                                        │   Validate   │
                                        └──────┬───────┘
                                               │
                                        ┌──────▼───────┐
                                        │   Store to   │
                                        │   Database   │
                                        └──────────────┘
```

### 2.2 OPC-UA Protocol Flow

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   OPC-UA     │    │   OPC-UA     │    │   IoT        │
│   Server     │◀──▶│   Client     │───▶│   Service    │
│   (PLC)      │    │   (node-opc) │    │              │
└──────────────┘    └──────────────┘    └──────┬───────┘
                                               │
NodeId: ns=2;s=Temperature                     │
Value: 25.5                                    │
                                               │
                                        ┌──────▼───────┐
                                        │   Transform  │
                                        │   to JSON    │
                                        └──────┬───────┘
                                               │
                                        ┌──────▼───────┐
                                        │   Store to   │
                                        │   Database   │
                                        └──────────────┘
```

### 2.3 Modbus TCP Flow

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Modbus     │    │   Modbus     │    │   IoT        │
│   Device     │◀──▶│   Client     │───▶│   Service    │
│   (Meter)    │    │   (modbus-s) │    │              │
└──────────────┘    └──────────────┘    └──────┬───────┘
                                               │
Register: 40001 (Holding)                      │
Value: 0x4248 0x0000 (Float32)                │
                                               │
                                        ┌──────▼───────┐
                                        │   Convert    │
                                        │   Registers  │
                                        └──────┬───────┘
                                               │
                                        ┌──────▼───────┐
                                        │   Store to   │
                                        │   Database   │
                                        └──────────────┘
```

---

## 3. Luồng Xử lý Cảnh báo

```
┌─────────────────────────────────────────────────────────────────┐
│                    ALARM PROCESSING FLOW                         │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐
│  New Data    │
│  Received    │
└──────┬───────┘
       │
       ▼
┌──────────────┐    ┌──────────────┐
│  Get Device  │───▶│  Get Active  │
│  Thresholds  │    │  Thresholds  │
└──────────────┘    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  Compare     │
                    │  Value vs    │
                    │  Thresholds  │
                    └──────┬───────┘
                           │
       ┌───────────────────┼───────────────────┐
       │                   │                   │
       ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  NORMAL      │    │  WARNING     │    │  ERROR/      │
│  No action   │    │  Create      │    │  CRITICAL    │
│              │    │  warning     │    │  Create      │
│              │    │  alarm       │    │  alarm       │
└──────────────┘    └──────┬───────┘    └──────┬───────┘
                           │                   │
                           └─────────┬─────────┘
                                     │
                              ┌──────▼───────┐
                              │  Store Alarm │
                              │  to Database │
                              └──────┬───────┘
                                     │
                              ┌──────▼───────┐
                              │  Send SSE    │
                              │  Event       │
                              └──────┬───────┘
                                     │
                              ┌──────▼───────┐
                              │  Check       │
                              │  Escalation  │
                              │  Rules       │
                              └──────┬───────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
                    ▼                ▼                ▼
             ┌──────────┐     ┌──────────┐     ┌──────────┐
             │  Email   │     │   SMS    │     │ Telegram │
             │  Notify  │     │  Notify  │     │  Notify  │
             └──────────┘     └──────────┘     └──────────┘
```

---

## 4. Luồng Tích hợp SPC

```
┌─────────────────────────────────────────────────────────────────┐
│                    IOT TO SPC INTEGRATION                        │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐
│  IoT Device  │
│  Data        │
│  (Raw)       │
└──────┬───────┘
       │
       ▼
┌──────────────┐    ┌──────────────┐
│  Aggregate   │───▶│  Group by    │
│  Service     │    │  Time Period │
└──────────────┘    │  (min/hour)  │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  Calculate   │
                    │  Statistics  │
                    │  Mean, StdDev│
                    └──────┬───────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────┐
│                    SPC MODULE                         │
├──────────────────────────────────────────────────────┤
│                                                       │
│  ┌──────────────┐    ┌──────────────┐                │
│  │  Calculate   │───▶│  Calculate   │                │
│  │  UCL, LCL    │    │  CPK, Cp     │                │
│  └──────────────┘    └──────┬───────┘                │
│                             │                         │
│                             ▼                         │
│                      ┌──────────────┐                │
│                      │  Check 8     │                │
│                      │  SPC Rules   │                │
│                      └──────┬───────┘                │
│                             │                         │
│       ┌─────────────────────┼─────────────────────┐  │
│       │                     │                     │  │
│       ▼                     ▼                     ▼  │
│ ┌──────────┐         ┌──────────┐         ┌──────────┐
│ │  Rule 1  │         │  Rule 4  │         │  Rule 8  │
│ │  1 point │         │  14 pts  │         │  8 pts   │
│ │  > 3σ    │         │  alter   │         │  same    │
│ └──────────┘         └──────────┘         │  side    │
│                                           └──────────┘
│                             │                         │
│                             ▼                         │
│                      ┌──────────────┐                │
│                      │  Generate    │                │
│                      │  SPC Report  │                │
│                      └──────────────┘                │
└──────────────────────────────────────────────────────┘
```

---

## 5. Luồng Realtime Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│                    REALTIME DASHBOARD FLOW                       │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐
│  New Data    │
│  Stored      │
└──────┬───────┘
       │
       ▼
┌──────────────┐    ┌──────────────┐
│  SSE Server  │───▶│  Broadcast   │
│  sse.ts      │    │  Event       │
└──────────────┘    └──────┬───────┘
                           │
                           │ EventSource
                           │
                    ┌──────▼───────┐
                    │  Frontend    │
                    │  useIot      │
                    │  Realtime    │
                    │  Hook        │
                    └──────┬───────┘
                           │
       ┌───────────────────┼───────────────────┐
       │                   │                   │
       ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Update      │    │  Update      │    │  Show        │
│  Charts      │    │  Stats       │    │  Toast       │
│  (Recharts)  │    │  Cards       │    │  Notification│
└──────────────┘    └──────────────┘    └──────────────┘
```

---

## 6. Luồng Device Health Monitoring

```
┌─────────────────────────────────────────────────────────────────┐
│                    DEVICE HEALTH MONITORING                      │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐
│  Scheduled   │
│  Job         │
│  (Every 1m)  │
└──────┬───────┘
       │
       ▼
┌──────────────┐    ┌──────────────┐
│  Get All     │───▶│  Check Last  │
│  Devices     │    │  Seen Time   │
└──────────────┘    └──────┬───────┘
                           │
       ┌───────────────────┼───────────────────┐
       │                   │                   │
       ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  < 1 min     │    │  1-5 min     │    │  > 5 min     │
│  ONLINE      │    │  WARNING     │    │  OFFLINE     │
│  Score: 100  │    │  Score: 70   │    │  Score: 0    │
└──────────────┘    └──────────────┘    └──────┬───────┘
                                               │
                                        ┌──────▼───────┐
                                        │  Create      │
                                        │  DEVICE_     │
                                        │  OFFLINE     │
                                        │  Alarm       │
                                        └──────┬───────┘
                                               │
                                        ┌──────▼───────┐
                                        │  Notify      │
                                        │  Maintenance │
                                        │  Team        │
                                        └──────────────┘
```

---

## 7. Sequence Diagrams

### 7.1 Sensor Data Collection Sequence

```
Sensor          MQTT Broker      IoT Service      Database         Dashboard
   │                 │                │               │                │
   │  Publish        │                │               │                │
   │  Data           │                │               │                │
   │────────────────▶│                │               │                │
   │                 │  Forward       │               │                │
   │                 │  Message       │               │                │
   │                 │───────────────▶│               │                │
   │                 │                │  Validate     │                │
   │                 │                │  Data         │                │
   │                 │                │───────────────│                │
   │                 │                │               │                │
   │                 │                │  Insert       │                │
   │                 │                │  Data         │                │
   │                 │                │──────────────▶│                │
   │                 │                │               │                │
   │                 │                │  Check        │                │
   │                 │                │  Threshold    │                │
   │                 │                │───────────────│                │
   │                 │                │               │                │
   │                 │                │  Send SSE     │                │
   │                 │                │  Event        │                │
   │                 │                │──────────────────────────────▶│
   │                 │                │               │                │
   │                 │                │               │    Update UI   │
   │                 │                │               │                │
```

### 7.2 Alarm Handling Sequence

```
IoT Service      Database         Escalation       Notification      User
     │               │                │                │              │
     │  Create       │                │                │              │
     │  Alarm        │                │                │              │
     │──────────────▶│                │                │              │
     │               │                │                │              │
     │  Check        │                │                │              │
     │  Escalation   │                │                │              │
     │  Rules        │                │                │              │
     │──────────────────────────────▶│                │              │
     │               │                │                │              │
     │               │                │  Get           │              │
     │               │                │  Recipients    │              │
     │               │                │───────────────▶│              │
     │               │                │                │              │
     │               │                │                │  Send        │
     │               │                │                │  Email/SMS   │
     │               │                │                │─────────────▶│
     │               │                │                │              │
     │               │                │                │              │  View
     │               │                │                │              │  Alarm
     │               │                │                │              │
     │               │                │                │              │  Ack
     │               │◀─────────────────────────────────────────────────│
     │               │                │                │              │
```

---

## 8. Tóm tắt Dataflow

| Luồng | Nguồn | Đích | Mô tả |
|-------|-------|------|-------|
| Data Collection | Sensor → Database | iot_device_data | Thu thập dữ liệu từ sensor |
| Alarm Processing | Database → Notification | iot_alarms | Xử lý và gửi cảnh báo |
| SPC Integration | iot_device_data → SPC Module | spc_analysis_history | Phân tích SPC từ dữ liệu IoT |
| Realtime Update | Database → Dashboard | SSE Events | Cập nhật UI realtime |
| Health Monitoring | Scheduled Job → Database | iot_devices | Theo dõi sức khỏe thiết bị |
