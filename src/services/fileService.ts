import * as fs from 'fs';
import * as path from 'path';

export class FileService {
  constructor(private contextDir: string) {}

  ensureDir() {
    if (!fs.existsSync(this.contextDir)) {
      fs.mkdirSync(this.contextDir, { recursive: true });
    }
  }

  writeFile(filename: string, content: string) {
    this.ensureDir();
    const filepath = path.join(this.contextDir, filename);
    fs.writeFileSync(filepath, content, 'utf-8');
  }

  readFile(filename: string): string {
    const filepath = path.join(this.contextDir, filename);
    if (!fs.existsSync(filepath)) return '';
    return fs.readFileSync(filepath, 'utf-8');
  }

  fileExists(filename: string): boolean {
    return fs.existsSync(path.join(this.contextDir, filename));
  }

  appendFile(filename: string, content: string) {
    const filepath = path.join(this.contextDir, filename);
    const existing = this.fileExists(filename) ? this.readFile(filename) : '';
    this.writeFile(filename, existing + '\n' + content);
  }
}
