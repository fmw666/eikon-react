/**
 * @file init.cjs
 * @description Main initialization script for Supabase setup
 * @author fmw666@github
 * @version 1.0.0
 *
 * This script orchestrates the initialization of Supabase tables and storage buckets.
 * It can run all initialization scripts or specific ones based on command line arguments.
 *
 * Usage:
 *   node scripts/init.cjs                    # Run all initialization scripts
 *   node scripts/init.cjs tables             # Run only table initialization
 *   node scripts/init.cjs storage            # Run only storage initialization
 *   node scripts/init.cjs auth               # Run only auth email template initialization
 *   node scripts/init.cjs --help             # Show help information
 *
 * Environment Variables:
 *   VITE_SUPABASE_POSTGRES_URL - Your Supabase database connection string (for tables and storage policies)
 *   VITE_SUPABASE_URL - Your Supabase project URL (for storage)
 *   VITE_SUPABASE_SERVICE_ROLE_KEY - Your Supabase service role key (for storage and auth)
 *   VITE_SUPABASE_STORAGE_BUCKET_NAME - Your Supabase storage bucket name (for storage)
 *   VITE_SUPABASE_ACCESS_TOKEN - Your Supabase access token (for auth)
 *   VITE_SUPABASE_PROJECT_REF - Your Supabase project ref (for auth)
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Load environment variables from .env file if it exists
try {
  const dotenv = require('dotenv');
  dotenv.config();
  console.log('[INFO] Loaded environment variables from .env file');
} catch (error) {
  console.log('[INFO] dotenv not available, using system environment variables');
}

// Available initialization scripts
const INIT_SCRIPTS = {
  tables: {
    file: 'init_supabase_tables.cjs',
    description: 'Initialize Supabase database tables',
    dependencies: ['VITE_SUPABASE_POSTGRES_URL']
  },
  storage: {
    file: 'init_supabase_storage.cjs',
    description: 'Initialize Supabase storage buckets',
    dependencies: ['VITE_SUPABASE_URL', 'VITE_SUPABASE_SERVICE_ROLE_KEY', 'VITE_SUPABASE_STORAGE_BUCKET_NAME', 'VITE_SUPABASE_POSTGRES_URL'],
  },
  auth: {
    file: 'init_supabase_auth.cjs',
    description: 'Initialize Supabase auth email templates',
    dependencies: ['VITE_SUPABASE_ACCESS_TOKEN', 'VITE_SUPABASE_PROJECT_REF'],
  }
};

/**
 * Display help information
 */
function showHelp() {
  console.log(`
DesignChat Supabase Initialization Script

Usage:
  node scripts/init.cjs [script] [options]

Available Scripts:
${Object.entries(INIT_SCRIPTS).map(([name, config]) => 
  `  ${name.padEnd(10)} - ${config.description}`
).join('\n')}

Options:
  --help, -h     Show this help message
  --all, -a      Run all initialization scripts (default)

Examples:
  node scripts/init.cjs                    # Run all scripts
  node scripts/init.cjs tables             # Run only table initialization
  node scripts/init.cjs storage            # Run only storage initialization
  node scripts/init.cjs auth               # Run only auth email template initialization
  node scripts/init.cjs --help             # Show help

Environment Variables:
  VITE_SUPABASE_POSTGRES_URL        - Supabase database connection string (for tables and storage policies)
  VITE_SUPABASE_URL                 - Supabase project URL (for storage)
  VITE_SUPABASE_SERVICE_ROLE_KEY    - Supabase service role key (for storage and auth)
  VITE_SUPABASE_STORAGE_BUCKET_NAME - Supabase storage bucket name (for storage)
  VITE_SUPABASE_ACCESS_TOKEN        - Supabase access token (for auth)
  VITE_SUPABASE_PROJECT_REF         - Supabase project ref (for auth)

Note: You can also use a .env file in the project root to set these variables.
`);
}

/**
 * Check if required environment variables are set
 * @param {string[]} requiredVars - Array of required environment variable names
 * @returns {boolean} - True if all required variables are set
 */
function checkEnvironmentVariables(requiredVars) {
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error(`[ERROR] Missing required environment variables: ${missing.join(', ')}`);
    console.error('[ERROR] Please set these variables or add them to your .env file');
    return false;
  }
  
  return true;
}

/**
 * Execute a script with proper error handling
 * @param {string} scriptName - Name of the script to execute
 * @param {string} scriptFile - Path to the script file
 * @returns {Promise<boolean>} - True if script executed successfully
 */
function executeScript(scriptName, scriptFile) {
  return new Promise((resolve) => {
    console.log(`\n[INFO] ========================================`);
    console.log(`[INFO] Executing ${scriptName} initialization...`);
    console.log(`[INFO] ========================================`);
    
    const scriptPath = path.join(__dirname, scriptFile);
    
    // Check if script file exists
    if (!fs.existsSync(scriptPath)) {
      console.error(`[ERROR] Script file not found: ${scriptPath}`);
      resolve(false);
      return;
    }
    
    const child = spawn('node', [scriptPath], {
      stdio: 'inherit',
      env: process.env,
      cwd: process.cwd()
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`[INFO] ✅ ${scriptName} initialization completed successfully`);
        resolve(true);
      } else {
        console.error(`[ERROR] ❌ ${scriptName} initialization failed with code ${code}`);
        resolve(false);
      }
    });
    
    child.on('error', (error) => {
      console.error(`[ERROR] Failed to execute ${scriptName} script:`, error.message);
      resolve(false);
    });
  });
}

/**
 * Main execution function
 */
async function main() {
  const args = process.argv.slice(2);
  
  // Handle help command
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  // Determine which scripts to run
  let scriptsToRun = [];
  
  if (args.includes('--all') || args.includes('-a') || args.length === 0) {
    // Run all scripts
    scriptsToRun = Object.keys(INIT_SCRIPTS);
  } else {
    // Run specific scripts
    const requestedScripts = args.filter(arg => !arg.startsWith('-'));
    scriptsToRun = requestedScripts.filter(script => INIT_SCRIPTS[script]);
    
    if (scriptsToRun.length === 0) {
      console.error('[ERROR] No valid scripts specified. Available scripts:');
      Object.keys(INIT_SCRIPTS).forEach(script => {
        console.error(`  - ${script}`);
      });
      console.error('\nUse --help for more information');
      process.exit(1);
    }
  }
  
  console.log('[INFO] DesignChat Supabase Initialization');
  console.log(`[INFO] Scripts to run: ${scriptsToRun.join(', ')}`);
  
  // Check environment variables for all scripts to be run
  const allRequiredVars = new Set();
  scriptsToRun.forEach(scriptName => {
    INIT_SCRIPTS[scriptName].dependencies.forEach(varName => {
      allRequiredVars.add(varName);
    });
  });
  
  if (!checkEnvironmentVariables(Array.from(allRequiredVars))) {
    process.exit(1);
  }
  
  // Execute scripts
  const results = [];
  for (const scriptName of scriptsToRun) {
    const config = INIT_SCRIPTS[scriptName];
    const success = await executeScript(scriptName, config.file);
    results.push({ script: scriptName, success });
  }
  
  // Summary
  console.log('\n[INFO] ========================================');
  console.log('[INFO] Initialization Summary');
  console.log('[INFO] ========================================');
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  results.forEach(result => {
    const status = result.success ? '✅ SUCCESS' : '❌ FAILED';
    console.log(`[INFO] ${result.script.padEnd(10)} - ${status}`);
  });
  
  console.log(`\n[INFO] Total: ${successful} successful, ${failed} failed`);
  
  if (failed > 0) {
    console.log('[WARN] Some initializations failed. Please check the logs above.');
    process.exit(1);
  } else {
    console.log('[INFO] 🎉 All initializations completed successfully!');
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('[ERROR] Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the main function
main().catch(err => {
  console.error('[ERROR] Error during initialization:', err);
  process.exit(1);
});
