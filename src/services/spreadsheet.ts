import { File as FsFile } from 'expo-file-system';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import * as XLSX from 'xlsx';
import { parseCsv } from './csv';

/**
 * Read a picked CSV / XLS / XLSX file into rows of { header: value } strings.
 * CSV uses the app's own parser; XLS/XLSX use SheetJS. SheetJS is pure JavaScript
 * (no native module), so this needs no new EAS build. The first sheet's first row
 * is treated as the header, matching parseCsv's output shape.
 */
export async function parseTabularFile(uri: string, name: string): Promise<Record<string, string>[]> {
    const extension = (name.split('.').pop() ?? '').toLowerCase();

    if (extension === 'xls' || extension === 'xlsx') {
        let workbook: XLSX.WorkBook;
        if (Platform.OS === 'web') {
            const buffer = await (await fetch(uri)).arrayBuffer();
            workbook = XLSX.read(buffer, { type: 'array' });
        } else {
            const base64 = await FileSystemLegacy.readAsStringAsync(uri, {
                encoding: FileSystemLegacy.EncodingType.Base64,
            });
            workbook = XLSX.read(base64, { type: 'base64' });
        }

        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        if (!firstSheet) return [];

        // raw:false returns each cell's displayed text so numeric ids aren't reformatted.
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '', raw: false });
        return json.map((row) => {
            const record: Record<string, string> = {};
            for (const key of Object.keys(row)) {
                record[String(key).trim()] = String(row[key] ?? '').trim();
            }
            return record;
        });
    }

    // CSV / plain text
    const text = Platform.OS === 'web'
        ? await (await fetch(uri)).text()
        : await new FsFile(uri).text();
    return parseCsv(text);
}
