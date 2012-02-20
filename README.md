# [HxDoc](http://hxdoc.org)

#### Version 0.1

**Written by [Neil E. Pearson](http://hx.net.au)**

*Licensed under the [Apache License](http://www.apache.org/licenses/LICENSE-2.0), Version 2.0*


## HxDoc Format
**XML-based code documentation**

HxDoc is a format for documenting code libraries in any language. The HxDoc format is well-formed XML, best described by its [XML Schema](http://hxdoc.org/schemas/hxdoc-0.1.xsd), included in the repo as `hxdoc-0.1.xsd`.

You can write HxDoc documents with any text editor. You may find it helpful to use a schema-aware XML editor such as [Netbeans](http://netbeans.org) or [OxygenXML](http://oxygenxml.com). The `hxdoc-authoring.css` stylesheet (also included in this repo) is designed to work with Oxygen to make editing HxDoc documents feel like word processing.

HxDoc is very much in its infancy. Some things we’d like to see:

- Dedicated, cross-platform authoring tools (Java or web apps).
- Tools to convert to and from other documentation formats, including [JSDoc](http://jsdoc.sourceforge.net), [PHPDoc](http://phpdoc.org), [.Net inline documentation](http://msdn.microsoft.com/en-us/library/b2s063f7.aspx), [JavaDoc](http://www.oracle.com/technetwork/java/javase/documentation/index-jsp-135444.html) etc.
- Support for interfaces, enumerations, generics and other common code elements.

If you’re interested in contributing in any of these areas, or you think you can make HxDoc better, please contact the repository admins.

## HxDoc Viewer
**Browser-based HxDoc viewer app with server- or client-side rendering**

HxDoc Viewer renders HxDoc documents as HTML, and includes a JavaScript library that displays a contents tree, breadcrumbs, search field and more.

HxDoc Viewer has four deployment models:

- Server-side shared
- Server-side standalone
- Client-side shared
- Client-side standalone

The server-side deployment models render the HTML server-side. Client-side models load the HxDoc XML document into the browser, and render directly to the DOM.

Shared models have separate resources (JavaScript, CSS, images etc). Standalone models combine all resources into a single file.

HxDoc Viewer uses **XSLT** to render HTML, so server- and client-side rendering share a common code base.

HxDoc Viewer supports all modern browsers, including Internet Explorer 9 and above. For server-side rendering, you’ll need PHP 5 with the `xsl` extension.

### Choosing a deployment model

Wherever possible, use server-side deployment. It caches the rendered documents, and reduces load (and load time) on the browser. Server-side deployment will also tell you if there are errors in your document’s syntax. Use client-side deployment if you’re unable to host your documents on a PHP-enabled server.

Shared deployments are ideal if you’re hosting lots of documents. Shared resources will be downloaded once, and cached by the browser.

Standalone deployments are ideal if you want to deliver a single payload. You can save the response of a standalone server-side render as an HTML file and email it around, and people will be able to open a single file without unzipping dependencies.

### Building HxDoc Viewer

To build HxDoc viewer, run the `build-viewer.sh` script. There are several useful command-line options; run `build-viewer.sh --help` to see them.

The build script will attempt to download [Google Closure Compiler](http://code.google.com/closure/compiler/) and [YUI Compressor](http://developer.yahoo.com/yui/compressor/), unless you run it with minification disabled. [Java](http://java.com) is also required for minification.

Building on Windows hasn’t been tested, but should work, as long as the `java` executable is on the path. Run `viewer/build.php` from a command line or browser.

### Viewing your documents

By default, HxDoc Viewer will display the XML file that has the same base name as the viewer. For example, `hxdoc.php` will display the document in `hxdoc.xml`. If you want to rename it to `index.php` so your server picks it up as the default document, simply rename your HxDoc document to `index.xml`.

You can force HxDoc Viewer to display a different document by making it the query string. For example, `hxdoc.html?my-document.xml` will display `my-document.xml`.

Server-side viewers are limited to displaying documents in the viewer’s directory, and subdirectories immediately located in the viewer’s directory. So, `hxdoc.php?../my-document.xml` won’t work.