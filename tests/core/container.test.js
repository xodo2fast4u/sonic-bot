import { Container, container } from '../../src/core/container.js';

describe('Container', () => {
  let testContainer;

  beforeEach(() => {
    testContainer = new Container();
  });

  afterEach(() => {
    testContainer.clear();
  });

  describe('Basic Registration', () => {
    test('should register a service', () => {
      const service = jest.fn(() => ({ name: 'test' }));

      testContainer.register('testService', service);

      expect(testContainer.has('testService')).toBe(true);
    });

    test('should register a singleton service', () => {
      const service = jest.fn(() => ({ name: 'singleton' }));

      testContainer.singleton('singletonService', service);

      expect(testContainer.has('singletonService')).toBe(true);
    });

    test('should register a transient service', () => {
      const service = jest.fn(() => ({ name: 'transient' }));

      testContainer.transient('transientService', service);

      expect(testContainer.has('transientService')).toBe(true);
    });
  });

  describe('Service Resolution', () => {
    test('should resolve a registered service', () => {
      const mockService = { name: 'test' };
      testContainer.register('testService', () => mockService);

      const resolved = testContainer.resolve('testService');

      expect(resolved).toBe(mockService);
    });

    test('should resolve singleton service once', () => {
      const service = jest.fn(() => ({ name: 'singleton' }));
      testContainer.singleton('singletonService', service);

      const first = testContainer.resolve('singletonService');
      const second = testContainer.resolve('singletonService');

      expect(service).toHaveBeenCalledTimes(1);
      expect(first).toBe(second);
    });

    test('should resolve transient service multiple times', () => {
      const service = jest.fn(() => ({ name: 'transient' }));
      testContainer.transient('transientService', service);

      const first = testContainer.resolve('transientService');
      const second = testContainer.resolve('transientService');

      expect(service).toHaveBeenCalledTimes(2);
      expect(first).not.toBe(second);
    });

    test('should throw error for unregistered service', () => {
      expect(() => {
        testContainer.resolve('nonExistentService');
      }).toThrow("Service 'nonExistentService' not registered");
    });
  });

  describe('Event Emission', () => {
    test('should emit service:created event', () => {
      const listener = jest.fn();
      testContainer.on('service:created', listener);

      testContainer.register('testService', () => ({}));
      testContainer.resolve('testService');

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'testService',
          singleton: false,
        }),
      );
    });
  });

  describe('Container Management', () => {
    test('should get registered service names', () => {
      testContainer.register('service1', () => ({}));
      testContainer.register('service2', () => ({}));

      const services = testContainer.getRegisteredServices();

      expect(services).toEqual(['service1', 'service2']);
    });

    test('should clear all services', () => {
      testContainer.register('service1', () => ({}));
      testContainer.register('service2', () => ({}));

      testContainer.clear();

      expect(testContainer.getRegisteredServices()).toEqual([]);
    });
  });

  describe('Global Container', () => {
    test('should use global container instance', () => {
      container.clear();

      const service = jest.fn(() => ({ name: 'global' }));
      container.register('globalService', service);

      const resolved = container.resolve('globalService');

      expect(resolved).toEqual({ name: 'global' });
    });
  });
});
