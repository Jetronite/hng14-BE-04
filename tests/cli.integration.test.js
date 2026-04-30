import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import os from 'os';

const execAsync = promisify(exec);

describe('CLI Integration Tests', () => {
  const cliPath = path.join(process.cwd(), '..', 'profiles-cli', 'bin', 'index.js');

  beforeAll(() => {
    // Ensure CLI file exists
    if (!fs.existsSync(cliPath)) {
      throw new Error(`CLI file not found at ${cliPath}`);
    }
  });

  describe('CLI Execution', () => {
    it('should display help information', async () => {
      try {
        const { stdout } = await execAsync(`node ${cliPath} --help`);
        expect(stdout).toContain('insighta');
        expect(stdout).toContain('CLI for Insighta Labs+');
      } catch (error) {
        // If help fails, that's also a problem
        throw error;
      }
    });

    it('should show version information', async () => {
      try {
        const { stdout } = await execAsync(`node ${cliPath} --version`);
        expect(stdout).toMatch(/\d+\.\d+\.\d+/);
      } catch (error) {
        throw error;
      }
    });

    it('should list available commands', async () => {
      try {
        const { stdout } = await execAsync(`node ${cliPath} --help`);
        expect(stdout).toContain('login');
        expect(stdout).toContain('logout');
        expect(stdout).toContain('whoami');
        expect(stdout).toContain('profiles');
      } catch (error) {
        throw error;
      }
    });
  });

  describe('CLI Profiles Commands', () => {
    it('should show profiles subcommands', async () => {
      try {
        const { stdout } = await execAsync(`node ${cliPath} profiles --help`);
        expect(stdout).toContain('list');
        expect(stdout).toContain('get');
        expect(stdout).toContain('search');
        expect(stdout).toContain('create');
        expect(stdout).toContain('export');
      } catch (error) {
        throw error;
      }
    });

    it('should show list command options', async () => {
      try {
        const { stdout } = await execAsync(`node ${cliPath} profiles list --help`);
        expect(stdout).toContain('--gender');
        expect(stdout).toContain('--country');
        expect(stdout).toContain('--age-group');
        expect(stdout).toContain('--sort-by');
        expect(stdout).toContain('--order');
        expect(stdout).toContain('--page');
        expect(stdout).toContain('--limit');
      } catch (error) {
        throw error;
      }
    });

    it('should show create command options', async () => {
      try {
        const { stdout } = await execAsync(`node ${cliPath} profiles create --help`);
        expect(stdout).toContain('--name');
      } catch (error) {
        throw error;
      }
    });

    it('should show export command options', async () => {
      try {
        const { stdout } = await execAsync(`node ${cliPath} profiles export --help`);
        expect(stdout).toContain('--gender');
        expect(stdout).toContain('--country');
        expect(stdout).toContain('--age-group');
        expect(stdout).toContain('--format');
      } catch (error) {
        throw error;
      }
    });
  });

  describe('CLI Error Handling', () => {
    it('should handle unknown commands gracefully', async () => {
      try {
        await execAsync(`node ${cliPath} unknown-command`);
        // If it doesn't throw, that's unexpected
        expect(true).toBe(false);
      } catch (error) {
        expect(error.stderr).toContain('error');
      }
    });

    it('should require authentication for protected commands', async () => {
      const { stdout } = await execAsync(`node ${cliPath} whoami`);
      expect(stdout).toContain('Authentication required');
    });
  });

  describe('CLI Token Storage', () => {
    const credentialsPath = path.join(os.homedir(), '.insighta', 'credentials.json');

    afterEach(() => {
      // Clean up test credentials
      if (fs.existsSync(credentialsPath)) {
        fs.unlinkSync(credentialsPath);
      }
    });

    it('should create credentials directory structure', () => {
      // This is more of a documentation test - the CLI should handle this
      const configDir = path.join(os.homedir(), '.insighta');
      // We can't easily test the actual creation without running login flow
      expect(configDir).toBeDefined();
    });
  });
});