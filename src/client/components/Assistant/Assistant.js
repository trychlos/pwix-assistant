/*
 * pwix:assistant/src/client/components/Assistant/Assistant.js
 *
 * Parms:
 * - see README
 */

import _ from 'lodash';

import { Bootbox } from 'meteor/pwix:bootbox';
import { Forms } from 'meteor/pwix:forms';
import { Modal } from 'meteor/pwix:modal';
import { pwixI18n } from 'meteor/pwix:i18n';
import { ReactiveDict } from 'meteor/reactive-dict';
import { ReactiveVar } from 'meteor/reactive-var';
import { UIU } from 'meteor/pwix:ui-utils';

import '../assistant_actions/assistant_actions.js';

import './Assistant.html';

Template.Assistant.onCreated( function(){
    const self = this;
    self.PCK = {
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
        // converter Tabbed event to Assistant event
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
        // a Forms.Checker for this assistant
        checker: new ReactiveVar( null ),
        // the global Message zone for this assistant
        messager: null,

        // depending of the current page, may choose to display special buttons
        //  but Assistant never ever enable/disable buttons
        //  at startup, Cancel is enabled, Prev and Next are Disabled - it is up to the application to change them
        actionsSetup( index ){
            if( self.PCK.$actions.get()?.length ){
                const pages = self.PCK.dcPages();
                if( pages[index].done === true ){
                    self.PCK.$actions.get().trigger( 'assistant-do-set-done' );
                }
            }
        },

        // returns a Promise which eventually resolve to true to let the assistant be closed, false else
        async beforeClose(){
            return Promise.resolve( true )
                .then(() => {
                    // default is to let the assistant be closed
                    if( self.PCK.beforeCloseParms.get( 'confirmOnClose' ) !== true ){
                        return true;
                    }
                    return new Promise(( resolve ) => {
                        Bootbox.confirm({
                            title: pwixI18n.label( I18N, 'assistant.close_title' ),
                            message: pwixI18n.label( I18N, 'assistant.close_confirm' ),
                            btns_family: Bootbox.C.Family.YESNO,
                            mdClassesContent: self.PCK.beforeCloseParms.get( 'mdClassesContent' )
                        }, ( res ) => { resolve( res ); });
                    });
                });
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
            if( self.PCK.dcPages()[0].name === name ){
                console.warn( 'cowardly refusing to disable first pane' );
            } else {
                self.PCK.enabledPanes.set( name, enabled );
                self.$( '.tabbed-template[data-tabbed-id="'+self.PCK.tabbedId.get()+'"]' ).trigger( 'tabbed-do-enable', {
                    tabbedId: self.PCK.tabbedId.get(),
                    index: self.PCK.indexByName( name ),
                    enabled: enabled
                });
            }
        },

        // return the index of the page giving its name, or -1
        indexByName( name ){
            const pages = self.PCK.dcPages();
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
            const pages = self.PCK.dcPages();
            let nextIdx = page.index+tick;
            let found = false;
            do {
                const name = pages[nextIdx].name;
                const value = self.PCK.enabledPanes.get( name );
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

        // reset the buttons before a pane be shown
        onToShow(){
        },

        // a page has been activated in an underlying tab (make sure this is our own tabbed-template)
        pageActivated( data ){
            if( data.tabbedName === self.PCK.dcName()){
                self.PCK.activePane.set( data.tab.TABBED );
            }
        },

        // go to next page
        pageNext(){
            self.PCK.pageOnChange( +1 );
        },

        // go back to previous page
        pagePrev(){
            self.PCK.pageOnChange( -1 );
        },

        // change page - this is triggered by an assistant-action
        //  if the first computed page is not enabled, then go forward (resp. backward) until first not-disabled
        pageOnChange( tick ){
            //console.debug( 'firstActivated', self.PCK.firstActivated );
            if( self.PCK.firstActivated ){
                const page = self.PCK.activePane.get();
                //console.debug( 'page', page );
                if( page ){
                    const nextIndex = self.PCK.nextIndex( page, tick );
                    const onChange = Template.currentData().onChange;
                    let accept = true;
                    if( onChange && _.isFunction( onChange )){
                        accept = onChange( page.index, nextIndex );
                    }
                    //console.debug( 'nextIndex', nextIndex, 'accept', accept );
                    if( accept ){
                        self.$( '.tabbed-template[data-tabbed-id="'+self.PCK.tabbedId.get()+'"]' ).trigger( 'tabbed-do-activate', { tabbedId: self.PCK.tabbedId.get(), index: nextIndex });
                    }
                }
            }
        },

        // a page is on the transation from to-hide until shown
        //  a message is forwarded to the pane and the application is called (once per phase)
        pageOnTransition( event, data ){
            const fwd_event = self.PCK.tabbedTemplateEvents[event] || null;
            //console.debug( 'pageOnTransition', event, data, self.PCK.firstActivated, data.tabbedName, self.PCK.dcName(), 'fwd_event', fwd_event, 'lastSent', self.PCK.lastAssistantEventSent );
            if( fwd_event && fwd_event !== self.PCK.lastAssistantEventSent && self.PCK.firstActivated && data.tabbedName === self.PCK.dcName()){
                const fwd_data = {
                    assistantName: self.PCK.dcName(),
                    tabbedId: data.tabbedId,
                    paneId: data.tab.TABBED.paneid,
                    paneName: data.tab.TABBED.name,
                    paneIndex: data.tab.TABBED.index
                };
                // advertize the assistant pane
                const $fwd_target = self.$( '.tabbed-template[data-tabbed-id="'+self.PCK.tabbedId.get()+'"] #'+data.tab.TABBED.paneid+' > :first-child' );
                $fwd_target.trigger( fwd_event, fwd_data );
                self.PCK.lastAssistantEventSent = fwd_event;
            }
        },

        // when a tab is shown, then set the focus on the first input field
        setFocusOnShown( event, data ){
            const $target = self.$( '.tabbed-template[data-tabbed-id="'+self.PCK.tabbedId.get()+'"] #'+data.tab.TABBED.paneid+' > :first-child' );
            $target.find( 'input' ).first().focus();
        }
    };

    // keep the value of confirmOnClose parameter
    self.autorun(() => {
        const confirm = Template.currentData().confirmOnClose;
        const classes = Template.currentData().mdClassesContent || '';
        self.PCK.beforeCloseParms.set( 'confirmOnClose', _.isBoolean( confirm ) ? confirm : false );
        self.PCK.beforeCloseParms.set( 'mdClassesContent', classes );
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
    const $modal = self.$( '.Assistant' ).closest( '.modal-body' );
    self.PCK.insideModal.set( Boolean( $modal.length > 0 ));

    // set ourselves as the modal event target + setup our own actions
    //  if we do not run in a modal, the assistant_actions companion component is a sub-template of the panes
    self.autorun(() => {
        if( self.PCK.insideModal.get()){
            Modal.set({
                target: self.$( '.Assistant' ),
                footer: 'assistant_actions',
                closeByBackdrop: false,
                // authorize the close on Escape though at the moment pwix:modal doesn't know how to intercept the Escape key (see #38)
                closeByKeyboard: true,
                beforeClose( modalId ){
                    return self.PCK.beforeClose();
                }
            })
        }
    });

    // track the current page object and setup actions on each change
    self.autorun(() => {
        const page = self.PCK.activePane.get();
        if( page ){
            self.PCK.actionsSetup( page.index );
        }
    });

    // get the assistant_action sibling DOM element
    //  inside a modal, this is a child of modal-body - else a child of this assistant-template
    //  but UIU.DOM.waitFor() searches through the whole document
    UIU.DOM.waitFor( '.assistant-actions' ).then(( elt ) => {
        self.PCK.$actions.set( $( elt ));
    });

    // and identify ourselves againts this companion component
    //  and run first activation
    //  only advertize of the assistant activation when initialization is done (and checker instanciated)
    self.autorun(() => {
        const $actions = self.PCK.$actions.get();
        const checker = self.PCK.checker.get();
        if( $actions && $actions.length && checker ){
            $actions.trigger( 'assistant-template', { jq: self.$(' .Assistant' )});

            // first activation
            //  only start (activate the assistant) when all pages have been loaded
            //  unfortunately, Bootstrap triggers events on each tab load, and do not retrigger any event when we ask to activate the current tab
            //  so we ask for the last page, set activation to true (because event handlers are sync), and then only activate the first page
            if( !self.PCK.firstActivated ){
                const pages = self.PCK.dcPages();
                self.$( '.tabbed-template[data-tabbed-id="'+self.PCK.tabbedId.get()+'"]' ).trigger( 'tabbed-do-activate', { tabbedId: self.PCK.tabbedId.get(), index: pages.length-1 });
                //console.debug( 'activating' );
                self.PCK.firstActivated = true;
                self.$( '.tabbed-template[data-tabbed-id="'+self.PCK.tabbedId.get()+'"]' ).trigger( 'assistant-activated', { name: self.PCK.dcName()});
                self.$( '.tabbed-template[data-tabbed-id="'+self.PCK.tabbedId.get()+'"]' ).trigger( 'tabbed-do-activate', { tabbedId: self.PCK.tabbedId.get(), index: 0 });
                // disable the pages at startup
                for( let i=0 ; i<pages.length ; ++i ){
                    if( pages[i].enabled === false ){
                        self.PCK.enablePaneByName( pages[i].name, false );
                    }
                }
            }
        }
    });

    // if a parent checker is provided, then allocate a checker and a messagefr here
    self.autorun(() => {
        const parentChecker = Template.currentData().checker;
        if( parentChecker && parentChecker instanceof ReactiveVar && parentChecker.get() instanceof Forms.Checker && !self.PCK.checker.get()){
            self.PCK.messager = new Forms.Messager();
            self.PCK.checker.set( new Forms.Checker( self, {
                name: 'assistant',
                parent: parentChecker.get(),
                messager: self.PCK.messager
            }));
            self.$( '.Assistant' ).trigger( 'assistant-checker', { checker: self.PCK.checker });
        }
    });
});

Template.Assistant.helpers({
    // parms to be provided for tabbed template
    // insert the checker if we have one
    parmsTabbed(){
        let dataContext = this;
        const APP = Template.instance().PCK;
        if( APP.checker.get() && APP.messager ){
            dataContext = _.merge( dataContext, {
                checker: APP.checker,
                paneSubTemplate: 'FormsMessager',
                paneSubData: {
                    messager: APP.messager
                }
            });
        }
        //console.debug( 'dcPages', APP.dcPages());
        return {
            ...dataContext,
            name(){
                return APP.dcName( dataContext ) || 'Assistant';
            },
            navLinkClasses: 'ca-inactive',
            navClasses: 'ca-assistant',
            navPosition: 'left',
            //paneSubTemplate: subTemplate,
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
    'tabbed-rendered .Assistant'( event, instance, data ){
        instance.PCK.tabbedId.set( data.tabbedId );
        return instance.PCK.firstActivated;
    },

    // transitional events the application panes have already received this event when it arrives here
    // a page is about to be left
    'tabbed-pane-to-hide .Assistant'( event, instance, data ){
        instance.PCK.pageOnTransition( event.type, data );
        return instance.PCK.firstActivated;
    },
    // a page is about to be shown
    //  set the active page (anticipated way) to also setup actions
    'tabbed-pane-to-show .Assistant'( event, instance, data ){
        instance.PCK.pageActivated( data );
        instance.PCK.onToShow();
        instance.PCK.pageOnTransition( event.type, data );
        return instance.PCK.firstActivated;
    },
    // a page is hidden
    //  we setup the actions here (as soon as possible) so that the application has two chances to override it with its own desiderata
    'tabbed-pane-hidden .Assistant'( event, instance, data ){
        instance.PCK.pageOnTransition( event.type, data );
        return instance.PCK.firstActivated;
    },
    // a page has been activated
    'tabbed-pane-shown .Assistant'( event, instance, data ){
        instance.PCK.pageOnTransition( event.type, data );
        instance.PCK.setFocusOnShown( event.type, data );
        return instance.PCK.firstActivated;
    },

    // handle assistant-actions actions
    'assistant-action-cancel .Assistant'( event, instance ){
        Modal.askClose();
        return false;
    },
    'assistant-action-close .Assistant'( event, instance ){
        //instance.PCK.buttonsReset();
        Modal.close();
    },
    'assistant-action-next .Assistant'( event, instance ){
        instance.PCK.pageNext();
    },
    'assistant-action-prev .Assistant'( event, instance ){
        instance.PCK.pagePrev();
    },

    // handle instructions from the parent
    'assistant-do-action-set .Assistant'( event, instance, data ){
        const $actions = instance.PCK.$actions.get();
        if( $actions && $actions.length ){
            $actions.trigger( event.type, data );
        }
        return false;
    },
    'assistant-do-enable-action .Assistant'( event, instance, data ){
        console.warn( 'obsolete event', event.type );
        return false;
    },
    'assistant-do-label-action .Assistant'( event, instance, data ){
        console.warn( 'obsolete event', event.type );
        return false;
    },
    'assistant-do-enable-tab .Assistant'( event, instance, data ){
        instance.PCK.enablePaneByName( data.name, data.enabled );
        return false;
    }
});
