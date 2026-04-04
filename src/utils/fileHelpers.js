import RNFS from 'react-native-fs';

export const ROOT_DIRECTORY = RNFS.DocumentDirectoryPath;
export const HIDDEN_FILES_DIR = `${ROOT_DIRECTORY}/.filelocker_hidden`;
export const HIDDEN_DIR = `${RNFS.DocumentDirectoryPath}/.shield_vault`;
export const METADATA_KEY = '@shield_file_mappings';

export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getFileType = (filename) => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const types = {
    jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', bmp: 'image',
    webp: 'image', svg: 'image', tiff: 'image', ico: 'image', heic: 'image',
    pdf: 'pdf',
    doc: 'document', docx: 'document', rtf: 'document', odt: 'document',
    xls: 'spreadsheet', xlsx: 'spreadsheet', csv: 'spreadsheet', ods: 'spreadsheet',
    ppt: 'presentation', pptx: 'presentation', odp: 'presentation',
    txt: 'text', log: 'text', md: 'text', json: 'text', xml: 'text',
    html: 'text', css: 'text', js: 'text', ts: 'text', jsx: 'text',
    mp3: 'audio', wav: 'audio', m4a: 'audio', aac: 'audio', flac: 'audio',
    ogg: 'audio', wma: 'audio', opus: 'audio',
    mp4: 'video', mov: 'video', avi: 'video', mkv: 'video', wmv: 'video',
    flv: 'video', webm: 'video', '3gp': 'video', m4v: 'video',
    zip: 'archive', rar: 'archive', '7z': 'archive', tar: 'archive', gz: 'archive',
    apk: 'android', exe: 'executable', dmg: 'executable', iso: 'archive',
  };
  return types[ext] || 'file';
};

export const getFileIcon = (type) => {
  const icons = {
    folder: 'folder', 'folder-back': 'arrow-back', image: 'image',
    pdf: 'picture-as-pdf', document: 'description', spreadsheet: 'grid-on',
    presentation: 'slideshow', text: 'text-fields', audio: 'audiotrack',
    video: 'movie', archive: 'archive', android: 'android', file: 'insert-drive-file',
  };
  return icons[type] || 'insert-drive-file';
};

export const getFileIconColor = (type) => {
  const colors = {
    folder: '#FFB300', 'folder-back': '#2196F3', image: '#4CAF50',
    pdf: '#F44336', document: '#2196F3', spreadsheet: '#0F9D58',
    presentation: '#FF9800', text: '#9C27B0', audio: '#E91E63',
    video: '#3F51B5', archive: '#795548', android: '#A4C639', file: '#607D8B',
  };
  return colors[type] || '#607D8B';
};

export const getParentDirectory = (path) => {
  const parts = path.split('/');
  parts.pop();
  return parts.join('/') || '/';
};

export const generateStealthName = (originalName) => {
  const uniqueId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  return `.shield.${uniqueId}.${originalName}`;
};

export const initializeVault = async () => {
  try {
    const exists = await RNFS.exists(HIDDEN_DIR);
    if (!exists) {
      await RNFS.mkdir(HIDDEN_DIR);
      await RNFS.writeFile(`${HIDDEN_DIR}/.nomedia`, '', 'utf8');
    }
  } catch (error) {
    console.error('Vault init error:', error);
  }
};

export const initializeHiddenDirectory = async () => {
  try {
    const exists = await RNFS.exists(HIDDEN_FILES_DIR);
    if (!exists) {
      await RNFS.mkdir(HIDDEN_FILES_DIR);
      await RNFS.writeFile(`${HIDDEN_FILES_DIR}/.nomedia`, '', 'utf8');
    }
  } catch (error) {
    // silent
  }
};
