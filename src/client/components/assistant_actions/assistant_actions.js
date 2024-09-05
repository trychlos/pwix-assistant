/*
 * /imports/client/components/assistant_actions/assistant_actions.js
 *
 * Handled events:
 * - set-done: replace all buttons by a close one 
 * - enable-action: enable an action { selector, enabled }
 * - label-action: enable an action { selector, html, title }
 * - reset-actions: reset actions to their default values
 * 
 * Triggered events:
 * - action-cancel
 * - action-close
 * - action-next
 * - action-prev
 */

import { pwixI18n } from 'meteor/pwix:i18n';
import { ReactiveDict } from 'meteor/reactive-dict';

import './assistant_actions.html';

Template.assistant_actions.onCreated( function(){
    const self = this;

    self.PCK = {
        // the Assistant component
        $assistant: null,

        // the default buttons definitions
        // they are initialized with the ad-hoc values for an introduction page
        defButtons: {
            cancel: {
                enabled: true,
                html: '<div class="assistant-button"><span class="fa-solid fa-fw fa-xmark"></span>'+pwixI18n.label( I18N, 'assistant.cancel_btn' )+'</div>',
                js: 'js-cancel',
                shown: true,
                title: pwixI18n.label( I18N, 'assistant.cancel_title' )
            },
            close: {
                enabled: true,
                html: '<div class="assistant-button"><span class="fa-solid fa-fw fa-power-off"></span>'+pwixI18n.label( I18N, 'assistant.close_btn' )+'</div>',
                js: 'js-close',
                shown: false,
                title: pwixI18n.label( I18N, 'assistant.close_title' )
            },
            next: {
                enabled: true,
                html: '<div class="assistant-button"><span class="fa-solid fa-fw fa-angle-right"></span>'+pwixI18n.label( I18N, 'assistant.next_btn' )+'</div>',
                js: 'js-next',
                shown: true,
                title: pwixI18n.label( I18N, 'assistant.next_title' )
            },
            prev: {
                enabled: false,
                html: '<div class="assistant-button"><span class="fa-solid fa-fw fa-angle-left"></span>'+pwixI18n.label( I18N, 'assistant.prev_btn' )+'</div>',
                js: 'js-prev',
                shown: true,
                title: pwixI18n.label( I18N, 'assistant.prev_title' )
            }
        },
        defOrder: [
            'cancel',
            'prev',
            'next',
            'close'
        ],

        // the separator between button name and property name
        sep: ':',

        // the current state of buttons and their definitions
        buttonStates: new ReactiveDict(),

        // the current (ordered) list of buttons
        buttonsList: new ReactiveVar( [] ),

        // trigger an event to the Assistant
        trigger( event ){
            const $target = self.PCK.$assistant ? self.PCK.$assistant : self.$( '.assistant-actions' );
            $target.trigger( event );
        }
    };

    // initialize the ordered list of the buttons
    self.autorun(() => {
        self.PCK.buttonsList.set( self.PCK.defOrder );
    });

    // initialize the reactive buttons states from their defaults
    self.autorun(() => {
        Object.keys( self.PCK.defButtons ).forEach(( it ) => {
            const def = self.PCK.defButtons[it];
            Object.keys( def ).forEach(( prop ) => {
                const key = it + self.PCK.sep + prop;
                self.PCK.buttonStates.set( key, def[prop] );
            });
        });
    });

    // track the button states
    self.autorun(() => {
        //console.debug( 'buttonStates', self.PCK.buttonStates.all());
    });
});

Template.assistant_actions.helpers({
    // internationalization
    i18n( arg ){
        return pwixI18n.label( I18N, arg.hash.key );
    },

    // the classes to be added
    itemClass( it ){
        const key = it + Template.instance().PCK.sep + 'js';
        return Template.instance().PCK.buttonStates.get( key );
    },

    // whether the button is disabled ?
    itemDisabled( it ){
        const key = it + Template.instance().PCK.sep + 'enabled';
        return Template.instance().PCK.buttonStates.get( key ) ? '' : 'disabled';
    },

    // the button HTML code
    itemHtml( it ){
        const key = it + Template.instance().PCK.sep + 'html';
        return Template.instance().PCK.buttonStates.get( key );
    },

    // whether the button is shown ?
    itemShown( it ){
        const key = it + Template.instance().PCK.sep + 'shown';
        return Template.instance().PCK.buttonStates.get( key );
    },

    // the button title
    itemTitle( it ){
        const key = it + Template.instance().PCK.sep + 'title';
        return Template.instance().PCK.buttonStates.get( key );
    },

    // the list of buttons
    //  returns the array of button names
    itemsList(){
        return Template.instance().PCK.buttonsList.get();
    }
});

Template.assistant_actions.events({
    // on first rendering, the assistant_template detects the assistant_actions and identifies itself
    'assistant-template .assistant-actions'( event, instance, data ){
        instance.PCK.$assistant = data.jq;
        return false;
    },

    // handle button clicks
    'click .js-cancel'( event, instance ){
        instance.PCK.trigger( 'assistant-action-cancel' );
    },
    'click .js-close'( event, instance ){
        instance.PCK.trigger( 'assistant-action-close' );
    },
    'click .js-next'( event, instance ){
        instance.PCK.trigger( 'assistant-action-next' );
    },
    'click .js-prev'( event, instance ){
        instance.PCK.trigger( 'assistant-action-prev' );
    },

    // instructions sent by Assistant
    'assistant-do-action-set .assistant-actions'( event, instance, data ){
        //instance.PCK.actions.set( data.action, data.enabled );
        if( instance.PCK.buttonsList.get().includes( data.action )){
            Object.keys( data ).forEach(( it ) => {
                if( it !== 'action' ){
                    const value = data[it];
                    switch( it ){
                        case 'enable':
                            if( value === true || value === false ){
                                instance.PCK.buttonStates.set( data.action + instance.PCK.sep + 'enabled', value );
                            } else {
                                console.warn( 'expected true|false value, got', value );
                            }
                            break;
                        case 'html':
                            instance.PCK.buttonStates.set( data.action + instance.PCK.sep + it, value );
                            break;
                        case 'show':
                            if( value === true || value === false ){
                                instance.PCK.buttonStates.set( data.action + instance.PCK.sep + 'shown', value );
                            } else {
                                console.warn( 'expected true|false value, got', value );
                            }
                            break;
                        case 'title':
                            instance.PCK.buttonStates.set( data.action + instance.PCK.sep + it, value );
                            break;
                    }
                }
            });
        } else {
            console.warn( 'unknown action', data.action );
        }
        return false;
    },
    'assistant-do-enable-action .assistant-actions'( event, instance, data ){
        console.warn( 'obsolete event', event.type );
        return false;
    },
    'assistant-do-label-action .assistant-actions'( event, instance, data ){
        console.warn( 'obsolete event', event.type );
        return false;
    },
    'assistant-do-show-action .assistant-actions'( event, instance, data ){
        console.warn( 'obsolete event', event.type );
        return false;
    },
    'assistant-do-set-starting .assistant-actions'( event, instance ){
        instance.$( '.assistant-actions' ).trigger( 'assistant-do-action-set', { action: 'cancel', show: true, enable: true });
        instance.$( '.assistant-actions' ).trigger( 'assistant-do-action-set', { action: 'prev', show: true });
        instance.$( '.assistant-actions' ).trigger( 'assistant-do-action-set', { action: 'next', show: true });
        instance.$( '.assistant-actions' ).trigger( 'assistant-do-action-set', { action: 'close', show: false });
        return false;
    },
    'assistant-do-set-ending .assistant-actions'( event, instance, data ){
        instance.$( '.assistant-actions' ).trigger( 'assistant-do-action-set', { action: 'cancel', show: false });
        instance.$( '.assistant-actions' ).trigger( 'assistant-do-action-set', { action: 'prev', show: false });
        instance.$( '.assistant-actions' ).trigger( 'assistant-do-action-set', { action: 'next', show: false });
        instance.$( '.assistant-actions' ).trigger( 'assistant-do-action-set', { action: 'close', show: true, enable: true });
        return false;
    }
});
