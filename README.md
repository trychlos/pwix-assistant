# pwix:assistant

## What is it ?

This package provides a Blaze `Assistant` component.

An assistant is a tabbed display unit which is used to guide the user through a more-or-less complex process, walking from one step to another each time the user accepts a page.

On each page, the user can choose:
- go to next page
- go back to previous page
- cancel the assistant
- ask for help (or for any other action provided by the caller).

Though the list and order of pages are generally predefined, hooks exist to let the caller dynamically add/remove a page somewhere in the process.

Also, depending of the entered data, the caller may decide to skip one or several page, to enable or disable them, or also to change the label of the buttons.

Assistant template may run inside of a page or of a modal. When ran from a modal, it auto-configures itself as the target of the modal events.

## Provides

### `Assistant`

The exported `Assistant` global object provides following items:

#### Functions

##### `Assistant.configure()`

See [below](#configuration).

A reactive data source.

##### `Assistant.i18n.namespace()`

Returns the i18n namespace used by the package. Used to add translations at runtime.

### Components

#### `Assistant`

A component which encapsulates a `pwix:tabbed` modal dialog which acts as an assistant.

It accepts following data context:

- `name`: mandatory, a name to be given to the assistant, defaulting to 'Assistant'

- `assistantPages`: an (ordered) array of page descriptions, or a function which returns such an array, where each item is a page definition with:

    - `name`: a page unique name in the assistant (in order to share an identifier between the caller and the assistant)
    - `template`: the template name to be displayed
    - `label`: the label to be displayed on the left pages index
    - `data`: the data context to be passed to the page, defaulting to the data context of this same assistant
    - `start`: should be set to true on the first page
         when true, the 'prev' action is disabled
         default to false
    - `end`: should be set to true on the last page
         when true, the available actions will be replaced with a single 'Close' button to mark that the action is done
         default to false, where we have the Cancel-Prev-Next buttons
    - `enabled`: whether the page is enabled at startup, defaulting to true

- `assistantActions`: when set, an (ordered) array of action descriptions to be added on the bottom left of the assistant pages, with:
    - `html`: the html content to be displayed

- `assistantOnChange`( currentIndex, nextIndex ): should return true to accept the change, false to staty on the same page, defaulting to true

- `assistantConfirmOnClose`, whether we want a user confirmation when closing the assistant on Cancel action or header xmark click, defaulting to false

- `assistantWithParentChecker`, whether we must wait for a parent `checker` to be available before instanciating our own `Forms.Checker`, defaulting to `true`

If a `checker` ReactiveVar is available in the provided data context, then the component will allocate a `Forms.Messager` on the bottom of the panes, and insert its own `Forms.Checker` between the caller and the panes. It will use the `paneSubTemplate`/`paneSubData` feature of the underlying `pwix:tabbed`. As a consequence, the application cannot use this feature when running an assistant.

`Assistant` component defaults to provide four actions `cancel`, `close`, `next` and `prev`. When the assistant is displayed in a modal, each of these actions can be materialized by a button in the bottom right of the display unit. Through events, each of the actions may be shown or hidden,  enabled or disabled, and their HTML attributes and content can be changed.

##### Handled events

- `assistant-do-action-set` { action, show|enable|html|title }
    - with `action` = prev, next, cancel or close
    - `show`: whether to show or not the action button
    - `enable`: whether to enable or not the action button
    - `html`: the HTML content of the action button
    - `title`: the title associated with the action button

- `assistant-do-enable-tab` { name, enabled }

    Please note that `Assistant` component cowardly refuses to disable the pane at index 0, as it wants have at least one displayable pane.

##### Triggered events

- on itself (and bubble up to the parents)
    - `assistant-activated` data={ name, pck } at initialization time, name being the assistant name
    - `assistant-action-cancel` on click
    - `assistant-action-close` on click
    - `assistant-action-next` on click
    - `assistant-action-prev` on click

- on every .tab-pane first child (the application-provided panes)
    - `assistant-pane-to-hide`, data={ assistantName, tabbedId, paneId, paneIndex, paneName } when about to leave the tab
    - `assistant-pane-to-show`, data={ assistantName, tabbedId, paneId, paneIndex, paneName } when the tab is about to be shown
    - `assistant-pane-hidden`, data={ assistantName, tabbedId, paneId, paneIndex, paneName } when the tab has left
    - `assistant-pane-shown`, data={ assistantName, tabbedId, paneId, paneIndex, paneName } when the has been shown

## Permissions management

None at the moment.

## Configuration

The package's behavior can be configured through a call to the `Assistant.configure()` method, with just a single javascript object argument, which itself should only contains the options you want override.

Known configuration options are:

- `verbosity`

    Define the expected verbosity level.

    The accepted value can be any or-ed combination of following:

    - `Assistant.C.Verbose.NONE`

        Do not display any trace log to the console

    - `Assistant.C.Verbose.CONFIGURE`

        Trace `Assistant.configure()` calls and their result

    - `Assistant.C.Verbose.PAGE`
    
        Trace the current page changes

    - `Assistant.C.Verbose.DISPLAY_UNIT`

        Trace DisplayUnit's instanciations

Please note that `Assistant.configure()` method should be called in the same terms both in client and server sides.

Remind too that Meteor packages are instanciated at application level. They are so only configurable once, or, in other words, only one instance has to be or can be configured. Addtionnal calls to `Assistant.configure()` will just override the previous one. You have been warned: **only the application should configure a package**.

## NPM peer dependencies

Starting with v 0.1.0, and in accordance with advices from [the Meteor Guide](https://guide.meteor.com/writing-atmosphere-packages.html#peer-npm-dependencies), we no more hardcode NPM dependencies in the `Npm.depends` clause of the `package.js`.

Instead we check npm versions of installed packages at runtime, on server startup, in development environment.

Dependencies as of v 1.1.0:

```js
    'lodash': '^4.17.0',
```

Each of these dependencies should be installed at application level:

```sh
    meteor npm install <package> --save
```

## Translations

New and updated translations are willingly accepted, and more than welcome. Just be kind enough to submit a PR on the [Github repository](https://github.com/trychlos/pwix-assistant/pulls).

## Cookies and comparable technologies

None at the moment.

## Issues & help

In case of support or error, please report your issue request to our [Issues tracker](https://github.com/trychlos/pwix-assistant/issues).

---
P. Wieser
- Last updated on 2024, Sep. 13th
