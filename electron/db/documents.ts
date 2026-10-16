import type { DocumentFile } from '../../shared/types';
import { db, queryAll, queryOne, queryScalar } from './connection';

export interface StoredDocument extends DocumentFile {
  // 實際存放在 userData/documents/ 底下的檔名（不會與其他檔案衝突）
  storedName: string;
}

const SELECT_COLUMNS = 'id, file_name AS fileName, stored_name AS storedName, size, uploaded_at AS uploadedAt';

export function listDocuments(): DocumentFile[] {
  return queryAll<StoredDocument>(`SELECT ${SELECT_COLUMNS} FROM documents ORDER BY uploaded_at DESC, id DESC`).map(
    ({ storedName: _storedName, ...doc }) => doc
  );
}

export function getStoredDocument(id: number): StoredDocument {
  const doc = queryOne<StoredDocument>(`SELECT ${SELECT_COLUMNS} FROM documents WHERE id = ?`, [id]);
  if (!doc) {
    throw new Error('檔案不存在');
  }
  return doc;
}

export function insertDocument(fileName: string, storedName: string, size: number): number {
  db().run('INSERT INTO documents (file_name, stored_name, size, uploaded_at) VALUES (?, ?, ?, ?)', [
    fileName,
    storedName,
    size,
    new Date().toISOString(),
  ]);
  return Number(queryScalar('SELECT last_insert_rowid()'));
}

export function deleteDocumentRow(id: number): void {
  db().run('DELETE FROM documents WHERE id = ?', [id]);
}
