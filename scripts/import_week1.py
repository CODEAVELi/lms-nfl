"""Reconcile the supplied Week 1 workbook and generate the static data (stdlib only).

Usage: python scripts/import_week1.py 'path/to/LMS Week 1 Picks.xlsx'
The original workbook is read only. Row-level picks are authoritative.
"""
from collections import Counter
import hashlib
import json
from pathlib import Path
import sys
import xml.etree.ElementTree as ET
import zipfile

source = Path(sys.argv[1])
ns = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
with zipfile.ZipFile(source) as archive:
    strings = ["".join(item.itertext()) for item in ET.fromstring(archive.read("xl/sharedStrings.xml")).findall("m:si", ns)]

    def read_rows(sheet):
        result = []
        for row in ET.fromstring(archive.read(sheet)).findall("m:sheetData/m:row", ns):
            cells = {}
            for cell in row.findall("m:c", ns):
                value = cell.find("m:v", ns)
                if value is not None:
                    cells["".join(filter(str.isalpha, cell.get("r")))] = (strings[int(value.text)] if cell.get("t") == "s" else value.text).strip()
            result.append(cells)
        return result

    rows = read_rows("xl/worksheets/sheet1.xml")
    assert rows[0]["B"] == "Name" and rows[0]["C"] == "Week 1", "Unexpected workbook layout"
    entries = [{"id": row["A"], "name": row["B"], "pick1": "" if row["C"] == "No Pick" else row["C"], "preOutReason": "No Pick" if row["C"] == "No Pick" else ""} for row in rows[1:]]
    assert all(entry["name"] for entry in entries)
    assert len({entry["id"] for entry in entries}) == len(entries), "Duplicate entry IDs"
    assert len({entry["name"] for entry in entries}) == len(entries), "Duplicate entry names"
    counts = Counter(row["C"] for row in rows[1:])
    summary = {row["A"]: int(row["B"]) for row in read_rows("xl/worksheets/sheet2.xml")[1:]}
    differences = [{"team": team, "rosterCount": counts.get(team, 0), "summaryCount": summary.get(team, 0)} for team in sorted(set(counts) | (set(summary) - {"Grand Total"})) if counts.get(team, 0) != summary.get(team, 0)]
    assert summary["Grand Total"] == len(entries), "Grand total does not match the roster"
    # Publish only aggregate team counts. Participant names/IDs stay in the
    # original workbook and are never written into the public site payload.
    data = {"season": 2026, "weekNumber": 1, "source": source.name, "sourceSha256": hashlib.sha256(source.read_bytes()).hexdigest(), "entryCount": len(entries), "noPickCount": counts["No Pick"], "summaryDifferences": differences, "teams": [{"team": name, "count": count} for name, count in counts.most_common() if name != "No Pick"]}

output = Path(__file__).resolve().parents[1] / "data" / "week1-2026.js"
output.parent.mkdir(exist_ok=True)
output.write_text("// Generated from the row-level picks by scripts/import_week1.py.\nconst LMS_WEEK1_2026 = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n")
print(json.dumps({key: value for key, value in data.items() if key not in ("entries", "teams")}, indent=2))
