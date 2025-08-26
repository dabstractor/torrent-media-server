import '@testing-library/jest-dom';

// Mock Next.js Request/Response for API route testing
global.Request = global.Request || class Request {};
global.Response = global.Response || class Response {};
global.Headers = global.Headers || class Headers {};