import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import type { RecoveryFileObject } from './types';

const FILE_EXTENSION = '.griplock';

function getFileName(walletId: string): string {
  const short = walletId.substring(0, 8);
  return `griplock-${short}${FILE_EXTENSION}`;
}

function encodeRecoveryFile(recoveryFile: RecoveryFileObject): string {
  const jsonString = JSON.stringify(recoveryFile);
  return btoa(
    encodeURIComponent(jsonString).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    )
  );
}

function decodeRecoveryFile(base64Content: string): RecoveryFileObject {
  const jsonString = decodeURIComponent(
    atob(base64Content)
      .split('')
      .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );
  return JSON.parse(jsonString);
}

export async function exportRecoveryFile(
  recoveryFile: RecoveryFileObject
): Promise<boolean> {
  const fileName = getFileName(recoveryFile.walletId);
  const file = new File(Paths.cache, fileName);

  const base64Content = encodeRecoveryFile(recoveryFile);
  const encoder = new TextEncoder();
  const data = encoder.encode(base64Content);

  const stream = file.writableStream();
  const writer = stream.getWriter();
  await writer.write(data);
  await writer.close();

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    return false;
  }

  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/octet-stream',
    dialogTitle: 'Save Recovery File',
    UTI: 'public.data',
  });

  return true;
}

export async function importRecoveryFile(): Promise<RecoveryFileObject | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];
  const importedFile = new File(asset.uri);
  const buffer = await importedFile.arrayBuffer();
  const decoder = new TextDecoder();
  const content = decoder.decode(buffer);

  if (!content) {
    throw new Error('Empty recovery file');
  }

  const parsed = decodeRecoveryFile(content);

  if (parsed.schema !== 'griplock.recovery.v2') {
    throw new Error('Invalid recovery file format');
  }

  return parsed;
}

export async function deleteLocalCache(walletId: string): Promise<void> {
  const fileName = getFileName(walletId);
  const file = new File(Paths.cache, fileName);
  if (file.exists) {
    file.delete();
  }
}
