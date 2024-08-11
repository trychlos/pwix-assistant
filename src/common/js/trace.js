/*
 * pwix:assistant/src/common/js/trace.js
 */

_verbose = function( level ){
    if( Assistant.configure().verbosity & level ){
        let args = [ ...arguments ];
        args.shift();
        console.debug( 'pwix:assistant', ...args );
    }
};

_trace = function( functionName ){
    _verbose( Assistant.C.Verbose.FUNCTIONS, ...arguments );
};
