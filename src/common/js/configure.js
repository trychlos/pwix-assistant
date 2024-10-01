/*
 * pwix:assistant/src/common/js/configure.js
 */

import _ from 'lodash';

import { ReactiveVar } from 'meteor/reactive-var';

let _conf = {};
Assistant._conf = new ReactiveVar( _conf );

Assistant._defaults = {
    verbosity: Assistant.C.Verbose.CONFIGURE
};

/**
 * @summary Get/set the package configuration
 *  Should be called *in same terms* both by the client and the server.
 * @param {Object} o configuration options
 * @returns {Object} the package configuration
 */
Assistant.configure = function( o ){
    if( o && _.isObject( o )){
        _conf = _.merge( Assistant._defaults, _conf, o );
        Assistant._conf.set( _conf );
        // be verbose if asked for
        if( _conf.verbosity & Assistant.C.Verbose.CONFIGURE ){
            //console.log( 'pwix:assistant configure() with', o, 'building', Assistant._conf );
            console.log( 'pwix:assistant configure() with', o );
        }
    }
    // also acts as a getter
    return Assistant._conf.get();
}

_conf = _.merge( {}, Assistant._defaults );
Assistant._conf.set( _conf );
