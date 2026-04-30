import fs from 'fs';
import path from 'path';

describe('Web Portal Structure and Configuration', () => {
  const webDir = path.join(process.cwd(), '..', 'web');

  describe('Project Structure', () => {
    it('should have package.json', () => {
      const packagePath = path.join(webDir, 'package.json');
      expect(fs.existsSync(packagePath)).toBe(true);

      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
      expect(packageJson.name).toBeDefined();
      expect(packageJson.dependencies).toBeDefined();
      expect(packageJson.dependencies.react).toBeDefined();
      expect(packageJson.dependencies['react-router-dom']).toBeDefined();
    });

    it('should have Vite configuration', () => {
      const viteConfigPath = path.join(webDir, 'vite.config.js');
      expect(fs.existsSync(viteConfigPath)).toBe(true);
    });

    it('should have ESLint configuration', () => {
      const eslintConfigPath = path.join(webDir, 'eslint.config.js');
      expect(fs.existsSync(eslintConfigPath)).toBe(true);
    });

    it('should have Tailwind configuration', () => {
      const tailwindConfigPath = path.join(webDir, 'tailwind.config.js');
      expect(fs.existsSync(tailwindConfigPath)).toBe(true);
    });

    it('should have main HTML file', () => {
      const htmlPath = path.join(webDir, 'index.html');
      expect(fs.existsSync(htmlPath)).toBe(true);

      const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
      expect(htmlContent).toContain('<div id="root"></div>');
    });
  });

  describe('Source Code Structure', () => {
    const srcDir = path.join(webDir, 'src');

    it('should have main entry point', () => {
      const mainPath = path.join(srcDir, 'main.jsx');
      expect(fs.existsSync(mainPath)).toBe(true);
    });

    it('should have App component', () => {
      const appPath = path.join(srcDir, 'App.jsx');
      expect(fs.existsSync(appPath)).toBe(true);
    });

    it('should have required pages', () => {
      const pages = ['Login', 'Dashboard', 'Profile', 'ProfileDetail', 'Search', 'Account'];
      pages.forEach(page => {
        const pagePath = path.join(srcDir, 'pages', `${page}.jsx`);
        expect(fs.existsSync(pagePath)).toBe(true);
      });
    });

    it('should have required components', () => {
      const components = ['Navbar', 'ProtectedRoute'];
      components.forEach(component => {
        const componentPath = path.join(srcDir, 'components', `${component}.jsx`);
        expect(fs.existsSync(componentPath)).toBe(true);
      });
    });

    it('should have auth context', () => {
      const authProviderPath = path.join(srcDir, 'context', 'AuthProvider.jsx');
      expect(fs.existsSync(authProviderPath)).toBe(true);
    });

    it('should have axios configuration', () => {
      const axiosPath = path.join(srcDir, 'api', 'axios.js');
      expect(fs.existsSync(axiosPath)).toBe(true);
    });
  });

  describe('Authentication Implementation', () => {
    it('should have CSRF token handling in axios config', () => {
      const axiosPath = path.join(webDir, 'src', 'api', 'axios.js');
      const axiosContent = fs.readFileSync(axiosPath, 'utf-8');

      expect(axiosContent).toMatch(/X-CSRF-Token/i);
      expect(axiosContent).toContain('CSRF');
    });

    it('should use HTTP-only cookies for auth', () => {
      const axiosPath = path.join(webDir, 'src', 'api', 'axios.js');
      const axiosContent = fs.readFileSync(axiosPath, 'utf-8');

      // Should not set Authorization header manually (tokens should be in cookies)
      expect(axiosContent).not.toContain('Authorization: `Bearer');
    });
  });

  describe('Routing Configuration', () => {
    it('should have protected routes', () => {
      const appPath = path.join(webDir, 'src', 'App.jsx');
      const appContent = fs.readFileSync(appPath, 'utf-8');

      expect(appContent).toContain('ProtectedRoute');
      expect(appContent).toContain('/dashboard');
      expect(appContent).toContain('/profile');
      expect(appContent).toContain('/search');
    });
  });

  describe('Build Configuration', () => {
    it('should have build scripts in package.json', () => {
      const packagePath = path.join(webDir, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));

      expect(packageJson.scripts.build).toBeDefined();
      expect(packageJson.scripts.dev).toBeDefined();
    });
  });
});