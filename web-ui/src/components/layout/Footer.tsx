import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white dark:bg-gray-800 py-4 mt-auto">
      <div className="container mx-auto px-4 text-center text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} Torrent UI. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
