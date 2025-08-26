import React from 'react';
import { useServiceStatus } from '@/hooks/use-service-status';
import LoadingSpinner from './common/LoadingSpinner';
import ErrorMessage from './common/ErrorMessage';

const ServiceStatus: React.FC = () => {
  const { serviceStatus, isLoading, error } = useServiceStatus();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error.message} />;
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Service Status</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {serviceStatus.map((service) => (
          <div key={service.name} className="p-4 rounded-lg shadow-md bg-white dark:bg-gray-800">
            <h3 className="font-bold">{service.name}</h3>
            <p className={`capitalize ${service.status === 'online' ? 'text-success-500' : 'text-error-500'}`}>
              {service.status}
            </p>
            {service.message && <p className="text-sm text-gray-500">{service.message}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ServiceStatus;
