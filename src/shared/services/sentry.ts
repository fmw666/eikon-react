/**
 * @file sentry.ts
 * @description Sentry initialization and exports
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import { useEffect } from 'react';

// --- Core-Relative Imports ---
import { createRoutesFromChildren, matchRoutes, useLocation, useNavigationType } from 'react-router-dom';

import * as Sentry from '@sentry/react';

// =================================================================================================
// Init
// =================================================================================================

const dsn = import.meta.env.VITE_SENTRY_DSN;
const environment = import.meta.env.VITE_SENTRY_ENV || import.meta.env.VITE_MODE;
const tracesSampleRate = Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? '0.1');
const replaysSessionSampleRate = Number(import.meta.env.VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE ?? '0');
const replaysOnErrorSampleRate = Number(import.meta.env.VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE ?? '1');

if (dsn && environment !== 'test') {
	Sentry.init({
		dsn,
		environment,
		integrations: [
			Sentry.reactRouterV6BrowserTracingIntegration({
				useEffect,
				useLocation,
				useNavigationType,
				createRoutesFromChildren,
				matchRoutes,
			}),
			...(replaysSessionSampleRate > 0 || replaysOnErrorSampleRate > 0
				? [
					Sentry.replayIntegration(),
				]
				: []),
		],
		tracesSampleRate,
		replaysSessionSampleRate,
		replaysOnErrorSampleRate,
	});
}

// =================================================================================================
// Exports
// =================================================================================================

export { Sentry };
