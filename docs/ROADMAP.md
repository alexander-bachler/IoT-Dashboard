# Gesamtplan / Roadmap – IoT Analytics & Use-Case-Plattform

> Ziel: Eine Plattform im Stil von **Datacake / Beaver IoT**, die zwei Säulen
> vereint:
> 1. **Explorative Zeitreihen-Analyse** – ad hoc, TimescaleDB + viele Apache ECharts.
> 2. **Use-Case-spezifische, konfigurierbare Dashboards & Berichte** – Templates,
>    Widgets, Variablen/Filter, Scheduling, Export, Alarme.
>
> Dieses Dokument ist der konsolidierte Plan auf Basis des realen Code-Stands
> (Stand 2026-06). Es nennt für jede Lücke die **wiederzuverwendenden** Bausteine
> und die **neu zu bauenden** Teile.

---

## 0. Bestandsaufnahme (Ist-Stand)

| Bereich | Status | Persistenz | Zentrale Lücke |
|---|---|---|---|
| Zeitreihen-Analyse | ✅ funktionsfähig | TimescaleDB (`time_bucket`) → Next.js-Route → ECharts | begrenzte Roll-ups, kein LTTB-Downsampling, keine gespeicherten Ansichten |
| Dashboards | ✅ funktionsfähig | Postgres via FastAPI + Zustand/localStorage | Templates ohne Auto-Binding, keine Variablen/Filter, kein Sharing |
| Calculations | ❌ Stub | nur Schema | keine Formel-Engine, kein Runner, kein Backend |
| Reports | ❌ Stub | nur Schema | kein Scheduler, keine PDF/Excel-Erzeugung, kein Mailversand |
| Alerts/Rules | ⚠️ teilweise | Postgres (Rules+Events) | keine Auswertung bei Ingest, kein Notification-Versand |
| LineMetrics-Anbindung | ✅ neu verdrahtet | FastAPI (OAuth2 password grant) | E2E-Test gegen echte API ausstehend |

**Architektur-Notiz (wichtig):** Es existieren zwei Backends parallel –
Next.js-API-Routes (Drizzle) und FastAPI (SQLAlchemy). Die produktive Linie ist
**FastAPI** (so für LineMetrics entschieden). Die Mess-Abfrage läuft aber noch
über die Next.js-Route `app/api/measurements/query/route.ts`. Das muss
konsolidiert werden (siehe Phase 0).

---

## 1. Architektur-Leitplanken

- **Ein Backend:** FastAPI ist die produktive Datenebene. Next.js-API-Routes
  werden migriert oder auf reine BFF-Proxies reduziert.
- **Eine Schema-Quelle:** Aktuell doppelt (Drizzle `db/*.ts` + SQLAlchemy
  `backend/app/models/*`). Festlegen: SQLAlchemy + Alembic als Source-of-Truth
  (FastAPI-Linie), Drizzle nur noch für Next.js-seitige Hilfsfunktionen oder
  entfernen.
- **TimescaleDB konsequent nutzen:** Continuous Aggregates (stündlich/täglich)
  sind in der Migration vorhanden – sie sollen für Langzeitcharts und Reports
  als Quelle dienen statt Roh-Hypertable.
- **Derived Metrics & Reports = First-Class-Daten:** Calculations erzeugen
  „virtuelle Metriken“, die überall (Explorer, Widgets, Reports, Alerts)
  wie normale Metriken verwendbar sind.
- **LineMetrics-Objektmodell als Use-Case-Struktur:** Die kuratierte Hierarchie
  (Gebäude→Etage→Raum→Messpunkt) ist ideal, um Use-Case-Dashboards
  automatisch zu instanziieren (siehe Phase 2).

---

## 2. Säule A – Explorative Zeitreihen-Analyse

**Schon da (wiederverwenden):**
- `components/explorer/time-series-chart.tsx` (ECharts-Wrapper),
  `components/charts/chart-renderer.tsx` (Dispatcher für 14 Chart-Typen).
- `app/api/measurements/query/route.ts` (TimescaleDB `time_bucket` mit
  avg/min/max/count), `lib/hooks/use-measurements.ts`,
  `lib/stores/explorer-store.ts`.

**Ausbau:**
1. **Gespeicherte Ansichten / Saved Queries** – Explorer-Zustand (Geräte,
   Metriken, Zeitraum, Chart-Typ, Aggregation) speicherbar und teilbar machen.
   → erweitert `explorer-store.ts`, neue Tabelle `saved_views` + FastAPI-CRUD.
2. **Erweiterte Aggregationen** – Perzentile, StdDev, Rate/Delta (für Zähler),
   first/last. → `query`-Endpoint um Funktionen erweitern.
3. **Performance bei großen Reihen** – LTTB-Downsampling + Nutzung der
   Continuous Aggregates je nach Zeitfenster (auto-Auswahl der Granularität).
4. **Vergleichsmodus** – mehrere Metriken/Perioden überlagern, Dual-Y-Achsen
   (Felder im Store bereits angelegt).

---

## 3. Säule B – Use-Case-Dashboards & Berichte

### 3.1 Dashboards konfigurierbar machen
**Schon da:** Builder (`components/dashboard/*`, `lib/stores/dashboard-store.ts`),
Persistenz (`backend/app/api/v1/endpoints/dashboards.py`, `use-dashboards.ts`),
5 Templates (`lib/utils/dashboard-templates.ts`).

**Ausbau:**
1. **Template-Auto-Binding** – Templates statt leerer Metrik-IDs automatisch an
   reale Metriken binden (per Heuristik/Mapping bzw. via LineMetrics-Objektmodell).
   → erweitert `app/dashboards/page.tsx` + neuer „Template anwenden“-Hook.
2. **Dashboard-Variablen / Filter** – z. B. Geräte-/Standort-Selektor oben,
   der alle Widgets filtert (wie Grafana-Variablen). → neues `variables`-Feld im
   Dashboard-Layout, Auswertung im `chart-renderer`/Widget-Config.
3. **Neue Widget-Typen** – KPI-/Value-Cards, Status-/Ampel-Widget, Tabelle,
   Karte (für `LOCATION`-Messwerte aus LineMetrics), Text/Markdown.
4. **Drill-down & Sharing** – Klick auf Widget → Explorer mit Kontext;
   öffentliche/eingebettete Read-only-Links (Schema-Feld `isPublic` existiert).

### 3.2 Calculations / Derived Metrics (Backend neu)
**Schon da:** UI `app/calculations/page.tsx`, Schema
`db/schema-calculations.ts` (`customCalculations`, `derivedMetrics`).

**Neu bauen:**
1. **Formel-Engine** `backend/app/services/formula_evaluator.py` – sicherer
   Parser (SUM/AVG/MIN/MAX, +−×÷, Klammern) über referenzierte Metriken.
2. **Runner** – berechnet derived metrics bei Ingest bzw. zeitgesteuert und legt
   sie in `derivedMetrics` ab (TimescaleDB).
3. **API** `backend/app/api/v1/endpoints/calculations.py` (CRUD + Evaluate),
   React-Hook + UI-Verdrahtung. Derived metrics in Explorer/Widgets nutzbar.

### 3.3 Reports (Backend neu)
**Schon da:** UI `app/reports/page.tsx`, Schema `db/schema-reports.ts`
(`scheduledReports` mit Cron, `reportHistory`).

**Neu bauen:**
1. **API** `backend/app/api/v1/endpoints/reports.py` (CRUD, „Run now“).
2. **Scheduler** – APScheduler (im FastAPI-Prozess) oder Celery-Beat, liest
   `scheduledReports.schedule` (Cron), schreibt `reportHistory`.
3. **Generierung** – Report = Snapshot eines Dashboards oder einer Saved Query;
   Export als **PDF** (z. B. WeasyPrint/ReportLab), **Excel** (openpyxl), **CSV**.
4. **Versand** – SMTP-Service (Empfänger aus `recipients`), Ablage der Datei,
   Download-Link in der History.

### 3.4 Alerts / Rules vervollständigen
**Schon da:** `lib/services/alert-service.ts` (Regeln/Events, Bedingungslogik),
Schema `db/schema-alerts.ts`.

**Neu/zu verdrahten:**
1. **Auswertung bei Ingest** – `evaluateMeasurement` an den Mess-Eingang hängen
   (FastAPI `measurements`-Batch + LineMetrics-Import), inkl. `duration`/Debounce.
2. **Notification-Service** `backend/app/services/notification_service.py`
   (E-Mail/Webhook; später SMS) – löst das offene `TODO` in `alert-service.ts:149`.
3. **LineMetrics-Alarme** zusätzlich einlesen (`GET /v2/children?object_type=alarm`).

---

## 4. Querschnittsthemen

- **Realtime:** vorhandene WebSocket-Bausteine (`lib/websocket/*`,
  `use-websocket.ts`) für Live-Widgets/Last-Value fertig verdrahten.
- **RBAC / Multi-Tenant / Workspaces:** Rollen (Admin/Editor/Viewer) bestehen;
  Mandanten-/Workspace-Trennung für Datacake-ähnliche Nutzung ergänzen.
- **White-Label / Theming:** Branding pro Workspace (Logo, Farben) – Theming-Basis
  (next-themes, CSS-Variablen) ist vorhanden.
- **Auth-Kontext-Fix:** `app/anomalies/page.tsx:23` (`acknowledged_by` hartkodiert)
  auf echten User umstellen.

---

## 5. Phasenplan (empfohlene Reihenfolge)

| Phase | Inhalt | Hauptnutzen | Aufwand |
|---|---|---|---|
| **0. Konsolidierung** | Ein Backend (FastAPI), eine Schema-Quelle, Mess-Query nach FastAPI, Auth-Kontext-Fix | Stabiles Fundament, keine Schema-Drift | M |
| **1. Analyse-Tiefe (Säule A)** | Saved Views, erweiterte Aggregationen, Continuous Aggregates + LTTB | Bessere/schnellere Ad-hoc-Analyse | M |
| **2. Dashboard-Konfig (Säule B)** | Variablen/Filter, Template-Auto-Binding, KPI/Tabelle/Map-Widgets, Sharing | Use-Case-Dashboards ohne Handarbeit | L |
| **3. Calculations** | Formel-Engine + Runner + API, derived metrics überall nutzbar | Fachliche KPIs | M |
| **4. Reports** | API + Scheduler + PDF/Excel/CSV + Mail | Automatische Berichte | L |
| **5. Alerts** | Auswertung-on-ingest + Notification-Service + LineMetrics-Alarme | Proaktive Überwachung | M |
| **6. Querschnitt** | Realtime-Widgets, RBAC/Multi-Tenant, White-Label | Plattform-/Mehrmandantenreife | L |

Aufwand grob: S < M < L. Phasen 0–2 liefern den größten unmittelbaren Mehrwert
für „beide Säulen“; 3–5 schließen die heutigen Stub-Lücken.

---

## 6. Wichtigste neue Artefakte (Überblick)

- `backend/app/services/formula_evaluator.py`, `.../endpoints/calculations.py`
- `backend/app/api/v1/endpoints/reports.py` + Scheduler + Generatoren
- `backend/app/services/notification_service.py`
- FastAPI-`measurements/query` (Ablösung der Next.js-Route) + Aggregations-/LTTB-Logik
- Dashboard-Variablen im Layout-Schema + neue Widget-Komponenten (KPI/Tabelle/Map)
- Saved-Views-Tabelle + CRUD
