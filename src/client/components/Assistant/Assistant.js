/*
 * pwix:assistant/src/client/components/Assistant/Assistant.js
 */

import _ from 'lodash';

import { ReactiveVar } from 'meteor/reactive-var';
import { UIU } from 'meteor/pwix:ui-utils';

import './Assistant.html';

Template.Assistant.onCreated( function(){
    const self = this;
    self.APP = {
        // keept the track of the first activation
        firstActivated: false,
        // whether the assistant runs inside of a modal
        insideModal: new ReactiveVar( false ),
        // the tabbed component identifier
        tabbedId: new ReactiveVar( null ),
        // maintain the current page name
        activePane: new ReactiveVar( null, _.isEqual ),
        // the assistant-actions DOM element
        $actions: new ReactiveVar( null ),
        // converter action -> button selector
        actions: {
            cancel: '.js-cancel',
            close: '.js-close',
            next: '.js-next',
            prev: '.js-prev'
        },
        // converter coreTabbedTemplate event to Assistant event
        tabbedTemplateEvents: {
            'tabbed-pane-to-hide': 'assistant-pane-to-hide',
            'tabbed-pane-to-show': 'assistant-pane-to-show',
            'tabbed-pane-hidden': 'assistant-pane-hidden',
            'tabbed-pane-shown': 'assistant-pane-shown'
        },
        // last Assistant event sent
        lastAssistantEventSent: null,
        // track the enabed/disabled panes addressed by their name
        enabledPanes: new ReactiveDict(),
        // happens that the data context is different in beforeClose() function depending of whether it is caller from the Cancel button (this assistant data context)
        //  or from the header xmark (mdModal data context) - so keep the interesting value here
        beforeCloseParms: new ReactiveDict(),

        // depending of the current page, may choose to display special buttons
        //  but Assistant never ever enable/disable buttons
        //  at startup, Cancel is enabled, Prev and Next are Disabled - it is up to the application to change them
        actionsSetup( index ){
            if( self.APP.$actions.get()?.length ){
                const pages = self.APP.dcPages();
                if( pages[index].done === true ){
                    self.APP.$actions.get().trigger( 'set-done' );
                }
            }
        },

        // returns a Promise which eventually resolve to true to let the assistant be closed, false else
        async beforeClose(){
            return Promise.resolve( true )
                .then(() => {
                    // default is to let the assistant be closed
                    if( self.APP.beforeCloseParms.get( 'confirmOnClose' ) !== true ){
                        return true;
                    }
                    return new Promise(( resolve ) => {
                        Bootbox.confirm({
                            title: pwixI18n.label( I18N, 'assistant.close_title' ),
                            message: pwixI18n.label( I18N, 'assistant.close_confirm' ),
                            btns_family: Bootbox.C.Family.YESNO,
                            mdClassesContent: self.APP.beforeCloseParms.get( 'mdClassesContent' )
                        }, ( res ) => { resolve( res ); });
                    });
                });
        },

        // reset the buttons
        buttonsReset(){
            const $actions = self.APP.$actions.get();
            if( $actions && $actions.length ){
                $actions.trigger( 'reset-actions' );
            }
        },

        // returns the assistant name from the data context
        dcName( dataContext=null ){
            dataContext = dataContext || Template.currentData();
            const name = dataContext.name;
            return name ? ( _.isFunction( name ) ? name() : name ) : null;
        },

        // returns the pages array from the data context
        dcPages(){
            const pages = Template.currentData().pages;
            return pages ? ( _.isFunction( pages ) ? pages() : ( _.isArray( pages ) ? pages : [] )) : [];
        },

        // enable/disable a pane
        enablePaneByName( name, enabled ){
            if( self.APP.dcPages()[0].name === name ){
                console.warn( 'cowardly refusing to disable first pane' );
            } else {
                self.APP.enabledPanes.set( name, enabled );
                self.$( '.ca-tabbed-template[data-tabbed-id="'+instance.APP.tabbedId.get()+'"]' ).trigger( 'tabbed-do-enable', {
                    tabbedId: instance.APP.tabbedId.get(),
                    index: instance.APP.indexByName( name ),
                    enabled: enabled
                });
            }
        },

        // return the index of the page giving its name, or -1
        indexByName( name ){
            const pages = self.APP.dcPages();
            let idx = -1;
            for( let i=0 ; i<pages.length ; ++i ){
                if( pages[i].name === name ){
                    idx = i;
                    break;
                }
            }
            return idx;
        },

        // compute the index of the next page
        nextIndex( page, tick ){
            const pages = self.APP.dcPages();
            let nextIdx = page.index+tick;
            let found = false;
            do {
                const name = pages[nextIdx].name;
                const value = self.APP.enabledPanes.get( name );
                const status = _.isBoolean( value ) ? value : true;
                //console.debug( 'nextIdx', nextIdx, 'name', name, 'value', value, 'status', status );
                if( status ){
                    found = true;
                } else {
                    nextIdx += tick;
                    if( nextIdx < 0 || nextIdx >= pages.length ){
                        found = true;
                        nextIdx = 0;    // must raturn a displayable pane
                    }
                }
            } while( !found );
            return nextIdx;
        },

        // a page has been activated in an underlying tab (make sure this is our own tabbed-template)
        pageActivated( data ){
            if( data.tabbedName === self.APP.dcName()){
                self.APP.activePane.set( data.tab.TABBED );
            }
        },

        // go to next page
        pageNext(){
            self.APP.pageOnChange( +1 );
        },

        // go back to previous page
        pagePrev(){
            self.APP.pageOnChange( -1 );
        },

        // change page - this is triggered by an assistant-action
        //  if the first computed page is not enabled, then go forward (resp. backward) until first not-disabled
        pageOnChange( tick ){
            if( self.APP.firstActivated ){
                const page = self.APP.activePane.get();
                if( page ){
                    const nextIndex = self.APP.nextIndex( page, tick );
                    const onChange = Template.currentData().onChange;
                    let accept = true;
                    if( onChange && _.isFunction( onChange )){
                        accept = onChange( page.index, nextIndex );
                    }
                    if( accept ){
                        self.$( '.ca-tabbed-template[data-tabbed-id="'+self.APP.tabbedId.get()+'"]' ).trigger( 'tabbed-do-activate', { tabbedId: self.APP.tabbedId.get(), index: nextIndex });
                    }
                }
            }
        },

        // a page is on the transation from to-hide until shown
        //  a message is forwarded to the pane and the application is called (once per phase)
        pageOnTransition( event, data ){
            const fwd_event = self.APP.tabbedTemplateEvents[event] || null;
            //console.debug( 'pageOnTransition', event, data, self.APP.firstActivated, data.tabbedName, self.APP.dcName(), 'fwd_event', fwd_event, 'lastSent', self.APP.lastAssistantEventSent );
            if( fwd_event && fwd_event !== self.APP.lastAssistantEventSent && self.APP.firstActivated && data.tabbedName === self.APP.dcName()){
                const fwd_data = {
                    assistantName: self.APP.dcName(),
                    tabbedId: data.tabbedId,
                    paneId: data.tab.TABBED.paneid,
                    paneName: data.tab.TABBED.name,
                    paneIndex: data.tab.TABBED.index
                };
                // advertize the assistant pane
                const $fwd_target = self.$( '.ca-tabbed-template[data-tabbed-id="'+self.APP.tabbedId.get()+'"] #'+data.tab.TABBED.paneid+' > :first-child' );
                $fwd_target.trigger( fwd_event, fwd_data );
                self.APP.lastAssistantEventSent = fwd_event;
            }
        }
    };

    // keep the value of confirmOnClose parameter
    self.autorun(() => {
        const confirm = Template.currentData().confirmOnClose;
        const classes = Template.currentData().mdClassesContent || '';
        self.APP.beforeCloseParms.set( 'confirmOnClose', _.isBoolean( confirm ) ? confirm : false );
        self.APP.beforeCloseParms.set( 'mdClassesContent', classes );
    });

    // track data context
    self.autorun(() => {
        //console.debug( 'Template.currentData()', Template.currentData());
    });

    // check minimal data
    if( !Template.currentData().name ){
        console.warn( 'name is required' );
    }
});

Template.Assistant.onRendered( function(){
    const self = this;

    // do we run inside of a modal ?
    const $modal = self.$( '.ca-assistant-template' ).closest( '.modal-body' );
    self.APP.insideModal.set( Boolean( $modal.length > 0 ));

    // set ourselves as the modal event target + setup our own actions
    //  if we do not run in a modal, the assistant_actions companion component is a sub-template of the panes
    self.autorun(() => {
        if( self.APP.insideModal.get()){
            Modal.set({
                target: self.$( '.ca-assistant-template' ),
                footer: 'assistant_actions',
                closeByBackdrop: false,
                // should authorize the close on Escape, but at the moment pwix:modal doesn't know how to intercept the Escape key (see #38)
                closeByKeyboard: false,
                beforeClose( modalId ){
                    return self.APP.beforeClose();
                }
            })
        }
    });

    // track the current page object and setup actions on each change
    self.autorun(() => {
        const page = self.APP.activePane.get();
        console.debug( 'activePane', page );
        if( page ){
            self.APP.actionsSetup( page.index );
        }
    });

    // get the assistant_action sibling DOM element
    //  inside a modal, this is a child of modal-body - else a child of this assistant-template
    //  but CoreApp.DOM.waitFor() searches through the whole document
    UIU.DOM.waitFor( '.ca-assistant-actions' ).then(( elt ) => {
        self.APP.$actions.set( $( elt ));
    });

    // and identify ourselves againts this companion component
    //  and run first activation
    self.autorun(() => {
        const $actions = self.APP.$actions.get();
        if( $actions && $actions.length ){
            $actions.trigger( 'assistant-template', { jq: self.$(' .ca-assistant-template' )});

            // first activation
            //  only start (activate the assistant) when all pages have been loaded
            //  unfortunately, Bootstrap triggers events on each tab load, and do not retrigger any event when we ask to activate the current tab
            //  so we ask for the last page, set activation to true (because event handlers are sync), and then only activate the first page
            if( !self.APP.firstActivated ){
                const pages = self.APP.dcPages();
                self.$( '.ca-tabbed-template[data-tabbed-id="'+self.APP.tabbedId.get()+'"]' ).trigger( 'tabbed-do-activate', { tabbedId: self.APP.tabbedId.get(), index: pages.length-1 });
                console.debug( 'activating' );
                self.APP.firstActivated = true;
                self.$( '.ca-tabbed-template[data-tabbed-id="'+self.APP.tabbedId.get()+'"]' ).trigger( 'assistant-activated', { name: self.APP.dcName()});
                self.$( '.ca-tabbed-template[data-tabbed-id="'+self.APP.tabbedId.get()+'"]' ).trigger( 'tabbed-do-activate', { tabbedId: self.APP.tabbedId.get(), index: 0 });
                // disable the pages at startup
                for( let i=0 ; i<pages.length ; ++i ){
                    if( pages[i].enabled === false ){
                        self.APP.enablePaneByName( pages[i].name, false );
                    }
                }
            }
        }
    });
});

Template.Assistant.helpers({
    // parms to be provided for tabbed template
    parmsTabbed(){
        const dataContext = this;
        const APP = Template.instance().APP;
        const subTemplate = APP.insideModal.get() ? null : 'assistant-actions'
        return {
            ...dataContext,
            name(){
                return APP.dcName( dataContext ) || 'ca-assistant-template';
            },
            navLinkClasses: 'ca-inactive',
            navClasses: 'ca-assistant',
            navPosition: 'left',
            paneSubTemplate: subTemplate,
            tabs(){
                let tabs = [];
                APP.dcPages().every(( page ) => {
                    tabs.push({
                        navLabel: page.label,
                        paneData: page.data || dataContext,
                        paneTemplate: page.template,
                        tabName: page.name
                    });
                    return true;
                });
                return tabs;
            }
        };
    }
});

Template.Assistant.events({
    // all messages are blocked until first activation
    // identifies the coreTabbedTemplate when first rendered
    //  doesn't bubble up while the assistant is not activated
    'tabbed-rendered .ca-assistant-template'( event, instance, data ){
        instance.APP.tabbedId.set( data.tabbedId );
        return instance.APP.firstActivated;
    },

    // transitional events the application panes have already received this event when it arrives here
    // a page is about to be left
    'tabbed-pane-to-hide .ca-assistant-template'( event, instance, data ){
        instance.APP.pageOnTransition( event.type, data );
        return instance.APP.firstActivated;
    },
    // a page is about to be shown
    //  set the active page (anticipated way) to also setup actions
    'tabbed-pane-to-show .ca-assistant-template'( event, instance, data ){
        instance.APP.pageActivated( data );
        instance.APP.buttonsReset();
        instance.APP.pageOnTransition( event.type, data );
        return instance.APP.firstActivated;
    },
    // a page is hidden
    //  we setup the actions here (as soon as possible) so that the application has two chances to override it with its own desiderata
    'tabbed-pane-hidden .ca-assistant-template'( event, instance, data ){
        instance.APP.pageOnTransition( event.type, data );
        return instance.APP.firstActivated;
    },
    // a page has been activated
    'tabbed-pane-shown .ca-assistant-template'( event, instance, data ){
        instance.APP.pageOnTransition( event.type, data );
        return instance.APP.firstActivated;
    },

    // handle assistant-actions actions
    'action-cancel .ca-assistant-template'( event, instance ){
        Modal.askClose();
        return false;
    },
    'action-close .ca-assistant-template'( event, instance ){
        instance.APP.buttonsReset();
        Modal.close();
    },
    'action-next .ca-assistant-template'( event, instance ){
        instance.APP.pageNext();
    },
    'action-prev .ca-assistant-template'( event, instance ){
        instance.APP.pagePrev();
    },

    // handle instructions from the parent
    'do-enable-action .ca-assistant-template'( event, instance, data ){
        const selector = instance.APP.actions[data.action] || null;
        const $actions = instance.APP.$actions.get();
        if( selector && $actions && $actions.length ){
            $actions.trigger( 'enable-action', { selector: selector, enabled: data.enabled });
        }
        return false;
    },
    'do-label-action .ca-assistant-template'( event, instance, data ){
        const selector = instance.APP.actions[data.action] || null;
        const $actions = instance.APP.$actions.get();
        if( selector && $actions && $actions.length ){
            $actions.trigger( 'label-action', { selector: selector, html: data.html, title: data.title });
        }
        return false;
    },
    'do-enable-tab .ca-assistant-template'( event, instance, data ){
        instance.APP.enablePaneByName( data.name, data.enabled );
        return false;
    }
});
