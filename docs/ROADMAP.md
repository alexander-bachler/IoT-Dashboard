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
| Zeitreihen-Analyse | ✅ funktionsfähig | TimescaleDB (Continuous Aggregates + `time_bucket`, LTTB für Rohdaten) → FastAPI → ECharts | Saved Views noch client-seitig (localStorage), nicht cross-device |
| Dashboards | ✅ funktionsfähig | Postgres via FastAPI + Zustand/localStorage | globaler Zeitraum- & Data-Source-Filter vorhanden; Templates ohne Auto-Binding, kein Sharing |
| Calculations | ✅ funktionsfähig | FastAPI (`/calculations`) + Formel-Engine + Editor mit Charts + **als Dashboard-Widget** nutzbar | — |
| Reports | ❌ Stub | nur Schema | kein Scheduler, keine PDF/Excel-Erzeugung, kein Mailversand |
| Alerts/Rules | ⚙️ Backend (Engine + CRUD + Evaluate) | FastAPI (`/alerts`) + reine Regel-Engine | Frontend, Auswertung bei Ingest, Notification-Versand (Stub) offen |
| LineMetrics-Anbindung | ✅ neu verdrahtet | FastAPI (OAuth2 password grant) | E2E-Test gegen echte API ausstehend |

**Architektur-Notiz (wichtig):** Es existieren zwei Backends parallel –
Next.js-API-Routes (Drizzle) und FastAPI (SQLAlchemy). Die produktive Linie ist
**FastAPI** (so für LineMetrics entschieden). Tatsächlich nutzt das Frontend
aber **beide** Backends gleichzeitig (belegt durch Code-Analyse):
- **FastAPI** (`apiClient` → `NEXT_PUBLIC_API_URL`/`:8000`): Dashboards,
  Data-Sources, Measurements, Anomalies, LineMetrics.
- **Next.js/Drizzle** (relative `fetch('/api/...')`): Geräte-/Metrik-Picker
  (`components/explorer/explorer-controls.tsx`, `components/dashboard/add-widget-dialog.tsx`
  → `/api/devices`, `/api/devices/{id}/metrics`), Annotations
  (`components/charts/chart-with-annotations.tsx` → `/api/annotations`) und
  Datenqualität (`components/explorer/data-quality-badge.tsx` → `/api/quality`).

Zusätzlich zeigt der Measurements-Client (`lib/api/services/measurements.ts`)
auf FastAPI-Endpunkte, die dort fehlten (`/time-series`, `/downsample`,
`/latest`, `/statistics`, `/range`), und der Anomalies-Client weicht in Pfad/
Methode ab (`getAll` GET `/` statt POST `/query`, `/statistics` statt `/stats`).
Das wird in Phase 0 konsolidiert.

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
- **LineMetrics: Device-Modell zuerst, Objektmodell optional.** Nicht jeder
  Kunde pflegt ein Objektmodell. Standard-Discovery/Sync läuft daher über das
  **Device-Modell** (`/v2/devices/all`, `/v2/devices?id=`,
  `/v2/device-inputs/{id}/data`) – so bereits im FastAPI-Service umgesetzt.
  Das **Objektmodell** (`/v2/children`, `/v2/data/{measurementId}`) wird nur
  **zusätzlich** genutzt, wenn vorhanden – z. B. um Use-Case-Dashboards aus der
  kuratierten Hierarchie (Gebäude→Etage→Raum→Messpunkt) automatisch zu
  instanziieren (Kür, nicht Pflicht).

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
   reale Metriken binden (per Heuristik/Mapping über Geräte/Metriken; optional
   über das LineMetrics-Objektmodell, falls beim Kunden vorhanden).
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

### Phase 0 – Status

**Erledigt:**
- FastAPI-Measurements vervollständigt: `GET /time-series`, `/downsample`,
  `/latest`, `/statistics`, `DELETE /range` inkl. portierter TimescaleDB-
  `time_bucket`-Aggregation (`backend/app/api/v1/endpoints/measurements.py`).
- Anomaly-Quittierung backend-autoritativ (`acknowledged_by` = eingeloggter
  User) + Frontend-Payload/Methode korrigiert (PUT, `{ acknowledged: true }`).
- Geräte-/Metrik-Picker auf FastAPI umgestellt (`explorer-controls.tsx`,
  `add-widget-dialog.tsx` → `apiClient` `/api/v1/devices`); dazu Device-/Metric-
  Endpunkte von `int`- auf `UUID`-IDs korrigiert; Next.js-Routes `devices` +
  `devices/[id]/metrics` entfernt.
- Annotations: echter FastAPI-Endpunkt auf `chart_annotations`
  (`backend/.../endpoints/annotations.py` + Model) statt Mock; Komponente
  umgestellt. Datenqualität wird client-seitig berechnet (`calculateDataQuality`).
  Next.js-Routes `annotations` + `quality` entfernt.
- Anomalies-Listen-Client an FastAPI angeglichen (`getAll` → POST `/query` mit
  paginiertem Wrapper, `getStatistics` → `/stats`, Card liest `acknowledged`).
- Toter Doppel-Code entfernt: Next.js-Routes `anomalies`, `data-sources`,
  `measurements/query` + ungenutzter `lib/services/alert-service.ts`.
- **Ergebnis:** Einziges Runtime-Backend ist FastAPI (0 `@/db`-Importer); unter
  `app/api/` verbleibt nur noch `auth/[...nextauth]` (NextAuth).

**Entscheidung (DDL-Quelle):**
- Die **Drizzle-SQL-Migrations** (`db/migrations/*.sql`) bleiben die alleinige
  DDL-Quelle (sie erzeugen Hypertable, Continuous Aggregates und die Advanced-
  Tabellen); FastAPI/SQLAlchemy mappt darauf. Drizzle wird zur **Laufzeit nicht
  mehr** genutzt. Ein Umbau auf Alembic ist optionale spätere Arbeit.

**Offene Caveats:**
- **Verifikation gegen laufenden FastAPI+TimescaleDB-Stack** steht aus (im
  Container nicht ausführbar): neue Measurement-Endpunkte, Annotation-Endpunkt,
  UUID-Device-Endpunkte, Anomalie-Quittierung.
- Anomalie-**Status-Semantik** (new/resolved/false_positive) ist backend-seitig
  nur als `acknowledged`-Bool abgebildet → Stats-Kacheln „Resolved/New“ zeigen
  ggf. 0. Vollständige Status-Angleichung ist Daten-Modell-Arbeit für Phase 1/2.

### Phase 1 – Status (laufend)

**Erledigt:**
- **Materialized Views (Continuous Aggregates) werden jetzt genutzt.** Die in
  `0000_setup_timescaledb.sql` definierten Views `measurements_hourly` /
  `measurements_daily` waren bisher totes Kapital — das Backend bucketete immer
  über die rohe Hypertable. `_bucketed_series` (versorgt `/time-series` und
  `/downsample`) wählt nun die Quelle nach Intervall:
  - Intervall = ganzzahlige Tage → `measurements_daily`
  - Intervall = ganzzahlige Stunden → `measurements_hourly`
  - sonst (sub-stündlich/ungerade) → rohe `measurements`.
  Beim Re-Bucketing der Views wird **count-gewichtet** aggregiert
  (`SUM(avg_value*count)/SUM(count)`), sodass das Ergebnis exakt dem Rohdaten-
  Aggregat entspricht (kein „Average-of-Averages“).
- **LTTB-Downsampling** für den Rohdatenpfad von `GET /time-series`: ohne
  `interval` werden Rohpunkte pro Metrik per Largest-Triangle-Three-Buckets auf
  `max_points` (Default 2000) reduziert — visuell verlustarm (Peaks/Täler
  bleiben erhalten) statt simplem `limit`-Abschneiden. Reiner Algorithmus,
  standalone getestet (Länge, Endpunkt-Erhalt, Spike-Erhalt).
- Latente Bugs in den Legacy-Measurement-Endpunkten gefixt
  (`POST /query`, `GET /stats`): `Measurement.timestamp`/`.id` → korrekte
  Spalte `time` (verhinderte sonst Laufzeit-`AttributeError`).
- **UI auf „cleaner SaaS“ umgestellt** (eigener `frontend-design`-Skill):
  neutrale Flächen, eine Akzentfarbe, responsive Navigation inkl. aller Routen,
  theme-fähiger ETL-Node-Editor. Production-Build (`next build`) grün.
- **Saved Views** (Explorer): benannte Snapshots der Explorer-Konfiguration
  (Gerät, Metriken, Zeitraum, Chart-Typ, Aggregation, Compare) speichern, laden
  und löschen. Persistenz aktuell client-seitig via Zustand-`persist`
  (localStorage); Config-Shape ist serialisierbar für späteren Umzug auf einen
  FastAPI-Endpunkt (cross-device).
- **Per-Metrik-Limit gefixt**: der Rohdatenpfad von `GET /time-series` fragt
  jetzt pro Metrik einzeln ab (gebundene Query + LTTB je Reihe), statt mit einem
  globalen `LIMIT` alle Reihen am selben Cut-off abzuschneiden.

**Noch offen (Phase 1):**
- **Saved Views → Backend**: optionaler Umzug von localStorage auf einen
  owner-scoped FastAPI-Endpunkt für geräteübergreifende Synchronisierung.
- **Freshness-Hinweis:** Die Cagg-Refresh-Policies haben `end_offset` (1h/1d);
  je nach TimescaleDB-Realtime-Setting kann der jeweils letzte Bucket aus
  Rohdaten ergänzt werden. Für Live-Kurzbereiche greift ohnehin der Rohdaten-
  Pfad. Verhalten gegen laufenden Stack verifizieren.

### Phase 2 – Status (laufend)

**Erledigt:**
- **Globaler Dashboard-Zeitraum-Filter**: opt-in Time-Picker in der Dashboards-
  Toolbar (`globalTimeRange` im Store); wenn gesetzt, nutzen **alle** Widgets
  diesen Zeitraum statt ihres eigenen (Default „Per widget", kein erzwungenes
  Verhalten). Ergänzt den bestehenden Data-Source-Filter. Build grün.
- **Globales Auto-Refresh + „Refresh all"**: manueller Refresh-Button und
  Intervall-Auswahl (Off/10s/30s/1m/5m) in der Toolbar; ein `refreshNonce` im
  Store löst alle Widgets im Gleichschritt neu aus (transient, nicht
  persistiert). Macht das Dashboard zu einer Live-Monitoring-Fläche. Build grün.
- **Dashboard-Persistenz-Contract gefixt** (war end-to-end kaputt, gleicher
  Drift wie Phase 0): Frontend sendete `layout`, das Backend verlangt aber
  `config` (required) → Create scheiterte mit 422; zudem `parseInt(uuid)`→`NaN`
  auf den int-typisierten Pfadparametern. Jetzt: Frontend spricht `config`,
  Backend-Dashboard-IDs `int`→`UUID`, kein `parseInt` mehr. Die globalen
  Einstellungen (Zeitraum/Refresh/Data-Sources) werden als `config.settings`
  **pro Dashboard** mitgespeichert und beim Laden wiederhergestellt.
- **Systematischer Contract-Audit** (Frontend ↔ FastAPI) durchgeführt und
  restliche Drift-Bugs behoben:
  - `int`-Pfadparameter → `UUID`: letzter Fall `GET /measurements/stats`
    (`metric_id`). Sweep zeigt: keine weiteren `int`-IDs im Backend.
  - `lib/api/config.ts`: 11 Endpunkt-Helfer von `(id: number)` → `(id: string)`
    (data-sources/devices/metrics/anomalies sind UUID-Ressourcen).
  - **Data-Sources-Drift behoben**: Backend liefert ein **Array** mit
    `is_active`; Frontend erwartete fälschlich paginiert (`.data`/`.total`) und
    `status` → Home-Stats und Manager-Kacheln zeigten 0/„Errors". Typ, Service,
    Home-Seite und Manager auf Array + `is_active` ausgerichtet.
  - Verifiziert: tsc (keine neuen Fehler), `next build` grün.
- **Reine Time-Series-Logik extrahiert + getestet**: LTTB, Intervall-
  Normalisierung (inkl. Injection-sicherer Whitelist) und Cagg-Auswahl liegen
  jetzt dependency-frei in `backend/app/services/timeseries.py`; `measurements.py`
  importiert sie. Neue pytest-Suite `backend/tests/test_timeseries.py`
  (11 Tests: Short/ISO-Intervalle, Default/Injection-Fallback, Cagg-Routing,
  count-gewichtete Re-Aggregation, LTTB-Invarianten inkl. Spike-Erhalt) — lokal
  alle grün; läuft in CI via `pytest` (in `requirements`).
- **CI-Pipeline** (`.github/workflows/ci.yml`): **drei** Jobs bei jedem Push/PR —
  Frontend (`npm ci` → `tsc --noEmit` → `vitest run` → `next build`), Backend
  (`pytest`) und **Integration** (TimescaleDB-Service → Drizzle-SQL-Migrations
  via `psql` → FastAPI per `uvicorn` → `smoke_test.py`). **Alle grün auf echtem
  CI verifiziert.**
- **Test-Schuld getilgt**: die vormals 27 `tsc`-Fehler und 10 fehlschlagenden
  Vitest-Tests behoben — Ursachen waren Test-Drift, kein Store-Reset
  (`resetRateLimitStore()` ergänzt), eine fehlende `getDashboardTemplate()`-
  Helferfunktion und eine Null-Varianz-Baseline im Anomalie-Test. Jetzt
  **`tsc --noEmit` = 0 Fehler** und **63/63 Vitest-Tests grün**, beide als
  CI-Gates erzwungen.
- **E2E-Smoke-Test** (`backend/scripts/smoke_test.py`): dependency-freies
  stdlib-Skript gegen einen **laufenden** Stack — Login (OAuth2 password grant),
  Read-Endpunkte (data-sources/devices/metrics/dashboards/anomalies-stats),
  Measurements-Kette (device→metrics→time-series mit `interval=1h`, trifft die
  stündliche Continuous Aggregate) und ein **Dashboard-CRUD-Round-Trip**.
  Folgt 307/308-Trailing-Slash-Redirects (Methode+Body). **Lauf grün: 8/8
  Checks gegen echte TimescaleDB** (inkl. CRUD mit echter UUID → validiert die
  `config`/UUID-Contract-Fixes end-to-end).
- **Vom Integrations-Job gefundene reale Bugs** (die Build/Typecheck/Unit-Tests
  nicht sehen konnten):
  - `data_sources.py` hatte einen **hartkodierten absoluten Upload-Pfad**, der
    beim Import angelegt wurde → App startete auf **keinem** anderen Host als der
    ursprünglichen Dev-Box. Behoben: Pfad relativ zu `backend/` (per `UPLOAD_DIR`
    überschreibbar) + defensives `mkdir`.

- **Calculations – Backend** (`/api/v1/calculations`): CRUD für abgeleitete
  Metriken + **sichere Formel-Engine** (`app/services/formula_evaluator.py`,
  AST-basiert, kein `eval`; Whitelist aus Operatoren/Funktionen). Auswertung
  bucketweise über die Quell-Metriken (time_bucket, auf gemeinsamen Buckets
  ausgerichtet) via `POST /preview` (ad-hoc) und `POST /{id}/evaluate`.
  Owner-scoped. Engine mit pytest abgedeckt (`tests/test_formula_evaluator.py`),
  CRUD+Preview im Live-E2E-Smoke-Test. **Alle drei CI-Jobs grün.**
- **Calculations – Frontend**: API-Service + React-Query-Hooks
  (`lib/api/services/calculations.ts`, `lib/hooks/use-calculations.ts`) +
  neue `app/calculations/page.tsx` als echter Editor: Variablen → Geräte-/
  Metrik-Picker, Formel-Eingabe, **Live-Preview** über `POST /preview`
  (zeigt Punkte/Aggregat/letzten Wert + Validierungsfehler), Speichern/Löschen.
  `next build` grün.

- **Alerts – Backend** (`/api/v1/alerts`): reine Regel-Engine
  (`app/services/alert_rules.py`: Schwellwert-Vergleiche, pytest-getestet) +
  owner-scoped CRUD für Alert-Rules (Scoping über metric→device→data_source) +
  `POST /rules/{id}/evaluate`, das die Metrik über einen Zeitraum prüft und je
  Breach ein `alert_events`-Event anlegt, + Events-Liste + Acknowledge. Die
  **Notification-Zustellung ist ein klar markierter Stub** (Kanäle werden
  gespeichert/geloggt, kein echter Versand). Engine via pytest, CRUD/Validierung
  im Live-E2E-Smoke-Test. **Offen:** Frontend, Auswertung bei Ingest, echter
  Versand.

**Noch offen (Phase 2, Auswahl):**
- **Alerts – Frontend** + Auswertung bei Ingest + echter Notification-Versand
  (E-Mail/Webhook).
- Calculation-Ergebnisse als **Dashboard-Widget** verwendbar machen (auf der
  Calculations-Seite werden sie bereits als Chart dargestellt). **Erledigt** —
  „Add Widget" bietet jetzt die Quelle *Calculation*; das Widget evaluiert
  `/{id}/evaluate` über den (globalen) Zeitraum und wird mit dem Dashboard
  persistiert.
- Dashboard-**Variablen** (z. B. `$device`) mit Auto-Binding an Widgets &
  Templates.
- Dashboard-**Sharing** / Persistenz pro Dashboard im Backend.
- **Calculations** (Formel-Engine + Runner) und **Reports** (Scheduler,
  PDF/Excel, Mailversand) — bisher Stubs.
- **Alerts**: Auswertung bei Ingest + Notification-Versand.

---

## 6. Wichtigste neue Artefakte (Überblick)

- `backend/app/services/formula_evaluator.py`, `.../endpoints/calculations.py`
- `backend/app/api/v1/endpoints/reports.py` + Scheduler + Generatoren
- `backend/app/services/notification_service.py`
- FastAPI-`measurements/query` (Ablösung der Next.js-Route) + Aggregations-/LTTB-Logik
- Dashboard-Variablen im Layout-Schema + neue Widget-Komponenten (KPI/Tabelle/Map)
- Saved-Views-Tabelle + CRUD
