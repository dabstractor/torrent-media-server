import React from 'react';

type ErrorMessageProps = {
  message: string;
};

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => {
  return (
    <div className="error-container" role="alert">
      <strong className="font-bold error-text">Error:</strong>
      <span className="block sm:inline error-text"> {message}</span>
    </div>
  );
};

export default ErrorMessage;
