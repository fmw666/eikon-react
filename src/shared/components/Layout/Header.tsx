import React from 'react';

import { Link } from 'react-router-dom';

const Header: React.FC = () => {
  return (
    <header
      className="fixed top-0 right-1/2 translate-x-1/2 px-8 sm:w-128 w-full h-16 flex gap-4 items-center justify-center bg-card text-card-foreground shadow z-10"
    >
      <Link to="/" className="text-primary font-bold text-lg hover:underline">
        Home
      </Link>
      <div className="w-full flex justify-center">
        This is a Header Component.
      </div>
    </header>
  );
};

export default Header;
