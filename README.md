[]()
<p align="center"><img src="https://get.stephancasas.com/static/snowblade-logo.png" width="50%"></p>

<p align="center"><i><strong>"Cool" componentization for faster frontend development.</strong></i></p>

# Snowblade.js — *Utility Preview*

Snowblade offers you componentization of HTML-based documents — similar to the import/export nature of ES6 modules.

Think of it like [Rollup](https://github.com/rollup/rollup) for HTML.

> Snowblade is currently under active **initial development** and available only for preview in its compiled "dist" state. As such, pull requests are not being considered at this time. However, bug reports, feedback, and feature requests are encouraged — the goal of this repository is to create an open discussion. Please submit any considerations of this nature as [issues here on GitHub](https://github.com/stephancasas/snowblade/issues).

## Why?

Snowblade was inspired by [Alpine.js](https://github.com/alpinejs/alpine), which offers developers the ability to leverage a fully-reactive framework via attributes sprinkled into your existing markup like `x-for`, `x-text`, or `x-on:click`. Using Alpine in-tandem with utility frameworks like [Tailwind CSS](https://github.com/tailwindlabs/tailwindcss), developers can rapidly build complete app frontends with little overhead and often without ever writing more than a single `.html` file. 

This ease of use has the potential to come at a cost however, as the HTML source starts to grow very rapidly and with considerable redundancy  — especially for SPA-type applications.

The goal of Snowblade is to break-down your app's HTML into smaller and reusable components without forcing you into adopting a new syntax like Vue or React's JSX. Already have most of your frontend built? Great! Snowblade works with the HTML you already have. All you have to do is extract the components that you want to reuse and organize.

> #### Why not use React or Vue?
> As developers, we each typically have a framework of choice when it comes to creating application views. Each framework comes with its own idiosyncracies; workflows; dependencies; and, often times, a learning curve (I'm looking at you, Angular). Tools like Alpine and Tailwind CSS leverage the universal familiarity of HTML and enable developers to accomplish a bulk of their frontend development in one place, the DOM — an approach that is both rapid and increasingly "instinctive" in its execution.
>
> Snowblade aims to build on that universal familiarity and seeks to make mangement of frontend components syntactically-natural, central, and accessible to everyone.

## Install

**From npm:** Install the CLI tool from npm.

```sh
npm i snowblade --save-dev
```

## Config

Inside of a Node environment, Snowblade is a command line utility accessible using the npm command `snowblade` with a configuration file that you specify. Create a `snowblade.config.js` file in your project's root:

### `snowblade.config.js`

```js
// REQUIRED : Object | Array<Object>
export default {
    // REQUIRED : string
    // Where to begin compiling -- this should be where your <body> element is
    input: 'resources/snowblade/views/index.html',
    
    // Optional : Array<string> | string
    // Path(s) to components that should be universally available
    include: [
        'resources/snowblade/shared/**/*.html'
    ],
    
    // REQUIRED : Object | Array<Object>
    // Specifies the compiled output path and its property variations
    output: {
        // REQUIRED: string
        // Specifies the compiled output path
        file: 'resources/views/index.html',
        
        // Optional : string ['none' (default) | 'minify' | 'pretty']
        // Specifies formatting to apply to the output
        formatting: 'none',
        
        // Optional : Object [{} (default)]
        // Specifies property values which are globally-available to components
        // without requiring redundant application on component expressions
        // (e.g. colours, sizes, etc.)
        props: {
            buttonColor: 'red',
        },
        
        // Optional : Object [{} (default)]
        // Specifies, as an object of functions accepting a single argument,
        // functions which manipulate the computation of expression properties
        pipes: {
            TailwindMxAlign(arg) {
                return {
                    left: 'mr-auto',
                    center: 'mx-auto',
                    right: 'ml-auto'
                }[arg === '' ? 'center' : arg];
            }
        }
    }
}
```

### Extending the Config File

By using a JS file as the configuration object, Snowblade enables developers the ability to leverage the object-oriented nature of JavaScript. In this way, you can declare things like `include`, `props`, or `pipes` as constants, and then pass them into as many or as few `config` objects that need them:


### `snowblade.config.js`

```js
const include = [
    'resources/snowblade/shared/**/*.html'
];

const props = {
    buttonColor: 'red',
    background: 'bg-gray-100'
};

const pipes = {
    TailwindMxAlign(arg) {
        return {
            left: 'mr-auto',
            center: 'mx-auto',
            right: 'ml-auto'
        }[arg === '' ? 'center' : arg];
    }
};

export default [
    {
        input: 'resources/snowblade/views/app.html',
        include, // assigned from const
        output: {
            file: 'resources/views/app.html',
            props, // assigned from const
            pipes, // assigned from const
        }
    },
    
    /* ... */
    
    {
        input: 'resources/snowblade/views/dashboard.html',
        include, // assigned from const
        output: {
            file: 'resources/views/dashboard.html',
            props, // assigned from const
            pipes, // assigned from const
        }
    }
]

```

## Usage

When run on its own, the `snowblade` command, by default, will look in your project's root directory for a `snowblade.config.js` file. If you wish to specify a different file for various build types, you may use the `--config` or `-c` switch to specify a different config:

```sh
snowblade --config snowblade.config.prod.js
snowblade --config snowblade.config.dev.js
```

As part of your development workflow, Snowblade can be used with `npm-run-all` to compile your DOM with each build:

**Example in TypeScript environment:**
```json
"scripts": {
    "compile:dom": "snowblade --config snowblade.config.js",
    "transpile": "tsc -p ./tsconfig.json",
    "clean": "rimraf ./dist",
    "build": "npm-run-all clean transpile compile:dom"
}
```

### File-watching with [Nodemon](https://github.com/remy/nodemon/)

Eventually, the intention is to use implement the [Chokidar](https://github.com/paulmillr/chokidar) file-watcher library to allow for a single command, `snowblade --watch`, to run in the background during component development. In this way, as each component is modified and saved, Snowblade will recompile to reflect changes.

For now, your development workspace can be configured to work with [Nodemon](https://github.com/remy/nodemon/) watching your Snowblade directory:

### `package.json`

```json
{
    /* ... */
    "scripts": {
        /* ... */
        "watch": "nodemon --watch ./resources/snowblade -e html snowblade",
        /* ... */
    }
    /* ... */
}
```

## Overview

Expression of components in Snowblade starts by declaring a component definition with native HTML, and then expressing that component in your markup through use of a syntactically-natural custom tag that you define. Starting from the `input` document in your config, your markup will be compiled as each component is referenced, expressed, and rendered.

### Input Documents

Snowblade output begins with one item, an input document specified as the `input` property of a config object in `snowblade.config.js`. From this input document, Snowblade will cascade through any component expressions and render them as HTML where they are written. A sample input document might look something like this:

```html
<!DOCTYPE html>
<link snowblade href="../components/app.html">
<link snowblade href="../components/documenthead.html">
<html>
    <head>
        <DocumentHead />
    </head>
    <body class="w-screen h-screen">
        <App />
    </body>
</html>
```

As promised, the syntax is plain old HTML. The only difference is that we've included components for Snowblade to reference and render. This is first done by referencing the components using standard `<link>` tags with an empty `snowblade` attribute:

```html
<link snowblade href="./components/app.html">
<link snowblade href="./components/documenthead.html">
```

Think of these `<link>` tags like ES6 `import` statements. Next, the components are told where to render within the document by expressing each component's custom tag:

```html
<!-- ... -->
    <DocumentHead />
<!-- ... -->
    <App />
<!-- ... -->
```


> #### Why use a generic `<link>` tag instead of a custom tag?
> To take advantage of IDE and editor logic/formatting. Most editors' language servers will offer auto-completion of paths expressed on the `href` attribute of a `<link>` tag. This makes it easier for you to ensure that you've typed the correct path to your imported component.
> 
> Eventually, I'd like to extend the existing HTML LSP-compliant language server in VSCode to help with auto-completion of component names and, where necessary, rewriting of component imports when project assets are reorganized. If anyone reading this has experience with LSP in VSCode, and would like to help, please [contact me via DM on Twitter](https://www.twitter.com/stephancasas).

#### Config-provided Components

If you've defined a string or array of strings on the `include` property of `snowblade.config.js`, you don't need to express your component imports using `<link>` tags for those component documents which match your given [Glob](https://github.com/isaacs/node-glob) patterns. In the case that a config-provided component has a name conflict with an import-provided component expressed via `<link>` tag, Snowblade will use the import-provided component when resolving a component expression.

> #### Unique Component Names
> 
> While making use of import-provided components allows for duplicating component names, this is a  practice against which I strongly recommend in most cases. However, an exception to this could be if you were defining a custom table component. In such an instance, you may want to have `<Cell> Data </Cell>` expressed differently under `<TableHeader>` than you would if it were expressed under `<TableRow>`.

---

### :rotating_light: Readme/Documentation Pragma :rotating_light:
The remainder of this README will be written under the assumption that all components are *import-provided*, but it should be noted that this is **not necessary**, and you can provide **all** of your components using the `include` property on your config object, making things much easier. Use Snowblade how you want to use it, in whatever way makes your project easier.

---

### Component Documents

The input document example included a link to the component `./app.html` and then expressed it as `<App />` within the markup. For this to render correctly, there needs to be a component file present at `./app.html`, relative to the index document:

### `app.html`

```html
<meta snowblade name="App">
<link snowblade href="./components/modal.html">
<link snowblade href="./components/sidebar.html">
<link snowblade href="./components/navigation.html">
<link snowblade href="./components/editor.html">

<div class="flex flex-col h-screen">
    <Modal />
    <Navigation />
    <div class="flex flex-1 items-center">
        <Sidebar class="w-32"/>
        <Editor class="flex-1" />
    </div>
</div>
```

A lot is happening here, but let's start from the top to understand what's being expressed. Most critically, the component document starts with a `<meta>` tag that provides a handle for the component we're defining — in this case, we're defining an *app* component that will be expressed as `<App />`, so the `name` attribute of our tag is set to `"App"`. The full tag is expressed as:

```html
<meta snowblade name="App">
```

For each component name, use of PascalCase (like ES6 classes) is recommended to aid in syntactic visibility, but this is optional and completely up to you. Snowblade component tags **are case-sensitive**, so if you declare a component as `App`, it must be expressed as `<App />`, and not as `<app />`.

> #### Case-insensitive Code Formatters
> 
> Some code formatters will drop capital letters in HTML tag names, especially those names which match existing standards-compliant tags. While Snowblade recognizes the difference between `<Head>` and `<head>` or `<Table>` and `<table>`, you may find that your code formatter replaces upper-cased tag names with lower-cased equivalents.
> 
> If you're using [Prettier](https://github.com/prettier/prettier), you will not experience an issue with casing unless you attempt to express a component using an upper-case name that matches an existing standard HTML tag.

#### Component Nesting

Below the `<meta>` tag, several `<link>` tags have been specified. Each of these will correspond to a component document that expresses its export via a `<meta snowblade name="...">`, similar to the one defined for the `App` component.

Within the body of the `App` component, there's a mix of native markup as well as Snowblade component expressions. In this way, a component can yield its HTML wherever it's needed in a document — nested inside of as many or as few expressions as is desired.

### Component Attributes

In the example `App` component document, notice that the `Sidebar` and `Timeline` expressions have `class` attributes applied to them. In this case, we're making use of [Tailwind CSS](https://tailwindcss.com/) to define the width of each component inside of their parent `<div>`. This is a critical aspect of Snowblade and one that makes component reusability so versatile. To take a look at how this is applied, let's examine the content of an example `sidebar.html` component:

```html
<meta snowblade name="Sidebar">
<link snowblade href="./notethumbnail.html">

<div class="flex flex-col flex-1 h-0">
    <div class="flex items-center p-2 text-xl">
        <span>All Notes</span>
    </div>
    <div class="flex flex-col flex-1 h-0 pt-2 border-t gap-y-2 overflow-y-scroll">
        <NoteThumbnail
            x-for="note in notes"
            $$wrap="template"
            ::showPreview
            ::size="large"
        />
    </div>
</div>
```

If you're unfamiliar with Tailwind CSS, the classes we've applied to the inner `<div>` in `App` containing our `Sidebar` and `Editor` components provide for a space that occupies the entirety of the browser below the `Navigation` component — we'll call this space the *"content"* area. Then, the classes applied to the wrapping `<div>` in `Sidebar` provide for a space that occupies the entire height and width of the content area.

> *The `Modal` component is `position: absolute;` and does not count against our app's vertical space.

However, the sidebar component is just that, a sidebar. It shouldn't occupy the *entire* content area – only a space to the side of it. By passing the `w-32` class in the `class` attribute for `Sidebar` in `App`, Snowblade will add `w-32` to the `class` attribute of the wrapping `<div>` in `Sidebar` when it renders its HTML for `App`. The Tailwind CSS class `w-32` will limit the width of `Sidebar` to `8rem`, leaving the remaining space in the content area to be occupied by `Editor`, on which we've applied a Tailwind CSS class of `flex-1`.

In this way, our sidebar component can be reused anywhere throughout our app. Attributes that need to be modified based on context can be applied onto the component expression itself rather than hard-coded into the component definition.

### Component Wrapping - `$$wrap`

Looking at the component document for `Sidebar`, you might have noticed that the component expression for `NoteThumbnail` is looking a little busy. In addition to applying an attribute for Alpine, `x-for`, the component expression also has a few attributes specific to Snowblade. To understand what each of these attributes does, let's look at the component document that the `NoteThumbnail` expression references:

### `notethumbnail.html`
```html
<meta
    snowblade
    name="NoteThumbnail"
    ::showPreview="hidden"
    ::showCheck="hidden"
    ::size="medium"
>

<script snowblade>
    function size(arg) {
        return {
            large: 'h-16',
            medium: 'h-8',
            small: 'h-4',
        }[arg];
    }
</script>

<div class="flex items-center p-2 {{ size | size}}">
    <div class="flex items-center w-4 {{ showCheck }}">
        <input
            type="checkbox"
            class="p-2 mx-auto"
        />
    </div>
    <div class="flex flex-col">
        <div class="text-lg font-semibold" x-text="note.header"></div>
        <div class="text-xs truncate {{ showPreview }}" x-text="note.content"></div>
    </div>
</div>
```

Considering the component definition for `App`, we already know that any attributes we apply to a component expression will be applied to the root element within that component. However, those familiar with Alpine know that the `x-for` attribute can only be applied to a `<template>` element, and the component definition for `NoteThumbnail` uses a `<div>` as its root.

We could just wrap the root `<div>` inside of a `<template>` within the component definition, but suppose we want to use our thumbnail component elsewhere within our app? With it wrapped inside of a `<template>` tag, we might lose the ability to reuse it. Instead, the expression for `NoteThumbnail` in `Sidebar` applies the Snowblade `$$wrap` attribute, which will wrap the component definition in a specified tag (in this case, a `<template>` tag) before applying any additional attribute logic. In this way, when the component's HTML is rendered, it will look like this:

```html
<template x-for="note in notes">
    <div class="flex items-center p-2 h-16">
        <div class="flex items-center w-4 hidden">
            <input
                type="checkbox"
                class="p-2 mx-auto"
            />
        </div>
        <div class="flex flex-col">
            <div class="text-lg font-semibold" x-text="note.header"></div>
            <div class="text-xs truncate " x-text="note.content"></div>
        </div>
    </div>
</template>
```

Notice that Snowblade applied the attribute `x-for` to the specified wrapper, and not directly onto the `<div>` inside the component definition. This is critical to note, as the `$$wrap` attribute, is the first thing to evaluate when parsing a component expression.

### Component Properties — `{{ propName }}`

Examining that output, did you notice anything else? The `class` attribute for the last `<div>` contained some mustache syntax as `{{ showPreview }}` which was rendered as: 

```html
    <div class="text-xs truncate " x-text="note.content"></div>
```

This is because a *property* was passed in the component expression for `NoteThumbnail` as `::showPreview`. Snowblade components can receive properties using the syntax `::propName="value"` on a component expression. Within the component, these property values are yielded using property tokens:

```html
<!-- Expressed as given -->
     {{ propName }}

<!-- Evaluated by pipe function before expression -->
     {{ propName | pipeName }}
```

Within the `<meta>` of the component definition, property defaults can be given that are used when the component expression is absent of said property:

```html
<meta
    snowblade
    name="NoteThumbnail"
    ::showPreview="hidden"
    ::showCheck="hidden"
    ::size="medium"
>
```

For the property `showPreview`, a default value of `"hidden"` is given (`display: none;` in Tailwind CSS), but on the component expression for `NoteThumbnail`, this is overriden to an empty value as `::showPreview`. In this way, you can make use of "boolean-style" properties for your components, where a truthy or falsy value is the property default that gets overriden by an empty value on a component expression.

> #### Why not use quoted object syntax `<Component props="{key: value}" />` for passing properties?
> It's ugly. Thanks for coming to my TED Talk.

### Component Property Pipes — `{{ propName | pipeName }}`

Reviewing the component expression for `NoteThumbnail` you'll notice that the `::size` property was passed as `"large"`, but was rendered as:

```html
<div class="flex items-center p-2 h-8">
```

In this case, before `size` was expressed, it was processed by a pipe — a function accepting a single argument and returning a string:

```js
function size(arg) {
    return {
        large: 'h-16',
        medium: 'h-8',
        small: 'h-4',
    }[arg];
}
```

Pipes can be useful where you'd like to use more "natural" language to express complex strings of data. In `NoteThumbnail` it's being used to convert values of `large`, `medium`, and `small` into Tailwind CSS height classes. Back in the example `snowblade.config.js`, the pipe `TailwindMxAlign` is defined to convert `left`, `right`, and `center` into their margin equivalents — useful when making use of flexbox:

```js
TailwindMxAlign(arg) {
    return {
        left: 'mr-auto',
        center: 'mx-auto',
        right: 'ml-auto'
    }[arg === '' ? 'center' : arg];
}
```

As you've probably noticed, there's two places where pipes can be defined. Where a pipe is only needed for a single component, it can be declared in a `<script>` tag with an empty `snowblade` attribute, written inside of the component document. If a pipe is going to be reused in several components, it can be declared on the `pipes` property of the `output` property of `snowblade.config.js`.

> #### The `function` Keyword in Component-scoped Pipes
> 
> If you're declaring a component-scoped pipe, you must declare your pipe at the root of `<script>` and provide the `function` keyword right before the pipe declaration. Component-scoped pipes are converted to named exports and then transpiled by Babel. Don't worry — to save time, pipes are cached, and this process only takes place when you change something in the content of `<script snowblade></script>`.

## Slots

Component slots in Snowblade work exactly as you'd expect. As of this writing, Snowblade supports one type of slot — the *default* slot. Named slots are under consideration, so if you'd like to see more development on this, please suggest an implementation strategy by [raising an issue](https://github.com/stephancasas/snowblade/issues).

Within a component document, a default slot can be expressed using the `<slot>` tag with an empty `snowblade` attribute:

```html
<!-- ... -->
    <slot snowblade> Some default content goes here. </slot>
<!-- ... -->
```

When using a component expression, the `<slot>` will be fulfilled by including markup between the expression's tags:

```html
<!-- ... -->
    <MyComponent>
        This is my slot content.
    </MyComponent>
<!-- ... -->
```

If no content is supplied, Snowblade will render the default content expressed between the `<slot>` tags in the component definition.

### Slots and Properties

Suppose you've defined a button component that you want to use with a slot:

### `basicbutton.html`
```html
<meta snowblade name="BasicButton" ::fill="green" ::label ::width="full" />

<button
  type="button"
  class="py-2 px-4 bg-{{ fill }}-500 border border-{{ fill }}-500 hover:bg-{{ fill }}-400 text-white transition ease-in duration-200 text-center text-base font-semibold rounded-lg w-{{ width }}"
>
  <slot snowblade>{{ label }}</slot>
</button>
```

When you use the `BasicButton` expression, you could fulfill the button's label in one of two ways:

```html
<!-- Slot Fulfillment -->
<BasicButton> Click Me! </BasicButton>

<!-- Property Value -->
<BasicButton ::label="Click Me!" />
```

This works because slot processing is the second step that takes place when parsing a component expression — right after the `$$wrap` attribute is evaluated. Because the default slot content is the property token `{{ label }}`, Snowblade will have access to substitute a given value when evaluating the expression-assigned property `::label`.

> #### Why would you want to do this?
> 
> Using a property token as the default slot content can be helpful if you want the ability to globally-manipulate a component's slotted content. Through the use of config-provided property values, you can manage slot content in one location.
> 
> This is also really useful for when using *magic properties* with Alpine, so please keep reading!

## Magic Properties

Saving the best for last, magic properties are what make Snowblade the perfect companion for Alpine developers. Consider the `BasicButton` component definition described above. If you wanted to make it more "Alpine-friendly," you could make some changes:

```html
<meta snowblade name="BasicButton" ::fill="'green'" ::label ::width="'full'" />

<button
  type="button"
  x-bind:class="`py-2 px-4 bg-${ {{ fill }} }-500 border border-${ {{ fill }} }-500 hover:bg-${ {{ fill }} }-400 text-white transition ease-in duration-200 text-center text-base font-semibold rounded-lg w-${ {{ width }} }`"
  x-text="{{ label }}"
></button>
```

Then, when iterating with `x-for`, your component expression would look something like this:

```html
<!-- ... -->
    <BasicButton $$wrap="template" x-for="b in buttons" ::label="b.label" ::fill="b.color" ::width="'24'" />
<!-- ... -->
```

That works, but it's less than ideal. In the component definition, you've had to do a lot of escaping and now, if you want to reuse the button outside of an Alpine context, you *can't* because `class` is declared as `x-bind:class` and the button's label is expressed as `x-text` rather than native HTML. *Additionally*, you now have to surround static property values with single quotes, like the default values for `fill` and `width`.

Is there a better way? Of course there is.

### A Little Bit of Magic :sparkles:

Let's restore the original version of the `BasicButton` definition:

```html
<meta snowblade name="BasicButton" ::fill="green" ::label ::width="full" />

<button
  type="button"
  class="py-2 px-4 bg-{{ fill }}-500 border border-{{ fill }}-500 hover:bg-{{ fill }}-400 text-white transition ease-in duration-200 text-center text-base font-semibold rounded-lg w-{{ width }}"
>
  <slot snowblade>{{ label }}</slot>
</button>
```

Now, instead of mangling the component definition, let's instead change the way that we write the component expression:

```html
<!-- ... -->
    <BasicButton $$wrap="template" x-for="b in buttons" ::$label="b.label" ::$fill="b.color" ::width="24" />
<!-- ... -->
```

Take note of the `$` chars added to the expression properties `label` and `fill`. When Snowblade compiles, this is what you'll see:

```html
<template x-for="b in buttons">
  <button
    type="button"
    x-html="`${b.label}`"
    x-bind:class="`py-2 px-4 bg-${b.color}-500 border border-${b.color}-500 hover:bg-${b.color}-400 text-white transition ease-in duration-200 text-center text-base font-semibold rounded-lg w-24`"
  ></button>
</template>
```

#### Take a *very close* look at what's happened:

* The Alpine `x-html` attribute has been added to the `<button>` element and will apply the `b.label` value at runtime.
* The `class` attribute has been converted to `x-bind:class` and its value has been enclosed in backtick `` ` `` template literal chars.
* Where the `fill` property is expressed in `class`, it's been enclosed as a template literal placeholder `${...}` that will apply the `b.color` value at runtime.
* Where the `width` property is expressed in `class`, it's been left alone as a string literal.

Using magic properties, you can take the components you already have or components from existing toolkits (like [TailwindToolbox](https://www.tailwindtoolbox.com)) and, with almost no effort, make them ready for your Alpine-powered frontend while still retaining their usability outside of Alpine's `x-data` scope.

> #### How does this work?
> 
> Snowblade is "context-aware" — meaning that it can tell when a property is being expressed inside of an element's attribute or inside of its `innerHTML` value. Additionally, it's aware of those attributes which are necessary for Alpine to do its work, like `x-html`, `x-text`, or anything prefixed with `x-bind:`.

### A Little More Magic :sparkles::sparkles:
Suppose you grab a an icon button from a toolkit and replace its static content with component properties to define `IconButton` like this:

```html
<meta snowblade name="IconButton" ::fill="green" ::icon ::label ::width="full" />

<button
  type="button"
  class="py-2 px-4 bg-{{ fill }}-500 border border-{{ fill }}-500 hover:bg-{{ fill }}-400 text-white transition ease-in duration-200 text-center text-base font-semibold rounded-lg w-{{ width }}"
>
  <i class="fas fa-{{ icon }} mr-1 text-xl"></i>{{ label }}
</button>
```

At first glance, there doesn't seem to be anything wrong, but within the `innerHTML` of `<button>` there's some interesting considerations for Snowblade:

* A property token, `{{ label }}`, is inline with static HTML.
* Within that static HTML next to a property token, another property token, `{{ icon }}`, is inside of an attribute.

For standard Snowblade expression properties, this is a simple case of substitution, and nothing about which to worry. With Alpine, however, there's more to consider. If you want to dynamically set the property of `label` *and* `icon`, you'd need to wrap `{{ label }}` inside of a `<div>` or `<span>`, so that it can be assigned `x-html`, right?

Not with magic properties! Leaving things as they are, let's write our component expression:

```html
<!-- ... -->
    <BasicButton $$wrap="template" x-for="b in buttons" ::$icon="b.icon" ::$label="b.label" ::$fill="b.color" ::width="24" />
<!-- ... -->
```

When Snowblade compiles, *this* is what you'll see:

```html
<template x-for="b in buttons"
  ><button
    type="button"
    x-bind:class="`py-2 px-4 bg-${b.color}-500 border border-${b.color}-500 hover:bg-${b.color}-400 text-white transition ease-in duration-200 text-center text-base font-semibold rounded-lg w-24`"
    x-html='`
    &lt;i class&equals;"fas fa-${b.icon} mr-1 text-xl"&gt;&lt;/i&gt;${b.label}
    `'
  ></button>
</template>
```

#### Take a close look at what Snowblade did with `x-html`:
* Like before, the value is wrapped as a template literal with `` ` `` chars.
* Where a dynamic expression is required, it's wrapped as a template literal placeholder `${...}`.
* Most importantly, the entire content of the `innerHTML` of `<button>` has been escaped into HTML-safe chars that will render exactly as you require at runtime. Alpine writes each element to the DOM at runtime, and the browser doesn't know any differently.

> #### Just because you can, should you?
> 
> Probably not.
> 
> I wrote this feature into Snowblade because it felt like something that should be there, but when debugging an app, the less complexity there is, the better. If you don't mind taking the extra 1.2 seconds required to wrap your property token inside a `<span>` element, you may save yourself some time if you ever need to dive into the browser inspector.

## License
Copyright © 2020-2021 Stephan Casas


Licensed under the MIT license, see LICENSE.md for details.

<p><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==" width="0" height="50"></p>

# About the Project

Hi, I'm Stephan, and I'm the developer of Snowblade.

> #### TL;DR
> 
> * Snowblade was built after I got tired of trying to learn Vue and React.
> * Please be my [friend](https://www.twitter.com/stephancasas).
> * If you enjoy using Snowblade, please consider [sponsoring the project]().

I started work on this project in mid-December and took almost two months off of my primary job as a freelance software developer to bring the concept to life. My work on it began after a single-page report for a client's project ballooned from 50 lines of code to +1200. The report, driven by Alpine, worked flawlessly, but was severely lacking with regards to organization. After taking a phone call in which I tried to debug a discrepancy with the client in realtime, struggling to sift through a mess of `#region` tags and arrowhead comments just wasn't doing it for me. I wanted a better way to work.

The obvious answer was to switch to React or Vue, but both of them felt like overkill for the use case, and there was the little matter of me not knowing how to use either. After watching several Vue tutorials at [Laracasts](https://www.laracasts.com/), one video's comment stuck with me:

<p align="center"><i><strong>"This is so much easier to do in Alpine."</strong></i></p>

That was the straw that broke the camel's back. He wasn't wrong. Getting up and running with Vue, especially for something as nominal as a single-page report, required a ton of overhead; a steep learning curve; and felt less than intuitive when compared with Alpine. I had everything I needed in my Alpine model — all I wanted was a little organization.

For about three nights, I scoured the Internet searching for existing solutions. Things came close, but not close enough. The goal I had in-mind was pretty basic: I didn't want to write any JavaScript — *everything had to be HTML-based*. No template literals, no JSX, no pragma... just pure HTML. I didn't find anything.

To me, it seemed crazy that things like Babel and WebPack existed, but nothing filled-in the transpiler gap for HTML. In reality, though, the need for something like this is a relatively fresh concept. When Caleb Porzio wrote Alpine, he introduced a new way to build reactive frontends that kept developers' work in one place: the DOM. With that in-mind, I got to work. Building something like this seemed like a great way to give back to the open-source community and an opportunity to make new friends. No, seriously, I only know like two other developers — [please be my friend](https://www.twitter.com/stephancasas).

Snowblade is definitely still in its early stages of development. When I started the project, I wasn't familiar with TypeScript, so there's a considerable amount of refactoring to be done. As I needed Snowblade to work for my job, lots of "hacks" have been applied with `// FIXME:` comments. With a reasonably-working preview, I'll be doing what I can in the coming weeks to burn through these, and promise to open the source up for pull requests once this is completed.

In the interim, please submit ideas, feedback, bug reports and any other considerations as [issues](https://github.com/stephancasas/snowblade/issues) right here on GitHub. As with any open-source project, Snowblade is built as my work allows for it. If you enjoy using Snowblade, and want to see further development, please consider [sponsoring the project]().

## Say "Hello"

:man_technologist: | **Stephan Casas** 
:---: |:--- 
:email: | stephancasas[at]icloud[dot]com|
:bird: | [@stephancasas](https://www.twitter.com/stephancasas) |
:camera: | [@stephancasas](https://www.instagram.com/stephancasas)