# Notfall-Backup & Wiederherstellung

Diese Datei beschreibt, wo die Sicherungen liegen und wie man im Notfall zurückkehrt.
Sie wird vor jeder größeren Design- oder Funktionsänderung aktualisiert.

---

## 1. Sicherung des App-Codes

| Sicherung | Stand | Commit | SHA-256 von `index.html` |
|---|---|---|---|
| `backups/v93_2026-11-08/index.html.gz` | v93 „Production Hardening“, letzter Stand vor dem Redesign | `02607b8bf31e7235ffed568b76253a6786fbd7fa` | `ea294d9c63df5c57dafc55e2655fe4928afbf1a6b600c6490f6d0f06b9e5a1e9` |

Die Sicherung liegt **komprimiert** (`.gz`) im Ordner `backups/`. Das ist Absicht: Würde dort eine lauffähige
`index.html` liegen, könnte sie auf dem Webserver mit veröffentlicht werden. Dann könnte jemand die alte Version öffnen
und mit altem Code in die Live-Daten schreiben.

Zusätzlich ist derselbe Stand für immer über den Commit `02607b8` in der Git-Historie abrufbar.

### Code wiederherstellen (ohne Git)

1. Auf GitHub `backups/v93_2026-11-08/index.html.gz` öffnen → **Download**.
2. Entpacken (Windows: z. B. 7-Zip; macOS: Doppelklick). Heraus kommt `index.html`.
3. Diese Datei ersetzt die `index.html` der App.

### Code wiederherstellen (mit Git)

```bash
gunzip -c backups/v93_2026-11-08/index.html.gz > index.html
```

Alternativ direkt aus der Git-Historie:

```bash
git checkout 02607b8bf31e7235ffed568b76253a6786fbd7fa -- index.html
```

Prüfen, dass es wirklich die gesicherte Datei ist (Ergebnis muss mit der Tabelle oben übereinstimmen):

```bash
sha256sum index.html
```

### Optional: festen Tag auf GitHub anlegen

Ein Tag markiert diesen Stand zusätzlich dauerhaft. Auf GitHub: **Releases → Draft a new release → Choose a tag**,
`backup-v93-2026-11-08` eintippen, als Ziel `main` wählen (zeigt aktuell auf `02607b8`), veröffentlichen.

---

## 2. Sicherung der Daten (Firebase)

**Wichtig:** Der Code-Backup enthält **keine** Mitarbeiter-, Beurteilungs- oder Gehaltsdaten. Die liegen in Firebase
(Projekt `performance-manager-b0967`) und müssen separat gesichert werden. Datensicherungen gehören **nicht** in dieses
Repository, weil sie personenbezogene und Gehaltsdaten enthalten.

### Variante A: Firestore-Export in der Google Cloud (empfohlen, vollständig)

Sichert **alle** Tabellen, inklusive Benutzerkonten und Gehaltshistorie.

1. In der Google Cloud Console das Projekt `performance-manager-b0967` öffnen.
2. **Firestore → Import/Export → Exportieren**, „Gesamte Datenbank“ wählen.
3. Einen Cloud-Storage-Bucket als Ziel wählen (ggf. vorher anlegen).
4. Optional: unter **Firestore → Notfallwiederherstellung** die Point-in-Time-Recovery bzw. geplante Backups aktivieren.

Wiederherstellen: gleicher Bereich → **Importieren** → Exportordner im Bucket wählen.

Die hochgeladenen PDFs liegen in **Firebase Storage**, nicht in Firestore. Sie werden vom Firestore-Export nicht erfasst.
Sicherung z. B. per `gsutil -m cp -r gs://<storage-bucket> <lokaler-ordner>`.

### Variante B: Export-Button in der App (schnell, aber unvollständig)

1. Als HR-Admin anmelden.
2. Bereich **Backup & Restore** öffnen → Backup exportieren. Es wird eine JSON-Datei
   `niederwieser_backup_<datum>_<zeit>.json` heruntergeladen.
3. Die Datei an einem geschützten Ort ablegen (nicht per E-Mail verschicken, nicht in dieses Repository).

Dieser Export enthält: `teamAppraisals`, `teamMembers`, `salaryReviewData`, `salaryReviewAccess`.

Er enthält **nicht**: `registeredUsers`, `appraisals` (ältere HR-Beurteilungen), `salaryReviewHistory`
und die PDF-Dateien aus Firebase Storage. Für einen echten Notfall daher Variante A verwenden.

---

## 3. Vor jedem Live-Gang einer neuen Version

- [ ] Firestore-Export (Variante A) erstellt und Datum hier notiert
- [ ] Code-Stand als neue Sicherung unter `backups/<version>_<datum>/` abgelegt und in der Tabelle oben eingetragen
- [ ] Neue Version mit einem bestehenden Konto getestet: alte Daten vollständig sichtbar, nichts vertauscht

### Protokoll Datensicherungen

| Datum | Art | Ablageort | Erstellt von |
|---|---|---|---|
| | | | |
