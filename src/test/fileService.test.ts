import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';
import { FileService } from '../services/fileService';

describe('FileService', () => {
  const tmpRoot = path.join(__dirname, '..', '..', '.test-temp');
  let dir: string;
  beforeEach(() => {
    dir = path.join(tmpRoot, Date.now().toString());
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('ensureDir creates directory', () => {
    const svc = new FileService(path.join(dir, 'ctx'));
    svc.ensureDir();
    expect(fs.existsSync(path.join(dir, 'ctx'))).to.be.true;
  });

  it('writeFile and readFile work', () => {
    const svc = new FileService(dir);
    svc.ensureDir();
    svc.writeFile('foo.md', 'hello');
    const content = svc.readFile('foo.md');
    expect(content).to.equal('hello');
  });

  it('appendFile appends content', () => {
    const svc = new FileService(dir);
    svc.ensureDir();
    svc.writeFile('a.md', 'first');
    svc.appendFile('a.md', 'second');
    const content = svc.readFile('a.md');
    expect(content).to.include('first');
    expect(content).to.include('second');
  });

  it('fileExists returns false for missing files', () => {
    const svc = new FileService(dir);
    svc.ensureDir();
    expect(svc.fileExists('nope.md')).to.be.false;
  });
});
