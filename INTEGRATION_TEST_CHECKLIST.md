# Integration Test Checklist - Data Platform

## ✅ Test-Status Legend
- ✅ = Implementiert & Funktioniert
- ⚠️ = Implementiert mit Einschränkungen
- ❌ = Nicht implementiert
- 🔧 = Benötigt Fix

---

## 1. DataSource Management

### 1.1 LineMetrics DataSource
- ✅ Erstellen: Add Data Source → Type "LineMetrics"
- ✅ OAuth2 Credentials (Client ID + Secret) eingeben
- ✅ Connection Test beim Erstellen
- ✅ Device Count wird angezeigt
- ✅ Speicherung in DB (type='linemetrics', client_id, api_token)
- ✅ DataSource Card zeigt LineMetrics-spezifische Actions (Sync, Import)

**Workflow:**
1. Data Sources Page
2. "Add Data Source" Button
3. Type: LineMetrics wählen
4. Name, API URL (auto-filled), Client ID, Client Secret eingeben
5. "Add Source" → Connection wird getestet
6. Success: DataSource erstellt, Device Count angezeigt

### 1.2 File DataSource
- ✅ Erstellen: Add Data Source → Type "File"
- ✅ Drag & Drop Upload UI
- ✅ Unterstützte Formate: CSV, Excel (.xlsx/.xls), JSON, Parquet
- ✅ File Parsing mit Pandas (Zeilen/Spalten erkennen)
- ✅ Speicherung: `/data/uploads/{user_id}/{datasource_id}/`
- ✅ File-Path in DataSource.api_url gespeichert

**Workflow:**
1. Data Sources Page
2. "Add Data Source" Button
3. Type: File wählen
4. Name eingeben
5. File hochladen (drag & drop oder click)
6. "Add Source" → File wird parsed & gespeichert
7. Success: Zeilen-Anzahl wird angezeigt

### 1.3 Generic DataSources (API, MQTT, Database)
- ✅ Erstellen: Add Data Source → Type wählen
- ✅ API URL, API Token eingeben
- ⚠️ Keine spezifische Validierung oder Test-Connection
- ✅ Speicherung in DB

---

## 2. LineMetrics Integration - Kompletter Flow

### 2.1 DataSource Erstellung
- ✅ `POST /api/v1/linemetrics/datasource`
- ✅ OAuth2 Client Credentials Flow
- ✅ Connection Test vor Speicherung
- ✅ Device Count von LineMetrics API abrufen

### 2.2 Device Sync
- ✅ `POST /api/v1/linemetrics/{datasource_id}/sync`
- ✅ Devices von LineMetrics API laden
- ✅ Devices in DB speichern (table: devices)
- ✅ Metrics/Input Streams pro Device laden
- ✅ Metrics in DB speichern (table: metrics)
- ✅ Stats zurückgeben (devices_created, devices_updated, metrics_created)

**Workflow:**
1. DataSource Card: "Sync" Button klicken
2. Backend: `sync_linemetrics_devices()` aufrufen
3. LineMetrics API: GET /devices
4. Für jedes Device: GET /devices/{id}/inputs
5. Devices & Metrics in DB speichern
6. Success Toast: "Synced X devices and Y metrics"

### 2.3 Measurements Import
- ✅ `POST /api/v1/linemetrics/{datasource_id}/import`
- ✅ Stream IDs, Date Range, Aggregation, Interval auswählen
- ✅ Import Dialog mit Stream-Auswahl
- ✅ Measurements von LineMetrics API laden
- ✅ Measurements in DB speichern (table: measurements - TimescaleDB hypertable)

**Workflow:**
1. DataSource Card: "Import" Button (Download Icon) klicken
2. Dialog öffnet: LineMetrics Import Dialog
3. Streams werden automatisch geladen (GET /api/v1/linemetrics/{id}/devices & streams)
4. User wählt: Streams, From/To Date, Aggregation, Granularity
5. "Import Measurements" → Backend lädt Daten
6. Success Toast: "Imported X measurements from Y streams"

**API Flow:**
```
POST /api/v1/linemetrics/{datasource_id}/import
{
  "stream_ids": ["input-123", "input-456"],
  "from_time": "2024-01-01T00:00:00Z",
  "to_time": "2024-01-07T00:00:00Z",
  "aggregation": "avg",
  "interval": "PT15M"
}
```

---

## 3. Schema Viewer Integration

### 3.1 Dynamic Schema Loading
- ✅ `GET /api/v1/schema/nodes`
- ✅ Lädt echte DataSources aus DB
- ✅ Generiert ReactFlow Nodes & Edges
- ✅ DataSource-Nodes mit Device/Metric Counts
- ✅ Grüne Edges: DataSource → Devices
- ✅ Blaue Edges: Standard DB Relationships
- ✅ Rote Edges: Anomaly References

**Visuelle Darstellung:**
```
[data_sources_table] (y=100)
       ↓ (blau)
[DataSource: My LineMetrics] (y=250) ---(grün)--→ [devices] (y=400)
[DataSource: Production API] (y=430)  ---(grün)--→     ↓ (blau)
                                              [metrics] (y=400)
                                                   ↓ (blau)
                                            [measurements] (y=700)
```

### 3.2 Refresh Functionality
- ✅ Refresh Button im Schema Viewer
- ✅ Lädt Schema neu ohne Page Reload
- ✅ Toast Notification: "Schema loaded: X data sources found"

🔧 **Fix Applied:** DataSource Node Positioning
- Problem: DataSources überlappten mit data_sources_table (beide y=100)
- Fix: DataSources starten jetzt bei y=250, spacing=180

---

## 4. ETL Designer Integration

### 4.1 DataSource als Input
- ✅ `GET /api/v1/schema/datasources/summary`
- ✅ DataSource Selector Dropdown
- ✅ Zeigt: Name, Type, Device Count, Metric Count
- ✅ "Add Input" Button erstellt DataSource-Node im Canvas
- ✅ Refresh Button für DataSource-Liste

**Workflow:**
1. Data Navigator → Tab "ETL Designer"
2. DataSource aus Dropdown wählen
3. "Add Input" klicken
4. DataSource wird als grüner "Source"-Node eingefügt
5. Node kann mit Transformationen verbunden werden

**Node Data:**
```javascript
{
  label: "Source: My LineMetrics (linemetrics)",
  type: "datasource",
  config: {
    datasource_id: "uuid-123",
    datasource_type: "linemetrics",
    device_count: 15,
    metric_count: 45
  },
  status: "ready",
  rowCount: 45  // metric_count
}
```

### 4.2 ETL Pipeline Building
- ✅ DataSource-Node als Input
- ⚠️ Transformationen nur UI (keine Backend-Logik)
- ⚠️ Pipeline-Execution nur Simulation
- ❌ Tatsächliche Daten-Transformation nicht implementiert

---

## 5. Metadaten-Editor

### 5.1 Current State
- ✅ UI implementiert
- ✅ Tabellen-Auswahl
- ✅ Spalten bearbeiten (Display Name, Data Type, Description, Format)
- ⚠️ Nutzt nur Mock-Daten
- ❌ Keine Backend-Integration
- ❌ DataSources werden nicht geladen

### 5.2 Functionality
- ✅ Anzeigename ändern
- ✅ Datentyp ändern (UI only)
- ✅ Nullable setzen
- ✅ Format-Vorlagen
- ✅ Beschreibungen
- ⚠️ Änderungen werden nur in Frontend gespeichert

---

## 6. Dashboard & Visualization

### 6.1 Dashboard Integration
- ⚠️ Dashboards zeigen Measurements aus DB
- ⚠️ Keine direkte DataSource-Filter-UI
- ✅ Measurements haben metric_id → Metric → Device → DataSource relationship
- ❌ Kein DataSource-Selector in Dashboard Charts

### 6.2 Chart Data Loading
- ✅ Charts laden Measurements via API
- ✅ Filtern nach Metric ID
- ⚠️ Kein Filter nach DataSource
- ⚠️ User muss DataSource indirekt über Device/Metric wählen

---

## 7. Vollständiger End-to-End Flow

### 7.1 LineMetrics → Dashboard
```
1. Add LineMetrics DataSource
   ↓
2. Sync Devices & Metrics
   ↓
3. Import Measurements (Date Range, Streams, Aggregation)
   ↓
4. Measurements in TimescaleDB (measurements table)
   ↓
5. Dashboard: Chart mit Metric auswählen
   ↓
6. Data wird aus measurements geladen & visualisiert
```

### 7.2 File Upload → ETL → Dashboard
```
1. Add File DataSource (Upload CSV)
   ↓
2. File parsed & gespeichert
   ↓
3. [MISSING] File-to-DB Import
   ↓
4. Schema Viewer: DataSource sichtbar
   ↓
5. ETL Designer: DataSource als Input wählen
   ↓
6. [MISSING] Pipeline ausführen → Transform → Load to measurements
   ↓
7. Dashboard: Visualisieren
```

---

## 8. Bekannte Einschränkungen & TODOs

### 8.1 Kritische Lücken
1. ❌ **File-to-DB Import fehlt**
   - Files werden hochgeladen & geparst
   - ABER: Nicht automatisch in devices/metrics/measurements importiert
   - User kann File-DataSource nicht in Dashboard visualisieren

2. ❌ **ETL Pipeline Execution**
   - Nur UI-Demo, keine echte Transformation
   - Backend-Logik für Pipeline-Ausführung fehlt

3. ❌ **DataSource Filter in Dashboards**
   - Keine UI zum Filtern nach DataSource
   - User muss Metric manuell wählen

### 8.2 Mittlere Priorität
1. ⚠️ **Metadata Editor Backend**
   - Nur Frontend, keine DB-Persistierung
   - Sollte metadata JSON in devices/metrics speichern

2. ⚠️ **File DataSource Spalten-Mapping**
   - Automatisches Mapping CSV → devices/metrics fehlt
   - User kann Spalten nicht konfigurieren

3. ⚠️ **DataSource Health Checks**
   - Keine regelmäßigen Connection Tests
   - Status wird nicht automatisch aktualisiert

### 8.3 Nice-to-Have
1. ❌ **Pipeline Scheduling**
   - Cron-Jobs für ETL Pipelines
   - Automatische Syncs

2. ❌ **Data Lineage Tracking**
   - Nachverfolgen: Welche DataSource → Transformation → Output
   - Visualisierung im Schema

3. ❌ **DataSource Credentials Encryption**
   - api_token/client_secret in Klartext in DB
   - Sollte verschlüsselt werden

---

## 9. Test Scenarios

### Scenario 1: LineMetrics komplett
```bash
# 1. Create DataSource
POST /api/v1/linemetrics/datasource
{
  "name": "Production LineMetrics",
  "api_url": "https://rest-api.linemetrics.com",
  "client_id": "xxx",
  "client_secret": "yyy"
}
# → Erwartung: Status 201, device_count > 0

# 2. Sync Devices
POST /api/v1/linemetrics/{datasource_id}/sync
# → Erwartung: devices_created > 0, metrics_created > 0

# 3. Import Measurements
POST /api/v1/linemetrics/{datasource_id}/import
{
  "stream_ids": ["input-1", "input-2"],
  "from_time": "2024-01-01T00:00:00Z",
  "to_time": "2024-01-07T00:00:00Z",
  "aggregation": "avg",
  "interval": "PT15M"
}
# → Erwartung: measurements_imported > 0

# 4. Check Schema
GET /api/v1/schema/nodes
# → Erwartung: DataSource-Node mit device_count, metric_count

# 5. Check ETL
GET /api/v1/schema/datasources/summary
# → Erwartung: DataSource in Liste
```

### Scenario 2: File Upload
```bash
# 1. Create File DataSource
POST /api/v1/data-sources
{
  "name": "Sensor Data CSV",
  "type": "file",
  "api_url": "",
  "api_token": ""
}

# 2. Upload File
POST /api/v1/data-sources/{id}/upload
Content-Type: multipart/form-data
file: sensor_data.csv
# → Erwartung: file_stats mit rows, columns

# 3. [MISSING] Import to DB
POST /api/v1/data-sources/{id}/import-file
# → Sollte CSV Zeilen in devices/metrics/measurements importieren
```

---

## 10. Zusammenfassung

### Was funktioniert ✅
1. ✅ DataSource Management (LineMetrics, File, Generic)
2. ✅ LineMetrics OAuth2 Integration
3. ✅ Device/Metric Sync von LineMetrics
4. ✅ Measurements Import von LineMetrics
5. ✅ Schema Viewer mit echten DataSources
6. ✅ ETL Designer DataSource Selector
7. ✅ File Upload & Parsing
8. ✅ Cross-Page Navigation (Data Sources ↔ Data Navigator)

### Was fehlt/eingeschränkt ist ⚠️❌
1. ❌ File-to-DB Import (kritisch!)
2. ❌ ETL Pipeline Execution (nur UI)
3. ❌ DataSource Filter in Dashboards
4. ⚠️ Metadata Editor nur Frontend
5. ⚠️ Keine Credentials Encryption
6. ❌ Pipeline Scheduling
7. ❌ Data Lineage Tracking

### Empfohlene nächste Schritte
1. **File-Import Backend** implementieren
   - CSV Zeilen → devices/metrics/measurements mapping
   - Spalten-Konfiguration UI

2. **ETL Pipeline Execution**
   - Backend-Logik für Transformationen
   - Execution Status Tracking

3. **DataSource Dashboard-Filter**
   - Dropdown in Dashboard: "Filter by DataSource"
   - Zeigt nur Metrics von ausgewählter DataSource
