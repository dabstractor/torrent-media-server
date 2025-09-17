# PRP 019: Dynamic Service URLs

## 1. Feature Goal

To update the Services Dashboard UI so that service URLs are generated dynamically, replacing the hard-coded `localhost` with the browser's current hostname. This will allow users to access the services from any machine on their network, not just the host machine.

### Deliverable

A pull request that modifies the frontend components to construct service URLs using the window's current hostname and the port number configured for each service, while maintaining all existing functionality and security constraints.

### Success Definition

When a user navigates to the Services Dashboard from a device at `http://192.168.1.100`, the link for qBittorrent (running on port 8080) should point to `http://192.168.1.100:8080`, not `http://localhost:8080`. All existing functionality including health checks and service categorization must continue to work correctly.

---

## 2. Context

The current implementation fetches full URLs (e.g., `http://localhost:8080`) from a backend API endpoint, which reads them from environment variables. The change will be made entirely on the frontend to parse these URLs and reconstruct them with the correct hostname.

### Files to Reference

- **`web-ui/src/components/services/ServiceCard.tsx`**: This is the React component that renders the final link to each service. The logic for URL construction will be implemented here.
- **`web-ui/src/hooks/use-service-config.ts`**: This hook fetches the service configurations, including the URLs. No changes are needed here, but it's important for understanding the data flow.
- **`web-ui/src/app/api/config/route.ts`**: The backend API route that supplies the service configuration from `process.env`. No changes are required for this file.
- **`docker-compose.yml`**: Contains the environment variable definitions that currently use `localhost` in their URLs.

### Key Learnings & Gotchas

- The change should be purely in the frontend to avoid altering the existing environment variable setup.
- The solution should handle both `http` and `https` protocols correctly by using `window.location.protocol`.
- The port for each service must be extracted from the full URL provided by the backend. The `new URL()` constructor is suitable for this.
- Security constraints must be maintained, particularly for qBittorrent which must remain VPN-isolated.
- Existing health check functionality must continue to work.
- The implementation should be compatible with various deployment scenarios (localhost, IP addresses, domain names).

---

## 3. Implementation Tasks

### Task 1: Modify `ServiceCard.tsx` to build dynamic URLs

- In `web-ui/src/components/services/ServiceCard.tsx`, locate the `<a>` tag that links to the service.
- Instead of using `href={service.url}` directly, create a new function or inline logic to generate the URL.
- The new URL should be constructed as follows:
  ```javascript
  const serviceUrl = new URL(service.url);
  const dynamicUrl = `${window.location.protocol}//${window.location.hostname}:${serviceUrl.port}${serviceUrl.pathname}`;
  ```
- Use this `dynamicUrl` for the `href` attribute of the link.
- Also, update the `title` attribute of the link's hostname display to show the full dynamic URL for clarity.
- Ensure that the hostname display in the metadata section also reflects the dynamic nature of the URL.

### Task 2: Update displayed hostname in ServiceCard metadata

- In the metadata section of `ServiceCard.tsx`, the displayed hostname currently shows `serviceUrl.hostname`.
- This should be updated to show `window.location.hostname` to reflect the dynamic nature of the link.

### Task 3: Add error handling for URL parsing

- Add error handling in case the service URL from the backend is malformed.
- If URL parsing fails, fall back to the original URL to maintain functionality.

### Task 4: Preserve existing functionality

- Ensure that all existing functionality continues to work, including:
  - Health status indicators
  - Service categorization
  - Loading states
  - Error handling

---

## 4. Validation Gates

### Manual Validation

1. Run the application locally.
2. Access the Services Dashboard via `http://localhost:3000/services`. Verify that service links correctly point to `http://localhost:<port>`.
3. Access the same dashboard from another device on the network using the host's IP address (e.g., `http://192.168.1.100:3000/services`).
4. Verify that the service links now correctly point to `http://192.168.1.100:<port>`.
5. Verify that health status indicators continue to work correctly.
6. Verify that all service categories are displayed correctly.
7. Test with both HTTP and HTTPS protocols if applicable.

### Automated Validation

- Update existing unit tests in `web-ui/src/__tests__/components/services/ServiceCard.test.tsx` to verify dynamic URL generation.
- Ensure all existing tests continue to pass.
- Add new tests to cover edge cases such as malformed URLs.

### Final Validation Checklist

- [ ] All service links on the Services Dashboard are dynamically generated.
- [ ] Links work correctly when accessed via `localhost`.
- [ ] Links work correctly when accessed via an IP address or a different hostname.
- [ ] The displayed hostname in the `ServiceCard` is updated to reflect the dynamic nature of the link.
- [ ] Health status indicators continue to work correctly.
- [ ] All service categories are displayed correctly.
- [ ] Existing unit tests continue to pass.
- [ ] New tests cover dynamic URL generation scenarios.
- [ ] Error handling is implemented for malformed URLs.
- [ ] Security constraints are maintained (particularly for qBittorrent).

---

## 5. Security Considerations

- The implementation must not expose any sensitive information through the dynamically generated URLs.
- The solution should not introduce any new XSS vulnerabilities.
- All existing security constraints, particularly for qBittorrent's VPN isolation, must be maintained.
- URL validation should be performed to ensure only safe protocols (http/https) are used.

---

## 6. Performance Considerations

- The URL generation logic should be lightweight and not impact rendering performance.
- The solution should not introduce any unnecessary network requests.
- Client-side URL generation should be efficient and not block the UI.

---

## 7. Backward Compatibility

- The solution should maintain backward compatibility with existing configurations.
- If the dynamic URL generation fails for any reason, the system should gracefully fall back to the original behavior.
- No changes should be required to existing environment variable configurations.

---

## 8. Testing Strategy

### Unit Tests
- Update `ServiceCard.test.tsx` to verify dynamic URL generation with different hostnames and protocols.
- Add tests for error handling scenarios with malformed URLs.
- Ensure existing tests for health status and categorization continue to pass.

### Integration Tests
- Verify that the `/api/config` endpoint continues to provide the expected service configurations.
- Ensure that health check endpoints continue to function correctly.

### End-to-End Tests
- Test the complete flow from accessing the Services Dashboard to clicking on a service link.
- Verify that the dynamically generated URLs correctly redirect to the intended services.

---

## 9. Rollout Plan

1. Implement the dynamic URL generation logic in `ServiceCard.tsx`.
2. Update unit tests to cover the new functionality.
3. Perform manual validation on localhost and with IP addresses.
4. Run the full test suite to ensure no regressions.
5. Deploy to a staging environment for additional validation.
6. Deploy to production after successful staging validation.

---

## 10. Monitoring and Observability

- Monitor for any increase in client-side errors related to URL generation.
- Track service access patterns to ensure the dynamic URLs are working as expected.
- Set up alerts for any failures in service health checks that might be related to URL changes.
