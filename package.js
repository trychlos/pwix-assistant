Package.describe({
    name: 'pwix:assistant',
    version: '1.1.3',
    summary: 'A Bootstrap modal-based assistant for Meteor',
    git: 'https://github.com/trychlos/pwix-assistant.git',
    documentation: 'README.md'
});

Package.onUse( function( api ){
    configure( api );
    api.export([
        'Assistant'
    ]);
    api.mainModule( 'src/client/js/index.js', 'client' );
    api.mainModule( 'src/server/js/index.js', 'server' );
});

Package.onTest( function( api ){
    configure( api );
    api.use( 'tinytest' );
    api.use( 'pwix:assistant' );
    api.mainModule( 'test/js/index.js' );
});

function configure( api ){
    api.versionsFrom([ '2.9.0', '3.0-rc.0' ]);
    api.use( 'blaze-html-templates@2.0.0 || 3.0.0-alpha300.0', 'client' );
    api.use( 'ecmascript' );
    api.use( 'less@4.0.0', 'client' );
    api.use( 'pwix:bootbox@1.5.0' );
    api.use( 'pwix:forms@1.0.0' );
    api.use( 'pwix:i18n@1.5.0' );
    api.use( 'pwix:modal@2.1.0' );
    api.use( 'pwix:tabbed@1.0.0' );
    api.use( 'pwix:ui-bootstrap5@2.0.0' );
    api.use( 'pwix:ui-fontawesome6@1.0.0' );
    api.use( 'pwix:ui-utils@1.0.0' );
    api.use( 'reactive-var' );
    api.use( 'tmeasday:check-npm-versions@1.0.2 || 2.0.0-beta.0', 'server' );
    api.addFiles( 'src/client/components/Assistant/Assistant.js', 'client' );
}

// NPM dependencies are checked in /src/server/js/check_npms.js
// See also https://guide.meteor.com/writing-atmosphere-packages.html#peer-npm-dependencies
