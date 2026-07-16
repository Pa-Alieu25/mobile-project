// Minimal CSV parser. The first non-empty row is treated as the header, and
// each following row becomes an object keyed by those headers. Handles quoted
// fields that contain commas or newlines.

export function parseCsv(text: string): Record<string, string>[] {
    const rows = splitRows(text).filter((r) => r.some((c) => c.trim() !== ''));
    if (rows.length < 2) return [];

    const headers = rows[0].map((h) => h.trim());
    return rows.slice(1).map((cells) => {
        const record: Record<string, string> = {};
        headers.forEach((header, i) => {
            record[header] = (cells[i] ?? '').trim();
        });
        return record;
    });
}

function splitRows(text: string): string[][] {
    const rows: string[][] = [];
    let field = '';
    let row: string[] = [];
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (inQuotes) {
            if (char === '"') {
                if (text[i + 1] === '"') {
                    field += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                field += char;
            }
        } else if (char === '"') {
            inQuotes = true;
        } else if (char === ',') {
            row.push(field);
            field = '';
        } else if (char === '\n') {
            row.push(field);
            rows.push(row);
            row = [];
            field = '';
        } else if (char !== '\r') {
            field += char;
        }
    }

    if (field !== '' || row.length > 0) {
        row.push(field);
        rows.push(row);
    }
    return rows;
}
