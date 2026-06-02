// Optimized loop-detector.js - Pair-based loop detection
/**
 * Detects loops in a sequence of tool calls
 * Identifies when the same consecutive pair of tool calls appears twice
 * @param {Array} calls - Array of tool call objects
 * @returns {Object|null} - Loop information if found, null otherwise
 */
function detectLoop(calls) {
  if (!Array.isArray(calls) || calls.length < 2) {
    return null;
  }

  // Optimized approach: detect repeated consecutive pairs
  // Using a custom hash function for pairs instead of JSON.stringify
  const seen = new Map();
  
  for (let i = 1; i < calls.length; i++) {
    // Create hash for the pair (calls[i-1], calls[i])
    const pairHash = hashPair(calls[i-1], calls[i]);
    
    if (seen.has(pairHash)) {
      const firstPairIndex = seen.get(pairHash);
      return {
        type: 'loop',
        start: firstPairIndex,
        end: i,
        length: i - firstPairIndex + 1,
        calls: calls.slice(firstPairIndex, i + 1)
      };
    }
    
    seen.set(pairHash, i - 1);
  }
  
  return null;
}

/**
 * Creates a hash for a pair of tool call objects
 * Optimized for performance with fast paths and minimal allocations
 * @param {Object} call1 - First tool call object
 * @param {Object} call2 - Second tool call object
 * @returns {string} - Hash string
 */
function hashPair(call1, call2) {
  // Fast path for null/undefined
  if (!call1 && !call2) return 'null:null';
  if (!call1) return 'null:' + hashCall(call2);
  if (!call2) return hashCall(call1) + ':null';
  
  // Compute hashes for each call
  const hash1 = hashCall(call1);
  const hash2 = hashCall(call2);
  
  // Combine with separator - unlikely to collide with individual hashes
  return hash1 + '|' + hash2;
}

/**
 * Creates a hash for a tool call object
 * Optimized version of original hashCall with fast paths
 * @param {Object} call - Tool call object
 * @returns {string} - Hash string
 */
function hashCall(call) {
  // Handle primitives fast
  if (call === null) return 'null';
  if (call === undefined) return 'undefined';
  if (typeof call !== 'object') return String(call);
  
  // Handle tool calls specifically - tool and args are the key parts
  const tool = call.tool || '';
  const args = call.args || {};
  
  // Fast path for empty args
  if (Object.keys(args).length === 0) {
    return tool;
  }
  
  // Start with tool
  let str = tool;
  
  // Sort args keys for consistent hashing
  // For small numbers of keys, insertion sort might be faster but built-in is fine
  const keys = Object.keys(args);
  if (keys.length === 1) {
    const key = keys[0];
    const value = args[key];
    // Fast path for common value types
    if (value === null) return str + ':' + key + '=null';
    if (value === undefined) return str + ':' + key + '=undefined';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return str + ':' + key + '=' + value;
    }
    // Fall back to JSON for objects/arrays
    return str + ':' + key + '=' + JSON.stringify(value);
  }
  
  // Multiple keys - need sorting
  keys.sort();
  
  // Build string efficiently
  // Pre-calculate rough size to minimize reallocations
  let size = str.length;
  for (const key of keys) {
    size += key.length + 2; // key + '='
    const value = args[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      size += JSON.stringify(value).length + 1; // +1 for '|'
    } else {
      size += String(value).length + 1; // +1 for '|'
    }
  }
  
  // If we expect significant savings from pre-allocation, we could use it
  // But for now, clarity is more important than micro-optimization
  str += ':';
  
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const value = args[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      str += key + '=' + JSON.stringify(value);
    } else {
      str += key + '=' + String(value);
    }
    if (i < keys.length - 1) {
      str += '|';
    }
  }
  
  return str;
}

module.exports = { detectLoop };
