/** Runs in its own test process before application schemas are imported.
 * Mirrors the host's prohibition on dynamic code; no global validation bypass. */
Object.defineProperty(globalThis,'Function',{configurable:false,writable:false,value:function(){throw new Error('Function constructor is disabled in extension context');}});
Object.defineProperty(globalThis,'eval',{configurable:false,writable:false,value:function(){throw new Error('eval is disabled in extension context');}});
