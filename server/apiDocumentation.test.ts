import { describe, it, expect } from 'vitest';
import { generateOpenAPISpec, generateSwaggerUIHtml, getAPIStatistics } from './services/apiDocumentationService';

describe('API Documentation Service', () => {
  describe('generateOpenAPISpec', () => {
    it('should generate valid OpenAPI 3.0 spec', () => {
      const spec = generateOpenAPISpec('https://example.com');

      expect(spec.openapi).toBe('3.0.3');
      expect(spec.info).toBeDefined();
      expect(spec.info.title).toBe('CPK/SPC Calculator API');
      expect(spec.info.version).toBe('2.0.0');
      expect(spec.info.description).toContain('tRPC');
    });

    it('should include server configuration', () => {
      const spec = generateOpenAPISpec('https://example.com');

      expect(spec.servers).toBeDefined();
      expect(spec.servers.length).toBeGreaterThan(0);
      expect(spec.servers[0].url).toBe('https://example.com');
    });

    it('should include all module tags', () => {
      const spec = generateOpenAPISpec();

      expect(spec.tags).toBeDefined();
      expect(Array.isArray(spec.tags)).toBe(true);
      expect(spec.tags.length).toBeGreaterThanOrEqual(100);

      // Check tag structure
      const firstTag = spec.tags[0];
      expect(firstTag.name).toBeDefined();
      expect(firstTag.description).toBeDefined();
    });

    it('should include tag groups', () => {
      const spec = generateOpenAPISpec();

      expect(spec['x-tagGroups']).toBeDefined();
      expect(Array.isArray(spec['x-tagGroups'])).toBe(true);
      expect(spec['x-tagGroups'].length).toBe(15);

      // Check group names
      const groupNames = spec['x-tagGroups'].map((g: any) => g.name);
      expect(groupNames).toContain('Core');
      expect(groupNames).toContain('SPC/CPK');
      expect(groupNames).toContain('IoT');
      expect(groupNames).toContain('AI & Vision');
      expect(groupNames).toContain('OEE & Maintenance');
    });

    it('should include health check paths', () => {
      const spec = generateOpenAPISpec();

      expect(spec.paths['/api/health']).toBeDefined();
      expect(spec.paths['/api/health'].get).toBeDefined();
      expect(spec.paths['/api/health/detailed']).toBeDefined();
      expect(spec.paths['/api/health/live']).toBeDefined();
      expect(spec.paths['/api/health/ready']).toBeDefined();
      expect(spec.paths['/api/metrics']).toBeDefined();
    });

    it('should include tRPC module paths', () => {
      const spec = generateOpenAPISpec();

      // Check some key module paths exist
      expect(spec.paths['/api/trpc/spc.*']).toBeDefined();
      expect(spec.paths['/api/trpc/oee.*']).toBeDefined();
      expect(spec.paths['/api/trpc/ai.*']).toBeDefined();
      expect(spec.paths['/api/trpc/auth.*']).toBeDefined();
      expect(spec.paths['/api/trpc/user.*']).toBeDefined();
    });

    it('should include GET and POST methods for tRPC paths', () => {
      const spec = generateOpenAPISpec();
      const spcPath = spec.paths['/api/trpc/spc.*'];

      expect(spcPath.get).toBeDefined();
      expect(spcPath.get.tags).toContain('SPC Analysis');
      expect(spcPath.get.summary).toContain('Query');

      expect(spcPath.post).toBeDefined();
      expect(spcPath.post.tags).toContain('SPC Analysis');
      expect(spcPath.post.summary).toContain('Mutation');
    });

    it('should include security schemes', () => {
      const spec = generateOpenAPISpec();

      expect(spec.components.securitySchemes).toBeDefined();
      expect(spec.components.securitySchemes.cookieAuth).toBeDefined();
      expect(spec.components.securitySchemes.cookieAuth.type).toBe('apiKey');
      expect(spec.components.securitySchemes.cookieAuth.in).toBe('cookie');
      expect(spec.components.securitySchemes.localAuth).toBeDefined();
    });

    it('should include reusable schemas', () => {
      const spec = generateOpenAPISpec();

      expect(spec.components.schemas).toBeDefined();
      expect(spec.components.schemas.Error).toBeDefined();
      expect(spec.components.schemas.TRPCResponse).toBeDefined();
      expect(spec.components.schemas.PaginationInput).toBeDefined();
      expect(spec.components.schemas.DateRangeInput).toBeDefined();
      expect(spec.components.schemas.SuccessResponse).toBeDefined();
      expect(spec.components.schemas.HealthBasic).toBeDefined();
      expect(spec.components.schemas.HealthDetailed).toBeDefined();
    });

    it('should mark auth endpoints as public (no security)', () => {
      const spec = generateOpenAPISpec();
      const authPath = spec.paths['/api/trpc/auth.*'];

      expect(authPath.get.security).toEqual([]);
      expect(authPath.post.security).toEqual([]);
    });

    it('should mark non-auth endpoints as protected', () => {
      const spec = generateOpenAPISpec();
      const spcPath = spec.paths['/api/trpc/spc.*'];

      expect(spcPath.get.security).toEqual([{ cookieAuth: [] }]);
      expect(spcPath.post.security).toEqual([{ cookieAuth: [] }]);
    });

    it('should have correct total path count', () => {
      const spec = generateOpenAPISpec();
      const pathCount = Object.keys(spec.paths).length;

      // 5 health check paths + 172 module paths = 177
      expect(pathCount).toBe(177);
    });
  });

  describe('generateSwaggerUIHtml', () => {
    it('should generate valid HTML', () => {
      const html = generateSwaggerUIHtml('/api/openapi.json');

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html');
      expect(html).toContain('</html>');
    });

    it('should include Swagger UI dependencies', () => {
      const html = generateSwaggerUIHtml();

      expect(html).toContain('swagger-ui-dist');
      expect(html).toContain('swagger-ui-bundle.js');
      expect(html).toContain('swagger-ui.css');
    });

    it('should include custom header', () => {
      const html = generateSwaggerUIHtml();

      expect(html).toContain('CPK/SPC Calculator API');
      expect(html).toContain('Manufacturing Quality Analytics Platform');
      expect(html).toContain('172 Modules');
    });

    it('should use correct spec URL', () => {
      const html = generateSwaggerUIHtml('/custom/spec.json');
      expect(html).toContain('/custom/spec.json');
    });

    it('should include Swagger UI configuration', () => {
      const html = generateSwaggerUIHtml();

      expect(html).toContain('SwaggerUIBundle');
      expect(html).toContain('deepLinking: true');
      expect(html).toContain('filter: true');
      expect(html).toContain('tryItOutEnabled: true');
    });
  });

  describe('getAPIStatistics', () => {
    it('should return correct statistics', () => {
      const stats = getAPIStatistics();

      expect(stats.totalModules).toBe(172);
      expect(stats.totalGroups).toBe(15);
      expect(stats.healthEndpoints).toBe(5);
      expect(stats.version).toBe('2.0.0');
    });

    it('should include all groups with details', () => {
      const stats = getAPIStatistics();

      expect(stats.groups).toBeDefined();
      expect(stats.groups.length).toBe(15);

      // Check group structure
      const coreGroup = stats.groups.find(g => g.name === 'Core');
      expect(coreGroup).toBeDefined();
      expect(coreGroup!.moduleCount).toBe(5);
      expect(coreGroup!.modules.length).toBe(5);

      // Check module structure
      const authModule = coreGroup!.modules.find(m => m.key === 'auth');
      expect(authModule).toBeDefined();
      expect(authModule!.name).toBe('Authentication');
      expect(authModule!.description).toBeTruthy();
    });

    it('should have IoT group with correct modules', () => {
      const stats = getAPIStatistics();
      const iotGroup = stats.groups.find(g => g.name === 'IoT');

      expect(iotGroup).toBeDefined();
      expect(iotGroup!.moduleCount).toBeGreaterThanOrEqual(10);

      const moduleKeys = iotGroup!.modules.map(m => m.key);
      expect(moduleKeys).toContain('iotDashboard');
      expect(moduleKeys).toContain('mqtt');
      expect(moduleKeys).toContain('edgeGateway');
    });

    it('should have AI & Vision group', () => {
      const stats = getAPIStatistics();
      const aiGroup = stats.groups.find(g => g.name === 'AI & Vision');

      expect(aiGroup).toBeDefined();
      expect(aiGroup!.moduleCount).toBeGreaterThanOrEqual(10);

      const moduleKeys = aiGroup!.modules.map(m => m.key);
      expect(moduleKeys).toContain('ai');
      expect(moduleKeys).toContain('aiAdvanced');
      expect(moduleKeys).toContain('vision');
    });
  });
});
