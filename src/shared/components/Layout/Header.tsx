/**
 * @file Header.tsx
 * @description Header component
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

import React from 'react';

import { Link } from 'react-router-dom';

// =================================================================================================
// Component
// =================================================================================================

const Header: React.FC = () => {
  return (
    <header
      className="fixed top-0 right-1/2 translate-x-1/2 px-8 sm:w-128 w-full h-16 flex gap-4 items-center justify-center bg-card text-card-foreground shadow z-10"
    >
      <Link to="/" className="relative group text-primary font-bold text-lg pb-0 transition-all duration-200 hover:-translate-y-0.5 hover:scale-105 hover:text-primary/90 hover:pb-0.5">
        <span className="relative">Home</span>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-0 bottom-0 h-[2px] w-full origin-left scale-x-0 bg-current transition-transform duration-300 ease-out group-hover:scale-x-100"
        />
      </Link>
      <div className="w-full flex justify-center">
        This is a Header Component.
      </div>
    </header>
  );
};

// =================================================================================================
// Exports
// =================================================================================================

export default Header;
